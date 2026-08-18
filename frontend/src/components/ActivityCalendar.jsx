import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

const PALETTE_DARK = {
    0: "#22223a",
    1: "#5C3D2E",
    2: "#B85C38",
    3: "#FF8E53",
    4: "#FF6B6B",
};

const PALETTE_LIGHT = {
    0: "#FDE8D0",
    1: "#FDBA74",
    2: "#FF8E53",
    3: "#FF6B6B",
    4: "#E85D45",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["","Mon","","Wed","","Fri",""];

// Group activity into month blocks with week columns inside each month (LeetCode style)
function groupByMonths(activity) {
    if (!activity || activity.length === 0) return [];

    const monthMap = new Map();

    activity.forEach((day) => {
        const d = new Date(day.date + "T00:00:00Z");
        const monthKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
        if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, {
                label: MONTHS[d.getUTCMonth()],
                year: d.getUTCFullYear(),
                monthIndex: d.getUTCMonth(),
                days: [],
            });
        }
        monthMap.get(monthKey).days.push(day);
    });

    const months = Array.from(monthMap.values());

    return months.map((m) => {
        const weeks = [];
        let week = [];

        if (m.days.length > 0) {
            const firstDayOfWeek = new Date(m.days[0].date + "T00:00:00Z").getUTCDay();
            for (let p = 0; p < firstDayOfWeek; p++) {
                week.push(null);
            }
        }

        m.days.forEach((day) => {
            week.push(day);
            if (week.length === 7) {
                weeks.push(week);
                week = [];
            }
        });

        if (week.length > 0) {
            while (week.length < 7) week.push(null);
            weeks.push(week);
        }

        return {
            label: m.label,
            weeks,
        };
    });
}

function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function Tooltip({ cell, x, y, visible, isDark, palette }) {
    if (!visible || !cell) return null;
    return (
        <div style={{
            position: "fixed", left: x + 12, top: y - 40,
            background: isDark ? "#22223a" : "#FFFFFF",
            border: `1px solid ${isDark ? "#2f2f4a" : "#FDE8D0"}`,
            borderRadius: 10, padding: "6px 12px",
            fontSize: 12, color: isDark ? "#F8F0E3" : "#1a1a2e",
            pointerEvents: "none",
            whiteSpace: "nowrap", zIndex: 9999,
            boxShadow: isDark ? "6px 6px 14px #12122a, -6px -6px 14px #24243e" : "6px 6px 14px #E8DFD3, -6px -6px 14px #FFFFFF",
            fontFamily: "'JetBrains Mono', monospace",
        }}>
            <strong style={{ color: palette[cell.level] }}>{cell.count} submission{cell.count !== 1 ? "s" : ""}</strong>
            <span style={{ color: isDark ? "#9B8EC4" : "#7C6E8A", marginLeft: 6 }}>on {formatDate(cell.date)}</span>
        </div>
    );
}

