import React from 'react'
import { ShieldAlert, Database, RefreshCw } from 'lucide-react'
import { CircularProgress } from '../ui/CircularProgress'

export default function KPIStats({
  avgReproducibility = 0,
  avgSurvivability = 0,
  totalRepos = 0,
  activeReposCount = 0,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Health Index Dials Panel */}
      <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-border-subtle flex flex-col justify-between space-y-6 relative overflow-hidden bg-gradient-to-b from-bg-surface to-bg-panel/40">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 text-brand-purple" />
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">System Stability Index</h3>
          </div>
          <p className="text-[10px] text-text-muted mt-1.5 leading-normal font-light">
            System-wide averages calculated across all scanned environment files.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 py-2">
          <CircularProgress 
            score={avgReproducibility} 
            label="Reproducibility" 
          />
          <CircularProgress 
            score={avgSurvivability} 
            label="Survivability" 
          />
        </div>
      </div>

      {/* Quick Metrics Statistics */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monitored Repos Card */}
        <div className="glass-panel p-6 rounded-2xl border border-border-subtle flex flex-col justify-between relative overflow-hidden group hover:border-brand-indigo/35 transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-indigo/3 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-indigo/5 transition duration-300"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Monitored Repositories</span>
            <div className="p-3 rounded-xl bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-6">
            <h4 className="text-5xl font-black text-text-primary tracking-tight font-sans">{totalRepos}</h4>
            <p className="text-[10px] text-text-muted mt-2 font-light">Index repositories verified in Vector database.</p>
          </div>
        </div>

        {/* Active scan jobs Card */}
        <div className="glass-panel p-6 rounded-2xl border border-border-subtle flex flex-col justify-between relative overflow-hidden group hover:border-status-success/35 transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-status-success-bg/30 rounded-full blur-2xl pointer-events-none group-hover:bg-status-success-bg/50 transition duration-300"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Active Run-Jobs</span>
            <div className={`p-3 rounded-xl bg-status-success-bg border border-status-success/20 text-status-success ${activeReposCount > 0 ? 'animate-pulse' : ''}`}>
              <RefreshCw className={`w-5 h-5 ${activeReposCount > 0 ? 'animate-spin' : ''}`} />
            </div>
          </div>
          <div className="mt-6">
            <h4 className="text-5xl font-black text-status-success tracking-tight font-sans">{activeReposCount}</h4>
            <p className="text-[10px] text-text-muted mt-2 font-light">LangGraph active scan worker processes.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
