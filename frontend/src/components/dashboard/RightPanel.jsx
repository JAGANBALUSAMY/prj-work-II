import React from 'react'
import { 
  Sparkles, AlertTriangle, ShieldAlert, Heart, Calendar, 
  Terminal, ArrowUpRight, CheckCircle2, RotateCw
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

export default function RightPanel({ 
  selectedRepo = null, 
  repos = [],
  onReanalyze = () => {},
  formatDate = (d) => d
}) {

  // Health categories computation
  const getHealthDetails = (repo) => {
    if (!repo) return null
    const analysis = repo.analyses?.[0] || null
    const repro = analysis?.reproducibility_score || 0
    const surv = analysis?.survivability_score || 0
    const composite = Math.round((repro + surv) / 2)

    // Last commit days ago calculation
    let daysAgo = 0
    if (repo.last_commit_date) {
      const commitDate = new Date(repo.last_commit_date)
      const diffTime = Math.abs(new Date() - commitDate)
      daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    if (repo.status === 'failed' || (analysis && composite < 40)) {
      return { label: 'Abandoned', badge: 'badge-abandoned', desc: 'Critical stability failure or score under 40%' }
    }
    if (repo.last_commit_date && daysAgo > 180) {
      return { label: 'Dormant', badge: 'badge-dormant', desc: 'No commit activity in the last 6 months' }
    }
    if (composite >= 85) {
      return { label: 'Elite', badge: 'badge-elite', desc: 'Excellent reproducibility and maintenance' }
    }
    if (composite >= 70) {
      return { label: 'Healthy', badge: 'badge-healthy', desc: 'Solid documentation and passing build' }
    }
    return { label: 'At Risk', badge: 'badge-atrisk', desc: 'Vulnerable dependencies or undocumented environment variables' }
  }

  // --- 1. Repos Scoped Details ---
  if (selectedRepo) {
    const health = getHealthDetails(selectedRepo)
    const envVars = selectedRepo.environment_profile?.variables || []
    const missingEnv = envVars.filter(v => v.is_missing_from_template)
    const depReport = selectedRepo.dependencies_profile?.report || {}
    const buildResult = selectedRepo.build_result || null
    const aiSummary = selectedRepo.detected_stack?.ai_analysis || null

    const alerts = []
    if (buildResult && !buildResult.build_success) {
      alerts.push({ type: 'error', text: 'Build is currently failing' })
    }
    if (missingEnv.length > 0) {
      alerts.push({ type: 'warning', text: `${missingEnv.length} environment variables missing from .env templates` })
    }
    if (depReport.duplicates?.length > 0) {
      alerts.push({ type: 'warning', text: `${depReport.duplicates.length} duplicate packages declared` })
    }
    if (depReport.suspicious_declarations?.length > 0) {
      alerts.push({ type: 'error', text: `${depReport.suspicious_declarations.length} suspicious dependencies found` })
    }
    if (!selectedRepo.documentation_profile?.scanned_file || selectedRepo.documentation_profile?.scanned_file === 'None') {
      alerts.push({ type: 'warning', text: 'README file is missing or incomplete' })
    }

    return (
      <div className="space-y-6">
        {/* Scoped Health Header */}
        <div className="space-y-3">
          <span className="text-[9px] text-text-muted font-extrabold uppercase tracking-widest block">
            Repository Health
          </span>
          <div className={`p-4.5 rounded-2xl border flex items-center justify-between gap-4 ${health.badge}`}>
            <div>
              <h4 className="text-sm font-black font-sans uppercase tracking-wider">{health.label}</h4>
              <p className="text-[10px] text-text-secondary font-light mt-0.5 leading-normal">{health.desc}</p>
            </div>
            <Heart className="w-5 h-5 shrink-0 animate-pulse" />
          </div>
        </div>

        {/* Health Alerts */}
        <div className="space-y-3">
          <span className="text-[9px] text-text-muted font-extrabold uppercase tracking-widest block">
            Health Alerts ({alerts.length})
          </span>
          {alerts.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-status-success-bg border border-status-success/20 text-status-success text-[10px] flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              All reproducibility flags are healthy
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {alerts.map((alert, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-xl border text-[10px] flex items-start gap-2.5 leading-relaxed font-medium ${
                    alert.type === 'error' 
                      ? 'bg-status-error-bg border-status-error/15 text-status-error' 
                      : 'bg-status-warning-bg border-status-warning/15 text-status-warning'
                  }`}
                >
                  {alert.type === 'error' ? (
                    <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  )}
                  <span>{alert.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights Feed */}
        <div className="space-y-3">
          <span className="text-[9px] text-text-muted font-extrabold uppercase tracking-widest block">
            AI Insights Feed
          </span>
          <div className="p-4 rounded-xl border border-border-subtle bg-bg-panel/40 space-y-3">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-brand-purple uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Context Analysis
            </div>
            {aiSummary?.executive_summary ? (
              <p className="text-[10px] text-text-secondary leading-relaxed font-light line-clamp-6" title={aiSummary.executive_summary}>
                {aiSummary.executive_summary}
              </p>
            ) : (
              <p className="text-[10px] text-text-muted italic font-light">
                Run analysis with an active AI endpoint to generate a summary.
              </p>
            )}
          </div>
        </div>

        {/* Live Recommendations */}
        <div className="space-y-3">
          <span className="text-[9px] text-text-muted font-extrabold uppercase tracking-widest block">
            Recommendations
          </span>
          <div className="space-y-2">
            {buildResult && !buildResult.build_success && (
              <div className="p-3 rounded-xl border border-border-subtle bg-bg-panel/30 flex items-center justify-between text-[10px] font-semibold text-text-secondary hover:text-text-primary transition group hover:border-brand-purple/40">
                <span>View container failure logs</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-purple transition" />
              </div>
            )}
            {missingEnv.length > 0 && (
              <div className="p-3 rounded-xl border border-border-subtle bg-bg-panel/30 flex items-center justify-between text-[10px] font-semibold text-text-secondary hover:text-text-primary transition group hover:border-brand-indigo/40">
                <span>Reconstruct config template</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-indigo transition" />
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReanalyze(selectedRepo)}
              icon={RotateCw}
              className="w-full text-[10px]"
            >
              Re-run Diagnostics
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- 2. Global View Aggregated Details ---
  const historyRepos = repos.filter(r => !(r.status === 'cloning' || (r.analyses && r.analyses.some(a => a.status === 'running'))))
  
  // Aggregate Health counts
  const healthStats = { elite: 0, healthy: 0, atrisk: 0, dormant: 0, abandoned: 0 }
  historyRepos.forEach(r => {
    const h = getHealthDetails(r)
    if (h) {
      if (h.label === 'Elite') healthStats.elite++
      else if (h.label === 'Healthy') healthStats.healthy++
      else if (h.label === 'At Risk') healthStats.atrisk++
      else if (h.label === 'Dormant') healthStats.dormant++
      else if (h.label === 'Abandoned') healthStats.abandoned++
    }
  })

  // Count aggregate alerts
  let totalMissingEnv = 0
  let totalDuplicates = 0
  let totalBuildFails = 0

  historyRepos.forEach(r => {
    totalMissingEnv += (r.environment_profile?.variables || []).filter(v => v.is_missing_from_template).length
    totalDuplicates += r.dependencies_profile?.report?.duplicates?.length || 0
    if (r.build_result && !r.build_result.build_success) totalBuildFails++
  })

  return (
    <div className="space-y-6">
      {/* Global Health Status Card */}
      <div className="space-y-3">
        <span className="text-[9px] text-text-muted font-extrabold uppercase tracking-widest block">
          SaaS Health Matrix
        </span>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          {[
            { label: 'Elite', count: healthStats.elite, bg: 'badge-elite' },
            { label: 'Healthy', count: healthStats.healthy, bg: 'badge-healthy' },
            { label: 'At Risk', count: healthStats.atrisk, bg: 'badge-atrisk' },
            { label: 'Abandoned', count: healthStats.abandoned, bg: 'badge-abandoned' }
          ].map(h => (
            <div key={h.label} className={`p-3 rounded-xl border flex flex-col justify-center ${h.bg}`}>
              <span className="text-base font-extrabold">{h.count}</span>
              <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Aggregate Health Alerts */}
      <div className="space-y-3">
        <span className="text-[9px] text-text-muted font-extrabold uppercase tracking-widest block">
          System Core Risks
        </span>
        <div className="space-y-2">
          {totalBuildFails > 0 && (
            <div className="p-3 rounded-xl border border-status-error/15 bg-status-error-bg text-status-error text-[10px] flex items-center gap-2 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{totalBuildFails} codebases failing docker builds</span>
            </div>
          )}
          {totalMissingEnv > 0 && (
            <div className="p-3 rounded-xl border border-status-warning/15 bg-status-warning-bg text-status-warning text-[10px] flex items-center gap-2 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{totalMissingEnv} undocumented variables in code</span>
            </div>
          )}
          {totalDuplicates > 0 && (
            <div className="p-3 rounded-xl border border-status-warning/15 bg-status-warning-bg text-status-warning text-[10px] flex items-center gap-2 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{totalDuplicates} packages duplicated in manifest</span>
            </div>
          )}
          {totalBuildFails === 0 && totalMissingEnv === 0 && totalDuplicates === 0 && (
            <div className="p-3 rounded-xl bg-status-success-bg border border-status-success/20 text-status-success text-[10px] flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              All deployed repositories are reproduction healthy
            </div>
          )}
        </div>
      </div>

      {/* Global AI Guidance */}
      <div className="space-y-3">
        <span className="text-[9px] text-text-muted font-extrabold uppercase tracking-widest block">
          AI Recommendations
        </span>
        <div className="p-4 rounded-xl border border-border-subtle bg-bg-panel/40 space-y-2.5">
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-brand-purple uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Global Tip
          </div>
          <p className="text-[10px] text-text-secondary leading-relaxed font-light">
            Keep your dependency manifests updated. We recommend checking unpinned version definitions in Python/React package files.
          </p>
        </div>
      </div>
    </div>
  )
}
