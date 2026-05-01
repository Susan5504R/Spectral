/**
 * PerformanceAnalyzer.jsx
 * * A comprehensive code submission performance analysis dashboard.
 * Graphs: Runtime vs Input, Memory vs Input, Distribution/Percentile
 * Features: Complexity detection, comparison mode, zoom/pan, hover tooltips
 * * Integration: Drop into any React project. Pass props as described below.
 * Dependencies: recharts (npm install recharts)
 */

import { useState, useMemo } from "react";
import {
  ComposedChart, Line,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts";

// ─── Complexity Detection Engine ─────────────────────────────────────────────

const COMPLEXITY_MODELS = {
  "O(1)":       { fn: () => 1,                       label: "O(1) — Constant" },
  "O(log n)":   { fn: n => Math.log2(n),             label: "O(log n) — Logarithmic" },
  "O(n)":       { fn: n => n,                         label: "O(n) — Linear" },
  "O(n log n)": { fn: n => n * Math.log2(n),         label: "O(n log n) — Linearithmic" },
  "O(n²)":      { fn: n => n * n,                    label: "O(n²) — Quadratic" },
  "O(2ⁿ)":      { fn: n => Math.pow(2, Math.min(n, 30)), label: "O(2ⁿ) — Exponential" },
};

function fitComplexity(data) {
  if (!data || data.length < 2) return null;
  const points = data.filter(d => d.inputSize > 0 && d.runtime > 0);
  if (points.length < 2) return null;

  let bestFit = null;
  let bestError = Infinity;
  let bestConfidence = 0;

  for (const [key, model] of Object.entries(COMPLEXITY_MODELS)) {
    const xs = points.map(d => model.fn(d.inputSize));
    const ys = points.map(d => d.runtime);

    // Least squares: y = a * x + b
    const n = xs.length;
    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumXX = xs.reduce((s, x) => s + x * x, 0);
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-10) continue;

    const a = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - a * sumX) / n;

    const residuals = ys.map((y, i) => Math.pow(y - (a * xs[i] + b), 2));
    const mse = residuals.reduce((s, r) => s + r, 0) / n;
    const meanY = sumY / n;
    const ssTot = ys.reduce((s, y) => s + Math.pow(y - meanY, 2), 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - (residuals.reduce((s,r)=>s+r,0) / ssTot)) : 0;

    if (mse < bestError) {
      bestError = mse;
      bestFit = { key, model, a, b, r2 };
      bestConfidence = Math.round(r2 * 100);
    }
  }

  return bestFit ? { ...bestFit, confidence: bestConfidence } : null;
}

function generateTrendline(data, fit) {
  if (!fit || !data.length) return [];
  const xs = data.map(d => d.inputSize);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const steps = 60;
  const result = [];
  for (let i = 0; i <= steps; i++) {
    const x = minX + (maxX - minX) * (i / steps);
    const transformed = fit.model.fn(x);
    const y = fit.a * transformed + fit.b;
    if (y > 0 && isFinite(y)) result.push({ inputSize: Math.round(x), trend: Math.max(0, y) });
  }
  return result;
}

function generatePredictions(data, fit, futureMultipliers = [2, 5, 10]) {
  if (!fit || !data.length) return [];
  const maxX = Math.max(...data.map(d => d.inputSize));
  return futureMultipliers.map(m => {
    const x = maxX * m;
    const y = fit.a * fit.model.fn(x) + fit.b;
    return { inputSize: Math.round(x), predicted: Math.max(0, y), multiplier: m };
  });
}

// ─── Percentile Calculation ───────────────────────────────────────────────────

function computePercentile(userRuntime, distribution) {
  if (!distribution || !distribution.length) return null;
  const below = distribution.filter(r => r < userRuntime).length;
  return Math.round((below / distribution.length) * 100);
}

function buildHistogram(distribution, bins = 20) {
  if (!distribution || !distribution.length) return [];
  const min = Math.min(...distribution);
  const max = Math.max(...distribution);
  const binSize = (max - min) / bins || 1;
  const buckets = Array.from({ length: bins }, (_, i) => ({
    rangeStart: min + i * binSize,
    rangeEnd: min + (i + 1) * binSize,
    count: 0,
    label: `${Math.round(min + i * binSize)}`
  }));
  distribution.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / binSize), bins - 1);
    buckets[idx].count++;
  });
  return buckets;
}

