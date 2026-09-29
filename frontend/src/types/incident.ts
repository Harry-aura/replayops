export type Severity = 'P1-CRITICAL' | 'P2-HIGH' | 'P3-MEDIUM' | 'P4-LOW';

export type IncidentStatus = 'ACTIVE' | 'TRIAGED' | 'INVESTIGATING' | 'REMEDIATING' | 'RESOLVED';

export type MemoryTier = 'WORKING' | 'EPISODIC' | 'SEMANTIC';

export interface MemoryItem {
  id: string;
  timestamp: string;
  tier: MemoryTier;
  title: string;
  summary: string;
  confidence: number; // 0 - 100
  vectorDistance?: number;
  source: string;
  tokensUsed?: number;
  actionTaken?: string;
  relatedService?: string;
  tags: string[];
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  cluster: string;
  region: string;
  severity: Severity;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string;
  blastRadius: string;
  affectedUsers: number;
  errorRate: string;
  latencyDelta: string;
  description: string;
  rootCause: string;
  hypotheses: string[];
  autonomousRemediationAvailable: boolean;
  remediationAction: {
    title: string;
    description: string;
    command: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    estimatedRecoveryTime: string;
  };
  memories: MemoryItem[];
  timeline: {
    time: string;
    stage: 'DETECT' | 'ANALYZE' | 'RECALL' | 'DECIDE' | 'EXECUTE' | 'VERIFY';
    message: string;
    actor: 'AEGIS_AGENT' | 'SYSTEM' | 'TELEMETRY' | 'SRE_OVERRIDE';
    details?: string;
  }[];
}

export interface MetricSummary {
  activeIncidents: number;
  criticalP1Count: number;
  mttdSeconds: number;
  mttrSeconds: number;
  autonomousResolutionRate: number;
  totalMemoriesIndexed: number;
  tokensProcessed: number;
}
