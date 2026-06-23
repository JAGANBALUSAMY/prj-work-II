import React from 'react'
import { Plus, Github, Loader2, ArrowRight, AlertCircle, RefreshCw, Terminal, CheckCircle, ShieldAlert } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export default function AnalysisPanel({
  cloneUrl,
  onCloneUrlChange,
  onSubmit,
  loading = false,
  error = '',
  activeRepos = [],
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Repository Submission form console */}
      <div className="glass-panel p-6 md:p-8 rounded-2xl border border-border-subtle shadow-glass max-w-3xl mx-auto relative overflow-hidden bg-gradient-to-br from-bg-surface to-brand-indigo/3">
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-indigo/3 rounded-full blur-3xl pointer-events-none"></div>
        
        <h2 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
          <Plus className="w-5 h-5 text-brand-indigo" />
          Analyze New Repository
        </h2>
        <p className="text-xs text-text-secondary mb-6 leading-relaxed font-light">
          Connect a GitHub repository URL. Aegis will clone, parse, and verify codebase safety, dependency drift, environment templates, and documentation health in real-time.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <Input 
            id="clone-url"
            label="Repository Clone URL"
            type="text"
            required
            placeholder="https://github.com/owner/repository"
            value={cloneUrl}
            onChange={(e) => onCloneUrlChange(e.target.value)}
            icon={Github}
          />

          {error && (
            <div className="p-3.5 rounded-xl bg-status-error-bg border border-status-error/20 text-status-error text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !cloneUrl.trim()}
            className="w-full py-4 text-xs font-black shadow-lg"
            loading={loading}
          >
            Trigger Analysis
          </Button>
        </form>
      </div>

      {/* Active Scanning pipelines */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <h2 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-brand-indigo ${activeRepos.length > 0 ? 'animate-spin' : ''}`} />
            Active Scanning Pipelines ({activeRepos.length})
          </h2>
          {activeRepos.length > 0 && (
            <span className="flex items-center gap-1.5 text-[9px] bg-brand-indigo/15 text-brand-indigo px-3 py-1 rounded-full border border-brand-indigo/25 font-black uppercase tracking-wider animate-pulse">
              Running
            </span>
          )}
        </div>
        
        {activeRepos.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center border border-border-subtle max-w-3xl mx-auto flex flex-col items-center">
            <CheckCircle className="w-10 h-10 text-status-success/70 mb-4" />
            <h3 className="text-sm font-bold text-text-primary">All Pipelines Idle</h3>
            <p className="text-xs text-text-muted mt-2 max-w-xs leading-relaxed font-light">
              No repository is currently being scanned. Provide a clone URL above to launch a new pipeline.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeRepos.map((repo) => {
              const logs = (repo.analyses && repo.analyses[0] && repo.analyses[0].logs) || []
              const status = repo.status
              const hasLog = (pattern) => logs.some(l => l.includes(pattern))
              
              let step1 = 'pending', step2 = 'pending', step3 = 'pending', step4 = 'pending', step5 = 'pending', step6 = 'pending', step7 = 'pending', step8 = 'pending', step9 = 'pending', step10 = 'pending', step11 = 'pending'
              if (status === 'cloning') step1 = 'active'
              if (status === 'cloned' || hasLog('Node [technology_discovery]')) step1 = 'completed'
              if (hasLog('Node [technology_discovery]')) step2 = 'active'
              if (hasLog('Node [dependency_analysis]')) step2 = 'completed'
              if (hasLog('Node [dependency_analysis]')) step3 = 'active'
              if (hasLog('Node [environment_reconstruction]')) step3 = 'completed'
              if (hasLog('Node [environment_reconstruction]')) step4 = 'active'
              if (hasLog('Node [documentation_analysis]')) step4 = 'completed'
              if (hasLog('Node [documentation_analysis]')) step5 = 'active'
              if (hasLog('Node [ai_documentation]')) step5 = 'completed'
              if (hasLog('Node [ai_documentation]')) step6 = 'active'
              if (hasLog('Node [ai_dependency]')) step6 = 'completed'
              if (hasLog('Node [ai_dependency]')) step7 = 'active'
              if (hasLog('Node [ai_repository_summary]')) step7 = 'completed'
              if (hasLog('Node [ai_repository_summary]')) step8 = 'active'
              if (hasLog('Node [build_validation]')) step8 = 'completed'
              if (hasLog('Node [build_validation]')) step9 = 'active'
              if (hasLog('Node [ai_recommendation]')) step9 = 'completed'
              if (hasLog('Node [ai_recommendation]')) step10 = 'active'
              if (hasLog('Node [store_results]')) step10 = 'completed'
              if (hasLog('Node [store_results]')) step11 = 'active'
              if (repo.analyses && repo.analyses[0] && repo.analyses[0].status === 'completed') step11 = 'completed'

              return (
                <div key={repo.id} className="glass-panel p-6 rounded-2xl border border-border-subtle space-y-6 bg-gradient-to-br from-bg-surface to-transparent animate-fadeIn">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted block font-mono">{repo.owner}</span>
                      <h3 className="text-sm font-bold text-text-primary mt-1 font-sans">{repo.name}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] text-text-muted font-mono select-all bg-bg-input px-2.5 py-1 rounded border border-border-subtle">{repo.clone_url}</span>
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-indigo"></span> ACTIVE RUNNER
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Flow stepper */}
                    <div className="lg:col-span-1 space-y-4">
                      <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Pipeline Node Stepper</h4>
                      <div className="relative pl-6 border-l border-border-subtle space-y-5 text-xs">
                        {[
                          { label: "01. Acquisition", state: step1, desc: "Cloning repo files & fetching stats" },
                          { label: "02. Stack Discovery", state: step2, desc: "Mapping core engine configuration markers" },
                          { label: "03. Dependency Audit", state: step3, desc: "Analyzing duplicates and security warnings" },
                          { label: "04. Env Reconstruction", state: step4, desc: "Resolving reference vars to .env templates" },
                          { label: "05. Doc Grading", state: step5, desc: "Checking documentation completeness criteria" },
                          { label: "06. AI Doc Analysis", state: step6, desc: "Auditing documentation structure" },
                          { label: "07. AI Dependency Audit", state: step7, desc: "Identifying package security risks" },
                          { label: "08. AI Summary", state: step8, desc: "Generating codebase architecture summaries" },
                          { label: "09. Build Validation", state: step9, desc: "Isolated container compilation check" },
                          { label: "10. AI Recommendation", state: step10, desc: "Diagnosing failures and generating fixes" },
                          { label: "11. Indexing & Save", state: step11, desc: "Saving data and indexing vectors to ChromaDB" }
                        ].map((step, idx) => {
                          const isCompleted = step.state === 'completed'
                          const isActive = step.state === 'active'
                          return (
                            <div key={idx} className="relative">
                              <div className={`absolute left-[-31px] top-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                                isCompleted ? 'bg-status-success-bg border-status-success text-status-success' : isActive ? 'bg-brand-indigo/25 border-brand-indigo text-brand-indigo animate-pulse' : 'bg-bg-input border-border-subtle text-text-muted'
                              }`}>
                                {isCompleted ? <CheckCircle className="w-2.5 h-2.5 text-status-success" /> : <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand-indigo' : 'bg-text-muted/30'}`} />}
                              </div>
                              <div>
                                <span className={`font-extrabold block text-[11px] ${isCompleted ? 'text-status-success' : isActive ? 'text-brand-indigo' : 'text-text-secondary'}`}>{step.label}</span>
                                <span className="text-[10px] text-text-muted mt-1 block leading-tight font-light">{step.desc}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Execution Terminal Console */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                      <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                        <Terminal className="w-4 h-4 text-brand-indigo" /> 
                        Diagnostic logs stream
                      </h4>
                      <div className="p-4 rounded-xl bg-bg-input border border-border-subtle font-mono text-[10px] text-text-secondary space-y-2 overflow-y-auto flex-1 min-h-0 shadow-inner leading-relaxed select-all">
                        {logs.length === 0 ? (
                          <div className="text-text-muted italic py-16 text-center">Awaiting execution logs stream...</div>
                        ) : (
                          logs.map((log, index) => (
                            <div key={index} className="flex gap-2.5">
                              <span className="text-text-muted shrink-0 select-none">[{index + 1}]</span>
                              <span className="text-status-success shrink-0 select-none">&gt;</span>
                              <span className="whitespace-pre-wrap">{log}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
