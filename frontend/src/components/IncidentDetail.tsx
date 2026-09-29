import React, { useState } from 'react';
import { 
  Server, Globe, Users, TrendingUp, AlertOctagon, Terminal, 
  CheckCircle2, Play, Copy, Check, FileText, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Incident } from '../types/incident';
import { sound } from '../lib/sound';

interface IncidentDetailProps {
  incident: Incident;
  onRemediate: (incidentId: string) => void;
  onOpenReplay: (incident: Incident) => void;
}

export const IncidentDetail: React.FC<IncidentDetailProps> = ({
  incident,
  onRemediate,
  onOpenReplay
}) => {
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<string>('');

  const copyCommand = () => {
    sound.playClick();
    navigator.clipboard.writeText(incident.remediationAction.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteRemediation = () => {
    sound.playExecute();
    setIsExecuting(true);
    setExecutionStep('Step 1/3: Initializing isolated sandbox & draining ingress connections...');

    setTimeout(() => {
      setExecutionStep('Step 2/3: Applying atomic memory-informed patch payload...');
      sound.playClick();
    }, 1200);

    setTimeout(() => {
      setExecutionStep('Step 3/3: Running synthetic canary verification & health checks...');
      sound.playClick();
    }, 2400);

    setTimeout(() => {
      setIsExecuting(false);
      sound.playSuccess();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      onRemediate(incident.id);
    }, 3600);
  };

  const stages = ['DETECT', 'ANALYZE', 'RECALL', 'DECIDE', 'EXECUTE', 'VERIFY'] as const;

  const currentStageIndex = incident.status === 'RESOLVED' 
    ? 5 
    : incident.status === 'REMEDIATING' 
    ? 4 
    : incident.status === 'INVESTIGATING' 
    ? 2 
    : 1;

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 md:p-6 shadow-2xl flex flex-col space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
              {incident.id}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Region: {incident.region}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Cluster: {incident.cluster}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white mt-2 leading-tight">
            {incident.title}
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
            {incident.description}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => {
              sound.playClick();
              onOpenReplay(incident);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Generate Post-Mortem</span>
          </button>
        </div>
      </div>

      {/* Real-Time Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Service</span>
          </div>
          <div className="mt-1 text-sm font-bold text-white truncate">
            {incident.service}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>Blast Radius</span>
          </div>
          <div className="mt-1 text-sm font-bold text-amber-300 truncate">
            {incident.blastRadius}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span>Affected Users</span>
          </div>
          <div className="mt-1 text-sm font-bold text-rose-300">
            {incident.affectedUsers.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span>Telemetry Anomaly</span>
          </div>
          <div className="mt-1 text-sm font-bold text-purple-300 truncate">
            {incident.errorRate}
          </div>
        </div>
      </div>

      {/* Autonomous Stage Progression Track */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            AGENT REASONING PIPELINE (CoT)
          </span>
          <span className="text-cyan-400 font-bold">
            STAGE: {stages[currentStageIndex]}
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {stages.map((stage, idx) => {
            const isPast = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div
                key={stage}
                className={`py-2 px-1 text-center rounded-lg border font-mono text-[10px] md:text-xs font-bold transition-all ${
                  isPast
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                    : isCurrent
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20 animate-pulse'
                    : 'bg-slate-900/60 border-slate-800 text-slate-600'
                }`}
              >
                {stage}
              </div>
            );
          })}
        </div>
      </div>

      {/* Root Cause & Hypothesis Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Root cause box */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold mb-2">
            <AlertOctagon className="w-4 h-4" />
            <span>IDENTIFIED ROOT CAUSE (RCA)</span>
          </div>
          <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-mono">
            {incident.rootCause}
          </p>
        </div>

        {/* Hypotheses */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold mb-2">
            <ArrowRight className="w-4 h-4" />
            <span>EVALUATED HYPOTHESES</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
            {incident.hypotheses.map((hyp, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5">•</span>
                <span>{hyp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Autonomous Remediation Action Box */}
      <div className="bg-gradient-to-br from-cyan-950/30 via-slate-950/60 to-slate-950/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                RECOMMENDED REMEDIATION
              </span>
              <span className="text-xs font-mono text-emerald-400">
                Risk: {incident.remediationAction.riskLevel}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Est. Time: {incident.remediationAction.estimatedRecoveryTime}
              </span>
            </div>
            <h4 className="text-base font-bold text-white mt-1">
              {incident.remediationAction.title}
            </h4>
          </div>

          {/* Remediation Action Button */}
          {incident.status !== 'RESOLVED' ? (
            <button
              disabled={isExecuting}
              onClick={handleExecuteRemediation}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
                isExecuting
                  ? 'bg-slate-800 text-slate-400 cursor-wait'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isExecuting ? 'EXECUTING AUTONOMOUS PATCH...' : 'EXECUTE AUTONOMOUS REMEDIATION'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>INCIDENT REMEDIATED & VERIFIED</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-300 mb-3">
          {incident.remediationAction.description}
        </p>

        {/* Command terminal */}
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs text-cyan-300 flex items-center justify-between overflow-x-auto gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-slate-400 select-none">$</span>
            <span className="truncate">{incident.remediationAction.command}</span>
          </div>
          <button
            onClick={copyCommand}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
            title="Copy command"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Execution progress banner */}
        {isExecuting && (
          <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center gap-3 animate-pulse">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span>{executionStep}</span>
          </div>
        )}
      </div>
    </div>
  );
};
