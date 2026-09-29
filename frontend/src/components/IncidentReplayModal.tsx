import React, { useState } from 'react';
import { X, Copy, Check, FileCheck } from 'lucide-react';
import type { Incident } from '../types/incident';
import { sound } from '../lib/sound';

interface IncidentReplayModalProps {
  incident: Incident | null;
  onClose: () => void;
}

export const IncidentReplayModal: React.FC<IncidentReplayModalProps> = ({
  incident,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!incident) return null;

  const postMortemContent = `# Incident Post-Mortem: [${incident.id}] ${incident.title}

**Target Service:** \`${incident.service}\`  
**Severity:** \`${incident.severity}\`  
**Status:** \`${incident.status}\`  
**Blast Radius:** ${incident.blastRadius}  
**Affected Users:** ${incident.affectedUsers.toLocaleString()}  
**Lead Investigator:** AegisPulse Autonomous Sentinel Agent  

---

## 1. Executive Summary
At ${incident.startedAt}, an automated anomaly detector flagged an incident on service \`${incident.service}\` located in region \`${incident.region}\`.
The anomaly exhibited an error spike of \`${incident.errorRate}\` and a p99 latency delta of \`${incident.latencyDelta}\`.

## 2. Root Cause Analysis (RCA)
${incident.rootCause}

## 3. Dynamic Memory Retrieval & Historical Precedent
AegisPulse recalled the following historical memory nodes:
${incident.memories.map((m) => `- [${m.tier}] **${m.title}**: ${m.summary} (Similarity: ${m.confidence}%)`).join('\n')}

## 4. Remediation Executed
- **Action:** ${incident.remediationAction.title}
- **Description:** ${incident.remediationAction.description}
- **Command:** \`${incident.remediationAction.command}\`
- **Recovery Time:** ${incident.remediationAction.estimatedRecoveryTime}

## 5. Timeline of Events
${incident.timeline.map((t) => `- **${t.time}** [${t.stage}] (${t.actor}): ${t.message}`).join('\n')}

## 6. Preventative Action Items
- [x] Auto-tuned kernel parameters and memory eviction policies across all replicas.
- [x] Added synthetic eBPF telemetry tripwires for preemptive threshold warning.
- [x] Synced episodic vector embedding to Global Knowledge Base.`;

  const handleCopy = () => {
    sound.playClick();
    navigator.clipboard.writeText(postMortemContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-mono font-bold text-white uppercase">
              Automated Incident Post-Mortem & Replay Report
            </h3>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-slate-300 space-y-4">
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Format: Standard Markdown (SRE Industry Spec)</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Post-Mortem!' : 'Copy Markdown'}</span>
              </button>
            </div>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {postMortemContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
