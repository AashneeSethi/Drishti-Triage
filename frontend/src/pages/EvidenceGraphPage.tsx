import React, { useState, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MarkerType,
  BackgroundVariant
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Network, 
  X, 
  FileCode
} from 'lucide-react';

interface SelectedEntity {
  type: 'NODE' | 'EDGE';
  id: string;
  title: string;
  subtitle: string;
  certainty: 'DETERMINISTIC' | 'INFERRED';
  supportingRecords: string[];
  description: string;
  details: Record<string, string>;
}

export const EvidenceGraphPage: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [filterCertainty, setFilterCertainty] = useState<'ALL' | 'DETERMINISTIC' | 'INFERRED'>('ALL');

  // Define graph nodes with distinct styling according to suspicion/role
  const initialNodes: Node[] = useMemo(() => [
    {
      id: 'node-suspect-phone',
      position: { x: 50, y: 80 },
      data: { 
        label: 'Suspect Phone Line\n+91 91234 56789',
        type: 'PHONE',
        suspicion: 'HIGH_SUSPECT'
      },
      style: {
        background: '#1c131d',
        color: '#f87171',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        width: 190
      }
    },
    {
      id: 'node-whatsapp-persona',
      position: { x: 50, y: 220 },
      data: { 
        label: 'Impersonation Persona\nCBI Cyber Cell Delhi',
        type: 'PERSONA',
        suspicion: 'HIGH_SUSPECT'
      },
      style: {
        background: '#1c131d',
        color: '#f87171',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        width: 190
      }
    },
    {
      id: 'node-victim-phone',
      position: { x: 380, y: 80 },
      data: { 
        label: 'Victim Phone\n+91 98765 43210 (Ramesh)',
        type: 'PHONE',
        suspicion: 'VICTIM'
      },
      style: {
        background: '#0d1b2a',
        color: '#38bdf8',
        border: '2px solid #0284c7',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        width: 200
      }
    },
    {
      id: 'node-victim-device',
      position: { x: 380, y: 220 },
      data: { 
        label: 'Victim PC\nDESKTOP-RAMESH (Win11)',
        type: 'DEVICE',
        suspicion: 'VICTIM'
      },
      style: {
        background: '#0d1b2a',
        color: '#38bdf8',
        border: '2px solid #0284c7',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        width: 200
      }
    },
    {
      id: 'node-victim-account',
      position: { x: 380, y: 360 },
      data: { 
        label: 'Victim Bank Account\nramesh.sharma@okhdfc',
        type: 'BANK_ACCOUNT',
        suspicion: 'VICTIM'
      },
      style: {
        background: '#0d1b2a',
        color: '#38bdf8',
        border: '2px solid #0284c7',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        width: 200
      }
    },
    {
      id: 'node-mule-account',
      position: { x: 720, y: 360 },
      data: { 
        label: 'Mule VPA Escrow\ncbiseal.investigation@okaxis',
        type: 'UPI_ID',
        suspicion: 'MULE'
      },
      style: {
        background: '#1c131d',
        color: '#f87171',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        width: 220
      }
    },
    {
      id: 'node-skype-process',
      position: { x: 720, y: 220 },
      data: { 
        label: 'Surveillance Session\nskype.exe /minimized',
        type: 'PROCESS',
        suspicion: 'HIGH_SUSPECT'
      },
      style: {
        background: '#241b12',
        color: '#fbbf24',
        border: '2px solid #d97706',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        width: 210
      }
    }
  ], []);

  // Define graph edges with explicit evidentiary certainty
  const initialEdges: Edge[] = useMemo(() => [
    {
      id: 'edge-call',
      source: 'node-suspect-phone',
      target: 'node-victim-phone',
      label: 'INBOUND CALL (180s)',
      animated: false,
      style: { stroke: '#38bdf8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      data: {
        certainty: 'DETERMINISTIC',
        relation: 'CALLED',
        records: ['calls_cdr.csv:Line 3', 'CDR_0002'],
        description: 'Direct telephony switch record proving incoming connection at 14:05:00 UTC for 180 seconds.'
      }
    },
    {
      id: 'edge-threat',
      source: 'node-whatsapp-persona',
      target: 'node-victim-phone',
      label: 'EXTORTION NOTICE',
      animated: false,
      style: { stroke: '#38bdf8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      data: {
        certainty: 'DETERMINISTIC',
        relation: 'MESSAGED',
        records: ['whatsapp_chat.txt:Line 2', 'MSG_0002'],
        description: 'WhatsApp database extraction verifying delivery of bogus arrest warrant at 14:06:10 IST.'
      }
    },
    {
      id: 'edge-skype',
      source: 'node-victim-device',
      target: 'node-skype-process',
      label: 'SURVEILLANCE PROCESS',
      animated: false,
      style: { stroke: '#38bdf8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      data: {
        certainty: 'DETERMINISTIC',
        relation: 'EXECUTED_ON',
        records: ['security_events.json:Event 4688', 'PID_3812'],
        description: 'Windows 11 EVTX log confirming process execution of skype.exe at 14:07:05 IST.'
      }
    },
    {
      id: 'edge-transfer',
      source: 'node-victim-account',
      target: 'node-mule-account',
      label: 'UPI ₹25,000.00',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      data: {
        certainty: 'DETERMINISTIC',
        relation: 'TRANSFERRED_FUNDS',
        records: ['bank_upi_statement.csv:Line 3', 'UTR_429104829104'],
        description: 'HDFC NetBanking core export certifying ₹25,000 debit at 14:08:15 IST.'
      }
    },
    {
      id: 'edge-coercion-link',
      source: 'node-suspect-phone',
      target: 'node-victim-account',
      label: 'COERCION (INFERRED)',
      animated: false,
      style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 4' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      data: {
        certainty: 'INFERRED',
        relation: 'COERCED_INFERRED',
        records: ['calls_cdr.csv', 'bank_upi_statement.csv'],
        description: 'Causal conjecture: While timing shows proximity, electronic metadata alone cannot prove psychological causality without witness testimony.'
      }
    }
  ], []);

  // Filter edges based on user toggle
  const visibleEdges = useMemo(() => {
    if (filterCertainty === 'ALL') return initialEdges;
    return initialEdges.filter(e => e.data?.certainty === filterCertainty);
  }, [initialEdges, filterCertainty]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    const data = node.data as { label?: string; suspicion?: string; type?: string };
    const labelStr = String(data.label || '');
    const lines = labelStr.split('\n');
    setSelectedEntity({
      type: 'NODE',
      id: node.id,
      title: lines[0] || 'Entity',
      subtitle: lines[1] || '',
      certainty: 'DETERMINISTIC',
      supportingRecords: ['Active Forensic Docket (DT-2026-001)'],
      description: `Entity registered in case knowledge graph. Classification: ${data.suspicion || 'UNKNOWN'}. Entity Type: ${data.type || 'UNKNOWN'}.`,
      details: {
        'Identifier': lines[1] || lines[0] || node.id,
        'Role': String(data.suspicion || 'UNKNOWN'),
        'Evidence Linkage': 'Indexed in Incident Super-Timeline',
        'Verification State': 'Byte-Corroborated'
      }
    });
  };

  const handleEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    const data = edge.data as any;
    setSelectedEntity({
      type: 'EDGE',
      id: edge.id,
      title: edge.label as string || 'Relationship',
      subtitle: `${edge.source} ➔ ${edge.target}`,
      certainty: data.certainty,
      supportingRecords: data.records || [],
      description: data.description,
      details: {
        'Relationship': data.relation,
        'Evidentiary Basis': data.certainty === 'DETERMINISTIC' ? 'Solid Line: Direct Record Proof' : 'Dashed Line: Inferred Hypothesis',
        'Citations': data.records?.join(', ') || 'None'
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-400" />
            Forensic Knowledge Graph
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Entity Correlation with Strict Evidentiary Separation: Solid (Deterministic) vs Dashed (Inferred)
          </p>
        </div>

        {/* Filter Edge Certainty */}
        <div className="flex items-center gap-2 bg-[#111827] p-1 rounded-lg border border-[#1e293b]">
          <span className="text-[11px] font-mono text-slate-400 px-2">Edge Filter:</span>
          {(['ALL', 'DETERMINISTIC', 'INFERRED'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterCertainty(mode)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                filterCertainty === mode
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Graph Visualizer Container */}
      <div className="relative w-full h-[520px] bg-[#080c14] border border-[#1e293b] rounded-lg overflow-hidden">
        <ReactFlow
          nodes={initialNodes}
          edges={visibleEdges}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          className="bg-[#080c14]"
        >
          <Background color="#1e293b" gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Controls className="bg-[#111827] border border-[#1e293b] fill-slate-300" />
        </ReactFlow>

        {/* Legend Overlay */}
        <div className="absolute top-4 left-4 p-3 rounded-lg bg-[#0f172a]/90 backdrop-blur border border-[#1e293b] text-xs font-mono space-y-1.5 pointer-events-none select-none">
          <div className="text-[10px] uppercase text-slate-400 tracking-wider font-bold mb-1">Graph Legend</div>
          <div className="flex items-center gap-2 text-red-400">
            <div className="w-3 h-3 rounded-sm bg-red-950 border border-red-500" />
            <span>Suspect / Mule Entity</span>
          </div>
          <div className="flex items-center gap-2 text-sky-400">
            <div className="w-3 h-3 rounded-sm bg-sky-950 border border-sky-500" />
            <span>Victim Entity / Asset</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 pt-1 border-t border-[#1e293b]">
            <div className="w-4 h-0.5 bg-sky-400" />
            <span>Solid: Deterministic Ground Truth</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <div className="w-4 h-0.5 border-t border-dashed border-amber-400" />
            <span>Dashed: Inferred Causal Leap</span>
          </div>
        </div>

        {/* Helper Callout */}
        <div className="absolute bottom-4 left-4 p-2.5 rounded bg-[#111827]/90 border border-[#1e293b] text-[11px] text-slate-400 pointer-events-none">
          Click any node or connection to inspect byte-level citations & confidence.
        </div>
      </div>

      {/* Selected Entity Inspector Drawer */}
      {selectedEntity && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between pb-3 border-b border-[#1e293b]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950/50 text-sky-300 border border-sky-800/40">
                  {selectedEntity.type} INSPECTOR
                </span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  selectedEntity.certainty === 'DETERMINISTIC' 
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' 
                    : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                }`}>
                  {selectedEntity.certainty}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 font-mono mt-1">{selectedEntity.title}</h3>
              <p className="text-xs text-slate-400">{selectedEntity.subtitle}</p>
            </div>
            <button
              onClick={() => setSelectedEntity(null)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
            <div>
              <span className="text-slate-400 font-mono text-[11px] uppercase">Forensic Context & Explanation:</span>
              <p className="text-slate-200 mt-1 leading-relaxed bg-[#0c111d] p-3 rounded border border-[#1e293b]">
                {selectedEntity.description}
              </p>
            </div>

            <div>
              <span className="text-slate-400 font-mono text-[11px] uppercase">Supporting Evidence Records:</span>
              <div className="mt-1 space-y-1.5">
                {selectedEntity.supportingRecords.map((rec, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-[#0c111d] border border-[#1e293b] font-mono text-[11px] text-sky-300">
                    <FileCode className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
