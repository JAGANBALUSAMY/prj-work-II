import React from 'react'
import { Cpu, Layers, GitBranch, Box, Globe, Package } from 'lucide-react'

export default function ArchitecturePanel({ repo }) {
  const stack = repo.detected_stack || null
  const modules = stack?.modules || []
  
  const analysis = repo.analyses?.[0] || null
  const intel = analysis?.findings?.intelligence || {}
  const arch = intel.architecture || null

  if (!stack || !arch) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
        No technology stack data available. Run analysis to detect architecture.
      </div>
    )
  }

  const backend = stack.backend || []
  const frontend = stack.frontend || []
  const databases = stack.databases || []

  const archType = arch.architecture_type || 'Unknown Architecture'
  const archDesc = arch.reasoning || ''
  const archConf = arch.confidence || 0
  const assessment = arch.assessment || ''

  let archIcon = Package
  let archColor = 'text-text-muted'
  let archConfidence = archConf >= 90 ? 'High' : (archConf >= 75 ? 'Medium' : 'Low')

  if (archType.includes("Microservices") || archType.includes("Distributed")) {
    archIcon = GitBranch
    archColor = 'text-brand-cyan'
  } else if (archType.includes("MERN") || archType.includes("Full Stack")) {
    archIcon = Globe
    archColor = 'text-brand-indigo'
  } else if (archType.includes("Monolith")) {
    archIcon = Box
    archColor = 'text-brand-purple'
  } else if (archType.includes("Backend API")) {
    archIcon = Cpu
    archColor = 'text-emerald-400'
  } else if (archType.includes("Frontend Application")) {
    archIcon = Layers
    archColor = 'text-amber-400'
  }

  const ArchIcon = archIcon
  const confColor = archConfidence === 'High' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : archConfidence === 'Medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  : 'text-text-muted bg-bg-panel border-border-subtle'

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Architecture Type Hero */}
      <div className="p-6 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-brand-indigo/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-indigo/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border border-border-subtle bg-bg-panel ${archColor}`}>
            <ArchIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className={`text-base font-extrabold ${archColor}`}>{archType}</h3>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${confColor}`}>
                {archConf}% Confidence
              </span>
            </div>
            <p className="text-xs text-text-secondary font-light leading-relaxed mb-2">{archDesc}</p>
            <p className="text-[10px] text-brand-indigo/80 font-medium italic">{assessment}</p>
          </div>
        </div>
      </div>

      {/* Evidence */}
      {arch.evidence && arch.evidence.length > 0 && (
        <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle space-y-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Evidence</span>
          <ul className="list-disc list-inside space-y-1">
            {arch.evidence.map((ev, i) => (
              <li key={i} className="text-xs text-text-secondary font-light">{ev}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tech Stack Fingerprints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Backend', items: backend, color: 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20' },
          { label: 'Frontend', items: frontend, color: 'bg-brand-purple/10 text-brand-purple border-brand-purple/20' },
          { label: 'Databases', items: databases, color: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' },
        ].map(({ label, items, color }) => (
          <div key={label} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle space-y-2">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">{label}</span>
            {items.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {items.map(t => (
                  <span key={t} className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${color}`}>{t}</span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-text-muted italic font-light">None detected</span>
            )}
          </div>
        ))}
      </div>

      {/* Module Breakdown */}
      {modules.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            Detected Modules ({modules.length})
          </h4>
          <div className="space-y-2">
            {modules.map((mod, i) => (
              <div key={i} className="p-4 rounded-xl bg-bg-input border border-border-subtle flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-text-primary font-mono">{mod.path === 'root' ? '/ (root)' : mod.path}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                      mod.role === 'Frontend' ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/20' :
                      mod.role === 'Backend'  ? 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20' :
                      mod.role === 'Fullstack' ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' :
                      'bg-bg-panel text-text-muted border-border-subtle'
                    }`}>
                      {mod.role}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(mod.technologies || []).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-[9px] text-text-secondary">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
