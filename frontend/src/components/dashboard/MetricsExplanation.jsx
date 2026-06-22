import React from 'react'
import { GraduationCap, Target, Hammer, Database, Terminal, BookOpen } from 'lucide-react'

export default function MetricsExplanation() {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Core Scores */}
        <div className="glass-panel p-6 rounded-2xl border border-border-subtle space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-brand-purple" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Core Analysis Scores</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-bg-panel/40 p-4 rounded-xl border border-border-subtle">
              <h4 className="text-xs font-bold text-brand-cyan uppercase tracking-wider mb-1">Reproducibility Score</h4>
              <p className="text-[11px] text-text-muted font-light leading-relaxed">
                Measures how easily another developer or system can clone and build the application from scratch without manual intervention. A high score means the repository is essentially "plug-and-play".
              </p>
            </div>
            
            <div className="bg-bg-panel/40 p-4 rounded-xl border border-border-subtle">
              <h4 className="text-xs font-bold text-brand-purple uppercase tracking-wider mb-1">Survivability Score</h4>
              <p className="text-[11px] text-text-muted font-light leading-relaxed">
                Evaluates the architectural health, dependency freshness, and long-term maintainability of the codebase. A high score indicates the project is resilient to "bit rot" and easy to update.
              </p>
            </div>
          </div>
        </div>

        {/* Grading Scale */}
        <div className="glass-panel p-6 rounded-2xl border border-border-subtle space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-brand-cyan" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Grading Scale</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-bg-panel/40 p-3 rounded-xl border border-border-subtle">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg bg-green-500/20 text-green-400 border border-green-500/30">A</div>
              <div>
                <div className="text-[11px] font-bold text-text-primary">Excellent (90-100)</div>
                <div className="text-[10px] text-text-muted font-light">Production-ready, fully documented, and containerized.</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-bg-panel/40 p-3 rounded-xl border border-border-subtle">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">B</div>
              <div>
                <div className="text-[11px] font-bold text-text-primary">Good (75-89)</div>
                <div className="text-[10px] text-text-muted font-light">Solid foundation but missing some configuration robustness.</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-bg-panel/40 p-3 rounded-xl border border-border-subtle">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">C</div>
              <div>
                <div className="text-[11px] font-bold text-text-primary">Fair (50-74)</div>
                <div className="text-[10px] text-text-muted font-light">Compiles, but lacks proper environment setup or documentation.</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-bg-panel/40 p-3 rounded-xl border border-border-subtle">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg bg-red-500/20 text-red-400 border border-red-500/30">F</div>
              <div>
                <div className="text-[11px] font-bold text-text-primary">Poor (0-49)</div>
                <div className="text-[10px] text-text-muted font-light">Fails to build or requires heavy manual intervention.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-metrics */}
      <div className="glass-panel p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Component Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-bg-panel/40 p-4 rounded-xl border border-border-subtle flex flex-col gap-2">
            <div className="flex items-center gap-2 text-brand-purple">
              <Terminal className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Environment</span>
            </div>
            <p className="text-[10px] text-text-muted font-light leading-relaxed">
              Assesses whether required environment templates (like .env.example) are provided, populated correctly, and structurally sound.
            </p>
          </div>

          <div className="bg-bg-panel/40 p-4 rounded-xl border border-border-subtle flex flex-col gap-2">
            <div className="flex items-center gap-2 text-brand-cyan">
              <Hammer className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Container Support</span>
            </div>
            <p className="text-[10px] text-text-muted font-light leading-relaxed">
              Checks if the repository includes a valid Dockerfile or docker-compose.yml to allow for isolated, deterministic execution.
            </p>
          </div>

          <div className="bg-bg-panel/40 p-4 rounded-xl border border-border-subtle flex flex-col gap-2">
            <div className="flex items-center gap-2 text-brand-purple">
              <Database className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Dependency Health</span>
            </div>
            <p className="text-[10px] text-text-muted font-light leading-relaxed">
              Evaluates if package dependencies are strictly pinned to specific versions to prevent breaking changes when building.
            </p>
          </div>

          <div className="bg-bg-panel/40 p-4 rounded-xl border border-border-subtle flex flex-col gap-2">
            <div className="flex items-center gap-2 text-brand-cyan">
              <BookOpen className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Documentation</span>
            </div>
            <p className="text-[10px] text-text-muted font-light leading-relaxed">
              Measures the thoroughness of the README regarding system requirements, local setup instructions, and execution commands.
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}
