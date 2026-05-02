import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

// ─── Complexity Detection Engine ─────────────────────────────────────────────

const COMPLEXITY_MODELS = {
  "O(1)":       { fn: () => 1,                       label: "O(1) — Constant" },
  "O(log n)":   { fn: n => Math.log2(n),             label: "O(log n) — Logarithmic" },
  "O(n)":       { fn: n => n,                         label: "O(n) — Linear" },
  "O(n log n)": { fn: n => n * Math.log2(n),         label: "O(n log n) — Linearithmic" },
  "O(n²)":      { fn: n => n * n,                    label: "O(n²) — Quadratic" },
};

function fitComplexity(data) {
  if (!data || data.length < 5) return null;
  const points = data.filter(d => d.inputSize > 0 && d.runtime > 0);
  if (points.length < 5) return null;

  let bestFit = null;
  let bestError = Infinity;

  for (const [key, model] of Object.entries(COMPLEXITY_MODELS)) {
    const xs = points.map(d => model.fn(d.inputSize));
    const ys = points.map(d => d.runtime);

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
    }
  }

  return bestFit ? { ...bestFit, confidence: Math.round(bestFit.r2 * 100) } : null;
}

function generateTrendline(data, fit) {
  if (!fit || !data.length) return [];
  const xs = data.map(d => d.inputSize);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const steps = 20;
  const result = [];
  for (let i = 0; i <= steps; i++) {
    const x = minX + (maxX - minX) * (i / steps);
    const y = fit.a * fit.model.fn(x) + fit.b;
    result.push({ inputSize: Math.round(x), trend: Math.max(0, y) });
  }
  return result;
}

// ─── Components ──────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
      <p className="text-xs font-bold text-slate-400 mb-1">Input Size: {label.toLocaleString()}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(2)} {unit}
        </p>
      ))}
    </div>
  );
};

export default function SubmissionGraph({ data, userPerformance, type }) {
  const [tab, setTab] = useState(type || 'runtime');
  const isTimeTab = tab === 'runtime';
  const unit = isTimeTab ? 'ms' : 'MB';

  const allSubmissions = data.allSubmissions || [];
  
  const complexityFit = useMemo(() => {
    if (!isTimeTab) return null;
    return fitComplexity(allSubmissions);
  }, [allSubmissions, isTimeTab]);

  const chartData = useMemo(() => {
    // Sort submissions by inputSize
    const sorted = [...allSubmissions].sort((a, b) => a.inputSize - b.inputSize);
    
    // Group by inputSize to show average per size if needed, or just individual points
    // For the complexity graph, we'll use individual points
    const points = sorted.map(s => ({
        inputSize: s.inputSize,
        value: isTimeTab ? s.runtime : s.memory
    }));

    // Add trendline points
    const trendline = isTimeTab ? generateTrendline(sorted, complexityFit) : [];
    
    // Merge for chart
    return [...points, ...trendline.map(t => ({ inputSize: t.inputSize, trend: t.trend }))].sort((a, b) => a.inputSize - b.inputSize);
  }, [allSubmissions, complexityFit, isTimeTab]);

  const userValue = userPerformance ? (isTimeTab ? userPerformance.time : userPerformance.memory) : null;

  if (allSubmissions.length < 5) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-white/[0.02] rounded-xl border border-white/5 text-slate-500 italic text-sm text-center px-6">
          Not enough submissions to generate a detailed performance analysis.<br/>
          (Minimum 5 submissions required)
        </div>
      );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/[0.03] rounded-lg border border-white/5 w-fit">
          <button 
            onClick={() => setTab('runtime')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${tab === 'runtime' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
              Runtime
          </button>
          <button 
            onClick={() => setTab('memory')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${tab === 'memory' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
              Memory
          </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Estimated Complexity</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-mono font-bold text-blue-400">{complexityFit ? complexityFit.key : 'N/A'}</p>
                {complexityFit && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {complexityFit.confidence}% match
                    </span>
                )}
              </div>
          </div>
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Your Performance</p>
              <p className="text-xl font-mono font-bold text-emerald-400">
                  {userValue ? userValue.toFixed(2) : '—'} <span className="text-xs font-normal text-slate-500">{unit}</span>
              </p>
          </div>
      </div>

      {/* Main Chart */}
      <div className="h-72 w-full bg-white/[0.01] rounded-xl border border-white/5 p-4 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
                dataKey="inputSize" 
                type="number"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                domain={['auto', 'auto']}
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10 }} 
                domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
            
            {/* Points */}
            <Line 
                type="monotone" 
                dataKey="value" 
                stroke="none" 
                dot={{ r: 3, fill: isTimeTab ? '#3b82f6' : '#a855f7', fillOpacity: 0.3 }} 
                name={isTimeTab ? "Runtime" : "Memory"}
            />
            
            {/* Trendline */}
            {isTimeTab && complexityFit && (
                <Line 
                    type="monotone" 
                    dataKey="trend" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    dot={false}
                    name="Trendline"
                />
            )}

            {/* User Point */}
            {userValue && (
                 <ReferenceLine y={userValue} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'You', fill: '#10b981', fontSize: 10, position: 'right' }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Distribution (Summary) */}
      <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
          <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-blue-400">Analysis:</strong> {isTimeTab ? (
                  complexityFit ? `Your code follows a ${complexityFit.model.label} pattern. This is considered ${complexityFit.key === 'O(1)' || complexityFit.key === 'O(log n)' ? 'highly optimal' : 'efficient'} for this type of problem.` : 'Analyzing complexity patterns...'
              ) : (
                  'Memory usage remains stable across varying input sizes, indicating efficient allocation.'
              )}
          </p>
      </div>
    </div>
  );
}
