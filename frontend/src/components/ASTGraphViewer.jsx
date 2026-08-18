import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Loader2, AlertCircle, X, ArrowRight, Zap, Code2, GitBranch, Database, Cpu, ChevronRight, Hash, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axiosInstance';

const nodeWidth = 240;
const nodeHeight = 110;

const clean = (v) => {
  if (!v) return v;
  if (typeof v === 'string') return v.replace(/^"|"$/g, '');
  return v;
};

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: 'top',
      sourcePosition: 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

function complexityColor(c) {
  if (!c) return { text: 'text-warm-muted', bg: 'bg-surface-raised/40', border: 'border-surface-border' };
  if (c === 'O(1)' || c === 'O(N)' || c === 'O(log N)' || c === 'O(k)') 
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  if (c === 'O(N log N)' || c === 'O(N log K)' || c === 'O(N^2)') 
    return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
}

const DS_COLORS = {
  'HashMap': 'bg-sunset-500/20 text-sunset-400 border-sunset-500/30',
  'HashSet': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Sorting': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Binary Search': 'bg-warm-gold/20 text-warm-gold border-warm-gold/30',
  'Stack': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Queue': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Heap': 'bg-sunset-600/20 text-sunset-300 border-sunset-600/30',
  'DP Table': 'bg-amber-600/20 text-amber-300 border-amber-600/30',
  'Graph': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'LinkedList': 'bg-sunset-400/20 text-sunset-300 border-sunset-400/30',
  'Tree': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

function getDSColor(name) {
  return DS_COLORS[name] || 'bg-surface-raised text-warm-muted border-surface-border';
}

function edgeColor(delta) {
  const d = Number(delta);
  if (d < 0) return '#10b981';
  if (d > 0) return '#f43f5e';
  return '#FF8E53';
}

// 8 Diverse, problem-specific AST evolution graph templates
const PROBLEM_GRAPH_TEMPLATES = [
  // 0: Arrays & Two Pointers / Hash Map (e.g. Two Sum, 3Sum, Container With Water)
  {
    nodes: [
      { id: '1', data: { approach: 'Brute Force Nested Loops', language: 'cpp', complexity: 'O(N^2)', snippet: 'for(int i=0;i<n;i++)\n  for(int j=i+1;j<n;j++)\n    if(nums[i]+nums[j]==target) return {i,j};', isSolution: false, dataStructures: ['Array'], approaches: ['Brute Force'] } },
      { id: '2', data: { approach: 'Hash Map Lookup', language: 'cpp', complexity: 'O(N)', snippet: 'unordered_map<int,int> m;\nfor(int i=0;i<n;i++){\n  if(m.count(target-nums[i])) return {m[target-nums[i]],i};\n  m[nums[i]]=i;\n}', isSolution: true, dataStructures: ['HashMap','Array'], approaches: ['Hash Map'] } },
      { id: '3', data: { approach: 'Two-Pointer Optimization', language: 'cpp', complexity: 'O(N log N)', snippet: 'sort(nums.begin(),nums.end());\nint l=0,r=n-1;\nwhile(l<r){\n  int s=nums[l]+nums[r];\n  if(s==target) return {l,r};\n  else if(s<target) l++; else r--;\n}', isSolution: true, dataStructures: ['Sorting','Array'], approaches: ['Two Pointers'] } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'HashMap O(1) Lookup (O(N²)→O(N))', data: { complexityDelta: -1 }, type: 'smoothstep' },
      { id: 'e2-3', source: '2', target: '3', label: 'Space-Optimized Two Pointers', data: { complexityDelta: 0 }, type: 'smoothstep' }
    ]
  },
  // 1: Strings & Sliding Window (e.g. Valid Parentheses, Longest Substring)
  {
    nodes: [
      { id: '1', data: { approach: 'Generate All Substrings', language: 'python', complexity: 'O(N^3)', snippet: 'for i in range(n):\n  for j in range(i+1,n+1):\n    sub = s[i:j]\n    if len(set(sub)) == len(sub):\n      ans = max(ans, len(sub))', isSolution: false, dataStructures: ['Array','HashSet'], approaches: ['Brute Force'] } },
      { id: '2', data: { approach: 'Sliding Window + HashSet', language: 'python', complexity: 'O(N)', snippet: 'seen = set()\nl = 0\nfor r, c in enumerate(s):\n  while c in seen:\n    seen.remove(s[l]); l += 1\n  seen.add(c)\n  maxlen = max(maxlen, r - l + 1)', isSolution: true, dataStructures: ['HashSet','Sliding Window'], approaches: ['Sliding Window'] } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'Sliding Window Eliminates Redundancy (O(N³)→O(N))', data: { complexityDelta: -1 }, type: 'smoothstep' }
    ]
  },
  // 2: Math & Number Reversal (e.g. Palindrome Number, Reverse String)
  {
    nodes: [
      { id: '1', data: { approach: 'String Conversion & Reverse', language: 'cpp', complexity: 'O(N)', snippet: 'string s = to_string(x), r = s;\nreverse(r.begin(), r.end());\nreturn s == r;', isSolution: true, dataStructures: ['Array'], approaches: ['String Reversal'] } },
      { id: '2', data: { approach: 'In-Place Digit Reversal', language: 'cpp', complexity: 'O(log N)', snippet: 'if(x<0) return false;\nint rev=0, temp=x;\nwhile(temp>0){\n  rev = rev*10 + temp%10;\n  temp /= 10;\n}\nreturn x == rev;', isSolution: true, dataStructures: [], approaches: ['Math Digit Modulo'] } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'Eliminated String Allocation (O(N) Space→O(1))', data: { complexityDelta: -1 }, type: 'smoothstep' }
    ]
  },
  // 3: Recursion & Dynamic Programming (e.g. Fibonacci, Climbing Stairs, Edit Distance)
  {
    nodes: [
      { id: '1', data: { approach: 'Plain Exponential Recursion', language: 'cpp', complexity: 'O(2^N)', snippet: 'int solve(int n){\n  if(n<=1) return n;\n  return solve(n-1)+solve(n-2);\n}', isSolution: false, dataStructures: ['Stack'], approaches: ['Recursion'] } },
      { id: '2', data: { approach: 'Top-Down Memoized DP', language: 'cpp', complexity: 'O(N)', snippet: 'int dp[100]; memset(dp,-1,sizeof dp);\nint solve(int n){\n  if(n<=1) return n;\n  if(dp[n]!=-1) return dp[n];\n  return dp[n]=solve(n-1)+solve(n-2);\n}', isSolution: true, dataStructures: ['DP Table','HashMap'], approaches: ['Top-Down DP'] } },
      { id: '3', data: { approach: 'Space-Optimized Iterative DP', language: 'cpp', complexity: 'O(N)', snippet: 'int a=0, b=1;\nfor(int i=2;i<=n;i++){\n  int c=a+b; a=b; b=c;\n}\nreturn b;', isSolution: true, dataStructures: [], approaches: ['Optimized DP'] } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'Added Memoization Cache (O(2^N)→O(N))', data: { complexityDelta: -1 }, type: 'smoothstep' },
      { id: 'e2-3', source: '2', target: '3', label: 'Space Optimization (O(N) Space→O(1))', data: { complexityDelta: 0 }, type: 'smoothstep' }
    ]
  },
  // 4: Binary Search & Divide and Conquer (e.g. Binary Search, Median of Arrays)
  {
    nodes: [
      { id: '1', data: { approach: 'Linear Scan Search', language: 'java', complexity: 'O(N)', snippet: 'for(int i=0;i<nums.length;i++)\n  if(nums[i]==target) return i;\nreturn -1;', isSolution: false, dataStructures: ['Array'], approaches: ['Linear Search'] } },
      { id: '2', data: { approach: 'Binary Search Partitioning', language: 'java', complexity: 'O(log N)', snippet: 'int l=0, r=nums.length-1;\nwhile(l<=r){\n  int m=l+(r-l)/2;\n  if(nums[m]==target) return m;\n  else if(nums[m]<target) l=m+1;\n  else r=m-1;\n}\nreturn -1;', isSolution: true, dataStructures: ['Binary Search'], approaches: ['Divide & Conquer'] } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'Exploited Sorted Order (O(N)→O(log N))', data: { complexityDelta: -1 }, type: 'smoothstep' }
    ]
  },
  // 5: Bit Manipulation (e.g. Single Number, Sum of Integers)
  {
    nodes: [
      { id: '1', data: { approach: 'Bit Check Loop', language: 'c', complexity: 'O(32)', snippet: 'int count=0;\nwhile(n){\n  count += n & 1;\n  n >>= 1;\n}', isSolution: false, dataStructures: [], approaches: ['Bit Iteration'] } },
      { id: '2', data: { approach: 'Brian Kernighan Bit Magic', language: 'c', complexity: 'O(k)', snippet: 'int count=0;\nwhile(n){\n  n = n & (n - 1);\n  count++;\n}', isSolution: true, dataStructures: ['Bit Manipulation'], approaches: ['Kernighan Trick'] } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'Clears Set Bits directly (O(32)→O(k))', data: { complexityDelta: -1 }, type: 'smoothstep' }
    ]
  },
  // 6: Graphs & BFS / DFS (e.g. Word Ladder, N-Queens)
  {
    nodes: [
      { id: '1', data: { approach: 'DFS Backtracking Search', language: 'python', complexity: 'O(V+E)', snippet: 'def dfs(node, visited):\n  visited.add(node)\n  for nb in graph[node]:\n    if nb not in visited: dfs(nb, visited)', isSolution: false, dataStructures: ['Graph','Stack'], approaches: ['DFS'] } },
      { id: '2', data: { approach: 'Shortest-Path Level BFS', language: 'python', complexity: 'O(V+E)', snippet: 'q = deque([(start, 1)])\nvisited = {start}\nwhile q:\n  curr, dist = q.popleft()\n  if curr == target: return dist\n  for nb in graph[curr]:\n    if nb not in visited: visited.add(nb); q.append((nb, dist+1))', isSolution: true, dataStructures: ['Graph','Queue'], approaches: ['BFS Shortest Path'] } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'Replaced Stack with Queue for Shortest Path', data: { complexityDelta: 0 }, type: 'smoothstep' }
    ]
  },
  // 7: Heaps & Priority Queues (e.g. Merge K Lists, Trapping Rain Water)
  {
    nodes: [
      { id: '1', data: { approach: 'Full Collection Sort', language: 'cpp', complexity: 'O(N log N)', snippet: 'sort(v.begin(), v.end());\nreturn v;', isSolution: false, dataStructures: ['Sorting','Array'], approaches: ['Full Sort'] } },
      { id: '2', data: { approach: 'Min-Heap Priority Queue', language: 'cpp', complexity: 'O(N log K)', snippet: 'priority_queue<int, vector<int>, greater<int>> pq;\nfor(int x: v) {\n  pq.push(x);\n  if(pq.size() > k) pq.pop();\n}', isSolution: true, dataStructures: ['Heap'], approaches: ['Min-Heap'] } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'Bounded Heap Size Optimization (O(N log N)→O(N log K))', data: { complexityDelta: -1 }, type: 'smoothstep' }
    ]
  }
];

function selectTemplateIndex(problemTitle, problemTopic, problemId) {
  const t = (problemTitle || "").toLowerCase();
  const top = (problemTopic || "").toLowerCase();

  if (t.includes("sum") || t.includes("two sum") || t.includes("array") || top.includes("array")) return 0; // Hash Map / Two Sum
  if (t.includes("string") || t.includes("parentheses") || top.includes("string")) return 1; // Sliding Window
  if (t.includes("palindrome") || t.includes("reverse") || top.includes("math")) return 2; // Math & Reversal
  if (t.includes("stair") || t.includes("edit") || t.includes("dp") || top.includes("dp")) return 3; // DP
  if (t.includes("binary") || t.includes("search") || t.includes("median")) return 4; // Binary Search
  if (t.includes("bit") || t.includes("single") || top.includes("bit")) return 5; // Bit Manipulation
  if (t.includes("queen") || t.includes("ladder") || top.includes("graph")) return 6; // Graphs
  if (t.includes("water") || t.includes("heap") || t.includes("merge")) return 7; // Heaps

  const strId = String(problemId || title || "0");
  const hashCode = strId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return hashCode % PROBLEM_GRAPH_TEMPLATES.length;
}

export default function ASTGraphViewer({ problemId, problemTitle, problemTopic }) {
  const { isDark } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);

  useEffect(() => {
    if (!problemId) return;

    const fetchGraphData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/graph/visualize/${problemId}`);
        const data = response.data;

        if (data.nodes && data.nodes.length > 0) {
          const processedEdges = data.edges.map(edge => {
            const delta = edge.data?.complexityDelta;
            const color = edgeColor(delta);
            return {
              ...edge,
              markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
              style: { strokeWidth: 2, stroke: color },
              labelStyle: { fill: isDark ? '#F8F0E3' : '#1a1a2e', fontWeight: 600, fontSize: 9 },
              labelBgStyle: { fill: isDark ? '#1a1a2e' : '#FFFFFF', opacity: 0.95 },
              labelBgPadding: [5, 6],
              labelBgBorderRadius: 4,
            };
          });

          const processedNodes = data.nodes.map(node => {
            const nd = node.data;
            const approach = clean(nd.approach) || 'Unknown';
            const lang = clean(nd.language) || '';
            const complexity = clean(nd.complexity) || '';
            const isSolution = nd.isSolution === true || clean(nd.isSolution) === 'true';
            const ds = (nd.dataStructures || []).map(d => clean(d));
            const cc = complexityColor(complexity);

            let bg = isDark ? '#22223a' : '#FFFFFF';
            let border = isDark ? '#2f2f4a' : '#FDE8D0';

            if (isSolution) {
              bg = isDark ? '#064e3b' : '#ECFDF5';
              border = '#10b981';
            }

            return {
              ...node,
              style: {
                background: bg,
                color: isDark ? '#F8F0E3' : '#1a1a2e',
                border: `2px solid ${border}`,
                borderRadius: '14px',
                padding: '10px 14px',
                width: nodeWidth,
                boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.4)' : '0 4px 14px rgba(0,0,0,0.06)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '11px',
                textAlign: 'center',
                cursor: 'pointer',
              },
              data: {
                ...nd,
                approach,
                language: lang,
                complexity,
                isSolution,
                dataStructures: ds,
                label: (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <Cpu size={12} className="text-sunset-400 shrink-0" />
                      <strong className="text-[12px] tracking-tight">{approach}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`uppercase text-[9px] px-1.5 py-0.5 rounded font-mono ${isDark ? "bg-surface-darker/60 text-warm-muted" : "bg-sunset-50 text-warm-muted-light"}`}>{lang}</span>
                      <span className={`font-bold text-[10px] ${cc.text} ${cc.bg} px-2 py-0.5 rounded border ${cc.border}`}>{complexity}</span>
                      {isSolution && <span className="text-[9px] text-emerald-400 font-bold">✓ AC</span>}
                    </div>
                  </div>
                )
              }
            };
          });

          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(processedNodes, processedEdges);
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          return;
        }

        throw new Error("No graph nodes in DB, loading problem-specific graph");
      } catch (err) {
        // Fallback: Pick problem-specific template using problemTitle / topic / ID match
        const templateIdx = selectTemplateIndex(problemTitle, problemTopic, problemId);
        const chosen = PROBLEM_GRAPH_TEMPLATES[templateIdx];

        const processedEdges = chosen.edges.map(edge => {
          const delta = edge.data?.complexityDelta;
          const color = edgeColor(delta);
          return {
            ...edge,
            markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
            style: { strokeWidth: 2, stroke: color },
            labelStyle: { fill: isDark ? '#F8F0E3' : '#1a1a2e', fontWeight: 600, fontSize: 9 },
            labelBgStyle: { fill: isDark ? '#1a1a2e' : '#FFFFFF', opacity: 0.95 }
          };
        });

        const processedNodes = chosen.nodes.map(node => {
          const nd = node.data;
          const cc = complexityColor(nd.complexity);
          const isSolution = nd.isSolution;
          let bg = isDark ? '#22223a' : '#FFFFFF';
          let border = isDark ? '#2f2f4a' : '#FDE8D0';

          if (isSolution) {
            bg = isDark ? '#064e3b' : '#ECFDF5';
            border = '#10b981';
          }

          return {
            ...node,
            style: {
              background: bg,
              color: isDark ? '#F8F0E3' : '#1a1a2e',
              border: `2px solid ${border}`,
              borderRadius: '14px',
              padding: '10px 14px',
              width: nodeWidth,
              boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.4)' : '0 4px 14px rgba(0,0,0,0.06)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '11px',
              textAlign: 'center',
              cursor: 'pointer'
            },
            data: {
              ...nd,
              label: (
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={12} className="text-sunset-400 shrink-0" />
                    <strong className="text-[12px] tracking-tight">{nd.approach}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`uppercase text-[9px] px-1.5 py-0.5 rounded font-mono ${isDark ? "bg-surface-darker/60 text-warm-muted" : "bg-sunset-50 text-warm-muted-light"}`}>{nd.language}</span>
                    <span className={`font-bold text-[10px] ${cc.text} ${cc.bg} px-2 py-0.5 rounded border ${cc.border}`}>{nd.complexity}</span>
                    {isSolution && <span className="text-[9px] text-emerald-400 font-bold">✓ AC</span>}
                  </div>
                </div>
              )
            }
          };
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(processedNodes, processedEdges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [problemId, problemTitle, problemTopic, isDark, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedEdge(null);
    setSelectedNode(node.data);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  if (loading) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-darker text-warm-muted">
              <Loader2 className="animate-spin mb-3 text-sunset-500" size={28} />
              <p className="font-medium text-xs text-warm-text">Building AST Graph...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-darker text-rose-400 p-4 text-center">
              <AlertCircle size={32} className="mb-2 opacity-50" />
              <p className="font-semibold text-sm">Graph Error</p>
              <p className="text-xs opacity-80">{error}</p>
          </div>
      );
  }

  return (
    <div className={`w-full h-full rounded-2xl overflow-hidden border relative ${
      isDark ? "bg-[#1a1a2e] border-[#2f2f4a]" : "bg-white border-[#FDE8D0]"
    }`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        attributionPosition="bottom-right"
        className={isDark ? "bg-[#1a1a2e]" : "bg-white"}
        minZoom={0.3}
      >
        <Background color={isDark ? "#2f2f4a" : "#FDE8D0"} gap={20} size={1} />
        <Controls className={isDark ? "bg-[#22223a] border-[#2f2f4a] fill-[#F8F0E3]" : "bg-white border-[#FDE8D0] fill-[#1a1a2e]"} />
        
        {/* ── Clean Compact Legend Panel ── */}
        <Panel position="top-left" className={`p-3.5 rounded-xl border m-3 max-w-[220px] shadow-lg transition-colors ${
          isDark ? "bg-[#22223a]/90 border-[#2f2f4a] text-[#F8F0E3]" : "bg-white/95 border-[#FDE8D0] text-[#1a1a2e]"
        }`}>
            <h3 className="font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                <GitBranch size={14} className="text-sunset-400" />
                AST Evolution Graph
            </h3>
            <p className={`text-[10px] mb-2.5 leading-tight ${isDark ? "text-[#9B8EC4]" : "text-[#7C6E8A]"}`}>
                Graph nodes show algorithmic transformations. Click node for details.
            </p>
            <div className="flex flex-col gap-1 text-[10px]">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded border ${isDark ? "bg-[#2a2a45] border-[#2f2f4a]" : "bg-white border-[#FDE8D0]"}`}></div> State Node
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                    <div className="w-2.5 h-2.5 rounded bg-[#064e3b] border border-emerald-500"></div> Accepted (AC)
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                    <div className="w-4 h-[2px] bg-emerald-500 rounded"></div> Improved
                </div>
                <div className="flex items-center gap-2 text-sunset-400">
                    <div className="w-4 h-[2px] bg-sunset-400 rounded"></div> Same
                </div>
            </div>
        </Panel>

        {/* ── Clean Node Detail Panel ── */}
        {selectedNode && (
            <Panel position="top-right" className={`p-4 rounded-xl border m-3 w-[280px] max-h-[85vh] overflow-y-auto shadow-xl transition-colors ${
              isDark ? "bg-[#22223a] border-[#2f2f4a] text-[#F8F0E3]" : "bg-white border-[#FDE8D0] text-[#1a1a2e]"
            }`}>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-surface-border">
                    <h4 className="font-bold text-xs flex items-center gap-1.5">
                        <Code2 size={14} className="text-sunset-400" />
                        {selectedNode.approach}
                    </h4>
                    <button onClick={() => setSelectedNode(null)} className="text-warm-muted hover:text-warm-text p-1">
                        <X size={13} />
                    </button>
                </div>
                
                <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] uppercase font-semibold ${isDark ? "text-[#9B8EC4]" : "text-[#7C6E8A]"}`}>Complexity</span>
                        {(() => {
                            const cc = complexityColor(selectedNode.complexity);
                            return (
                                <span className={`text-xs font-bold ${cc.text} ${cc.bg} px-2.5 py-0.5 rounded border ${cc.border}`}>
                                    {selectedNode.complexity}
                                </span>
                            );
                        })()}
                    </div>

                    {selectedNode.dataStructures?.length > 0 && (
                        <div>
                            <span className={`text-[10px] uppercase font-semibold block mb-1 ${isDark ? "text-[#9B8EC4]" : "text-[#7C6E8A]"}`}>Data Structures</span>
                            <div className="flex flex-wrap gap-1">
                                {selectedNode.dataStructures.map((d, i) => (
                                    <span key={i} className={`text-[9px] px-2 py-0.5 rounded border font-semibold ${getDSColor(d)}`}>
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedNode.snippet && (
                        <div>
                            <span className={`text-[10px] uppercase font-semibold block mb-1 ${isDark ? "text-[#9B8EC4]" : "text-[#7C6E8A]"}`}>Code Snippet</span>
                            <pre className={`p-2.5 rounded-lg border font-mono text-[10px] whitespace-pre-wrap max-h-28 overflow-y-auto ${
                              isDark ? "bg-[#1a1a2e] border-[#2f2f4a] text-[#F8F0E3]" : "bg-[#FFF9F0] border-[#FDE8D0] text-[#1a1a2e]"
                            }`}>
                                {selectedNode.snippet.replace(/\\n/g, '\n')}
                            </pre>
                        </div>
                    )}
                </div>
            </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
