import React from 'react';
import { Activity, Clock, Zap, Database, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { MetricSummary } from '../types/incident';

interface MetricsBarProps {
  metrics: MetricSummary;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* Active Incidents */}
      <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>ACTIVE INCIDENTS</span>
          <AlertTriangle className={`w-3.5 h-3.5 ${metrics.criticalP1Count > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">{metrics.activeIncidents}</span>
          {metrics.criticalP1Count > 0 && (
            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              {metrics.criticalP1Count} P1
            </span>
          )}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          Global fleet telemetry
        </div>
      </div>

      {/* MTTD */}
      <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>MTTD (DETECTION)</span>
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-cyan-400">{metrics.mttdSeconds}s</span>
          <span className="text-[11px] font-mono text-emerald-400">▼ 99.6%</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 font-mono">
          Human: ~18m
        </div>
      </div>

      {/* MTTR */}
      <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>MTTR (RECOVERY)</span>
          <Clock className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-purple-400">{metrics.mttrSeconds}s</span>
          <span className="text-[11px] font-mono text-emerald-400">▼ 98.9%</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 font-mono">
          Human: ~45m
        </div>
      </div>

      {/* Autonomous Rate */}
      <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>AUTO-RESOLUTION</span>
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-400">{metrics.autonomousResolutionRate}%</span>
          <span className="text-[10px] font-mono text-slate-400">ZERO-TOUCH</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 font-mono">
          Self-healing pipeline
        </div>
      </div>

      {/* Memory Nodes */}
      <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>MEMORY VECTORS</span>
          <Database className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-blue-400">
            {(metrics.totalMemoriesIndexed).toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-cyan-400">3-TIER</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 font-mono">
          Episodic + GraphRAG
        </div>
      </div>

      {/* Agent Health */}
      <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>REASONING PIPELINE</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl font-black text-white font-mono">ONLINE</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block ml-1" />
        </div>
        <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">
          {(metrics.tokensProcessed / 1000).toFixed(0)}k tokens ctx
        </div>
      </div>
    </div>
  );
};
