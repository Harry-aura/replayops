import React, { useState } from 'react';
import { 
  Cpu, Database, Sparkles, Network, 
  ExternalLink, ChevronDown, ChevronUp, Layers, CheckCircle
} from 'lucide-react';
import type { Incident, MemoryTier } from '../types/incident';
import { sound } from '../lib/sound';

interface MemoryTimelineProps {
  incident: Incident;
}

export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({ incident }) => {
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    sound.playClick();
    setExpandedMemoryId(expandedMemoryId === id ? null : id);
  };

  const filteredMemories = incident.memories.filter((mem) => {
    if (selectedTier === 'ALL') return true;
    return mem.tier === selectedTier;
  });

  const getTierIcon = (tier: MemoryTier) => {
    switch (tier) {
      case 'WORKING':
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'EPISODIC':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'SEMANTIC':
        return <Network className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTierBadge = (tier: MemoryTier) => {
    switch (tier) {
      case 'WORKING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/40">
            WORKING MEMORY (CoT)
          </span>
        );
      case 'EPISODIC':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/60 text-purple-300 border border-purple-500/40">
            EPISODIC MEMORY (VECTORS)
          </span>
        );
      case 'SEMANTIC':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/60 text-blue-300 border border-blue-500/40">
            SEMANTIC MEMORY (GRAPH)
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 md:p-6 shadow-2xl flex flex-col space-y-5">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-mono font-bold tracking-wider text-slate-100 uppercase">
              Dynamic Memory Timeline & Vector Retrieval
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Correlating active telemetry against episodic incident history & semantic topology.
          </p>
        </div>

        {/* Tier filter buttons */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {['ALL', 'EPISODIC', 'WORKING', 'SEMANTIC'].map((tier) => (
            <button
              key={tier}
              onClick={() => {
                sound.playClick();
                setSelectedTier(tier);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedTier === tier
                  ? 'bg-purple-950/60 text-purple-300 border border-purple-500/50 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Nodes Timeline */}
      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-purple-500/50 before:via-cyan-500/30 before:to-slate-800">
        {filteredMemories.map((mem) => {
          const isExpanded = expandedMemoryId === mem.id;

          return (
            <div
              key={mem.id}
              className="relative group bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 transition-all"
            >
              {/* Timeline dot */}
              <div className="absolute -left-[27px] top-4.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-purple-400 flex items-center justify-center shadow-md shadow-purple-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              </div>

              {/* Memory Node Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {getTierIcon(mem.tier)}
                  {getTierBadge(mem.tier)}
                  <span className="text-[11px] font-mono text-slate-400">
                    {mem.timestamp}
                  </span>
                </div>

                {/* Confidence Bar */}
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-mono text-purple-300 flex items-center gap-1">
                    <span>Similarity:</span>
                    <span className="font-bold text-white">{mem.confidence}%</span>
                  </div>
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                      style={{ width: `${mem.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Title & Summary */}
              <h4 className="text-sm font-bold text-slate-100 mt-1">
                {mem.title}
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-sans">
                {mem.summary}
              </p>

              {/* Source & Tags */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-2 text-slate-400">
                  <Database className="w-3 h-3 text-cyan-400" />
                  <span className="truncate">{mem.source}</span>
                  {mem.tokensUsed && (
                    <span className="text-slate-500">
                      • {mem.tokensUsed} tokens
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {mem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400"
                    >
                      #{tag}
                    </span>
                  ))}
                  <button
                    onClick={() => toggleExpand(mem.id)}
                    className="ml-2 p-1 hover:text-cyan-300 text-slate-400 transition"
                    title="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Reasoning & Vector Embedding Inspection */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-purple-500/20 bg-slate-900/60 rounded-lg p-3 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>VECTOR EMBEDDING TRACE</span>
                    <span>DISTANCE: {mem.vectorDistance ?? '0.045'}</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded text-cyan-400 text-[11px] overflow-x-auto">
                    {`{"vector_id": "${mem.id}", "metric": "cosine", "score": ${mem.confidence / 100}, "tier": "${mem.tier}", "applied_rule": "RCA_VERIFIED"}`}
                  </div>
                  {mem.actionTaken && (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Historical Action Taken: {mem.actionTaken}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Incident Execution Log Timeline */}
      <div className="mt-4 pt-4 border-t border-slate-800/80">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase mb-3 flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real-Time Incident Telemetry Log</span>
        </h4>
        <div className="space-y-2 font-mono text-xs">
          {incident.timeline.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-2 rounded-lg bg-slate-950/40 border border-slate-800/50"
            >
              <span className="text-slate-500 text-[11px] shrink-0 mt-0.5">
                {item.time}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-cyan-300 border border-slate-700 shrink-0">
                {item.stage}
              </span>
              <span className="text-slate-300 text-[11px]">
                {item.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
