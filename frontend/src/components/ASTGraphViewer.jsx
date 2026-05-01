import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import api from '../api/axiosInstance';

const nodeWidth = 260;
const nodeHeight = 120;

// Clean AGE agtype double-quotes that leak through from the backend
const clean = (v) => {
  if (!v) return v;
  if (typeof v === 'string') return v.replace(/^"|"$/g, '');
  return v;
};

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });

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

// Complexity color: green = fast, amber = medium, red = slow
function complexityColor(c) {
  if (!c) return { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
  if (c === 'O(1)' || c === 'O(N)') return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  if (c === 'O(N^2)') return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
}

// Data structure badge colors
const DS_COLORS = {
  'HashMap': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'HashSet': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'Sorting': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Binary Search': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Stack': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Queue': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'Heap': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'DP Table': 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  'Graph': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'LinkedList': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'Tree': 'bg-lime-500/20 text-lime-300 border-lime-500/30',
};

function getDSColor(name) {
  return DS_COLORS[name] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}

// Edge color based on complexity delta
function edgeColor(delta) {
  const d = Number(delta);
  if (d < 0) return '#10b981'; // improved (green)
  if (d > 0) return '#f43f5e'; // worsened (red)
  return '#8b5cf6'; // same (purple)
}

export default function ASTGraphViewer({ problemId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [showCode, setShowCode] = useState(false);
  const [codeIdx, setCodeIdx] = useState(0);

  useEffect(() => {
    if (!problemId) return;

    const fetchGraphData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/graph/visualize/${problemId}`);
        const data = response.data;

        if (data.timeline) setTimeline(data.timeline);

        // Process edges with transformation labels and color-coding
        const processedEdges = data.edges.map(edge => {
            const delta = edge.data?.complexityDelta;
            const color = edgeColor(delta);
            return {
                ...edge,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 15,
                  height: 15,
                  color,
                },
                style: { strokeWidth: 2.5, stroke: color },
                labelStyle: { fill: '#e2e8f0', fontWeight: 700, fontSize: 10 },
                labelBgStyle: { fill: '#0f172a', opacity: 0.95 },
                labelBgPadding: [6, 8],
                labelBgBorderRadius: 6,
            };
        });

        // Process nodes with rich approach-based styling
        const processedNodes = data.nodes.map(node => {
           const nd = node.data;
           // Clean all string values from AGE agtype quotes
           const approach = clean(nd.approach) || 'Unknown';
           const lang = clean(nd.language) || '';
           const complexity = clean(nd.complexity) || '';
           const snippet = clean(nd.snippet) || '';
           const hash = clean(nd.hash) || '';
           const isSolution = nd.isSolution === true || clean(nd.isSolution) === 'true';
           const ds = (nd.dataStructures || []).map(d => clean(d));
           const approaches = (nd.approaches || []).map(a => clean(a));
           
           const cc = complexityColor(complexity);
           
           let gradientBg = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
           let borderColor = '#334155';
           let shadow = '0 4px 20px rgba(0,0,0,0.3)';

           if (isSolution) {
               gradientBg = 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)';
               borderColor = '#10b981';
               shadow = '0 4px 25px rgba(16, 185, 129, 0.25)';
           }

           return {
               ...node,
               style: {
                   background: gradientBg,
                   color: '#f8fafc',
                   border: `2px solid ${borderColor}`,
                   borderRadius: '14px',
                   padding: '12px 16px',
                   width: nodeWidth,
                   boxShadow: shadow,
                   fontFamily: "'Inter', 'Segoe UI', sans-serif",
                   fontSize: '12px',
                   textAlign: 'center',
                   cursor: 'pointer',
               },
               data: {
                   ...node.data,
                   approach,
                   language: lang,
                   complexity,
                   snippet,
                   hash,
                   isSolution,
                   dataStructures: ds,
                   approaches,
                   label: (
                       <div className="flex flex-col items-center justify-center gap-1.5">
                           {/* Approach name as primary label */}
                           <div className="flex items-center gap-1.5">
                               <Cpu size={12} className="text-violet-400 shrink-0" />
                               <strong className="text-[13px] tracking-tight leading-tight">{approach}</strong>
                           </div>
                           
                           {/* Complexity badge */}
                           <div className="flex items-center gap-2">
                               <span className="uppercase text-[9px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">{lang}</span>
                               <span className={`font-bold text-[11px] ${cc.text} ${cc.bg} px-2 py-0.5 rounded border ${cc.border}`}>
                                   {complexity}
                               </span>
                               {isSolution && (
                                   <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                                       <Zap size={9} /> AC
                                   </span>
                               )}
                           </div>
                           
                           {/* Data structure badges */}
                           {ds.length > 0 && (
                               <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5">
                                   {ds.slice(0, 3).map((d, i) => (
                                       <span key={i} className={`text-[8px] px-1.5 py-0.5 rounded-full border font-semibold ${getDSColor(d)}`}>
                                           {d}
                                       </span>
                                   ))}
                                   {ds.length > 3 && <span className="text-[8px] text-slate-500">+{ds.length - 3}</span>}
                               </div>
                           )}
                       </div>
                   )
               }
           };
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          processedNodes,
          processedEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      } catch (err) {
        console.error("Failed to load graph data", err);
        setError("Failed to load graph data. Ensure the backend is running and has processed submissions.");
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [problemId, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedEdge(null);
    setSelectedNode(node.data);
    setShowCode(false);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
    setShowCode(false);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setShowCode(false);
  }, []);

  if (loading) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400">
              <Loader2 className="animate-spin mb-4 text-violet-500" size={32} />
              <p className="font-medium">Analyzing AST Evolution...</p>
              <p className="text-xs text-slate-600 mt-1">Building code structure graph</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-rose-400 p-6 text-center">
              <AlertCircle size={48} className="mb-4 opacity-50" />
              <p className="font-semibold text-lg mb-2">Graph Visualization Error</p>
              <p className="text-sm opacity-80">{error}</p>
          </div>
      );
  }

  return (
    <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
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
        className="bg-slate-950"
        minZoom={0.2}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
        
        {/* ── Legend Panel ── */}
        <Panel position="top-left" className="bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-700/50 m-3 shadow-2xl max-w-[260px]">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-[13px]">
                <GitBranch size={15} className="text-violet-400" />
                Code Evolution Graph
            </h3>
            <p className="text-slate-400 text-[10px] mb-3 leading-relaxed">
                Each node represents a unique algorithmic approach with its data structures and complexity.
                Edges show how code was transformed between approaches. Click for details.
            </p>
            <div className="flex flex-col gap-1.5 text-[10px]">
                <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-3 h-3 rounded bg-[#1e293b] border border-slate-500"></div> Code State
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                    <div className="w-3 h-3 rounded bg-[#064e3b] border border-emerald-500"></div> Accepted
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                    <div className="w-5 h-[2px] bg-emerald-500 rounded"></div> Improved
                </div>
                <div className="flex items-center gap-2 text-violet-400">
                    <div className="w-5 h-[2px] bg-violet-500 rounded"></div> Same Complexity
                </div>
                <div className="flex items-center gap-2 text-rose-400">
                    <div className="w-5 h-[2px] bg-rose-500 rounded"></div> Worsened
                </div>
            </div>
        </Panel>

        {/* ── Node Detail Panel ── */}
        {selectedNode && (
            <Panel position="top-right" className="bg-slate-900/98 backdrop-blur-md rounded-xl border border-slate-700/50 m-3 shadow-2xl w-[320px] max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white font-bold text-sm flex items-center gap-2">
                            <Code2 size={16} className="text-violet-400" />
                            {selectedNode.approach || selectedNode.label}
                        </h4>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white transition p-1 rounded hover:bg-slate-800">
                            <X size={14} />
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-500">State #{selectedNode.stateNumber} • {selectedNode.language?.toUpperCase()}</p>
                </div>
                
                <div className="p-4 space-y-3">
                    {/* Approach */}
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Algorithm Approach</span>
                        <p className="mt-1 text-sm text-violet-300 font-bold">{selectedNode.approach}</p>
                        {selectedNode.approaches?.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {selectedNode.approaches.slice(1).map((a, i) => (
                                    <span key={i} className="text-[9px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20">{a}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Data Structures */}
                    {selectedNode.dataStructures?.length > 0 && (
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                                <Database size={10} /> Data Structures Used
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {selectedNode.dataStructures.map((d, i) => (
                                    <span key={i} className={`text-[10px] px-2 py-1 rounded-lg border font-semibold ${getDSColor(d)}`}>
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Complexity */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Time Complexity</span>
                        {(() => {
                            const cc = complexityColor(selectedNode.complexity);
                            return (
                                <span className={`text-sm font-bold ${cc.text} ${cc.bg} px-3 py-1 rounded-lg border ${cc.border}`}>
                                    {selectedNode.complexity}
                                </span>
                            );
                        })()}
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Verdict</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${selectedNode.isSolution ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'}`}>
                            {selectedNode.isSolution ? '✓ Accepted' : '✗ Not Accepted'}
                        </span>
                    </div>

                    {/* Code Preview */}
                    {selectedNode.snippet && (
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Code Preview</span>
                            <pre className="mt-1 text-[10px] text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-32 overflow-y-auto">
                                {selectedNode.snippet.replace(/\\n/g, '\n')}
                            </pre>
                        </div>
                    )}

                    {/* Hash */}
                    {selectedNode.hash && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <span className="text-[9px] text-slate-600 flex items-center gap-1"><Hash size={9} /> AST Hash</span>
                            <span className="text-slate-600 font-mono text-[9px]">{selectedNode.hash?.slice(0, 16)}</span>
                        </div>
                    )}
                </div>
            </Panel>
        )}

        {/* ── Edge Detail Panel ── */}
        {selectedEdge && (
            <Panel position="top-right" className="bg-slate-900/98 backdrop-blur-md rounded-xl border border-violet-700/30 m-3 shadow-2xl w-[320px] max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white font-bold text-sm flex items-center gap-2">
                            <ArrowRight size={16} className="text-violet-400" />
                            Transformation Details
                        </h4>
                        <button onClick={() => setSelectedEdge(null)} className="text-slate-500 hover:text-white transition p-1 rounded hover:bg-slate-800">
                            <X size={14} />
                        </button>
                    </div>
                </div>
                
                <div className="p-4 space-y-3">
                    {/* Transformation labels */}
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">What Changed</span>
                        <div className="mt-1.5 space-y-1.5">
                            {(selectedEdge.data?.labels || [selectedEdge.label]).map((l, i) => (
                                <div key={i} className="flex items-center gap-2 bg-violet-500/10 p-2.5 rounded-lg border border-violet-500/20">
                                    <ChevronRight size={12} className="text-violet-400 shrink-0" />
                                    <span className="text-violet-300 font-semibold text-xs">{l}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        {selectedEdge.data?.distance != null && (
                            <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Edit Distance</span>
                                <span className="text-amber-400 font-bold text-lg">{selectedEdge.data.distance}</span>
                                <span className="text-[8px] text-slate-600 block">tree ops</span>
                            </div>
                        )}
                        {selectedEdge.data?.complexityDelta != null && (
                            <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Complexity Δ</span>
                                <span className={`font-bold text-lg ${
                                    Number(selectedEdge.data.complexityDelta) < 0 ? 'text-emerald-400' 
                                    : Number(selectedEdge.data.complexityDelta) > 0 ? 'text-rose-400' 
                                    : 'text-slate-400'
                                }`}>
                                    {Number(selectedEdge.data.complexityDelta) > 0 ? '+' : ''}{selectedEdge.data.complexityDelta}
                                </span>
                                <span className="text-[8px] text-slate-600 block">
                                    {Number(selectedEdge.data.complexityDelta) < 0 ? 'improved' : Number(selectedEdge.data.complexityDelta) > 0 ? 'worsened' : 'unchanged'}
                                </span>
                            </div>
                        )}
                        {selectedEdge.data?.jaccard != null && (
                            <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Similarity</span>
                                <span className="text-cyan-400 font-bold text-lg">{(Number(selectedEdge.data.jaccard) * 100).toFixed(0)}%</span>
                                <span className="text-[8px] text-slate-600 block">Jaccard</span>
                            </div>
                        )}
                        {selectedEdge.data?.labelSource && (
                            <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Classified By</span>
                                <span className="text-slate-300 font-bold text-sm capitalize">{selectedEdge.data.labelSource}</span>
                                <span className="text-[8px] text-slate-600 block">engine</span>
                            </div>
                        )}
                    </div>
                </div>
            </Panel>
        )}

        {/* ── Submission Timeline Panel ── */}
        {timeline.length > 0 && !selectedNode && !selectedEdge && (
            <Panel position="bottom-left" className="bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-700/50 m-3 shadow-2xl max-w-[340px]">
                <h4 className="text-white font-bold text-[11px] flex items-center gap-2 mb-2">
                    <Clock size={12} className="text-violet-400" /> Submission Timeline ({timeline.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {timeline.map((sub, i) => (
                        <div key={sub.id} className="flex items-center justify-between text-[10px] bg-slate-800/50 rounded-lg px-2 py-1.5 border border-slate-700/30">
                            <span className="text-slate-400">#{i + 1} {sub.language.toUpperCase()}</span>
                            <span className={sub.status === 'Accepted' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{sub.status}</span>
                        </div>
                    ))}
                </div>
            </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