// ─── Color Palette ────────────────────────────────────────────────────────────

const SUBMISSION_COLORS = [
  "#378ADD", "#1D9E75", "#D85A30", "#7F77DD", "#D4537E",
  "#639922", "#BA7517", "#E24B4A",
];

const COMPLEXITY_COLORS = {
  "O(1)":       "#1D9E75",
  "O(log n)":   "#378ADD",
  "O(n)":       "#639922",
  "O(n log n)": "#BA7517",
  "O(n²)":      "#E24B4A",
  "O(2ⁿ)":      "#A32D2D",
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, unit = "ms" }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: "var(--border-radius-md)",
      padding: "10px 14px",
      fontSize: 13,
    }}>
      <p style={{ margin: "0 0 6px", fontWeight: 500, color: "var(--color-text-primary)" }}>
        Input size: {typeof label === "number" ? label.toLocaleString() : label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: "2px 0", color: entry.color || "var(--color-text-secondary)" }}>
          {entry.name}: <strong>{typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value} {unit}</strong>
        </p>
      ))}
    </div>
  );
};

const DistTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: "var(--border-radius-md)",
      padding: "8px 12px",
      fontSize: 13,
    }}>
      <p style={{ margin: 0, color: "var(--color-text-primary)" }}>
        {Math.round(d?.rangeStart)}–{Math.round(d?.rangeEnd)} ms
      </p>
      <p style={{ margin: "2px 0 0", color: "var(--color-text-secondary)" }}>
        {d?.count} submissions
      </p>
    </div>
  );
};

// ─── Complexity Badge ─────────────────────────────────────────────────────────

const ComplexityBadge = ({ fit }) => {
  if (!fit) return null;
  const color = COMPLEXITY_COLORS[fit.key] || "#888";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "var(--color-background-secondary)",
      border: `0.5px solid ${color}40`,
      borderRadius: "var(--border-radius-md)",
      padding: "6px 12px",
    }}>
      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Estimated complexity</span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color
      }}>{fit.key}</span>
      <span style={{
        fontSize: 11,
        background: fit.confidence > 80 ? "#EAF3DE" : fit.confidence > 60 ? "#FAEEDA" : "#FCEBEB",
        color: fit.confidence > 80 ? "#3B6D11" : fit.confidence > 60 ? "#854F0B" : "#A32D2D",
        padding: "2px 6px", borderRadius: 4,
      }}>{fit.confidence}% confidence</span>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, unit, accent }) => (
  <div style={{
    background: "var(--color-background-secondary)",
    borderRadius: "var(--border-radius-md)",
    padding: "12px 16px", flex: 1,
  }}>
    <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</p>
    <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color: accent || "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
      {value}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 3, color: "var(--color-text-secondary)" }}>{unit}</span>
    </p>
  </div>
);

// ─── Runtime vs Input Size Graph ──────────────────────────────────────────────

