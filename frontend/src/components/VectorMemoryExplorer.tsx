import React, { useState } from 'react';
import { Search, Database, Sparkles, ArrowRight } from 'lucide-react';
import { sound } from '../lib/sound';

interface VectorResult {
  id: string;
  service: string;
  incidentRef: string;
  similarity: number;
  snippet: string;
  tier: 'EPISODIC' | 'SEMANTIC' | 'WORKING';
  action: string;
}

const SAMPLE_QUERIES = [
  'Redis redlock distributed lock contention',
  'Postgres max_connections PgBouncer saturation',
  'Kafka partition consumer group rebalance loop',
  'BGP route flap edge transit packet loss'
];

export const VectorMemoryExplorer: React.FC = () => {
  const [query, setQuery] = useState('Redis redlock distributed lock contention');
  const [isSearching, setIsSearching] = useState(false);

  const sampleResults: VectorResult[] = [
    {
      id: 'VEC-9042',
      service: 'auth-session-cluster',
      incidentRef: 'INC-4029',
      similarity: 0.984,
      snippet: 'Encountered identical deadlock during Black Friday peak surge. Key eviction policy was set to `noeviction` under memory pressure. Remediated by atomic lock key flush and volatile-lru.',
      tier: 'EPISODIC',
      action: 'Runbook #42: Flush stale mutex + override maxmemory-policy'
    },
    {
      id: 'VEC-8812',
      service: 'session-redis-cache',
      incidentRef: 'TOPOLOGY-MAP',
      similarity: 0.912,
      snippet: 'Auth Session Cluster is downstream to Cloudflare edge workers and upstream to User Profile MySQL shard. Tier-0 SLA target: < 200ms latency.',
      tier: 'SEMANTIC',
      action: 'SLA Policy: Auto-scale replicas if CPU > 85% or p99 > 800ms'
    },
    {
      id: 'VEC-7419',
      service: 'checkout-billing-db',
      incidentRef: 'INC-6102',
      similarity: 0.841,
      snippet: 'PgBouncer connection starvation caused by runaway analytics query. Remediated with query timeout threshold and idle connection purge.',
      tier: 'EPISODIC',
      action: 'Terminated backend pid + enforced statement_timeout = 5s'
    }
  ];

  const handleSearch = (q: string) => {
    sound.playClick();
    setQuery(q);
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      sound.playSuccess();
    }, 400);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/90 p-6 shadow-2xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-mono font-bold text-white uppercase">
              Neural Vector Memory & Knowledge Explorer
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Search 14,820 indexed memory embeddings across episodic incident history, architecture topology graphs, and active scratchpad context.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Dimension: 1536-D (Cosine Metric)</span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
          placeholder="Query vector memory (e.g., 'Redis connection pool deadlock', 'Kafka rebalance storm')..."
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl pl-11 pr-24 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
        />
        <button
          onClick={() => handleSearch(query)}
          className="absolute right-2 top-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition"
        >
          {isSearching ? 'Querying...' : 'Search'}
        </button>
      </div>

      {/* Suggested Quick Queries */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-slate-500">Quick Recall:</span>
        {SAMPLE_QUERIES.map((sq) => (
          <button
            key={sq}
            onClick={() => handleSearch(sq)}
            className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>TOP SIMILARITY MATCHES</span>
          <span>THRESHOLD: &gt; 0.80 COSINE</span>
        </div>

        {sampleResults.map((res) => (
          <div
            key={res.id}
            className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 hover:border-cyan-500/40 transition-all space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs font-bold text-cyan-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  {res.id}
                </span>
                <span className="text-xs text-slate-400">Ref: {res.incidentRef}</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">{res.service}</span>
              </div>

              {/* Similarity score */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {(res.similarity * 100).toFixed(1)}% Similarity
                </span>
                <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                    style={{ width: `${res.similarity * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {res.snippet}
            </p>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{res.action}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-purple-300">
                {res.tier}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
