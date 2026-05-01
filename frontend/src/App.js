import { useState } from "react";
import PerformanceAnalyzer from "./PerformanceAnalyzer";
import ActivityCalendar from "./ActivityCalendar";
import { multiSubmission, distributionData } from "./mockData";

// Change this to your actual server URL
const API_BASE = "http://localhost:5000";

export default function App() {
  const [tab, setTab] = useState("analyzer"); // "analyzer" | "activity"
  const [code, setCode] = useState(
`#include<iostream>
#include<vector>
#include<algorithm>
using namespace std;
int main(){
    int n; cin>>n;
    vector<int> a(n);
    for(int i=0;i<n;i++) cin>>a[i];
    sort(a.begin(), a.end());
    cout<<a[n-1];
}`
  );
  const [language, setLanguage] = useState("cpp");
  const [inputType, setInputType] = useState("array");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submissionData, setSubmissionData] = useState(null);
  const [useMockData, setUseMockData] = useState(true);

  // ── Fetch real benchmark data from your server ──────────────────────────────
  async function runBenchmark() {
    setLoading(true);
    setError(null);
    setUseMockData(false);

    try {
      const response = await fetch(`${API_BASE}/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          inputGenerator: inputType,
          inputSizes: [100, 500, 1000, 2000, 5000, 10000, 20000],
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const result = await response.json();

      if (!result.dataPoints || result.dataPoints.length < 2) {
        throw new Error("Not enough data points returned. Check your code handles the input format.");
      }

      // Shape it for PerformanceAnalyzer
      setSubmissionData([{
        label: `${language.toUpperCase()} submission`,
        timestamp: new Date().toLocaleString(),
        data: result.dataPoints,
      }]);

    } catch (err) {
      setError(err.message);
      setUseMockData(true); // fall back to mock
    } finally {
      setLoading(false);
    }
  }

  const displayData = useMockData ? multiSubmission : submissionData;

  return (
    <div style={{
      maxWidth: 860, margin: "0 auto", padding: "32px 20px",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Navigation */}
      <div style={{ display: "flex", gap: 0, marginBottom: 32, borderBottom: "1px solid #e5e5e5" }}>
        {["analyzer", "activity"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", border: "none", background: "transparent",
            borderBottom: tab === t ? "2px solid #378ADD" : "2px solid transparent",
            color: tab === t ? "#378ADD" : "#888", cursor: "pointer",
            fontSize: 14, fontWeight: tab === t ? 500 : 400,
            textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {/* Performance Analyzer tab */}
      {tab === "analyzer" && (
        <div>
          {/* Code input panel */}
          <div style={{ marginBottom: 24, padding: 20, border: "1px solid #e5e5e5", borderRadius: 10 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
              >
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
              <select
                value={inputType}
                onChange={e => setInputType(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
              >
                <option value="array">Array input (n + n numbers)</option>
                <option value="number">Number input (just n)</option>
              </select>
              <button
                onClick={runBenchmark}
                disabled={loading}
                style={{
                  padding: "7px 18px", borderRadius: 6,
                  background: loading ? "#ccc" : "#378ADD",
                  color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 500,
                }}
              >
                {loading ? "Running benchmarks..." : "Run Benchmark"}
              </button>
              <button
                onClick={() => { setUseMockData(true); setSubmissionData(null); }}
                style={{
                  padding: "7px 14px", borderRadius: 6,
                  background: "transparent", border: "1px solid #ddd",
                  cursor: "pointer", fontSize: 13, color: "#666",
                }}
              >
                Load demo data
              </button>
            </div>

            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              style={{
                width: "100%", height: 180, fontFamily: "monospace", fontSize: 13,
                padding: 12, border: "1px solid #e5e5e5", borderRadius: 6,
                resize: "vertical", boxSizing: "border-box", background: "#fafafa",
              }}
            />

            {error && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "#FCEBEB", borderRadius: 6, fontSize: 13, color: "#A32D2D" }}>
                {error}
              </div>
            )}

            {useMockData && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#999" }}>
                Showing demo data — click "Run Benchmark" to analyze your code
              </p>
            )}
          </div>

          {/* The actual graph component */}
          <PerformanceAnalyzer
            submissions={displayData}
            distributionData={distributionData}
            showPredictions={true}
          />
        </div>
      )}

      {/* Activity Calendar tab */}
      {tab === "activity" && (
        <ActivityCalendar
          userId="demo-user-001"
          apiBase={API_BASE}
        />
      )}
    </div>
  );
}