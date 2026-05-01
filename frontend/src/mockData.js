/**
 * mockData.js
 * 
 * Sample data for testing PerformanceAnalyzer.
 * Includes: single submission, multi-submission comparison, distribution data.
 * 
 * Usage:
 *   import { singleSubmission, multiSubmission, distributionData } from './mockData';
 */

// ─── Helper to add noise ──────────────────────────────────────────────────────

const noise = (v, pct = 0.08) => v * (1 + (Math.random() - 0.5) * 2 * pct);

// ─── Single: O(n log n) submission (e.g., merge sort) ────────────────────────

export const singleSubmission = [
  {
    label: "Merge Sort (today)",
    timestamp: "2025-05-01 14:32",
    data: [
      { inputSize: 100,    runtime: noise(0.8),   memory: noise(1.2) },
      { inputSize: 500,    runtime: noise(4.8),   memory: noise(2.1) },
      { inputSize: 1000,   runtime: noise(10.0),  memory: noise(3.5) },
      { inputSize: 2000,   runtime: noise(21.5),  memory: noise(5.8) },
      { inputSize: 5000,   runtime: noise(57.5),  memory: noise(9.1) },
      { inputSize: 10000,  runtime: noise(120.0), memory: noise(14.3) },
      { inputSize: 20000,  runtime: noise(253.0), memory: noise(22.5) },
      { inputSize: 50000,  runtime: noise(675.0), memory: noise(41.2) },
      { inputSize: 100000, runtime: noise(1400.0),memory: noise(68.0) },
    ],
  },
];

// ─── Multi: Compare two submissions (O(n log n) vs O(n²)) ────────────────────

export const multiSubmission = [
  {
    label: "Merge Sort (optimized)",
    timestamp: "2025-05-01 14:32",
    data: [
      { inputSize: 100,   runtime: noise(0.8),   memory: noise(1.2) },
      { inputSize: 500,   runtime: noise(4.8),   memory: noise(2.1) },
      { inputSize: 1000,  runtime: noise(10.0),  memory: noise(3.5) },
      { inputSize: 2000,  runtime: noise(21.5),  memory: noise(5.8) },
      { inputSize: 5000,  runtime: noise(57.5),  memory: noise(9.1) },
      { inputSize: 10000, runtime: noise(120.0), memory: noise(14.3) },
      { inputSize: 20000, runtime: noise(253.0), memory: noise(22.5) },
    ],
  },
  {
    label: "Bubble Sort (naive)",
    timestamp: "2025-04-30 10:15",
    data: [
      { inputSize: 100,   runtime: noise(1.2),    memory: noise(0.8) },
      { inputSize: 500,   runtime: noise(30.0),   memory: noise(0.9) },
      { inputSize: 1000,  runtime: noise(120.0),  memory: noise(1.0) },
      { inputSize: 2000,  runtime: noise(480.0),  memory: noise(1.1) },
      { inputSize: 5000,  runtime: noise(3000.0), memory: noise(1.2) },
      { inputSize: 10000, runtime: noise(12000.0),memory: noise(1.3) },
    ],
  },
  {
    label: "Binary Search Sort",
    timestamp: "2025-04-28 09:00",
    data: [
      { inputSize: 100,   runtime: noise(0.5),  memory: noise(1.5) },
      { inputSize: 500,   runtime: noise(2.5),  memory: noise(2.8) },
      { inputSize: 1000,  runtime: noise(5.2),  memory: noise(4.2) },
      { inputSize: 2000,  runtime: noise(10.6), memory: noise(6.5) },
      { inputSize: 5000,  runtime: noise(28.0), memory: noise(10.8) },
      { inputSize: 10000, runtime: noise(58.5), memory: noise(16.5) },
      { inputSize: 20000, runtime: noise(121.0),memory: noise(24.3) },
    ],
  },
];

// ─── Distribution: 2000 simulated user runtimes (right-skewed) ───────────────

function generateDistribution(n = 2000) {
  const dist = [];
  for (let i = 0; i < n; i++) {
    // Most users between 80-200ms, some fast (<80ms), some slow (>200ms)
    const u = Math.random();
    let v;
    if (u < 0.1)       v = 40 + Math.random() * 40;           // fast: 40-80ms (10%)
    else if (u < 0.55) v = 80 + Math.random() * 60;           // avg: 80-140ms (45%)
    else if (u < 0.80) v = 140 + Math.random() * 80;          // above avg: 140-220ms (25%)
    else if (u < 0.93) v = 220 + Math.random() * 120;         // slow: 220-340ms (13%)
    else               v = 340 + Math.random() * 200;         // very slow: 340-540ms (7%)
    dist.push(Math.round(v * 10) / 10);
  }
  return dist;
}

export const distributionData = generateDistribution(2000);

// ─── Linear example (for testing O(n) detection) ─────────────────────────────

export const linearSubmission = [
  {
    label: "Linear scan",
    timestamp: "2025-05-01 16:00",
    data: [100, 500, 1000, 2000, 5000, 10000, 20000].map(n => ({
      inputSize: n,
      runtime: noise(n * 0.012),
      memory: noise(n * 0.0008 + 1.0),
    })),
  },
];

// ─── Constant example (O(1) hash lookup) ─────────────────────────────────────

export const constantSubmission = [
  {
    label: "Hash lookup",
    timestamp: "2025-05-01 12:00",
    data: [100, 500, 1000, 5000, 10000, 50000, 100000].map(n => ({
      inputSize: n,
      runtime: noise(2.5, 0.15),
      memory: noise(8.0, 0.05),
    })),
  },
];
