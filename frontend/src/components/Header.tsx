import React from 'react';
import { ShieldAlert, Cpu, Volume2, VolumeX, Sparkles, PlusCircle, Radio } from 'lucide-react';
import { sound } from '../lib/sound';

interface HeaderProps {
  activeTab: 'feed' | 'memory' | 'replay' | 'submission';
  setActiveTab: (tab: 'feed' | 'memory' | 'replay' | 'submission') => void;
  autonomousMode: boolean;
  setAutonomousMode: (val: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onSimulateIncident: () => void;
  activeCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  autonomousMode,
  setAutonomousMode,
  soundEnabled,
  setSoundEnabled,
  onSimulateIncident,
  activeCount
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.playClick();
  };

  const handleTabClick = (tab: 'feed' | 'memory' | 'replay' | 'submission') => {
    sound.playClick();
    setActiveTab(tab);
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Status */}
        <div className="flex items-center space-x-4">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 shadow-lg shadow-cyan-500/10">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
                AegisPulse SRE
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                v2.4-NEURAL
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Autonomous Incident Command
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                Live Agent Active
              </span>
            </h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => handleTabClick('feed')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Live Incident Feed</span>
            {activeCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'feed' ? 'bg-slate-950 text-cyan-400' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {activeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabClick('memory')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'memory'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Memory Graph</span>
          </button>
          <button
            onClick={() => handleTabClick('submission')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'submission'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hackathon Package</span>
          </button>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center space-x-3">
          {/* Autonomous Mode Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              setAutonomousMode(!autonomousMode);
            }}
            title="Toggle autonomous SRE agent auto-resolution"
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-2 transition-all ${
              autonomousMode
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autonomousMode ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{autonomousMode ? 'AUTO-REMEDIATE: ON' : 'HUMAN APPROVAL: ON'}</span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-slate-700 transition"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Simulate Chaos Incident */}
          <button
            onClick={onSimulateIncident}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Simulate P1 Outage</span>
          </button>
        </div>
      </div>
    </header>
  );
};
