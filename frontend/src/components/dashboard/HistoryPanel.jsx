import React, { useState } from 'react'
import { 
  Clock, Trash2, Github, Star, GitFork, AlertCircle, 
  CheckCircle, ShieldAlert, Users, Calendar, ExternalLink, 
  Database, Code, Terminal, BookOpen, Layers, HeartHandshake,
  ChevronRight, ArrowRight, Sparkles, Brain, Check, XCircle,
  Hammer, Wrench, Download, Zap, Cpu, BarChart2, TrendingDown,
  MapPin, Activity, ListChecks
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { CircularProgress } from '../ui/CircularProgress'
import { Tooltip } from '../ui/Tooltip'
// Intelligence Center Components
import ExecutiveIntelligencePanel from '../intelligence/ExecutiveIntelligencePanel'
import ArchitecturePanel from '../intelligence/ArchitecturePanel'
import MaturityPanel from '../intelligence/MaturityPanel'
import DependencyIntelligencePanel from '../intelligence/DependencyIntelligencePanel'
import BuildReproducibilityPanel from '../intelligence/BuildReproducibilityPanel'
import AIReasoningPanel from '../intelligence/AIReasoningPanel'
import RiskForecastPanel from '../intelligence/RiskForecastPanel'
import ActionPlanPanel from '../intelligence/ActionPlanPanel'
import ExecutionGuidePanel from '../intelligence/ExecutionGuidePanel'
import VisualizationsPanel from '../intelligence/VisualizationsPanel'
import EnvironmentIntelligencePanel from '../intelligence/EnvironmentIntelligencePanel'

export default function HistoryPanel({
  repos = [],
  selectedRepo,
  onSelectRepo,
  onDeleteRepo,
  onDeleteAll,
  onDownloadReport,
  onReanalyze,
  activeTab,
  onActiveTabChange,
  formatDate,
}) {
  const [depSearch, setDepSearch] = useState('')
  const [depFilter, setDepFilter] = useState('all') // all, production, development, direct, warnings
  const [envCopied, setEnvCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest') // newest, score_desc, score_asc, name

  const historyRepos = repos.filter(r => !(r.status === 'cloning' || (r.analyses && r.analyses.some(a => a.status === 'running'))))

  // Sort and filter the history list
  const filteredRepos = historyRepos.filter(repo => {
    const query = searchQuery.toLowerCase()
    return (
      repo.name.toLowerCase().includes(query) ||
      (repo.owner && repo.owner.toLowerCase().includes(query)) ||
      (repo.description && repo.description.toLowerCase().includes(query))
    )
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at) - new Date(a.created_at)
    }
    const scoreA = a.analyses?.[0] ? Math.round(((a.analyses[0].reproducibility_score || 0) + (a.analyses[0].survivability_score || 0)) / 2) : 0
    const scoreB = b.analyses?.[0] ? Math.round(((b.analyses[0].reproducibility_score || 0) + (b.analyses[0].survivability_score || 0)) / 2) : 0
    if (sortBy === 'score_desc') {
      return scoreB - scoreA
    }
    if (sortBy === 'score_asc') {
      return scoreA - scoreB
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    }
    return 0
  })

  // Handle environment template copying
  const handleCopyText = (template) => {
    navigator.clipboard.writeText(template)
    setEnvCopied(true)
    setTimeout(() => setEnvCopied(false), 2000)
  }

  const renderAIInsightsTab = (repo) => {
    const aiDoc = repo.documentation_profile?.ai_analysis || null
    const aiDep = repo.dependencies_profile?.ai_analysis || null
    const aiSummary = repo.detected_stack?.ai_analysis || null

    if (!aiDoc && !aiDep && !aiSummary) {
      return (
        <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
          No AI-powered insights cataloged for this repository yet. Run analysis again to invoke AI agents.
        </div>
      )
    }

    const getHealthColor = (health) => {
      const h = (health || '').toLowerCase()
      if (h === 'good') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      if (h === 'moderate' || h === 'fair') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Executive summary card */}
        {aiSummary && (
          <Card className="p-6 border border-border-subtle bg-bg-panel/25 relative overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-brand-purple" />
                <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wide">Repository Executive Summary</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${getHealthColor(aiSummary.repository_health)}`}>
                Health: {aiSummary.repository_health}
              </span>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed font-light mb-6">
              {aiSummary.executive_summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2.5">
                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Strengths
                </span>
                <ul className="space-y-2">
                  {(aiSummary.strengths || []).map((s, i) => (
                    <li key={`str-${i}`} className="text-xs text-text-secondary flex items-start gap-2 font-light">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Risks & Weaknesses
                </span>
                <ul className="space-y-2">
                  {(aiSummary.weaknesses || []).map((w, i) => (
                    <li key={`weak-${i}`} className="text-xs text-text-secondary flex items-start gap-2 font-light">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documentation Assessment Card */}
          {aiDoc && (
            <Card className="p-6 border border-border-subtle bg-bg-panel/20">
              <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4.5 h-4.5 text-brand-indigo" />
                  <h3 className="text-xs font-extrabold text-text-primary uppercase tracking-wide">Documentation Quality</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getHealthColor(aiDoc.documentation_quality)}`}>
                    {aiDoc.documentation_quality}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-bg-panel border border-border-subtle text-text-muted text-[9px] font-bold uppercase tracking-wider">
                    Setup: {aiDoc.setup_difficulty_estimate}
                  </span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed font-light mb-4">
                {aiDoc.summary}
              </p>

              <div className="space-y-4">
                {aiDoc.missing_documentation_areas?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block">Missing Documentation Areas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiDoc.missing_documentation_areas.map((area, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-rose-500/5 text-rose-300 border border-rose-500/10 text-[9px] font-medium">{area}</span>
                      ))}
                    </div>
                  </div>
                )}

                {aiDoc.improvement_recommendations?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block">Recommendations</span>
                    <ul className="space-y-1.5">
                      {aiDoc.improvement_recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-text-secondary flex items-start gap-2 font-light">
                          <ChevronRight className="w-3.5 h-3.5 text-brand-indigo mt-0.5 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Dependency Risk Card */}
          {aiDep && (
            <Card className="p-6 border border-border-subtle bg-bg-panel/20">
              <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-brand-cyan" />
                  <h3 className="text-xs font-extrabold text-text-primary uppercase tracking-wide">Dependency Risk Assessment</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getHealthColor(aiDep.risk_level)}`}>
                  Risk: {aiDep.risk_level}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block mb-1">Health Summary</span>
                  <p className="text-xs text-text-secondary leading-relaxed font-light">
                    {aiDep.dependency_health_summary}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block mb-1">Version Pinning</span>
                  <p className="text-xs text-text-secondary leading-relaxed font-light">
                    {aiDep.version_pinning_assessment}
                  </p>
                </div>

                {aiDep.upgrade_suggestions?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block">Upgrade Suggestions</span>
                    <ul className="space-y-1.5">
                      {aiDep.upgrade_suggestions.map((sug, i) => (
                        <li key={i} className="text-xs text-text-secondary flex items-start gap-2 font-light">
                          <ChevronRight className="w-3.5 h-3.5 text-brand-cyan mt-0.5 shrink-0" />
                          <span>{sug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // --- Sub-renderers for Tabs ---
  const renderOverviewTab = (repo) => {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Acquisition Status banner */}
        <div className="p-4 rounded-xl bg-bg-panel/40 border border-border-subtle flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Acquisition status</span>
            <span className="text-xs font-bold text-text-primary mt-1 capitalize block">
              {repo.status === 'cloned' ? 'Git Repository Cached' : repo.status === 'failed' ? 'Pipeline Failure' : repo.status}
            </span>
          </div>
          <div>
            {repo.status === 'cloned' && <CheckCircle className="w-5 h-5 text-status-success" />}
            {repo.status === 'failed' && <ShieldAlert className="w-5 h-5 text-status-error" />}
          </div>
        </div>

        {/* Grid for Repo Metrics */}
        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Repository Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Stars', val: repo.stars || 0, icon: Star, color: 'text-amber-500' },
              { label: 'Forks', val: repo.forks || 0, icon: GitFork, color: 'text-brand-indigo' },
              { label: 'Open Issues', val: repo.open_issues || 0, icon: AlertCircle, color: 'text-status-error' },
              { label: 'Contributors', val: repo.contributors_count || 0, icon: Users, color: 'text-brand-cyan' }
            ].map((metric, i) => {
              const Icon = metric.icon
              return (
                <div key={i} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between h-20">
                  <span className="text-[10px] text-text-muted font-bold uppercase flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${metric.color}`} /> {metric.label}
                  </span>
                  <span className="text-lg font-bold text-text-primary mt-1">{metric.val}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detected Stack Panel */}
        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Fingerprints Detected</h3>
          {repo.detected_stack && (
            (repo.detected_stack.backend && repo.detected_stack.backend.length > 0) || 
            (repo.detected_stack.frontend && repo.detected_stack.frontend.length > 0) || 
            (repo.detected_stack.databases && repo.detected_stack.databases.length > 0)
          ) ? (
            <div className="p-4 rounded-xl bg-bg-input/80 border border-border-subtle space-y-3 shadow-inner">
              {repo.detected_stack.backend && repo.detected_stack.backend.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase w-20 shrink-0 font-mono">Backend:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {repo.detected_stack.backend.map(tech => (
                      <span key={tech} className="px-2 py-0.5 rounded bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20 text-[10px] font-semibold">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {repo.detected_stack.frontend && repo.detected_stack.frontend.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase w-20 shrink-0 font-mono">Frontend:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {repo.detected_stack.frontend.map(tech => (
                      <span key={tech} className="px-2 py-0.5 rounded bg-brand-purple/10 text-brand-purple border border-brand-purple/20 text-[10px] font-semibold">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {repo.detected_stack.databases && repo.detected_stack.databases.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase w-20 shrink-0 font-mono">Databases:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {repo.detected_stack.databases.map(tech => (
                      <span key={tech} className="px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 text-[10px] font-semibold">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-bg-panel/10 border border-border-subtle text-xs text-text-muted italic font-light">
              No technology fingerprints cataloged.
            </div>
          )}
        </div>

        {/* Description Card */}
        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Metadata Description</h3>
          <p className="text-xs text-text-secondary leading-relaxed bg-bg-panel/40 p-4 rounded-xl border border-border-subtle font-light">
            {repo.description || "No description cataloged for this repository."}
          </p>
        </div>

        {/* File Info / Timestamps */}
        <div className="space-y-3 text-xs bg-bg-panel/20 p-4 rounded-xl border border-border-subtle font-light">
          <div className="flex justify-between py-1.5 border-b border-border-subtle">
            <span className="text-text-tertiary flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-brand-indigo" /> Last Commit Date</span>
            <span className="text-text-secondary font-semibold">{formatDate(repo.last_commit_date)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border-subtle">
            <span className="text-text-tertiary flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-brand-purple" /> Analysis Timestamp</span>
            <span className="text-text-secondary font-semibold">{formatDate(repo.created_at)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border-subtle">
            <span className="text-text-tertiary flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5 text-brand-cyan" /> Repository URL</span>
            <a href={repo.clone_url} target="_blank" rel="noreferrer" className="text-brand-indigo hover:underline font-mono truncate max-w-xs flex items-center gap-1">
              {repo.clone_url} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {repo.local_path && (
            <div className="flex justify-between py-1.5">
              <span className="text-text-tertiary flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-text-muted" /> Disk Path</span>
              <span className="text-text-secondary font-mono truncate max-w-xs" title={repo.local_path}>
                {repo.local_path}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderDependenciesTab = (repo) => {
    if (!repo.dependencies_profile) {
      return (
        <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
          No dependency analysis cataloged.
        </div>
      )
    }

    const profile = repo.dependencies_profile
    const deps = profile.dependencies || []
    const report = profile.report || { duplicates: [], missing_versions: [], suspicious_declarations: [] }
    
    const filteredDeps = deps.filter(d => {
      const nameMatches = d.name.toLowerCase().includes(depSearch.toLowerCase())
      if (depFilter === 'all') return nameMatches
      if (depFilter === 'production') return nameMatches && (d.dependency_type === 'production' || d.dependency_type === 'compile')
      if (depFilter === 'development') return nameMatches && (d.dependency_type === 'development' || d.dependency_type === 'test')
      if (depFilter === 'direct') return nameMatches && d.dependency_type === 'direct'
      if (depFilter === 'warnings') {
        const isDup = report.duplicates.some(dup => dup.name.toLowerCase() === d.name.toLowerCase() && dup.source_file === d.source_file)
        const isMissing = !d.version || d.version === '*' || d.version === 'unspecified'
        const isSusp = report.suspicious_declarations.some(susp => susp.name.toLowerCase() === d.name.toLowerCase() && susp.source_file === d.source_file)
        return nameMatches && (isDup || isMissing || isSusp)
      }
      return nameMatches
    })

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* KPI summaries */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between">
            <span className="text-[10px] text-text-muted font-bold uppercase">Total Packages</span>
            <span className="text-xl font-bold text-text-primary mt-1">{report.total_count || 0}</span>
          </div>
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${report.duplicates?.length > 0 ? 'bg-status-warning-bg border-status-warning/20 text-status-warning' : 'bg-bg-panel/30 border-border-subtle text-text-muted'}`}>
            <span className="text-[10px] font-bold uppercase">Duplicates</span>
            <span className="text-xl font-bold text-text-primary mt-1">{report.duplicates?.length || 0}</span>
          </div>
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${report.missing_versions?.length > 0 ? 'bg-status-warning-bg border-status-warning/20 text-status-warning' : 'bg-bg-panel/30 border-border-subtle text-text-muted'}`}>
            <span className="text-[10px] font-bold uppercase">Missing Versions</span>
            <span className="text-xl font-bold text-text-primary mt-1">{report.missing_versions?.length || 0}</span>
          </div>
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${report.suspicious_declarations?.length > 0 ? 'bg-status-error-bg border-status-error/20 text-status-error' : 'bg-bg-panel/30 border-border-subtle text-text-muted'}`}>
            <span className="text-[10px] font-bold uppercase">Suspicious Ref</span>
            <span className="text-xl font-bold text-text-primary mt-1">{report.suspicious_declarations?.length || 0}</span>
          </div>
        </div>

        {/* Detailed Warnings Box */}
        {(report.duplicates?.length > 0 || report.missing_versions?.length > 0 || report.suspicious_declarations?.length > 0) && (
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-status-warning" />
              Security Warnings ({report.duplicates.length + report.missing_versions.length + report.suspicious_declarations.length})
            </h4>
            <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 select-all scrollbar-thin">
              {report.duplicates.map((dup, i) => (
                <div key={`dup-${i}`} className="p-3 rounded-xl bg-status-warning-bg border border-status-warning/20 text-xs text-status-warning flex items-start gap-2.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div className="font-light">Duplicate declaration: package <code className="font-semibold">{dup.name}</code> defined multiple times in <code>{dup.source_file}</code> (versions: {dup.versions.join(', ')}).</div>
                </div>
              ))}
              {report.missing_versions.map((m, i) => (
                <div key={`m-${i}`} className="p-3 rounded-xl bg-status-warning-bg border border-status-warning/20 text-xs text-status-warning flex items-start gap-2.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div className="font-light">Missing constraint: package <code className="font-semibold">{m.name}</code> in <code>{m.source_file}</code> version constraint unspecified.</div>
                </div>
              ))}
              {report.suspicious_declarations.map((s, i) => (
                <div key={`s-${i}`} className="p-3 rounded-xl bg-status-error-bg border border-status-error/20 text-xs text-status-error flex items-start gap-2.5">
                  <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div className="font-light">Suspicious declaration: package <code className="font-semibold">{s.name}</code> (version: <code>{s.version}</code>) in <code>{s.source_file}</code>. Reason: {s.reason}.</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            placeholder="Search package catalog..."
            value={depSearch}
            onChange={(e) => setDepSearch(e.target.value)}
            className="flex-1"
          />
          <select
            value={depFilter}
            onChange={(e) => setDepFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl glass-input text-xs text-text-secondary bg-bg-panel border border-border-subtle outline-none focus:border-brand-indigo"
          >
            <option value="all">All Dependencies</option>
            <option value="production">Production / Compile</option>
            <option value="development">Development / Test</option>
            <option value="direct">Direct (Python)</option>
            <option value="warnings">Warnings / Threats Only</option>
          </select>
        </div>

        {/* Packages Grid Table */}
        <div className="border border-border-subtle rounded-2xl overflow-hidden bg-bg-panel/20">
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bg-panel/85 border-b border-border-subtle text-text-muted font-bold uppercase tracking-wider">
                  <th className="p-3.5">Package</th>
                  <th className="p-3.5">Version</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Source File</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeps.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-text-muted italic font-light">
                      No packages cataloged in dependencies matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredDeps.map((d, idx) => {
                    const isDuplicate = report.duplicates.some(dup => dup.name.toLowerCase() === d.name.toLowerCase() && dup.source_file === d.source_file)
                    const isMissing = !d.version || d.version === '*' || d.version === 'unspecified'
                    const isSuspicious = report.suspicious_declarations.some(susp => susp.name.toLowerCase() === d.name.toLowerCase() && susp.source_file === d.source_file)
                    const hasWarning = isDuplicate || isMissing || isSuspicious
                    
                    return (
                      <tr key={idx} className="border-b border-border-subtle/50 hover:bg-bg-panel/40 transition">
                        <td className="p-3.5 font-bold text-text-secondary flex items-center gap-2">
                          {d.name}
                          {hasWarning && (
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSuspicious ? 'bg-status-error animate-ping' : 'bg-status-warning'}`}></span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-text-tertiary">
                          {d.version ? d.version : <span className="text-status-warning/80 italic font-sans text-[10px]">unspecified</span>}
                        </td>
                        <td className="p-3.5">
                          <span className={`
                            px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border
                            ${d.dependency_type === 'production' || d.dependency_type === 'compile' 
                              ? 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20' 
                              : d.dependency_type === 'development' || d.dependency_type === 'test' 
                                ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/20' 
                                : 'bg-bg-panel text-text-secondary border-border-subtle'
                            }
                          `}>
                            {d.dependency_type}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-text-muted text-[10px] select-all">{d.source_file}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderEnvironmentTab = (repo) => {
    if (!repo.environment_profile) {
      return (
        <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
          No environment variables profiles cataloged.
        </div>
      )
    }

    const profile = repo.environment_profile
    const vars = profile.variables || []
    const template = profile.template || ""
    const scannedCount = profile.scanned_files_count || 0
    const templatesFound = profile.template_files_found || []
    const missingVars = vars.filter(v => v.is_missing_from_template)

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* KPI stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between">
            <span className="text-[10px] text-text-muted font-bold uppercase">Total Variables</span>
            <span className="text-xl font-bold text-text-primary mt-1">{vars.length}</span>
          </div>
          <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between">
            <span className="text-[10px] text-text-muted font-bold uppercase">Scanned Files</span>
            <span className="text-xl font-bold text-text-primary mt-1">{scannedCount}</span>
          </div>
          <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between">
            <span className="text-[10px] text-text-muted font-bold uppercase">Templates Found</span>
            <span className="text-xs font-bold text-text-secondary mt-2 truncate" title={templatesFound.join(', ')}>{templatesFound.length > 0 ? templatesFound.join(', ') : 'None'}</span>
          </div>
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${missingVars.length > 0 ? 'bg-status-warning-bg border-status-warning/20 text-status-warning' : 'bg-bg-panel/30 border-border-subtle text-text-muted'}`}>
            <span className="text-[10px] font-bold uppercase">Undocumented Vars</span>
            <span className="text-xl font-bold text-text-primary mt-1">{missingVars.length}</span>
          </div>
        </div>

        {/* Missing Variables Warnings */}
        {missingVars.length > 0 && (
          <div className="p-4 rounded-xl bg-status-warning-bg border border-status-warning/20 text-xs text-status-warning space-y-2 animate-fadeIn">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px]">
              <ShieldAlert className="w-4 h-4 text-status-warning" /> Configuration Discrepancies
            </div>
            <p className="leading-relaxed font-light">The following variables are referenced in the codebase but missing from the project's config template files (like <code>.env.example</code>):</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {missingVars.map(v => (
                <span key={v.name} className="px-2 py-0.5 rounded bg-status-warning/10 border border-status-warning/20 text-status-warning font-mono text-[9px] select-all">{v.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Reconstructed env file template view */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Reconstructed .env Template</h4>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => handleCopyText(template)} 
              disabled={!template}
            >
              {envCopied ? <><CheckCircle className="w-3.5 h-3.5 text-status-success" /> Copied!</> : 'Copy Template'}
            </Button>
          </div>
          <pre className="p-4 rounded-xl bg-bg-input border border-border-subtle font-mono text-xs text-status-success overflow-x-auto max-h-[180px] shadow-inner select-all leading-relaxed whitespace-pre scrollbar-thin">
            {template || "# No variables cataloged to compile template."}
          </pre>
        </div>

        {/* Registry Table */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Environment Variable Registry</h4>
          <div className="border border-border-subtle rounded-2xl overflow-hidden bg-bg-panel/20">
            <div className="max-h-[260px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bg-panel/85 border-b border-border-subtle text-text-muted font-bold uppercase tracking-wider">
                    <th className="p-3.5">Variable Key</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Source Files</th>
                  </tr>
                </thead>
                <tbody>
                  {vars.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-text-muted italic font-light">
                        No variables registered.
                      </td>
                    </tr>
                  ) : (
                    vars.map((v, idx) => (
                      <tr key={idx} className="border-b border-border-subtle/50 hover:bg-bg-panel/40 transition">
                        <td className="p-3.5 font-bold font-mono text-text-secondary select-all">{v.name}</td>
                        <td className="p-3.5">
                          <span className={`
                            px-2 py-0.5 rounded text-[9px] font-bold uppercase border
                            ${v.is_missing_from_template 
                              ? 'bg-status-warning-bg text-status-warning border-status-warning/20' 
                              : 'bg-status-success-bg text-status-success border-status-success/20'
                            }
                          `}>
                            {v.is_missing_from_template ? 'Missing Template' : 'Documented'}
                          </span>
                        </td>
                        <td className="p-3.5 text-text-tertiary font-mono leading-relaxed select-all">
                          <div className="flex flex-wrap gap-1">
                            {v.sources.map((s, sIdx) => (
                              <span key={sIdx} className="bg-bg-input px-1.5 py-0.5 rounded border border-border-subtle text-[9px]" title={s}>
                                {s.split('/').pop()}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDocumentationTab = (repo) => {
    if (!repo.documentation_profile) {
      return (
        <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
          No documentation checks recorded.
        </div>
      )
    }

    const profile = repo.documentation_profile
    const score = profile.completeness_score || 0
    const scannedFile = profile.scanned_file || "None"
    const sections = profile.sections || []
    const suggestions = profile.suggestions || []
    const preview = profile.readme_preview || ""
    const detectedCount = sections.filter(s => s.found).length

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-1 flex justify-center">
            <CircularProgress 
              score={score} 
              label="Completeness Grade" 
              size={110} 
            />
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between">
              <span className="text-[10px] text-text-muted font-bold uppercase font-sans">Scanned File</span>
              <span className="text-xs font-bold text-text-secondary mt-2 truncate select-all" title={scannedFile}>
                {scannedFile !== "None" ? scannedFile : "README Not Found"}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between">
              <span className="text-[10px] text-text-muted font-bold uppercase font-sans">Detected Sections</span>
              <span className="text-xl font-bold text-text-primary mt-1">{detectedCount} / 6</span>
            </div>
            <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between col-span-2">
              <span className="text-[10px] text-text-muted font-bold uppercase font-sans">Documentation Insight</span>
              <span className="text-[11px] text-text-secondary mt-2 leading-relaxed font-light">
                {suggestions.length > 0 
                  ? `Detected ${suggestions.length} key recommendations to improve codebase onboarding setup layout.` 
                  : "Repository documentation matches completeness criteria."
                }
              </span>
            </div>
          </div>
        </div>

        {/* Suggestions Box */}
        {suggestions.length > 0 && (
          <div className="p-4 rounded-xl bg-status-warning-bg border border-status-warning/20 text-xs text-status-warning space-y-2 animate-fadeIn select-all">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px]">
              <ShieldAlert className="w-4 h-4 text-status-warning" /> Onboarding Recommendations
            </div>
            <ul className="list-disc pl-4 space-y-1.5 leading-relaxed font-light">
              {suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
            </ul>
          </div>
        )}

        {/* Sections checklist */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Onboarding Sections Evaluation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((sec, idx) => {
              let tagStyles = 'bg-status-success-bg text-status-success border-status-success/20'
              if (sec.score < 50) tagStyles = 'bg-status-error-bg text-status-error border-status-error/20'
              else if (sec.score < 80) tagStyles = 'bg-status-warning-bg text-status-warning border-status-warning/20'
              
              return (
                <div key={idx} className="p-4 rounded-xl bg-bg-panel/40 border border-border-subtle flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">{sec.category}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${tagStyles}`}>
                      {sec.score}%
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-normal font-light">{sec.details}</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    {sec.found ? (
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-status-success">
                        <CheckCircle className="w-3.5 h-3.5" /> Section Present
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-status-error">
                        <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> Section Missing
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Readme File preview */}
        {preview && (
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">File Preview ({scannedFile})</h4>
            <pre className="p-4 rounded-xl bg-bg-input border border-border-subtle font-mono text-[11px] text-text-secondary overflow-x-auto max-h-[220px] shadow-inner leading-relaxed whitespace-pre-wrap select-all scrollbar-thin">
              {preview}
            </pre>
          </div>
        )}
      </div>
    )
  }

  const renderReproducibilityTab = (repo) => {
    if (!repo.analyses || repo.analyses.length === 0) {
      return (
        <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
          No stability details recorded.
        </div>
      )
    }

    const analysis = repo.analyses[0]
    const findings = analysis.findings || {}
    const factors = findings.reproducibility_factors || {}

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-center py-2">
          <CircularProgress 
            score={analysis.reproducibility_score || 0} 
            label="Reproducibility Score" 
            size={110} 
          />
        </div>
        
        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Verification Factors</h3>
          <div className="space-y-3">
            {[
              { 
                label: "Dockerfile / Container Specs", 
                found: factors.has_dockerfile,
                badge: factors.has_dockerfile ? 'Found' : 'Missing',
                tag: factors.has_dockerfile ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-error-bg text-status-error border-status-error/20'
              },
              { 
                label: "README Setup Guidelines", 
                found: factors.has_readme,
                badge: factors.has_readme ? 'Found' : 'Missing',
                tag: factors.has_readme ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-error-bg text-status-error border-status-error/20'
              },
              { 
                label: "Installation Guidelines Grade", 
                found: true,
                badge: `${factors.environment_instructions_score || 0} / 10`,
                tag: 'bg-bg-panel text-text-primary border-border-subtle'
              }
            ].map((factor, i) => (
              <div key={i} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-purple"></span> 
                  <span className="text-xs text-text-secondary font-semibold">{factor.label}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${factor.tag}`}>
                  {factor.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Executive summary details text */}
        <div className="p-4 rounded-xl bg-bg-input border border-border-subtle select-all">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2.5">Executive Summary Report</h4>
          <p className="text-xs text-text-secondary leading-relaxed font-light whitespace-pre-wrap">{analysis.summary || "No stability report compiled."}</p>
        </div>
      </div>
    )
  }

  const renderSurvivabilityTab = (repo) => {
    if (!repo.analyses || repo.analyses.length === 0) {
      return (
        <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light animate-fadeIn">
          No survivability data recorded.
        </div>
      )
    }

    const analysis = repo.analyses[0]
    const findings = analysis.findings || {}
    const factors = findings.survivability_factors || {}
    const details = findings.survivability_details || null
    const prediction = findings.health_prediction || null

    const getCategoryBadgeClass = (category) => {
      const c = (category || '').toLowerCase()
      if (c === 'healthy') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      if (c === 'moderate') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      if (c === 'at risk') return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }

    const getPredictiveBadgeClass = (health) => {
      const h = (health || '').toLowerCase()
      if (h === 'healthy') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      if (h === 'at risk') return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      if (h === 'dormant') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }

    const getBarColor = (score) => {
      if (score >= 80) return 'bg-emerald-400'
      if (score >= 60) return 'bg-amber-400'
      if (score >= 30) return 'bg-orange-400'
      return 'bg-rose-400'
    }

    if (details) {
      const metrics = details.metrics || {}
      const rawStats = details.raw_stats || {}
      const riskFactors = details.risk_factors || []
      const days_ago = rawStats.last_commit_days_ago || 0
      
      const subMetrics = [
        { name: 'Commit Frequency', score: metrics.commit_frequency_score || 0, desc: `${rawStats.commit_count_1y || 0} commits in the last year` },
        { name: 'Release Frequency', score: metrics.release_frequency_score || 0, desc: `${rawStats.tags_count || 0} release tags found` },
        { name: 'Dependency Freshness', score: metrics.dependency_freshness_score || 0, desc: 'Constraint pinning and repository age' },
        { name: 'Contributor Activity', score: metrics.contributor_activity_score || 0, desc: `${rawStats.active_contributors_90d || 0} active, ${rawStats.total_contributors || 0} total contributors` },
        { name: 'Issue Resolution Rate', score: metrics.issue_resolution_score || 0, desc: `${rawStats.open_issues || 0} open issues` },
        { name: 'Security Risk Indicators', score: metrics.security_risks_score || 0, desc: 'Duplicate, unpinned, and suspicious packages' }
      ]

      return (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Cards Grid (Survivability + AI Prediction) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Core Survivability Card */}
            <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/25 flex flex-col sm:flex-row items-center justify-around gap-6">
              <div className="shrink-0 flex justify-center">
                <CircularProgress 
                  score={analysis.survivability_score || 0} 
                  label="Survivability Score" 
                  size={100} 
                />
              </div>
              
              <div className="space-y-3 text-center sm:text-left flex-1">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block font-mono">Health Classification</span>
                  <span className={`inline-block px-3 py-1 rounded-xl text-[11px] font-black border uppercase tracking-wider mt-1.5 ${getCategoryBadgeClass(details.health_category)}`}>
                    {details.health_category}
                  </span>
                </div>
                <p className="text-xs text-text-secondary font-light leading-relaxed">
                  The survivability index measures long-term project viability, maintenance speed, community activity, and architectural security resilience.
                </p>
              </div>
            </div>

            {/* Health Prediction Outcome Card */}
            {prediction ? (
              <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/25 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-brand-purple" />
                    <span className="text-xs font-extrabold text-text-primary uppercase tracking-wide">AI Health Prediction</span>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-[11px] font-black border uppercase tracking-wider ${getPredictiveBadgeClass(prediction.predicted_health)}`}>
                    {prediction.predicted_health}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-text-muted font-mono">
                    <span>Model Confidence</span>
                    <span>{Math.round(prediction.confidence * 100)}%</span>
                  </div>
                  <div className="w-full bg-bg-panel/60 h-1.5 rounded-full overflow-hidden border border-border-subtle">
                    <div 
                      className="h-full rounded-full bg-brand-purple" 
                      style={{ width: `${prediction.confidence * 100}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed font-light select-text">
                  {prediction.reasoning}
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/20 flex flex-col justify-center items-center text-center italic text-text-muted text-xs font-light">
                <Brain className="w-8 h-8 text-text-muted/30 mb-2 animate-pulse" />
                Predictive health model output not generated. Run analysis to trigger classification.
              </div>
            )}
          </div>

          {/* Risk Factors Section if any exist */}
          {riskFactors.length > 0 && (
            <Card className="p-5 border border-status-error/10 bg-status-error-bg/5 space-y-3">
              <span className="text-[10px] text-status-error font-extrabold uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-4 h-4" /> Detected Risk Factors ({riskFactors.length})
              </span>
              <ul className="space-y-2">
                {riskFactors.map((rf, i) => (
                  <li key={i} className="text-xs text-text-secondary flex items-start gap-2 font-light">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-error mt-1.5 shrink-0"></span>
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* 6 Upgraded Sub-Metrics grid */}
          <div>
            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Survivability Dimensions Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subMetrics.map((sm, i) => (
                <div key={i} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-primary">{sm.name}</span>
                    <span className="font-bold font-mono text-text-secondary">{sm.score}%</span>
                  </div>
                  <div className="w-full bg-bg-panel/60 h-1.5 rounded-full overflow-hidden border border-border-subtle">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(sm.score)}`} 
                      style={{ width: `${sm.score}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted font-light leading-relaxed block">{sm.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Stats Grid */}
          <div>
            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Repository Activity Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Days Since Last Commit', val: rawStats.last_commit_days_ago, desc: days_ago === 0 ? 'Committed today' : days_ago === 1 ? '1 day ago' : `${days_ago} days ago` },
                { label: 'Commits (Last Year)', val: rawStats.commit_count_1y, desc: 'Maintenance intensity' },
                { label: 'Release Tags Count', val: rawStats.tags_count, desc: 'Versioning frequency' },
                { label: 'Total Contributors', val: rawStats.total_contributors, desc: 'Project community size' },
                { label: 'Active Contributors (90d)', val: rawStats.active_contributors_90d, desc: 'Recent collaboration' },
                { label: 'Open Issues Count', val: rawStats.open_issues, desc: 'Unresolved backlog' }
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-xl bg-bg-input/60 border border-border-subtle flex flex-col justify-between min-h-[72px]">
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">{stat.label}</span>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="text-base font-extrabold text-text-primary">{stat.val}</span>
                    <span className="text-[9px] text-text-muted font-light truncate max-w-[100px]">{stat.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Legacy Fallback (older reports without survivability_details)
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-center py-2">
          <CircularProgress 
            score={analysis.survivability_score || 0} 
            label="Survivability Score" 
            size={110} 
          />
        </div>
        
        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Project Health Metrics</h3>
          <div className="space-y-3">
            {[
              {
                label: "Repository Maintenance Activity",
                val: factors.active_maintenance ? 'Active' : 'Dormant',
                tag: factors.active_maintenance ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-error-bg text-status-error border-status-error/20'
              },
              {
                label: "Permissive Open Source License",
                val: factors.license_permissive ? 'Permissive' : 'Missing/Strict',
                tag: factors.license_permissive ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-error-bg text-status-error border-status-error/20'
              },
              {
                label: "Dependencies Security Index",
                val: factors.dependency_health || 'Healthy',
                tag: (factors.dependency_health || 'Healthy').toLowerCase() === 'healthy' ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-warning-bg text-status-warning border-status-warning/20'
              }
            ].map((factor, i) => (
              <div key={i} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span> 
                  <span className="text-xs text-text-secondary font-semibold">{factor.label}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${factor.tag}`}>
                  {factor.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderBuildValidationTab = (repo) => {
    const buildResult = repo.build_result || null
    const diagnosis = repo.failure_diagnosis || null
    const aiRecommendation = diagnosis?.ai_recommendation || null

    if (!buildResult) {
      return (
        <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light animate-fadeIn">
          No build validation has been executed for this repository yet. Run analysis or trigger build validation first.
        </div>
      )
    }

    const buildSuccess = buildResult.build_success
    const detectedEcosystem = buildResult.detected_ecosystem || 'Unknown'
    const commandsExecuted = buildResult.commands_executed || []
    const execTime = buildResult.execution_time || 0.0
    const buildLogs = buildResult.logs || ''
    const containerLogs = buildResult.container_logs || ''
    
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Build Status Banner */}
        <div className={`p-5 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
          buildSuccess 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
        }`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Build Validation Status</span>
            <div className="flex items-center gap-2 mt-1">
              {buildSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-sm font-extrabold text-text-primary uppercase tracking-wide">Build Succeeded</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="text-sm font-extrabold text-text-primary uppercase tracking-wide">Build Failed / Skipped</span>
                </>
              )}
            </div>
            <p className="text-xs text-text-secondary font-light mt-1">
              Ecosystem: <code className="font-semibold text-text-primary">{detectedEcosystem}</code> | Execution Time: <span className="font-semibold text-text-primary">{execTime.toFixed(2)}s</span>
            </p>
          </div>
          {commandsExecuted.length > 0 && (
            <div className="text-xs font-mono bg-bg-panel/40 px-3 py-1.5 rounded-lg border border-border-subtle shrink-0">
              <span className="text-[9px] text-text-muted font-bold uppercase block mb-1">Commands run</span>
              {commandsExecuted.map((c, i) => (
                <div key={i} className="text-text-secondary">&gt; {c}</div>
              ))}
            </div>
          )}
        </div>

        {/* AI Failure Remediation Recommendation if Build Failed */}
        {!buildSuccess && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI recommendation agent panel */}
            {aiRecommendation ? (
              <Card className="p-6 border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-transparent relative overflow-hidden space-y-5">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-brand-purple" />
                    <h3 className="text-xs font-extrabold text-text-primary uppercase tracking-wide">AI Fix Recommendation</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-text-muted font-bold uppercase">Confidence</span>
                    <span className="px-2 py-0.5 rounded bg-brand-purple/10 text-brand-purple border border-brand-purple/20 text-[9px] font-black uppercase">
                      {Math.round(aiRecommendation.confidence_level * 100)}%
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block mb-1">Root Cause Explanation</span>
                  <p className="text-xs text-text-secondary leading-relaxed font-light">
                    {aiRecommendation.root_cause_explanation}
                  </p>
                </div>

                {aiRecommendation.fix_steps?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block">Remediation Steps</span>
                    <ul className="space-y-1.5">
                      {aiRecommendation.fix_steps.map((step, i) => (
                        <li key={i} className="text-xs text-text-secondary flex items-start gap-2.5 font-light">
                          <span className="w-4 h-4 rounded-full bg-brand-purple/10 text-brand-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-black">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiRecommendation.commands_to_execute?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block">Fix Commands To Run</span>
                    <div className="p-3 bg-bg-input rounded-xl border border-border-subtle font-mono text-xs text-brand-purple flex justify-between items-center group relative select-all">
                      <div className="truncate">
                        {aiRecommendation.commands_to_execute.map((c, i) => (
                          <div key={i}>$ {c}</div>
                        ))}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(aiRecommendation.commands_to_execute.join('\n'))
                        }}
                        className="p-1 rounded bg-bg-panel/80 hover:bg-bg-panel text-text-muted hover:text-text-primary text-[10px] font-semibold transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-6 border border-border-subtle bg-bg-panel/20 flex flex-col justify-center items-center text-center italic text-text-muted text-xs font-light">
                <Brain className="w-8 h-8 text-text-muted/30 mb-2" />
                No AI recommendation generated. Wait for analysis workflow to finish.
              </Card>
            )}

            {/* Rule-Based Scanner Diagnosis */}
            {diagnosis ? (
              <Card className="p-6 border border-border-subtle bg-bg-panel/20 space-y-5">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4.5 h-4.5 text-brand-indigo" />
                    <h3 className="text-xs font-extrabold text-text-primary uppercase tracking-wide">Scanner Diagnosis</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold uppercase tracking-wider">
                    {diagnosis.category}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block mb-1">Detected Root Cause</span>
                  <div className="p-3 rounded-lg bg-bg-input border border-border-subtle font-mono text-[10px] text-text-secondary whitespace-pre-wrap select-all">
                    {diagnosis.root_cause}
                  </div>
                </div>

                {diagnosis.recommendations?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block font-mono">Scanner Suggestions</span>
                    <ul className="space-y-1.5">
                      {diagnosis.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-text-secondary flex items-start gap-2 font-light">
                          <ChevronRight className="w-3.5 h-3.5 text-brand-indigo mt-0.5 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-6 border border-border-subtle bg-bg-panel/20 flex flex-col justify-center items-center text-center italic text-text-muted text-xs font-light">
                No diagnosis findings available.
              </Card>
            )}
          </div>
        )}

        {/* Build Terminal Logs */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <Terminal className="w-4 h-4 text-brand-cyan" /> 
            Build Execution Terminal Output
          </h3>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10.5px] text-slate-300 max-h-[350px] overflow-y-auto shadow-inner leading-relaxed select-all scrollbar-thin">
            {containerLogs ? (
              <div>
                <div className="text-slate-500 select-none pb-2"># --- Container Logs ---</div>
                <div className="whitespace-pre-wrap">{containerLogs}</div>
              </div>
            ) : null}
            {buildLogs ? (
              <div className={`${containerLogs ? 'mt-4 border-t border-slate-800 pt-4' : ''}`}>
                <div className="text-slate-500 select-none pb-2"># --- Host/Docker Build Logs ---</div>
                <div className="whitespace-pre-wrap">{buildLogs}</div>
              </div>
            ) : null}
            {!buildLogs && !containerLogs && (
              <span className="text-slate-500 italic">No output logged.</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderAgentLogsTab = (repo) => {
    const logs = (repo.analyses && repo.analyses[0] && repo.analyses[0].logs) || []
    return (
      <div className="space-y-4 animate-fadeIn">
        <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5 font-mono">
          <Terminal className="w-4 h-4 text-brand-indigo" /> 
          Agent State Machine Execution Trace
        </h3>
        {logs.length > 0 ? (
          <div className="p-4 rounded-xl bg-bg-input border border-border-subtle font-mono text-[10px] text-text-secondary space-y-2 max-h-[400px] overflow-y-auto shadow-inner leading-relaxed select-all scrollbar-thin">
            {logs.map((log, index) => (
              <div key={index} className="flex gap-2.5">
                <span className="text-text-muted shrink-0 select-none">[{index + 1}]</span>
                <span className="text-status-success shrink-0 select-none">&gt;</span>
                <span className="whitespace-pre-wrap">{log}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
            No logs archived yet.
          </div>
        )}
      </div>
    )
  }

  // --- Main Inspector view for selected report ---
  const renderHistoryDetails = (repo) => {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-border-subtle space-y-6 bg-gradient-to-br from-bg-surface to-transparent animate-fadeIn">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => onSelectRepo(null)}
            >
              ← Back to History
            </Button>
            <div className="p-2 rounded-xl bg-bg-panel border border-border-subtle text-text-tertiary">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary font-sans truncate max-w-md">
                {repo.owner} / {repo.name}
              </h2>
              <p className="text-[9px] text-text-muted font-mono mt-1 tracking-wider">
                ID: {repo.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onReanalyze(repo)}
              icon={Hammer}
            >
              Re-run Scan
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDownloadReport(repo)}
              icon={Download}
            >
              Download PDF
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDeleteRepo(repo.id)}
              icon={Trash2}
            >
              Delete Report
            </Button>
          </div>
        </div>

        {/* Intelligence Hub Tab Navigation */}
        <div className="flex border-b border-border-subtle bg-transparent overflow-x-auto scrollbar-none gap-1">
          {[
            { id: 'intelligence_hub', label: 'Intelligence Hub',    icon: Zap,            isNew: true },
            { id: 'documentation',    label: 'Documentation',       icon: BookOpen },
            { id: 'environment',      label: 'Environment',         icon: Terminal },
            { id: 'dependencies',     label: 'Dependencies',        icon: Database },
            { id: 'build_validation', label: 'Build & Repro',       icon: Hammer },
            { id: 'survivability',    label: 'Survivability',       icon: HeartHandshake },
            { id: 'ai_reasoning',     label: 'AI Reasoning',        icon: Brain,          isNew: true },
            { id: 'risk_forecast',    label: 'Risk & Forecast',     icon: TrendingDown,   isNew: true },
            { id: 'action_plan',      label: 'Action Plan',         icon: ListChecks,     isNew: true },
            { id: 'visualizations',   label: 'Visualizations',      icon: BarChart2,      isNew: true },
            { id: 'logs',             label: 'Agent Logs',          icon: Clock }
          ].map(tab => {
            const Icon = tab.icon
            const isTabActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onActiveTabChange(tab.id)}
                className={`
                  flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition -mb-px shrink-0 relative
                  ${isTabActive 
                    ? 'border-brand-indigo text-text-primary' 
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.isNew && !isTabActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-brand-purple" />
                )}
              </button>
            )
          })}
        </div>

        {/* Intelligence Hub Tab Content */}
        <div className="pt-2">
          {/* NEW: Intelligence Hub — Executive overview */}
          {activeTab === 'intelligence_hub' && (
            <div className="space-y-8 animate-fadeIn">
              <ExecutiveIntelligencePanel repo={repo} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-brand-indigo" /> Architecture
                  </h3>
                  <ArchitecturePanel repo={repo} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-brand-purple" /> Maturity
                  </h3>
                  <MaturityPanel repo={repo} />
                </div>
              </div>
            </div>
          )}
          {/* NEW: AI Reasoning */}
          {activeTab === 'ai_reasoning' && <AIReasoningPanel repo={repo} />}
          {/* NEW: Risk Forecast */}
          {activeTab === 'risk_forecast' && <RiskForecastPanel repo={repo} />}
          {/* NEW: Action Plan */}
          {activeTab === 'action_plan' && (
            <div className="space-y-8">
              <ExecutionGuidePanel repo={repo} />
              <ActionPlanPanel repo={repo} />
            </div>
          )}
          {/* Enhanced: Build & Reproducibility */}
          {activeTab === 'build_validation' && <BuildReproducibilityPanel repo={repo} />}
          {/* Enhanced: Dependencies */}
          {activeTab === 'dependencies' && <DependencyIntelligencePanel repo={repo} />}
          {/* Existing tabs */}
          {activeTab === 'environment'  && <EnvironmentIntelligencePanel repo={repo} />}
          {activeTab === 'documentation' && renderDocumentationTab(repo)}
          {activeTab === 'survivability' && renderSurvivabilityTab(repo)}
          {/* NEW: Visualizations */}
          {activeTab === 'visualizations' && <VisualizationsPanel repo={repo} />}
          {activeTab === 'logs' && renderAgentLogsTab(repo)}
        </div>
      </div>
    )
  }

  // If a repo has been selected, render its details page instead of the general history grid
  if (selectedRepo) {
    return renderHistoryDetails(selectedRepo)
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Search, Filter, Sort and Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h2 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-brand-indigo" />
            Analysis Registry History
          </h2>
          <p className="text-xs text-text-muted mt-1 font-light">
            Displaying {filteredRepos.length} completed or failed codebase scanning reports.
          </p>
        </div>

        {historyRepos.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={onDeleteAll}
            icon={Trash2}
          >
            Clear All Records
          </Button>
        )}
      </div>

      {/* Grid Filtering Controls */}
      {historyRepos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Input 
            type="text"
            placeholder="Search saved analysis logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl glass-input text-xs text-text-secondary bg-bg-panel border border-border-subtle outline-none focus:border-brand-indigo"
          >
            <option value="newest">Newest Scans</option>
            <option value="score_desc">Highest Composite Score</option>
            <option value="score_asc">Lowest Composite Score</option>
            <option value="name">Alphabetical (A-Z)</option>
          </select>
        </div>
      )}

      {/* Empty State vs List grid */}
      {filteredRepos.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center border border-border-subtle max-w-3xl mx-auto flex flex-col items-center">
          <Github className="w-12 h-12 text-text-muted/40 mb-4" />
          <h3 className="text-sm font-bold text-text-primary">No Scan Logs Found</h3>
          <p className="text-xs text-text-muted mt-2 max-w-xs leading-relaxed font-light">
            No previous scans match your search. Connect a repository clone URL under the Analysis tab or adjust your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepos.map((repo) => {
            const latestAnalysis = repo.analyses && repo.analyses.length > 0 ? repo.analyses[0] : null
            const hasScore = latestAnalysis?.status === 'completed'
            const averageScore = hasScore 
              ? Math.round(((latestAnalysis.reproducibility_score || 0) + (latestAnalysis.survivability_score || 0)) / 2)
              : null
            
            return (
              <Card
                key={repo.id}
                onClick={() => onSelectRepo(repo)}
                className="hover:border-brand-indigo/35 flex flex-col justify-between space-y-4 shadow-glass animate-fadeIn"
              >
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-muted uppercase font-mono tracking-wider">{repo.owner}</span>
                    {repo.status === 'cloned' ? (
                      <span className="px-2 py-0.5 rounded bg-status-success-bg text-status-success border border-status-success/20 text-[9px] font-bold">Ready</span>
                    ) : repo.status === 'failed' ? (
                      <span className="px-2 py-0.5 rounded bg-status-error-bg text-status-error border border-status-error/20 text-[9px] font-bold">Failed</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-bg-panel text-text-secondary border border-border-subtle text-[9px] font-bold">{repo.status}</span>
                    )}
                  </div>
                  
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-indigo transition-colors truncate">{repo.name}</h3>
                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed font-light" title={repo.description}>
                    {repo.description || "No metadata description provided."}
                  </p>
                </div>

                <div 
                  className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-[10px] relative z-10 font-mono"
                  onClick={e => e.stopPropagation()} // Stop selection click on actions
                >
                  <span className="text-text-muted">{formatDate(repo.created_at)}</span>
                  <div className="flex items-center gap-2">
                    {hasScore && (
                      <span className="px-2 py-0.5 rounded bg-brand-indigo/10 border border-brand-indigo/20 text-brand-cyan font-bold font-mono" title="Composite Health Grade">
                        {averageScore}%
                      </span>
                    )}
                    <button
                      onClick={() => onDeleteRepo(repo.id)}
                      className="p-1.5 rounded-lg bg-status-error-bg hover:bg-status-error/20 text-status-error border border-status-error/10 hover:border-status-error/30 transition duration-150"
                      title="Delete from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
