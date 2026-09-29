import React, { useState } from 'react';
import { Search, Flame, AlertCircle, Info, CheckCircle, Zap } from 'lucide-react';
import type { Incident, Severity } from '../types/incident';
import { sound } from '../lib/sound';

interface IncidentFeedProps {
  incidents: Incident[];
  selectedIncidentId: string;
  onSelectIncident: (incident: Incident) => void;
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case 'P1-CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
            P1 CRITICAL
          </span>
        );
      case 'P2-HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            P2 HIGH
          </span>
        );
      case 'P3-MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Info className="w-3 h-3 text-blue-400" />
            P3 MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            P4 LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-950/60 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            ACTIVE
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            INVESTIGATING
          </span>
        );
      case 'REMEDIATING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-950/60 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-spin" />
            REMEDIATING
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            RESOLVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const matchesFilter =
      filterSeverity === 'ALL'
        ? true
        : filterSeverity === 'RESOLVED'
        ? inc.status === 'RESOLVED'
        : inc.severity === filterSeverity;

    const matchesSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl">
      {/* Feed Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-sm font-mono font-bold tracking-wider text-slate-200 uppercase">
              Live Ingestion Feed
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {filteredIncidents.length} / {incidents.length} Streams
          </span>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service, cluster, trace ID, root cause..."
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          {['ALL', 'P1-CRITICAL', 'P2-HIGH', 'P3-MEDIUM', 'RESOLVED'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                sound.playClick();
                setFilterSeverity(lvl);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterSeverity === lvl
                  ? 'bg-slate-800 text-white font-bold border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {lvl.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/40">
        {filteredIncidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            No incidents matching current telemetry filter.
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const isSelected = incident.id === selectedIncidentId;
            const topEpisodicMemory = incident.memories.find((m) => m.tier === 'EPISODIC');

            return (
              <div
                key={incident.id}
                onClick={() => {
                  sound.playClick();
                  onSelectIncident(incident);
                }}
                className={`pt-2.5 first:pt-0 cursor-pointer rounded-xl p-3 transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900/90 border border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950/30 hover:bg-slate-900/60 border border-slate-800/50 hover:border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {incident.id}
                    </span>
                    {getSeverityBadge(incident.severity)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(incident.status)}
                    <span className="text-[11px] font-mono text-slate-500">
                      {incident.startedAt}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 line-clamp-1">
                  {incident.title}
                </h3>

                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">
                    {incident.service}
                  </span>
                  <span>•</span>
                  <span className="truncate">{incident.cluster}</span>
                </div>

                {/* Metrics ribbon */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-rose-400 font-medium">
                    {incident.errorRate}
                  </span>
                  <span className="text-purple-400">
                    {incident.latencyDelta}
                  </span>
                  <span className="text-slate-400">
                    {incident.affectedUsers.toLocaleString()} users
                  </span>
                </div>

                {/* Memory Match Tag if available */}
                {topEpisodicMemory && (
                  <div className="mt-2.5 flex items-center justify-between bg-cyan-950/30 border border-cyan-500/20 rounded-lg px-2 py-1 text-[11px] text-cyan-300">
                    <span className="flex items-center gap-1 font-mono">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      Memory: {topEpisodicMemory.confidence}% Match
                    </span>
                    <span className="text-[10px] text-cyan-400/80 truncate max-w-[140px]">
                      {topEpisodicMemory.title.split(':')[0]}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
