import type { Incident } from '../types/incident';

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'INC-8921',
    title: 'Distributed Lock Deadlock & Cascading Cache Storm',
    service: 'auth-session-cluster',
    cluster: 'k8s-prod-us-east-1',
    region: 'us-east-1a (N. Virginia)',
    severity: 'P1-CRITICAL',
    status: 'ACTIVE',
    startedAt: '2 mins ago',
    blastRadius: '42% of Global Auth Sessions',
    affectedUsers: 142850,
    errorRate: '+34.8% (HTTP 503 / 504)',
    latencyDelta: '+1,840ms (p99)',
    description: 'Redis cluster leader node failed over abruptly during a burst in token renewal queries. Redlock distributed locks failed to expire, creating an thread backlog in session-workers.',
    rootCause: 'Redis maxmemory-policy misconfiguration (`noeviction`) preventing key expiry during memory saturation, cascading to connection pool deadlock.',
    hypotheses: [
      'Split-brain condition across Redis sentinel nodes',
      'Memory exhaustion triggered by unindexed JWT blacklist keys',
      'Downstream database connection pool starvation under retry tempest'
    ],
    autonomousRemediationAvailable: true,
    remediationAction: {
      title: 'Flush Stale Redlock Keys & Dynamic Eviction Policy Override',
      description: 'Executes non-blocking atomic key sweep on deadlocked session locks, switches Redis eviction policy to `volatile-lru`, and scales read-replica pods by +6 instances.',
      command: 'aegis-sre remediate --target redis-cluster-auth --flush-pattern "lock:session:*" --set-policy volatile-lru --scale-replicas 6',
      riskLevel: 'LOW',
      estimatedRecoveryTime: '~18 seconds'
    },
    memories: [
      {
        id: 'MEM-E-4029',
        timestamp: '14 days ago',
        tier: 'EPISODIC',
        title: 'Prior Incident INC-4029: Flash Sale Session Cache Saturation',
        summary: 'Identical deadlock pattern observed during Black Friday surge. Remediation required flushing dangling mutex locks and overriding eviction policy from `noeviction` to `volatile-lru`.',
        confidence: 98.4,
        vectorDistance: 0.082,
        source: 'Vector Store (Cosine Similarity: 0.984)',
        tokensUsed: 420,
        actionTaken: 'Atomic key purge + dynamic config update',
        relatedService: 'auth-session-cluster',
        tags: ['redis', 'deadlock', 'redlock', 'eviction-policy', 'p1']
      },
      {
        id: 'MEM-S-104',
        timestamp: 'Persistent Topology',
        tier: 'SEMANTIC',
        title: 'Service Dependency Graph & SLA Blast Radius',
        summary: 'Auth Session Cluster is Tier-0 Critical. Direct upstream dependency for API Gateway, Mobile App Ingress, and Billing Gateway. SLA breach threshold: 180 seconds.',
        confidence: 100,
        source: 'Topology Knowledge Graph (Neo4j/GraphRAG)',
        tags: ['tier-0', 'architecture-graph', 'sla-180s', 'api-gateway']
      },
      {
        id: 'MEM-W-991',
        timestamp: '15 seconds ago',
        tier: 'WORKING',
        title: 'Real-Time Hypothesis Verification & Safe Remediation Plan',
        summary: 'Analyzed p99 latency curve (+1840ms). Validated that no stateful user data will be destroyed by evicting dangling mutex keys. Generated atomic rollback script with 100% test coverage.',
        confidence: 96.1,
        source: 'Aegis Agent Working Scratchpad (LLM CoT)',
        tokensUsed: 1240,
        tags: ['cot-reasoning', 'hypothesis-proven', 'safety-verified']
      }
    ],
    timeline: [
      {
        time: '19:04:12',
        stage: 'DETECT',
        actor: 'TELEMETRY',
        message: 'Prometheus Alert: HTTP 504 gateway timeouts breached 5.0% threshold (Current: 34.8%).'
      },
      {
        time: '19:04:15',
        stage: 'ANALYZE',
        actor: 'AEGIS_AGENT',
        message: 'Aegis Sentinel initialized autonomous triage. Correlating eBPF traces across 124 pod instances.'
      },
      {
        time: '19:04:19',
        stage: 'RECALL',
        actor: 'AEGIS_AGENT',
        message: 'Vector Memory Hit: Matched incident INC-4029 with 98.4% cosine similarity. Root cause pinpointed: lock contention.'
      },
      {
        time: '19:04:24',
        stage: 'DECIDE',
        actor: 'AEGIS_AGENT',
        message: 'Remediation plan generated with safety verification score 9.9/10. Ready for execution.'
      }
    ]
  },
  {
    id: 'INC-8922',
    title: 'Postgres Connection Pool Exhaustion on Checkout Gateway',
    service: 'checkout-billing-db',
    cluster: 'k8s-prod-eu-west-1',
    region: 'eu-west-1 (Frankfurt)',
    severity: 'P2-HIGH',
    status: 'INVESTIGATING',
    startedAt: '8 mins ago',
    blastRadius: 'Payment Processing in EMEA',
    affectedUsers: 48200,
    errorRate: '+14.2% (HTTP 500)',
    latencyDelta: '+920ms',
    description: 'PgBouncer connection pool reached 498/500 allocated client sockets. Long-running analytical query from automated compliance scan holding shared table locks.',
    rootCause: 'Unoptimized analytical query bypass on primary read-write replica without query timeout cancellation enabled.',
    hypotheses: [
      'Unindexed JOIN in v2 billing reconcile worker',
      'Zombie transactions left open by disconnected gRPC clients',
      'PgBouncer max_client_conn ceiling miscalculated'
    ],
    autonomousRemediationAvailable: true,
    remediationAction: {
      title: 'Terminate Idle Transactions & Reroute Compliance Queries',
      description: 'Force terminates idle transactions in state older than 20 seconds, diverts analytical queries to dedicated read-replica pool, and sets statement_timeout = 5000ms.',
      command: 'aegis-sre db-remediate --cluster checkout-primary --kill-idle-older-than 20s --reroute-analytics-read-replica',
      riskLevel: 'LOW',
      estimatedRecoveryTime: '~12 seconds'
    },
    memories: [
      {
        id: 'MEM-E-6102',
        timestamp: '28 days ago',
        tier: 'EPISODIC',
        title: 'Prior Incident INC-6102: End-of-Month Billing Thread Lock',
        summary: 'Nightly reconciliation script held row-level lock on payment_methods table. PgBouncer pool saturated in 4 minutes. Resolved by terminating backend PID and enforcing statement_timeout.',
        confidence: 94.2,
        vectorDistance: 0.124,
        source: 'Vector Store (Cosine Similarity: 0.942)',
        tokensUsed: 380,
        actionTaken: 'Terminated backend pid + statement timeout',
        relatedService: 'checkout-billing-db',
        tags: ['postgres', 'pgbouncer', 'connection-pool', 'lock']
      },
      {
        id: 'MEM-S-220',
        timestamp: 'Persistent Topology',
        tier: 'SEMANTIC',
        title: 'Database Architecture & Pool Routing Map',
        summary: 'Primary Write Node has 3 Read Replicas with asynchronous replication lag < 12ms. Compliance worker is authorized to run exclusively on Replica #3.',
        confidence: 99.1,
        source: 'Database Topology Metadata',
        tags: ['read-replicas', 'pgbouncer', 'compliance-rule']
      },
      {
        id: 'MEM-W-994',
        timestamp: '1 min ago',
        tier: 'WORKING',
        title: 'Active Query Inspection (pg_stat_activity)',
        summary: 'Identified PID 18942 running SELECT * FROM audit_ledger WHERE created_at > ... duration 324s. Flagged as primary blocking lock.',
        confidence: 97.8,
        source: 'Live Telemetry Inspection',
        tokensUsed: 890,
        tags: ['active-pid', 'blocking-lock', 'safe-to-terminate']
      }
    ],
    timeline: [
      {
        time: '18:58:02',
        stage: 'DETECT',
        actor: 'TELEMETRY',
        message: 'PgBouncer connection pool warning: Pool utilization exceeded 95% threshold.'
      },
      {
        time: '18:58:30',
        stage: 'ANALYZE',
        actor: 'AEGIS_AGENT',
        message: 'Identified rogue unindexed query holding shared table lock for 320+ seconds.'
      },
      {
        time: '18:59:12',
        stage: 'RECALL',
        actor: 'AEGIS_AGENT',
        message: 'Episodic memory matched INC-6102. Verified standard recovery procedure.'
      }
    ]
  },
  {
    id: 'INC-8923',
    title: 'Kafka Consumer Lag Spike in Real-Time Audit Pipeline',
    service: 'kafka-event-pipeline',
    cluster: 'k8s-prod-ap-southeast-1',
    region: 'ap-southeast-1 (Singapore)',
    severity: 'P3-MEDIUM',
    status: 'TRIAGED',
    startedAt: '24 mins ago',
    blastRadius: 'Audit Logging & Async Notification Delay',
    affectedUsers: 12000,
    errorRate: '0.2% (Delayed)',
    latencyDelta: '+4,200ms queue lag',
    description: 'Consumer partition 7 through 12 lag escalated to 1.8M messages following JVM stop-the-world Garbage Collection pause in audit ingest worker.',
    rootCause: 'Heap memory fragmentation causing extended G1GC full pause (>14s), triggering Kafka consumer group heartbeat rebalance storm.',
    hypotheses: [
      'JVM heap undersized for payload batch size',
      'Partition rebalance loop caused by max.poll.interval.ms timeout',
      'Slow downstream S3 sink throughput bottleneck'
    ],
    autonomousRemediationAvailable: true,
    remediationAction: {
      title: 'Autoscale Consumer Replicas & Optimize JVM GC Tunables',
      description: 'Scales consumer deployment from 6 to 18 pods, dynamically updates max.poll.interval.ms to 600000ms, and resets partition assignments.',
      command: 'kubectl scale deployment/audit-consumer --replicas=18 -n event-bus',
      riskLevel: 'LOW',
      estimatedRecoveryTime: '~45 seconds'
    },
    memories: [
      {
        id: 'MEM-E-5180',
        timestamp: '45 days ago',
        tier: 'EPISODIC',
        title: 'Prior Incident INC-5180: Rebalance Loop during Ingestion Spike',
        summary: 'Resolved consumer lag accumulation by horizontally scaling workers and tuning cooperative-sticky rebalance assignor.',
        confidence: 89.5,
        vectorDistance: 0.18,
        source: 'Vector Store (Cosine Similarity: 0.895)',
        tokensUsed: 310,
        actionTaken: 'Autoscale pods + switch assignor',
        relatedService: 'kafka-event-pipeline',
        tags: ['kafka', 'consumer-lag', 'jvm-gc', 'rebalance']
      },
      {
        id: 'MEM-S-089',
        timestamp: 'Persistent Topology',
        tier: 'SEMANTIC',
        title: 'Kafka Partition Mapping Spec',
        summary: 'Topic `audit-events-v1` has 24 partitions. Current consumer group has only 6 active pods, causing 4 partitions per worker overhead.',
        confidence: 100,
        source: 'Infrastructure Manifests',
        tags: ['kafka-topic', 'partition-topology', '24-partitions']
      }
    ],
    timeline: [
      {
        time: '18:42:10',
        stage: 'DETECT',
        actor: 'TELEMETRY',
        message: 'Kafka consumer lag alert triggered: Lag > 1,000,000 messages.'
      },
      {
        time: '18:43:00',
        stage: 'ANALYZE',
        actor: 'AEGIS_AGENT',
        message: 'Correlated JVM GC logs with consumer timeout. Verified no data loss.'
      }
    ]
  },
  {
    id: 'INC-8919',
    title: 'BGP Route Flap & Edge CDN Origin Request Loop',
    service: 'edge-router-anycast',
    cluster: 'global-pop-mesh',
    region: 'global-anycast',
    severity: 'P1-CRITICAL',
    status: 'RESOLVED',
    startedAt: '1 hour ago',
    resolvedAt: '48 mins ago',
    blastRadius: 'Global Ingress Traffic Routing',
    affectedUsers: 310000,
    errorRate: 'Normalized (was +52.1%)',
    latencyDelta: '18ms (was +3,100ms)',
    description: 'Upstream transit provider announced invalid route table flapping, sending edge POP traffic into circular proxy bounce.',
    rootCause: 'BGP community tag misconfiguration by upstream transit partner.',
    hypotheses: [
      'Upstream provider BGP route leak',
      'DDoS volumetric SYN flood on edge PoP'
    ],
    autonomousRemediationAvailable: true,
    remediationAction: {
      title: 'Withdraw BGP Flapping Route & Failover to Cloudflare Secondary',
      description: 'Automated ASN route withdrawal executed via BGP API. Successfully diverted 100% of global transit within 28 seconds.',
      command: 'aegis-sre edge withdraw --asn 13335 --failover-provider cloudflare-magic-transit',
      riskLevel: 'MEDIUM',
      estimatedRecoveryTime: '~30 seconds'
    },
    memories: [
      {
        id: 'MEM-E-3112',
        timestamp: '60 days ago',
        tier: 'EPISODIC',
        title: 'Prior Incident INC-3112: European Transit Provider Flap',
        summary: 'Emergency ASN withdrawal executed with zero packet drop by prepending 3 AS hops.',
        confidence: 97.2,
        vectorDistance: 0.09,
        source: 'Vector Store (Cosine Similarity: 0.972)',
        tokensUsed: 450,
        actionTaken: 'Withdrew BGP route and engaged secondary CDN',
        relatedService: 'edge-router-anycast',
        tags: ['bgp', 'cdn', 'anycast', 'route-flap']
      }
    ],
    timeline: [
      {
        time: '18:02:11',
        stage: 'DETECT',
        actor: 'TELEMETRY',
        message: 'Packet loss alert: Global PoP packet drop exceeded 15%.'
      },
      {
        time: '18:02:18',
        stage: 'RECALL',
        actor: 'AEGIS_AGENT',
        message: 'Retrieved incident memory INC-3112. Autonomous failover script validated.'
      },
      {
        time: '18:02:40',
        stage: 'EXECUTE',
        actor: 'AEGIS_AGENT',
        message: 'Executed automated BGP route withdraw command via edge API.'
      },
      {
        time: '18:03:08',
        stage: 'VERIFY',
        actor: 'AEGIS_AGENT',
        message: 'Health checks verified green across 48 global PoPs. Incident resolved in 57 seconds.'
      }
    ]
  }
];

export const INITIAL_METRICS = {
  activeIncidents: 3,
  criticalP1Count: 1,
  mttdSeconds: 4.2,
  mttrSeconds: 28.5,
  autonomousResolutionRate: 95.8,
  totalMemoriesIndexed: 14820,
  tokensProcessed: 894320
};
