import { useState, useEffect } from "react";

const PALETTE = {
    0: "#161b22",
    1: "#0e4429",
    2: "#006d32",
    3: "#26a641",
    4: "#39d353",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["","Mon","","Wed","","Fri",""];

function groupByWeek(activity) {
    const weeks = [];
    let week = [];
    if (activity.length > 0) {
        const firstDay = new Date(activity[0].date + "T00:00:00Z").getUTCDay();
        for (let p = 0; p < firstDay; p++) week.push(null);
    }
    for (const day of activity) {
        week.push(day);
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }
    return weeks;
}

function getMonthLabels(weeks) {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
        const firstReal = week.find(d => d !== null);
        if (!firstReal) return;
        const month = new Date(firstReal.date + "T00:00:00Z").getUTCMonth();
        if (month !== lastMonth) {
            labels.push({ col: i, label: MONTHS[month] });
            lastMonth = month;
        }
    });
    return labels;
}

function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function Tooltip({ cell, x, y, visible }) {
    if (!visible || !cell) return null;
    return (
        <div style={{
            position: "fixed", left: x + 12, top: y - 40,
            background: "#1c2128", border: "1px solid #30363d",
            borderRadius: 6, padding: "6px 10px",
            fontSize: 12, color: "#e6edf3", pointerEvents: "none",
            whiteSpace: "nowrap", zIndex: 9999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            fontFamily: "'JetBrains Mono', monospace",
        }}>
            <strong style={{ color: PALETTE[cell.level] }}>{cell.count} submission{cell.count !== 1 ? "s" : ""}</strong>
            <span style={{ color: "#8b949e", marginLeft: 6 }}>on {formatDate(cell.date)}</span>
        </div>
    );
}

// apiBase defaults to "" so the fetch uses a relative URL — works in any environment.
// Pass the JWT token from your auth context so the request is authenticated.
export default function ActivityCalendar({ userId, token, apiBase = "" }) {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const [tooltip, setTooltip] = useState({ visible: false, cell: null, x: 0, y: 0 });

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

    if (loading) return <CalendarSkeleton />;
    if (error)   return <div style={styles.error}>Failed to load activity: {error}</div>;
    if (!data)   return null;

    const weeks = groupByWeek(data.activity);
    const monthLabels = getMonthLabels(weeks);
    const CELL = 13;
    const GAP  = 3;
    const UNIT = CELL + GAP;

    return (
        <div style={styles.root}>
            <div style={styles.header}>
                <h2 style={styles.title}>Activity</h2>
                <div style={styles.statRow}>
                    <Stat value={data.stats.totalSubmissions} label="submissions"    color="#39d353" />
                    <Stat value={data.stats.activeDays}       label="active days"    color="#58a6ff" />
                    <Stat value={data.stats.currentStreak}    label="current streak" color="#e3b341" />
                    <Stat value={data.stats.maxStreak}        label="max streak"     color="#f78166" />
                </div>
            </div>

            <div style={styles.calendarWrap}>
                <div style={styles.dayLabels}>
                    {DAYS.map((d, i) => (
                        <div key={i} style={{ height: UNIT, fontSize: 10, color: "#8b949e",
                            display: "flex", alignItems: "center", fontFamily: "monospace" }}>
                            {d}
                        </div>
                    ))}
                </div>

                <div style={{ overflowX: "auto", paddingBottom: 8 }}>
                    <div style={{ display: "flex", marginBottom: 4, paddingLeft: 2 }}>
                        {weeks.map((_, wi) => {
                            const ml = monthLabels.find(m => m.col === wi);
                            return (
                                <div key={wi} style={{ width: UNIT, minWidth: UNIT,
                                    fontSize: 10, color: "#8b949e", fontFamily: "monospace",
                                    whiteSpace: "nowrap" }}>
                                    {ml ? ml.label : ""}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: "flex", gap: GAP }}>
                        {weeks.map((week, wi) => (
                            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                                {week.map((day, di) => (
                                    <Cell
                                        key={di} day={day} size={CELL}
                                        onEnter={(e) => day && setTooltip({ visible: true, cell: day, x: e.clientX, y: e.clientY })}
                                        onLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                                        onMove={(e) => setTooltip(t => ({ ...t, x: e.clientX, y: e.clientY }))}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={styles.legend}>
                <span style={{ color: "#8b949e", fontSize: 11 }}>Less</span>
                {[0,1,2,3,4].map(l => (
                    <div key={l} style={{
                        width: 11, height: 11, borderRadius: 2,
                        background: PALETTE[l], border: "1px solid rgba(255,255,255,0.06)"
                    }} />
                ))}
                <span style={{ color: "#8b949e", fontSize: 11 }}>More</span>
            </div>

            <Tooltip {...tooltip} />
        </div>
    );
}

function Cell({ day, size, onEnter, onLeave, onMove }) {
    if (!day) {
        return <div style={{ width: size, height: size }} />;
    }
    return (
        <div
            onMouseEnter={e => {
                e.currentTarget.style.filter = "brightness(1.4)";
                e.currentTarget.style.transform = "scale(1.3)";
                onEnter(e);
            }}
            onMouseLeave={e => {
                e.currentTarget.style.filter = "brightness(1)";
                e.currentTarget.style.transform = "scale(1)";
                onLeave(e);
            }}
            onMouseMove={onMove}
            style={{
                width: size, height: size, borderRadius: 2,
                background: PALETTE[day.level],
                border: "1px solid rgba(255,255,255,0.06)",
                cursor: day.count > 0 ? "pointer" : "default",
                transition: "transform 0.1s, filter 0.1s",
            }}
        />
    );
}

function Stat({ value, label, color }) {
    return (
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
                {(value ?? 0).toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: "#8b949e" }}>{label}</span>
        </div>
    );
}

function CalendarSkeleton() {
    return (
        <div style={{ ...styles.root, opacity: 0.4 }}>
            <div style={{ height: 80, background: "#21262d", borderRadius: 8, marginBottom: 16 }} />
            <div style={{ height: 130, background: "#21262d", borderRadius: 8 }} />
        </div>
    );
}

const styles = {
    root: {
        background: "#0d1117",
        border: "1px solid #21262d",
        borderRadius: 12,
        padding: "20px 24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        maxWidth: 900,
        color: "#e6edf3",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        flexWrap: "wrap",
        gap: 12,
    },
    title: {
        margin: 0, fontSize: 16, fontWeight: 600, color: "#e6edf3",
        letterSpacing: 0.3,
    },
    statRow: {
        display: "flex", gap: 20, flexWrap: "wrap",
    },
    calendarWrap: {
        display: "flex", gap: 4,
    },
    dayLabels: {
        display: "flex", flexDirection: "column", paddingTop: 20, marginRight: 4,
    },
    legend: {
        display: "flex", alignItems: "center", gap: 4,
        marginTop: 12, justifyContent: "flex-end", fontSize: 11,
    },
    error: {
        color: "#f78166", padding: 16, background: "#1c2128",
        borderRadius: 8, border: "1px solid #30363d",
    },
};