const RuntimeGraph = ({ submissions, showMemory = false, showPredictions = true }) => {
  const [activeKeys, setActiveKeys] = useState(submissions.map((_, i) => i));
  const [zoomDomain, setZoomDomain] = useState(null);

  const metric = showMemory ? "memory" : "runtime";
  const unit = showMemory ? "MB" : "ms";

  const fits = useMemo(() =>
    submissions.map(s => fitComplexity(s.data)), [submissions]);

  const trendlines = useMemo(() =>
    submissions.map((s, i) => generateTrendline(s.data, fits[i])), [submissions, fits]);

  const predictions = useMemo(() =>
    submissions.map((s, i) => showPredictions ? generatePredictions(s.data, fits[i]) : []),
    [submissions, fits, showPredictions]);

  // Merge all points for unified chart
  const allPoints = useMemo(() => {
    const map = {};
    submissions.forEach((s, si) => {
      if (!activeKeys.includes(si)) return;
      s.data.forEach(d => {
        const key = d.inputSize;
        if (!map[key]) map[key] = { inputSize: key };
        map[key][`runtime_${si}`] = d[metric];
      });
    });
    const merged = Object.values(map).sort((a, b) => a.inputSize - b.inputSize);

    // add trendline values
    trendlines.forEach((tl, si) => {
      if (!activeKeys.includes(si)) return;
      tl.forEach(t => {
        const pt = merged.find(m => Math.abs(m.inputSize - t.inputSize) < 1);
        if (pt) pt[`trend_${si}`] = t.trend;
        else {
          const obj = { inputSize: t.inputSize, [`trend_${si}`]: t.trend };
          merged.push(obj);
        }
      });
    });

    // add prediction points
    if (showPredictions) {
      predictions.forEach((preds, si) => {
        if (!activeKeys.includes(si)) return;
        preds.forEach(p => {
          const obj = { inputSize: p.inputSize, [`predicted_${si}`]: p.predicted, isPrediction: true };
          merged.push(obj);
        });
      });
    }

    return merged.sort((a, b) => a.inputSize - b.inputSize);
  }, [submissions, activeKeys, trendlines, predictions, metric, showPredictions]);

  const toggleSub = (i) => {
    setActiveKeys(prev => prev.includes(i) ? prev.filter(k => k !== i) : [...prev, i]);
  };

  const resetZoom = () => setZoomDomain(null);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {submissions.map((s, i) => (
          <button
            key={i}
            onClick={() => toggleSub(i)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: "var(--border-radius-md)",
              border: `0.5px solid ${activeKeys.includes(i) ? SUBMISSION_COLORS[i] : "var(--color-border-tertiary)"}`,
              background: activeKeys.includes(i) ? `${SUBMISSION_COLORS[i]}15` : "transparent",
              cursor: "pointer", fontSize: 12, color: "var(--color-text-primary)",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: activeKeys.includes(i) ? SUBMISSION_COLORS[i] : "var(--color-border-secondary)" }} />
            {s.label || `Submission ${i + 1}`}
            {fits[i] && activeKeys.includes(i) && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: SUBMISSION_COLORS[i] }}>
                {fits[i].key}
              </span>
            )}
          </button>
        ))}
        {zoomDomain && (
          <button onClick={resetZoom} style={{
            padding: "5px 10px", borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-secondary)",
            background: "transparent", cursor: "pointer", fontSize: 12,
            color: "var(--color-text-secondary)",
          }}>Reset zoom</button>
        )}
      </div>

      <div style={{ position: "relative", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={allPoints} margin={{ top: 8, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
            <XAxis
              dataKey="inputSize"
              type="number"
              domain={zoomDomain ? zoomDomain : ["auto", "auto"]}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(v%1000===0?0:1)}k` : v}
              label={{ value: "Input size (n)", position: "insideBottom", offset: -10, fontSize: 12, fill: "var(--color-text-secondary)" }}
              tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            />
            <YAxis
              label={{ value: showMemory ? "Memory (MB)" : "Runtime (ms)", angle: -90, position: "insideLeft", offset: 15, fontSize: 12, fill: "var(--color-text-secondary)" }}
              tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
              tickFormatter={v => v.toFixed(1)}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />

            {submissions.map((s, si) => activeKeys.includes(si) && (
              <Line
                key={`runtime_${si}`}
                type="monotone"
                dataKey={`runtime_${si}`}
                stroke={SUBMISSION_COLORS[si]}
                strokeWidth={2}
                dot={{ r: 4, fill: SUBMISSION_COLORS[si], strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                name={s.label || `Submission ${si + 1}`}
                connectNulls={false}
              />
            ))}

            {submissions.map((s, si) => activeKeys.includes(si) && (
              <Line
                key={`trend_${si}`}
                type="monotone"
                dataKey={`trend_${si}`}
                stroke={SUBMISSION_COLORS[si]}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                name={`Trend ${si + 1}`}
                legendType="none"
                connectNulls
              />
            ))}

            {showPredictions && submissions.map((s, si) => activeKeys.includes(si) && (
              <Line
                key={`predicted_${si}`}
                type="monotone"
                dataKey={`predicted_${si}`}
                stroke={SUBMISSION_COLORS[si]}
                strokeWidth={1}
                strokeDasharray="2 4"
                dot={{ r: 5, fill: "none", stroke: SUBMISSION_COLORS[si], strokeWidth: 1.5 }}
                name={`Prediction ${si + 1}`}
                legendType="none"
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showPredictions && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
            Predicted runtime for larger inputs (dashed circles)
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {predictions.map((preds, si) =>
              activeKeys.includes(si) && preds.map(p => (
                <div key={`${si}_${p.multiplier}`} style={{
                  fontSize: 12, padding: "4px 10px",
                  background: "var(--color-background-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  color: "var(--color-text-secondary)",
                }}>
                  <span style={{ color: SUBMISSION_COLORS[si], fontFamily: "var(--font-mono)" }}>
                    {p.inputSize.toLocaleString()}n
                  </span>
                  {" → "}{p.predicted.toFixed(1)} {unit}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Distribution Graph ───────────────────────────────────────────────────────

const DistributionGraph = ({ distribution, userRuntime, label = "Your submission" }) => {
  const bins = useMemo(() => buildHistogram(distribution, 24), [distribution]);
  const percentile = useMemo(() => computePercentile(userRuntime, distribution), [userRuntime, distribution]);
  const fasterThan = percentile !== null ? 100 - percentile : null;

  const isUserBin = (bin) =>
    userRuntime >= bin.rangeStart && userRuntime < bin.rangeEnd;

  return (
    <div>
      {fasterThan !== null && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: fasterThan > 75 ? "#EAF3DE" : fasterThan > 50 ? "#FAEEDA" : "#FCEBEB",
          borderRadius: "var(--border-radius-md)", padding: "10px 16px", marginBottom: 16,
        }}>
          <span style={{
            fontSize: 28, fontWeight: 500, fontFamily: "var(--font-mono)",
            color: fasterThan > 75 ? "#3B6D11" : fasterThan > 50 ? "#854F0B" : "#A32D2D"
          }}>
            {fasterThan}%
          </span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: fasterThan > 75 ? "#3B6D11" : fasterThan > 50 ? "#854F0B" : "#A32D2D" }}>
              faster than other users
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>
              Your runtime: {userRuntime.toFixed(2)} ms · Beat {fasterThan}% of {distribution.length.toLocaleString()} submissions
            </p>
          </div>
        </div>
      )}

      <div style={{ position: "relative", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 8, right: 16, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
              label={{ value: "Runtime (ms)", position: "insideBottom", offset: -10, fontSize: 12, fill: "var(--color-text-secondary)" }}
              interval={Math.floor(bins.length / 6)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
              label={{ value: "Submissions", angle: -90, position: "insideLeft", offset: 15, fontSize: 12, fill: "var(--color-text-secondary)" }}
            />
            <Tooltip content={<DistTooltip />} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {bins.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={isUserBin(entry) ? "#D85A30" : "#378ADD"}
                  fillOpacity={isUserBin(entry) ? 1 : 0.55}
                />
              ))}
            </Bar>
            {userRuntime && (
              <ReferenceLine
                x={String(Math.round(userRuntime))}
                stroke="#D85A30"
                strokeWidth={2}
                strokeDasharray="4 2"
                label={{ value: `You: ${userRuntime.toFixed(1)}ms`, fill: "#D85A30", fontSize: 11, position: "top" }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ title, subtitle, badge }) => (
  <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
    <div>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{title}</h3>
      {subtitle && <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>{subtitle}</p>}
    </div>
    {badge}
  </div>
);

// ─── Tab Button ───────────────────────────────────────────────────────────────

const Tab = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "6px 14px", fontSize: 13,
    border: "none",
    borderBottom: active ? "2px solid #378ADD" : "2px solid transparent",
    background: "transparent", cursor: "pointer",
    color: active ? "#378ADD" : "var(--color-text-secondary)",
    fontWeight: active ? 500 : 400,
    transition: "all 0.15s",
  }}>{label}</button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * PerformanceAnalyzer
 * * @param {Object[]} submissions - Array of submission objects
 * Each: { label, timestamp, data: [{ inputSize, runtime, memory }] }
 * @param {number[]} [distributionData] - Array of runtimes from other users
 * @param {boolean} [showPredictions=true] - Show future runtime predictions
 * @param {boolean} [darkMode=false] - Force dark mode (auto-detects if not set)
 */
export default function PerformanceAnalyzer({
  submissions,
  distributionData,
  showPredictions = true,
}) {
  const [tab, setTab] = useState("runtime");

  // FIX: Moved useMemo hooks ABOVE the early return!
  const primarySub = submissions && submissions.length > 0 ? submissions[0] : null;
  const primaryFit = useMemo(() => fitComplexity(primarySub?.data), [primarySub]);

  if (!submissions || !submissions.length) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
        No submission data provided.
      </div>
    );
  }

  const allRuntimes = primarySub?.data?.map(d => d.runtime) || [];
  const avgRuntime = allRuntimes.length ? (allRuntimes.reduce((s, v) => s + v, 0) / allRuntimes.length).toFixed(1) : "—";
  const peakMemory = primarySub?.data?.length ? Math.max(...primarySub.data.map(d => d.memory)).toFixed(1) : "—";
  const maxRuntime = allRuntimes.length ? Math.max(...allRuntimes).toFixed(1) : "—";

  const userRuntime = primarySub?.data?.find(d => d.inputSize > 0)?.runtime;

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-primary)" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 500 }}>Performance Analysis</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)" }}>
        {submissions.length} submission{submissions.length > 1 ? "s" : ""} · {primarySub?.data?.length || 0} data points
      </p>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Avg runtime" value={avgRuntime} unit="ms" />
        <StatCard label="Peak runtime" value={maxRuntime} unit="ms" accent="#E24B4A" />
        <StatCard label="Peak memory" value={peakMemory} unit="MB" />
        {primaryFit && (
          <StatCard
            label="Complexity"
            value={primaryFit.key}
            unit={`${primaryFit.confidence}%`}
            accent={COMPLEXITY_COLORS[primaryFit.key]}
          />
        )}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 20, display: "flex" }}>
        <Tab label="Runtime" active={tab === "runtime"} onClick={() => setTab("runtime")} />
        <Tab label="Memory" active={tab === "memory"} onClick={() => setTab("memory")} />
        {distributionData && <Tab label="Distribution" active={tab === "dist"} onClick={() => setTab("dist")} />}
      </div>

      {/* Runtime tab */}
      {tab === "runtime" && (
        <div>
          <SectionHeader
            title="Runtime vs Input Size"
            subtitle="Dashed line = trendline (complexity fit) · Open circles = predictions for larger inputs"
            badge={<ComplexityBadge fit={primaryFit} />}
          />
          <RuntimeGraph submissions={submissions} showMemory={false} showPredictions={showPredictions} />
          {primaryFit && (
            <div style={{
              marginTop: 16, padding: "12px 16px",
              background: "var(--color-background-secondary)",
              borderRadius: "var(--border-radius-md)",
              borderLeft: `3px solid ${COMPLEXITY_COLORS[primaryFit.key] || "#378ADD"}`,
              fontSize: 13,
            }}>
              <strong style={{ color: "var(--color-text-primary)" }}>Complexity insight: </strong>
              <span style={{ color: "var(--color-text-secondary)" }}>
                {primaryFit.key === "O(1)" && "Runtime appears constant — likely a lookup or hash-based solution."}
                {primaryFit.key === "O(log n)" && "Logarithmic growth — consistent with binary search or balanced tree traversal."}
                {primaryFit.key === "O(n)" && "Linear growth — good! The algorithm scales proportionally to input."}
                {primaryFit.key === "O(n log n)" && "Linearithmic growth — typical of efficient sorting algorithms (merge sort, heap sort)."}
                {primaryFit.key === "O(n²)" && "Quadratic growth detected — nested loops may be the bottleneck. Consider optimization."}
                {primaryFit.key === "O(2ⁿ)" && "Exponential growth — this won't scale. Consider dynamic programming or memoization."}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Memory tab */}
      {tab === "memory" && (
        <div>
          <SectionHeader
            title="Memory vs Input Size"
            subtitle="Shows memory allocation across different input sizes"
          />
          <RuntimeGraph submissions={submissions} showMemory={true} showPredictions={false} />
        </div>
      )}

      {/* Distribution tab */}
      {tab === "dist" && distributionData && (
        <div>
          <SectionHeader
            title="Runtime Distribution"
            subtitle="How your submission compares to all accepted solutions"
          />
          <DistributionGraph
            distribution={distributionData}
            userRuntime={userRuntime}
          />
        </div>
      )}

      {/* Legend for multi-submission */}
      {submissions.length > 1 && (
        <div style={{
          marginTop: 20, padding: "12px 16px",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>
            Comparison legend
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {submissions.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span style={{ width: 20, height: 2, background: SUBMISSION_COLORS[i], display: "inline-block" }} />
                <span style={{ color: "var(--color-text-primary)" }}>{s.label || `Submission ${i + 1}`}</span>
                {s.timestamp && (
                  <span style={{ color: "var(--color-text-secondary)" }}>{s.timestamp}</span>
                )}
                {fitComplexity(s.data) && (
                  <span style={{ fontFamily: "var(--font-mono)", color: SUBMISSION_COLORS[i] }}>
                    {fitComplexity(s.data)?.key}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}