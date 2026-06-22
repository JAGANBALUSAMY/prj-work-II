import React from 'react'
import { BarChart2, FileText, Package, Tag, Users, Clock } from 'lucide-react'

export default function MaturityPanel({ repo }) {
  const analysis = repo.analyses?.[0] || null
  const intel = analysis?.findings?.intelligence || {}
  const maturity = intel.maturity || null

  if (!maturity) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
        No maturity data available. Run analysis to calculate maturity score.
      </div>
    )
  }

  const { classification, score, reasoning, dimensions } = maturity

  const dimensionsList = [
    { name: 'Documentation', Icon: FileText, value: dimensions.documentation, desc: 'README completeness and onboarding guides.' },
    { name: 'Deployment', Icon: Package, value: dimensions.deployment, desc: 'Containerization and build validation status.' },
    { name: 'Release Cadence', Icon: Tag, value: dimensions.release_management, desc: 'Release tags and versioning practices.' },
    { name: 'Community', Icon: Users, value: dimensions.community, desc: 'Contributor diversity and engagement.' },
    { name: 'Maintenance', Icon: Clock, value: dimensions.maintenance, desc: 'Commit frequency and active development.' }
  ]

  const getTierStyles = (val) => {
    if (val >= 80) return {
      bar: 'bg-emerald-400',
      text: 'text-emerald-400',
      wrapper: 'bg-emerald-500/10 border-emerald-500/20'
    }
    if (val >= 60) return {
      bar: 'bg-teal-400',
      text: 'text-teal-400',
      wrapper: 'bg-teal-500/10 border-teal-500/20'
    }
    if (val >= 40) return {
      bar: 'bg-amber-400',
      text: 'text-amber-400',
      wrapper: 'bg-amber-500/10 border-amber-500/20'
    }
    return {
      bar: 'bg-rose-400',
      text: 'text-rose-400',
      wrapper: 'bg-rose-500/10 border-rose-500/20'
    }
  }

  const overallClass = 
    classification === 'Enterprise Grade' ? { label: classification, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
  : classification === 'Production Ready' ? { label: classification, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
  : classification === 'Intermediate' ? { label: classification, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' }
  : classification === 'Early Stage' ? { label: classification, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
  : { label: classification, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' }

  return (
    <div className="space-y-6 animate-fadeIn bg-bg-surface p-6 rounded-xl border border-border-subtle">
      {/* Overall Classification Header */}
      <div className="flex items-center justify-between p-5 rounded-lg border border-border-subtle bg-bg-panel/40">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-brand-indigo" />
          <div>
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">Overall Maturity Classification</span>
            <span className={`text-lg font-bold text-brand-indigo`}>{overallClass.label}</span>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-3 py-1 rounded border uppercase tracking-wider ${overallClass.bg} ${overallClass.color}`}>
          {score}% index
        </span>
      </div>
      
      <p className="text-xs text-text-secondary leading-relaxed font-light">{reasoning}</p>

      {/* Maturity Scale Reference - Gradient Track */}
      <div className="space-y-2 select-none">
        <div className="flex justify-between items-center text-[10px] text-text-secondary font-mono">
          <span>Maturity Progress</span>
          <span className="font-bold text-brand-indigo">{classification}</span>
        </div>
        <div className="relative w-full h-2 rounded-full bg-bg-input border border-border-subtle overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-indigo transition-all duration-1000"
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-text-muted font-mono uppercase tracking-wider font-bold">
          <span>Prototype</span>
          <span>Enterprise Grade</span>
        </div>
      </div>

      {/* Dimensions Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {dimensionsList.map((dim) => {
          const styles = getTierStyles(dim.value)
          
          return (
            <div key={dim.name} className="p-4 rounded-lg border border-border-subtle bg-bg-panel/20 flex flex-col gap-3 hover:border-border-glow transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded border ${styles.wrapper} ${styles.text}`}>
                  <dim.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">{dim.name}</span>
                    <span className={`text-[10px] font-bold ${styles.text}`}>{dim.value}/100</span>
                  </div>
                  <p className="text-[10px] text-text-secondary font-light leading-snug">{dim.desc}</p>
                </div>
              </div>
              <div className="h-1 bg-bg-input rounded-full overflow-hidden mt-auto">
                <div className={`h-full ${styles.bar} rounded-full`} style={{ width: `${dim.value}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
