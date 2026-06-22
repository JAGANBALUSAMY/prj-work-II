import React from 'react'
import { Database, RefreshCw } from 'lucide-react'

export default function KPIStats({
  totalRepos = 0,
  activeReposCount = 0,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {/* Monitored Repos Card */}
      <div className="p-5 rounded-xl border border-border-subtle bg-bg-surface flex items-center justify-between relative overflow-hidden group hover:border-brand-indigo/35 transition duration-300">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Monitored Repositories</span>
          <h4 className="text-4xl font-light text-text-primary tracking-tight font-sans">{totalRepos}</h4>
          <p className="text-[10px] text-text-muted font-light">Index repositories verified in Vector database.</p>
        </div>
        <div className="p-3.5 rounded-xl bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo shrink-0">
          <Database className="w-5 h-5" />
        </div>
      </div>

      {/* Active Scan Jobs Card */}
      <div className="p-5 rounded-xl border border-border-subtle bg-bg-surface flex items-center justify-between relative overflow-hidden group hover:border-status-success/35 transition duration-300">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Active Run-Jobs</span>
          <h4 className={`text-4xl font-light tracking-tight font-sans ${activeReposCount > 0 ? 'text-status-success' : 'text-text-primary'}`}>{activeReposCount}</h4>
          <p className="text-[10px] text-text-muted font-light">LangGraph active scan worker processes.</p>
        </div>
        <div className={`p-3.5 rounded-xl bg-status-success-bg border border-status-success/20 text-status-success shrink-0 ${activeReposCount > 0 ? 'animate-pulse' : ''}`}>
          <RefreshCw className={`w-5 h-5 ${activeReposCount > 0 ? 'animate-spin' : ''}`} />
        </div>
      </div>
    </div>
  )
}