export default function ActivityCalendar({ userId, token, apiBase = "" }) {
    const { isDark } = useTheme();
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const [tooltip, setTooltip] = useState({ visible: false, cell: null, x: 0, y: 0 });

    const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;

    useEffect(() => {
        if (!userId || !token) return;
        setLoading(true);
        fetch(`${apiBase}/activity/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [userId, token, apiBase]);

    if (loading) return <CalendarSkeleton isDark={isDark} />;
    if (error)   return <div className={`p-4 rounded-xl border ${isDark ? "bg-[#22223a] border-[#2f2f4a] text-[#FF6B6B]" : "bg-white border-[#FDE8D0] text-[#E85D45]"}`}>Failed to load activity: {error}</div>;
    if (!data)   return null;

    const monthGroups = groupByMonths(data.activity);
    const CELL = 13;
    const GAP  = 3;
    const UNIT = CELL + GAP;

    return (
        <div className={`neo-panel p-6 rounded-2xl transition-colors ${
            isDark ? "bg-[#1a1a2e] text-[#F8F0E3] border-[#2f2f4a]" : "bg-white text-[#1a1a2e] border-[#FDE8D0]"
        }`}>
            {/* Header & Stats */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <h2 className="text-base font-bold tracking-tight">Activity Map</h2>
                <div className="flex flex-wrap gap-5">
                    <Stat value={data.stats.totalSubmissions} label="submissions"    color="#FF6B6B" isDark={isDark} />
                    <Stat value={data.stats.activeDays}       label="active days"    color="#FF8E53" isDark={isDark} />
                    <Stat value={data.stats.currentStreak}    label="current streak" color="#F59E0B" isDark={isDark} />
                    <Stat value={data.stats.maxStreak}        label="max streak"     color="#E85D45" isDark={isDark} />
                </div>
            </div>

            {/* Calendar Map with Month Block Spacing */}
            <div className="flex gap-2 items-start overflow-x-auto pb-2 scrollbar-none">
                {/* Day Labels (Mon, Wed, Fri) */}
                <div className="flex flex-col pt-1 pr-1 shrink-0">
                    {DAYS.map((d, i) => (
                        <div key={i} style={{ height: UNIT, fontSize: 10 }} className={`flex items-center font-mono ${isDark ? "text-[#9B8EC4]" : "text-[#7C6E8A]"}`}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Month Blocks Container */}
                <div className="flex gap-4">
                    {monthGroups.map((monthGroup, mi) => (
                        <div key={mi} className="flex flex-col items-center">
                            {/* Weeks in Month */}
                            <div className="flex gap-1 mb-2">
                                {monthGroup.weeks.map((week, wi) => (
                                    <div key={wi} className="flex flex-col gap-1">
                                        {week.map((day, di) => (
                                            <Cell
                                                key={di} day={day} size={CELL} palette={palette}
                                                onEnter={(e) => day && setTooltip({ visible: true, cell: day, x: e.clientX, y: e.clientY })}
                                                onLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                                                onMove={(e) => setTooltip(t => ({ ...t, x: e.clientX, y: e.clientY }))}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Centered Month Label below month block */}
                            <span className={`text-[10px] font-mono font-bold ${isDark ? "text-[#9B8EC4]" : "text-[#7C6E8A]"}`}>
                                {monthGroup.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-4 justify-end text-xs">
                <span className={`text-[11px] ${isDark ? "text-[#9B8EC4]" : "text-[#7C6E8A]"}`}>Less</span>
                {[0,1,2,3,4].map(l => (
                    <div key={l} style={{
                        width: 11, height: 11, borderRadius: 3,
                        background: palette[l],
                        border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)"
                    }} />
                ))}
                <span className={`text-[11px] ${isDark ? "text-[#9B8EC4]" : "text-[#7C6E8A]"}`}>More</span>
            </div>

            <Tooltip {...tooltip} isDark={isDark} palette={palette} />
        </div>
    );
}

function Cell({ day, size, palette, onEnter, onLeave, onMove }) {
    if (!day) {
        return <div style={{ width: size, height: size }} />;
    }
    return (
        <div
            onMouseEnter={e => {
                e.currentTarget.style.filter = "brightness(1.4)";
                e.currentTarget.style.transform = "scale(1.25)";
                onEnter(e);
            }}
            onMouseLeave={e => {
                e.currentTarget.style.filter = "brightness(1)";
                e.currentTarget.style.transform = "scale(1)";
                onLeave(e);
            }}
            onMouseMove={onMove}
            style={{
                width: size, height: size, borderRadius: 3,
                background: palette[day.level],
                border: "1px solid rgba(255,255,255,0.06)",
                cursor: day.count > 0 ? "pointer" : "default",
                transition: "transform 0.1s, filter 0.1s",
            }}
        />
    );
}

function Stat({ value, label, color, isDark }) {
    return (
        <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono" style={{ color }}>
                {(value ?? 0).toLocaleString()}
            </span>
            <span className={`text-xs ${isDark ? "text-[#9B8EC4]" : "text-[#7C6E8A]"}`}>{label}</span>
        </div>
    );
}

function CalendarSkeleton({ isDark }) {
    return (
        <div className={`p-6 rounded-2xl opacity-50 ${isDark ? "bg-[#1a1a2e] border-[#2f2f4a]" : "bg-white border-[#FDE8D0]"}`}>
            <div className={`h-16 rounded-xl mb-4 ${isDark ? "bg-[#2a2a45]" : "bg-[#FFF9F0]"}`} />
            <div className={`h-28 rounded-xl ${isDark ? "bg-[#2a2a45]" : "bg-[#FFF9F0]"}`} />
        </div>
    );
}
