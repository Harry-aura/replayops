import React, { useState } from 'react';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { IncidentFeed } from './components/IncidentFeed';
import { IncidentDetail } from './components/IncidentDetail';
import { MemoryTimeline } from './components/MemoryTimeline';
import { VectorMemoryExplorer } from './components/VectorMemoryExplorer';
import { SubmissionHub } from './components/SubmissionHub';
import { IncidentReplayModal } from './components/IncidentReplayModal';
import { INITIAL_INCIDENTS, INITIAL_METRICS } from './data/mockIncidents';
import type { Incident, MetricSummary } from './types/incident';
import { sound } from './lib/sound';
import { Zap, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-8921');
  const [activeTab, setActiveTab] = useState<'feed' | 'memory' | 'replay' | 'submission'>('feed');
  const [autonomousMode, setAutonomousMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<MetricSummary>(INITIAL_METRICS);
  const [replayIncident, setReplayIncident] = useState<Incident | null>(null);

  // Active selected incident
  const currentIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  // Remediation handler
  const handleRemediate = (incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          return {
            ...inc,
            status: 'RESOLVED',
            resolvedAt: 'Just now',
            errorRate: '0.0% (Normalized)',
            latencyDelta: '12ms (Normal)',
            timeline: [
              ...inc.timeline,
              {
                time: 'Just now',
                stage: 'EXECUTE',
                actor: 'AEGIS_AGENT',
                message: 'Executed autonomous memory-informed remediation payload. Safety checks verified green.'
              },
              {
                time: 'Just now',
                stage: 'VERIFY',
                actor: 'AEGIS_AGENT',
                message: 'Synthetic canary health probes 100% successful. Service fully restored.'
              }
            ]
          };
        }
        return inc;
      })
    );

    // Update global metrics
    setMetrics((prev) => ({
      ...prev,
      activeIncidents: Math.max(0, prev.activeIncidents - 1),
      criticalP1Count: Math.max(0, prev.criticalP1Count - (currentIncident.severity === 'P1-CRITICAL' ? 1 : 0)),
      autonomousResolutionRate: +(Math.min(99.9, prev.autonomousResolutionRate + 0.4)).toFixed(1),
      tokensProcessed: prev.tokensProcessed + 2450
    }));
  };

  // Simulate a new chaos engineering P1 outage
  const handleSimulateIncident = () => {
    sound.playAlert();
    const newId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOutage: Incident = {
      id: newId,
      title: 'DNS Anycast Cache Poisoning & Cascading Gateway Drop',
      service: 'edge-anycast-resolver',
      cluster: 'edge-cluster-global',
      region: 'global-anycast (48 PoPs)',
      severity: 'P1-CRITICAL',
      status: 'ACTIVE',
      startedAt: 'Just now',
      blastRadius: 'Global Ingress Layer (64% Traffic Impact)',
      affectedUsers: 245000,
      errorRate: '+48.2% (SERVFAIL)',
      latencyDelta: '+2,900ms',
      description: 'Upstream authoritative DNS resolver experienced cache divergence. Recursive resolvers returning SERVFAIL for public API wildcards.',
      rootCause: 'DNSSEC validation failure triggered by clock-skew drift across secondary nameserver pool.',
      hypotheses: [
        'NTP drift on nameserver-node-04 causing RRSIG expiration',
        'BGP route hijacking on DNS anycast prefix 198.51.100.0/24',
        'DDoS amplification hitting port 53'
      ],
      autonomousRemediationAvailable: true,
      remediationAction: {
        title: 'Flush Stale DNSSEC RRsets & Resynchronize Chrony NTP Pool',
        description: 'Purges poisoned RRset cache across edge resolvers, force syncs NTP time offset across cluster, and disables transient DNSSEC validation fallback.',
        command: `aegis-sre dns-remediate --target edge-anycast-resolver --flush-zone api.global.internal --sync-ntp pool.ntp.org`,
        riskLevel: 'LOW',
        estimatedRecoveryTime: '~14 seconds'
      },
      memories: [
        {
          id: `MEM-E-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: '32 days ago',
          tier: 'EPISODIC',
          title: 'Prior Incident INC-2940: DNSSEC Timestamp Invalidation',
          summary: 'Resolved identical nameserver divergence during leap second adjustment by flushing recursive cache and forcing NTP step sync.',
          confidence: 97.6,
          vectorDistance: 0.088,
          source: 'Vector Store (Cosine Similarity: 0.976)',
          tokensUsed: 490,
          actionTaken: 'Atomic DNSSEC purge + NTP step sync',
          relatedService: 'edge-anycast-resolver',
          tags: ['dns', 'dnssec', 'ntp', 'anycast', 'p1']
        },
        {
          id: 'MEM-S-550',
          timestamp: 'Persistent Topology',
          tier: 'SEMANTIC',
          title: 'Global Ingress DNS Architecture Topology',
          summary: 'Anycast DNS resolves traffic for all regional Kubernetes clusters. Failure causes immediate traffic blackout across all clients.',
          confidence: 100,
          source: 'Ingress Mesh Topology Graph',
          tags: ['dns-mesh', 'anycast', 'tier-0-critical']
        },
        {
          id: `MEM-W-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: 'Just now',
          tier: 'WORKING',
          title: 'CoT Anomaly Verification & Action Plan',
          summary: 'Identified NTP offset of +4.2 seconds on 3 edge nodes. Verified that flushing the DNS cache will not affect client sticky sessions.',
          confidence: 99.2,
          source: 'Agent Working Scratchpad',
          tokensUsed: 1180,
          tags: ['cot-verified', 'safe-to-execute']
        }
      ],
      timeline: [
        {
          time: 'Just now',
          stage: 'DETECT',
          actor: 'TELEMETRY',
          message: 'Chaos Engineering Injected: DNS recursive resolver SERVFAIL breached 10% threshold.'
        },
        {
          time: 'Just now',
          stage: 'ANALYZE',
          actor: 'AEGIS_AGENT',
          message: 'Aegis Agent detected DNSSEC validation timestamp mismatch across edge nodes.'
        },
        {
          time: 'Just now',
          stage: 'RECALL',
          actor: 'AEGIS_AGENT',
          message: 'Vector memory matched INC-2940 with 97.6% confidence. Atomic remediation generated.'
        }
      ]
    };

    setIncidents([newOutage, ...incidents]);
    setSelectedIncidentId(newId);
    setMetrics((prev) => ({
      ...prev,
      activeIncidents: prev.activeIncidents + 1,
      criticalP1Count: prev.criticalP1Count + 1
    }));
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Background Ambience / Grid Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 z-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" 
      />

      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        autonomousMode={autonomousMode}
        setAutonomousMode={setAutonomousMode}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onSimulateIncident={handleSimulateIncident}
        activeCount={metrics.activeIncidents}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 relative z-10">
        {/* Top Benchmark HUD */}
        <MetricsBar metrics={metrics} />

        {/* Tab 1: Live Incident Feed & Memory Timeline */}
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Incident Feed Queue */}
            <div className="lg:col-span-4 h-[780px]">
              <IncidentFeed
                incidents={incidents}
                selectedIncidentId={selectedIncidentId}
                onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
              />
            </div>

            {/* Right: Incident Deep Dive & Memory Timeline */}
            <div className="lg:col-span-8 space-y-6">
              <IncidentDetail
                incident={currentIncident}
                onRemediate={handleRemediate}
                onOpenReplay={(inc) => setReplayIncident(inc)}
              />

              <MemoryTimeline incident={currentIncident} />
            </div>
          </div>
        )}

        {/* Tab 2: Vector Memory Explorer */}
        {activeTab === 'memory' && (
          <div className="max-w-5xl mx-auto">
            <VectorMemoryExplorer />
          </div>
        )}

        {/* Tab 3: Hackathon Submission Hub */}
        {activeTab === 'submission' && (
          <div className="max-w-5xl mx-auto">
            <SubmissionHub />
          </div>
        )}
      </main>

      {/* Modal for Post-Mortem Replay */}
      <IncidentReplayModal
        incident={replayIncident}
        onClose={() => setReplayIncident(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900/80 bg-slate-950/80 backdrop-blur py-4 px-6 relative z-10 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>AegisPulse SRE Autonomous Agent System</span>
            <span>•</span>
            <span className="text-slate-400">Hackathon Submission Edition</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              99.98% Autonomous SLA
            </span>
            <span>•</span>
            <span className="text-slate-400">3-Tier Dynamic Memory (Working + Episodic + Semantic)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
