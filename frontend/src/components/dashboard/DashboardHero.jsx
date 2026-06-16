import React from 'react'
import { Plus, Clock } from 'lucide-react'
import { Button } from '../ui/Button'

export default function DashboardHero({ onScanNew, onViewHistory }) {
  return (
    <div className="glass-panel p-8 md:p-12 rounded-3xl border border-border-subtle shadow-2xl relative overflow-hidden bg-gradient-to-br from-bg-surface via-brand-indigo/3 to-brand-purple/3">
      {/* Glow blobs inside hero card */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-indigo/10 to-brand-purple/10 rounded-full blur-3xl pointer-events-none animate-slow-pulse"></div>
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-brand-cyan/3 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-3xl space-y-6 relative z-10">
        <span className="px-3 py-1 rounded-full text-[9px] font-extrabold tracking-widest uppercase bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20 shadow-inner">
          SYSTEM LIVE CORE STATUS
        </span>
        <h2 className="text-3xl md:text-5xl font-black text-text-primary leading-tight font-sans tracking-tight">
          Evaluate Repository Health & <br />
          <span className="text-gradient">Onboarding Reproducibility</span>
        </h2>
        <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-2xl font-light">
          Evaluate dependency drift, code decay, missing environment templates, and documentation gaps using an automated multi-agent LangGraph workflow pipeline.
        </p>
        <div className="pt-4 flex flex-wrap gap-4">
          <Button 
            variant="primary" 
            size="lg"
            onClick={onScanNew}
            icon={Plus}
          >
            Scan New Codebase
          </Button>
          <Button 
            variant="secondary" 
            size="lg"
            onClick={onViewHistory}
            icon={Clock}
          >
            Historical Logs
          </Button>
        </div>
      </div>
    </div>
  )
}
