import React, { useState, useEffect } from 'react'
import { 
  Github, Plus, RefreshCw, Star, GitFork, AlertCircle, 
  CheckCircle, Loader2, ArrowRight, ExternalLink, Calendar, 
  Users, Terminal, Code, Database, ShieldAlert, Cpu, HeartHandshake,
  Layers, ChevronRight, X, Clock, BookOpen
} from 'lucide-react'
import { getRepositories, analyzeRepository, getRepositoryDetails } from './services/repositories'

function App() {
  const [repos, setRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [cloneUrl, setCloneUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview') // overview, dependencies, reproducibility, survivability, logs
  const [depSearch, setDepSearch] = useState('')
  const [depFilter, setDepFilter] = useState('all') // all, production, development, direct, warnings
  const [envCopied, setEnvCopied] = useState(false)

  const fetchRepos = async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const data = await getRepositories()
      setRepos(data)
      
      // Update selected repository details if drawer is open
      if (selectedRepo) {
        const updatedSelected = data.find(r => r.id === selectedRepo.id)
        if (updatedSelected) {
          setSelectedRepo(updatedSelected)
        }
      }
    } catch (err) {
      console.error("Failed to load repositories:", err)
      setError("Failed to sync with API. Check backend connection.")
    } finally {
      if (!silent) setRefreshing(false)
    }
  }

  // Load repositories on mount
  useEffect(() => {
    fetchRepos()
  }, [])

  // Smart polling: if any repository is cloning or has a running analysis, refresh every 3 seconds
  useEffect(() => {
    const activeTasks = repos.some(r => 
      r.status === 'cloning' || 
      (r.analyses && r.analyses.some(a => a.status === 'running'))
    )

    if (activeTasks) {
      const interval = setInterval(() => {
        fetchRepos(true)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [repos])

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!cloneUrl.trim()) return

    setError('')
    setLoading(true)

    try {
      const newRepo = await analyzeRepository(cloneUrl.trim())
      setRepos(prev => [newRepo, ...prev])
      setCloneUrl('')
      // Select the newly added repo to monitor progress
      setSelectedRepo(newRepo)
      setActiveTab('overview')
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.detail || "An error occurred during submission."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Calculate high level stats
  const totalRepos = repos.length
  
  const completedAnalyses = repos.flatMap(r => r.analyses || []).filter(a => a.status === 'completed')
  
  const avgReproducibility = completedAnalyses.length > 0
    ? Math.round(completedAnalyses.reduce((acc, a) => acc + (a.reproducibility_score || 0), 0) / completedAnalyses.length)
    : 0
    
  const avgSurvivability = completedAnalyses.length > 0
    ? Math.round(completedAnalyses.reduce((acc, a) => acc + (a.survivability_score || 0), 0) / completedAnalyses.length)
    : 0

  const activeJobs = repos.filter(r => r.status === 'cloning').length

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Render circular progress indicator
  const ScoreDial = ({ score, label, colorClass, glowClass }) => {
    const radius = 35
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference

    return (
      <div className="flex flex-col items-center p-4 rounded-xl bg-dark-900/50 border border-slate-800">
        <div className="relative flex items-center justify-center w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              className={`transition-all duration-1000 ease-out ${colorClass}`}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xl font-bold font-sans">{score}%</span>
        </div>
        <span className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
    )
  }

  return (
    <div className="min-h-full relative overflow-hidden bg-dark-950 text-slate-100 pb-12">
      {/* Decorative Blur Blobs */}
      <div className="glow-blob-purple top-[-100px] right-[-100px] animate-slow-pulse"></div>
      <div className="glow-blob-blue bottom-[-100px] left-[-100px]"></div>

      {/* Top Header */}
      <header className="sticky top-0 z-10 glass-panel border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-purple shadow-lg shadow-brand-indigo/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-gradient">
                A E G I S
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">
                Intelligent Repository Reproducibility & Survivability Analyzer
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end md:self-auto">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              API Online
            </span>
            <button 
              onClick={() => fetchRepos()}
              disabled={refreshing}
              className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 border border-slate-800 hover:border-slate-700 transition duration-150 text-slate-300 disabled:opacity-50"
              title="Sync dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-indigo' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Statistics Cards Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-5 rounded-2xl shadow-glass flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monitored Repos</p>
              <h3 className="text-3xl font-bold mt-1 text-white">{totalRepos}</h3>
            </div>
            <div className="p-3 rounded-xl bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo">
              <Database className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-glass flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Reproducibility</p>
              <h3 className="text-3xl font-bold mt-1 text-brand-purple">{avgReproducibility}%</h3>
            </div>
            <div className="p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-glass flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Survivability</p>
              <h3 className="text-3xl font-bold mt-1 text-brand-cyan">{avgSurvivability}%</h3>
            </div>
            <div className="p-3 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-glass flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tasks</p>
              <h3 className="text-3xl font-bold mt-1 text-emerald-400">{activeJobs}</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <RefreshCw className={`w-5 h-5 ${activeJobs > 0 ? 'animate-spin' : ''}`} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel: Register Repository Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 rounded-2xl shadow-glass">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-indigo" />
                Analyze New Repository
              </h2>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Connect a GitHub repository. Aegis will register the project, retrieve metadata details, clone the repository files locally, and build the state graph analysis.
              </p>

              <form onSubmit={handleAnalyze} className="space-y-4">
                <div>
                  <label htmlFor="clone-url" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Repository Clone URL
                  </label>
                  <input
                    id="clone-url"
                    type="text"
                    required
                    placeholder="https://github.com/owner/repository"
                    value={cloneUrl}
                    onChange={(e) => setCloneUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm text-slate-200"
                  />
                  <p className="mt-1.5 text-[10px] text-slate-500">
                    Supports HTTPS clone URL formats.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !cloneUrl.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-purple hover:from-brand-indigo/90 hover:to-brand-purple/90 transition text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-indigo/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Acquiring Repository...
                    </>
                  ) : (
                    <>
                      Trigger Analysis
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Quick Architecture Info Card */}
            <div className="glass-panel p-6 rounded-2xl shadow-glass border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-purple" />
                Under The Hood
              </h3>
              <ul className="space-y-3 text-xs text-slate-400">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-indigo mt-1.5 shrink-0"></div>
                  <span><strong>Repository Acquisition Agent</strong> pulls repository metrics and performs a git clone asynchronously.</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-purple mt-1.5 shrink-0"></div>
                  <span><strong>LangGraph State Machine</strong> orchestrates the parsing nodes, evaluating reproducibility and decay scores.</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan mt-1.5 shrink-0"></div>
                  <span><strong>ChromaDB Vector Store</strong> indexes files and modules for vector semantic search queries.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Panel: Repository Grid & Lists */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-brand-indigo" />
                Connected Projects
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                Showing {repos.length} records
              </span>
            </div>

            {repos.length === 0 ? (
              <div className="glass-panel p-12 rounded-2xl text-center flex flex-col items-center justify-center">
                <Github className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-md font-semibold text-slate-300">No Projects Connected Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Provide a valid GitHub clone URL on the left panel to trigger the metadata fetching and code acquisition flow.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {repos.map((repo) => {
                  const latestAnalysis = repo.analyses && repo.analyses.length > 0 ? repo.analyses[0] : null
                  
                  return (
                    <div 
                      key={repo.id}
                      onClick={() => {
                        setSelectedRepo(repo)
                        setActiveTab('overview')
                      }}
                      className={`glass-panel glass-panel-hover p-5 rounded-2xl cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        selectedRepo?.id === repo.id ? 'border-brand-indigo ring-1 ring-brand-indigo/30' : ''
                      }`}
                    >
                      <div>
                        {/* Header: Project Name & Owner */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide block truncate">
                            {repo.owner}
                          </span>
                          {/* Status Badge */}
                          {repo.status === 'cloning' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                              Cloning
                            </span>
                          )}
                          {repo.status === 'cloned' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Ready
                            </span>
                          )}
                          {repo.status === 'failed' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Failed
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5 truncate font-sans">
                          {repo.name}
                        </h3>

                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                          {repo.description || "No description provided."}
                        </p>
                      </div>

                      {/* Footer: Metadata & scores */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        {/* GitHub indicators */}
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1" title="Stars">
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            {repo.stars}
                          </span>
                          <span className="flex items-center gap-1" title="Forks">
                            <GitFork className="w-3.5 h-3.5 text-slate-400" />
                            {repo.forks}
                          </span>
                        </div>

                        {/* Scores preview */}
                        {latestAnalysis?.status === 'completed' ? (
                          <div className="flex gap-2 text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                              R: {latestAnalysis.reproducibility_score}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                              S: {latestAnalysis.survivability_score}%
                            </span>
                          </div>
                        ) : latestAnalysis?.status === 'running' ? (
                          <span className="text-[10px] font-semibold text-brand-indigo flex items-center gap-1 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Analyzing
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            No Analysis
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Slide-out Drawer Detail Inspector */}
      {selectedRepo && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-2xl bg-dark-900 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl relative">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 bg-dark-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                  <Github className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-md font-bold text-white font-sans truncate max-w-md">
                    {selectedRepo.owner} / {selectedRepo.name}
                  </h2>
                  <p className="text-[10px] text-slate-400 tracking-wide font-mono uppercase mt-0.5 truncate">
                    ID: {selectedRepo.id}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRepo(null)}
                className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-dark-900 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Code },
                { id: 'dependencies', label: 'Dependencies', icon: Database },
                { id: 'environment', label: 'Environment', icon: Cpu },
                { id: 'documentation', label: 'Documentation', icon: BookOpen },
                { id: 'reproducibility', label: 'Reproducibility', icon: Layers },
                { id: 'survivability', label: 'Survivability', icon: HeartHandshake },
                { id: 'logs', label: 'Execution Logs', icon: Terminal }
              ].map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 py-3.5 px-4 text-xs font-semibold border-b-2 transition -mb-px ${
                      active 
                        ? 'border-brand-indigo text-white' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Drawer Body Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tab 1: OVERVIEW */}
              {activeTab === 'overview' && (
                (() => {
                  const logs = (selectedRepo.analyses && selectedRepo.analyses[0] && selectedRepo.analyses[0].logs) || []
                  const status = selectedRepo.status
                  const hasLog = (pattern) => logs.some(l => l.includes(pattern))
                  
                  let step1 = 'pending'
                  if (status === 'cloning') step1 = 'active'
                  if (status === 'cloned' || hasLog('Node [technology_discovery]')) step1 = 'completed'
                  
                  let step2 = 'pending'
                  if (hasLog('Node [technology_discovery]')) step2 = 'active'
                  if (hasLog('Node [dependency_analysis]')) step2 = 'completed'
                  
                  let step3 = 'pending'
                  if (hasLog('Node [dependency_analysis]')) step3 = 'active'
                  if (hasLog('Node [environment_reconstruction]')) step3 = 'completed'
                  
                  let step4 = 'pending'
                  if (hasLog('Node [environment_reconstruction]')) step4 = 'active'
                  if (hasLog('Node [documentation_analysis]')) step4 = 'completed'
                  
                  let step5 = 'pending'
                  if (hasLog('Node [documentation_analysis]')) step5 = 'active'
                  if (hasLog('Node [store_results]')) step5 = 'completed'
                  
                  let step6 = 'pending'
                  if (hasLog('Node [store_results]')) step6 = 'active'
                  if (selectedRepo.analyses && selectedRepo.analyses[0] && selectedRepo.analyses[0].status === 'completed') step6 = 'completed'

                  return (
                    <div className="space-y-6">
                      {/* Status Box */}
                      <div className="p-4 rounded-xl bg-dark-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Acquisition Status</span>
                          <span className="text-sm font-semibold text-white mt-1 capitalize block">
                            {selectedRepo.status === 'cloned' ? 'Git Clone Completed' : selectedRepo.status}
                          </span>
                        </div>
                        <div>
                          {selectedRepo.status === 'cloned' && <CheckCircle className="w-6 h-6 text-emerald-400" />}
                          {selectedRepo.status === 'cloning' && <Loader2 className="w-6 h-6 text-brand-indigo animate-spin" />}
                          {selectedRepo.status === 'failed' && <ShieldAlert className="w-6 h-6 text-rose-400" />}
                        </div>
                      </div>

                      {/* Analysis Progress Stepper */}
                      {(selectedRepo.status === 'cloning' || (selectedRepo.analyses && selectedRepo.analyses[0] && selectedRepo.analyses[0].status === 'running')) && (
                        <div className="p-5 rounded-xl bg-dark-950 border border-slate-800/80 space-y-4">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Loader2 className="w-4 h-4 text-brand-indigo animate-spin" />
                            Analysis Pipeline Progress
                          </h3>
                          
                          <div className="relative pl-6 border-l-2 border-slate-800 space-y-4 text-xs">
                            {[
                              { label: "Repository Acquisition", state: step1, desc: "Cloning files and fetching GitHub metadata" },
                              { label: "Technology Stack Discovery", state: step2, desc: "Scanning configuration markers and files" },
                              { label: "Dependency Analysis", state: step3, desc: "Analyzing packages, duplicates, and threats" },
                              { label: "Environment Variables Reconstruction", state: step4, desc: "Scanning code references and template configurations" },
                              { label: "Documentation Onboarding Analysis", state: step5, desc: "Evaluating README.md completeness and sections" },
                              { label: "Results Finalization & Vector Indexing", state: step6, desc: "Computing scores, compiling findings, and indexing ChromaDB" }
                            ].map((step, idx) => {
                              const isCompleted = step.state === 'completed'
                              const isActive = step.state === 'active'
                              
                              return (
                                <div key={idx} className="relative">
                                  <div className={`absolute left-[-32px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 ${
                                    isCompleted 
                                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' 
                                      : isActive 
                                        ? 'bg-brand-indigo/20 border-brand-indigo text-brand-indigo animate-pulse' 
                                        : 'bg-dark-900 border-slate-800 text-slate-500'
                                  }`}>
                                    {isCompleted ? (
                                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-brand-indigo' : 'bg-slate-700'}`} />
                                    )}
                                  </div>
                                  
                                  <div>
                                    <span className={`font-semibold block transition-colors duration-300 ${
                                      isCompleted ? 'text-emerald-400' : isActive ? 'text-brand-indigo font-bold' : 'text-slate-400'
                                    }`}>
                                      {step.label}
                                    </span>
                                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-normal">
                                      {step.desc}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                  {/* GitHub Statistics Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Repository Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Stars</span>
                        <span className="text-lg font-bold text-white mt-1">{selectedRepo.stars}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Forks</span>
                        <span className="text-lg font-bold text-white mt-1">{selectedRepo.forks}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Open Issues</span>
                        <span className="text-lg font-bold text-white mt-1">{selectedRepo.open_issues}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Contributors</span>
                        <span className="text-lg font-bold text-white mt-1">{selectedRepo.contributors_count}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detected Stack */}
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Detected Technology Stack</h3>
                    {selectedRepo.detected_stack && (
                      (selectedRepo.detected_stack.backend && selectedRepo.detected_stack.backend.length > 0) || 
                      (selectedRepo.detected_stack.frontend && selectedRepo.detected_stack.frontend.length > 0) || 
                      (selectedRepo.detected_stack.databases && selectedRepo.detected_stack.databases.length > 0)
                    ) ? (
                      <div className="p-4 rounded-xl bg-dark-950/50 border border-slate-800/80 space-y-3">
                        {selectedRepo.detected_stack.backend && selectedRepo.detected_stack.backend.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0">Backend:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedRepo.detected_stack.backend.map(tech => (
                                <span key={tech} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedRepo.detected_stack.frontend && selectedRepo.detected_stack.frontend.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0">Frontend:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedRepo.detected_stack.frontend.map(tech => (
                                <span key={tech} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-semibold">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedRepo.detected_stack.databases && selectedRepo.detected_stack.databases.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0">Databases:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedRepo.detected_stack.databases.map(tech => (
                                <span key={tech} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-semibold">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedRepo.detected_stack.scanned_files && selectedRepo.detected_stack.scanned_files.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-[10px] text-slate-500">
                            <span>Scanned:</span>
                            <div className="flex gap-1 flex-wrap">
                              {selectedRepo.detected_stack.scanned_files.map(file => (
                                <span key={file} className="font-mono bg-dark-950 px-1 py-0.5 rounded border border-slate-800 text-[9px]">
                                  {file}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-dark-950/30 border border-slate-800/80 text-xs text-slate-500 italic">
                        {selectedRepo.status === 'cloning' 
                          ? 'Acquiring repository and analyzing files...' 
                          : 'No backend, frontend or database markers detected.'}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Description</h3>
                    <p className="text-sm text-slate-400 leading-relaxed bg-dark-950/60 p-4 rounded-xl border border-slate-800/80">
                      {selectedRepo.description || "No description fetched for this repository."}
                    </p>
                  </div>

                  {/* Other Details */}
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Last Commit</span>
                      <span className="text-slate-200 font-medium">{formatDate(selectedRepo.last_commit_date)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Registered At</span>
                      <span className="text-slate-200 font-medium">{formatDate(selectedRepo.created_at)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Clone URL</span>
                      <a 
                        href={selectedRepo.clone_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-brand-indigo hover:underline font-mono truncate max-w-xs flex items-center gap-1"
                      >
                        {selectedRepo.clone_url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Local Clone Path</span>
                      <span className="text-slate-300 font-mono truncate max-w-xs" title={selectedRepo.local_path}>
                        {selectedRepo.local_path || 'Not cloned yet'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()
          )}

            {/* Tab: DEPENDENCIES */}
              {activeTab === 'dependencies' && (
                <div className="space-y-6">
                  {selectedRepo.dependencies_profile ? (
                    (() => {
                      const profile = selectedRepo.dependencies_profile
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
                        <div className="space-y-6">
                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Packages</span>
                              <span className="text-xl font-bold text-white mt-1">{report.total_count || 0}</span>
                            </div>
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                              report.duplicates?.length > 0 ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-dark-900 border-slate-800 text-slate-400'
                            }`}>
                              <span className="text-[10px] font-semibold uppercase">Duplicates</span>
                              <span className="text-xl font-bold text-white mt-1">{report.duplicates?.length || 0}</span>
                            </div>
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                              report.missing_versions?.length > 0 ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-dark-900 border-slate-800 text-slate-400'
                            }`}>
                              <span className="text-[10px] font-semibold uppercase">Missing Version</span>
                              <span className="text-xl font-bold text-white mt-1">{report.missing_versions?.length || 0}</span>
                            </div>
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                              report.suspicious_declarations?.length > 0 ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' : 'bg-dark-900 border-slate-800 text-slate-400'
                            }`}>
                              <span className="text-[10px] font-semibold uppercase">Suspicious Ref</span>
                              <span className="text-xl font-bold text-white mt-1">{report.suspicious_declarations?.length || 0}</span>
                            </div>
                          </div>

                          {/* Threat Alerts Section */}
                          {(report.duplicates?.length > 0 || report.missing_versions?.length > 0 || report.suspicious_declarations?.length > 0) && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4 text-amber-500" />
                                Dependency Alerts ({report.duplicates.length + report.missing_versions.length + report.suspicious_declarations.length})
                              </h4>
                              <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                                {report.duplicates.map((dup, i) => (
                                  <div key={`dup-${i}`} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <div>
                                      <strong>Duplicate dependency:</strong> package <code>{dup.name}</code> defined multiple times in <code>{dup.source_file}</code> (versions: {dup.versions.join(', ')}).
                                    </div>
                                  </div>
                                ))}

                                {report.missing_versions.map((m, i) => (
                                  <div key={`m-${i}`} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <div>
                                      <strong>Missing version:</strong> package <code>{m.name}</code> in <code>{m.source_file}</code> has unspecified version constraint.
                                    </div>
                                  </div>
                                ))}

                                {report.suspicious_declarations.map((s, i) => (
                                  <div key={`s-${i}`} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                                    <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <div>
                                      <strong>Suspicious declaration:</strong> package <code>{s.name}</code> (version: <code>{s.version}</code>) in <code>{s.source_file}</code>. Reason: {s.reason}.
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Search & Filter Controls */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="text"
                              placeholder="Search package name..."
                              value={depSearch}
                              onChange={(e) => setDepSearch(e.target.value)}
                              className="px-3 py-2 rounded-lg glass-input text-xs text-slate-200 flex-1"
                            />
                            <select
                              value={depFilter}
                              onChange={(e) => setDepFilter(e.target.value)}
                              className="px-3 py-2 rounded-lg glass-input text-xs text-slate-300 bg-dark-900 border border-slate-800"
                            >
                              <option value="all">All Dependencies</option>
                              <option value="production">Production / Compile</option>
                              <option value="development">Development / Test</option>
                              <option value="direct">Direct (Python)</option>
                              <option value="warnings">Warnings / Threats Only</option>
                            </select>
                          </div>

                          {/* Dependency Table list */}
                          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-dark-950/40">
                            <div className="max-h-[300px] overflow-y-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-dark-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                                    <th className="p-3">Package</th>
                                    <th className="p-3">Version</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Source File</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredDeps.length === 0 ? (
                                    <tr>
                                      <td colSpan="4" className="p-8 text-center text-slate-500 italic">
                                        No dependencies match the search criteria.
                                      </td>
                                    </tr>
                                  ) : (
                                    filteredDeps.map((d, index) => {
                                      const isDuplicate = report.duplicates.some(dup => dup.name.toLowerCase() === d.name.toLowerCase() && dup.source_file === d.source_file)
                                      const isMissing = !d.version || d.version === '*' || d.version === 'unspecified'
                                      const isSuspicious = report.suspicious_declarations.some(susp => susp.name.toLowerCase() === d.name.toLowerCase() && susp.source_file === d.source_file)
                                      const hasWarning = isDuplicate || isMissing || isSuspicious

                                      return (
                                        <tr key={index} className="border-b border-slate-800/60 hover:bg-dark-900/40 transition">
                                          <td className="p-3 font-semibold text-slate-200 flex items-center gap-1.5">
                                            {d.name}
                                            {hasWarning && (
                                              <span 
                                                title={isSuspicious ? "Suspicious declaration" : isDuplicate ? "Duplicate package declaration" : "Missing version constraint"} 
                                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSuspicious ? 'bg-rose-500' : 'bg-amber-500'}`}
                                              ></span>
                                            )}
                                          </td>
                                          <td className="p-3 font-mono text-slate-400">
                                            {d.version ? d.version : (
                                              <span className="text-amber-500/80 italic font-sans text-[10px]">unspecified</span>
                                            )}
                                          </td>
                                          <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                              d.dependency_type === 'production' || d.dependency_type === 'compile'
                                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                : d.dependency_type === 'development' || d.dependency_type === 'test'
                                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                : 'bg-slate-500/10 text-slate-300 border border-slate-700/30'
                                            }`}>
                                              {d.dependency_type}
                                            </span>
                                          </td>
                                          <td className="p-3">
                                            <span className="font-mono text-slate-500 text-[10px]">
                                              {d.source_file}
                                            </span>
                                          </td>
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
                    })()
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs italic bg-dark-950/30 border border-slate-800 rounded-xl">
                      {selectedRepo.status === 'cloning' 
                        ? 'Cloning and scanning files for dependencies...' 
                        : 'No dependency scans are recorded for this repository.'}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: ENVIRONMENT */}
              {activeTab === 'environment' && (
                <div className="space-y-6">
                  {selectedRepo.environment_profile ? (
                    (() => {
                      const profile = selectedRepo.environment_profile
                      const vars = profile.variables || []
                      const template = profile.template || ""
                      const scannedCount = profile.scanned_files_count || 0
                      const templatesFound = profile.template_files_found || []
                      
                      const missingVars = vars.filter(v => v.is_missing_from_template)
                      
                      const handleCopyText = () => {
                        navigator.clipboard.writeText(template)
                        setEnvCopied(true)
                        setTimeout(() => setEnvCopied(false), 2000)
                      }

                      return (
                        <div className="space-y-6">
                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Variables</span>
                              <span className="text-xl font-bold text-white mt-1">{vars.length}</span>
                            </div>
                            <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase">Scanned Files</span>
                              <span className="text-xl font-bold text-white mt-1">{scannedCount}</span>
                            </div>
                            <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase">Templates Scanned</span>
                              <span className="text-sm font-bold text-slate-200 mt-1 truncate" title={templatesFound.join(', ')}>
                                {templatesFound.length > 0 ? templatesFound.join(', ') : 'None'}
                              </span>
                            </div>
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                              missingVars.length > 0 ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-dark-900 border-slate-800 text-slate-400'
                            }`}>
                              <span className="text-[10px] font-semibold uppercase">Undocumented Vars</span>
                              <span className="text-xl font-bold text-white mt-1">{missingVars.length}</span>
                            </div>
                          </div>

                          {/* Warning alerts for undocumented vars */}
                          {missingVars.length > 0 && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2">
                              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[10px] font-sans">
                                <ShieldAlert className="w-4 h-4 text-amber-400" />
                                Configuration Discrepancies Detected
                              </div>
                              <p className="leading-relaxed">
                                The following environment variables are referenced in the source code but are missing from your configuration templates (e.g., <code>.env.example</code>). Please document these to ensure reproducibility:
                              </p>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {missingVars.map(v => (
                                  <span key={v.name} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                                    {v.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Copyable Environment Template Code Block */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Generated .env Template</h4>
                              <button
                                onClick={handleCopyText}
                                disabled={!template}
                                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 transition flex items-center gap-1 font-sans"
                              >
                                {envCopied ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3" />
                                    Copy Template
                                  </>
                                )}
                              </button>
                            </div>
                            
                            <div className="relative">
                              <pre className="p-4 rounded-xl bg-dark-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[180px] shadow-inner select-all">
                                {template || "# No variables detected to compile template."}
                              </pre>
                            </div>
                          </div>

                          {/* Variables details table */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Variable Discovery Directory</h4>
                            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-dark-950/40">
                              <div className="max-h-[260px] overflow-y-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-dark-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                                      <th className="p-3">Variable</th>
                                      <th className="p-3">Status</th>
                                      <th className="p-3">Discovery Sources</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {vars.length === 0 ? (
                                      <tr>
                                        <td colSpan="3" className="p-8 text-center text-slate-500 italic">
                                          No environment variables detected.
                                        </td>
                                      </tr>
                                    ) : (
                                      vars.map((v, idx) => (
                                        <tr key={idx} className="border-b border-slate-800/60 hover:bg-dark-900/40 transition">
                                          <td className="p-3 font-semibold font-mono text-slate-200">{v.name}</td>
                                          <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                              v.is_missing_from_template
                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            }`}>
                                              {v.is_missing_from_template ? 'Code Only' : 'Documented'}
                                            </span>
                                          </td>
                                          <td className="p-3 text-slate-400 font-mono leading-relaxed">
                                            <div className="flex flex-wrap gap-1">
                                              {v.sources.map((s, sIdx) => (
                                                <span key={sIdx} className="bg-dark-950 px-1 py-0.5 rounded border border-slate-800 text-[10px]" title={s}>
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
                    })()
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs italic bg-dark-950/30 border border-slate-800 rounded-xl">
                      {selectedRepo.status === 'cloning' 
                        ? 'Cloning and scanning files for environment configurations...' 
                        : 'No environment scans are recorded for this repository.'}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: DOCUMENTATION */}
              {activeTab === 'documentation' && (
                <div className="space-y-6">
                  {selectedRepo.documentation_profile ? (
                    (() => {
                      const profile = selectedRepo.documentation_profile
                      const score = profile.completeness_score || 0
                      const scannedFile = profile.scanned_file || "None"
                      const sections = profile.sections || []
                      const suggestions = profile.suggestions || []
                      const preview = profile.readme_preview || ""

                      const detectedCount = sections.filter(s => s.found).length

                      return (
                        <div className="space-y-6">
                          {/* Score Dial & Summary Stats */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div className="md:col-span-1 flex justify-center">
                              <ScoreDial 
                                score={score} 
                                label="Documentation Score" 
                                colorClass={score >= 80 ? "stroke-emerald-400" : score >= 50 ? "stroke-amber-400" : "stroke-rose-400"} 
                              />
                            </div>
                            
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
                                <span className="text-[10px] text-slate-500 font-semibold uppercase">Scanned File</span>
                                <span className="text-sm font-bold text-slate-200 mt-1 truncate" title={scannedFile}>
                                  {scannedFile !== "None" ? scannedFile : "README Not Found"}
                                </span>
                              </div>
                              <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
                                <span className="text-[10px] text-slate-500 font-semibold uppercase">Detected Sections</span>
                                <span className="text-xl font-bold text-white mt-1">
                                  {detectedCount} / 6
                                </span>
                              </div>
                              <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex flex-col justify-between col-span-2">
                                <span className="text-[10px] text-slate-500 font-semibold uppercase">Suggestions Checklist</span>
                                <span className="text-xs text-slate-400 mt-1 leading-relaxed">
                                  {suggestions.length > 0 
                                    ? `Identified ${suggestions.length} area(s) to optimize repository onboarding.`
                                    : "Onboarding documentation meets all evaluation standards."}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actionable Suggestions */}
                          {suggestions.length > 0 && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2">
                              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[10px] font-sans">
                                <ShieldAlert className="w-4 h-4 text-amber-400" />
                                Onboarding Optimization Guide
                              </div>
                              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                                {suggestions.map((s, idx) => (
                                  <li key={idx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Section Checklist */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Evaluation Checklist</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sections.map((sec, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-dark-950/50 border border-slate-800 flex flex-col justify-between space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white">{sec.category}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      sec.score >= 80 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : sec.score > 0 
                                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {sec.score}%
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 leading-normal">
                                    {sec.details}
                                  </p>
                                  <div className="flex items-center gap-1.5 pt-1">
                                    {sec.found ? (
                                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Present
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* File Preview */}
                          {preview && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">File Preview: {scannedFile}</h4>
                              <pre className="p-4 rounded-xl bg-dark-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[200px] shadow-inner leading-relaxed whitespace-pre-wrap">
                                {preview}
                              </pre>
                            </div>
                          )}
                        </div>
                      )
                    })()
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs italic bg-dark-950/30 border border-slate-800 rounded-xl">
                      {selectedRepo.status === 'cloning' 
                        ? 'Cloning and scanning files for documentation metadata...' 
                        : 'No documentation scans are recorded for this repository.'}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: REPRODUCIBILITY */}
              {activeTab === 'reproducibility' && (
                <div className="space-y-6">
                  {selectedRepo.analyses && selectedRepo.analyses.length > 0 ? (
                    (() => {
                      const analysis = selectedRepo.analyses[0]
                      const factors = analysis.findings?.reproducibility_factors || {}
                      
                      return (
                        <div className="space-y-6">
                          <div className="flex justify-center py-4">
                            <ScoreDial 
                              score={analysis.reproducibility_score || 0} 
                              label="Reproducibility Score" 
                              colorClass="stroke-brand-purple" 
                            />
                          </div>

                          <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Reproducibility Factors</h3>
                            <div className="space-y-3">
                              <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                                  <span className="text-sm">Dockerfile Environment Config</span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  factors.has_dockerfile ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {factors.has_dockerfile ? 'Found' : 'Missing'}
                                </span>
                              </div>

                              <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                                  <span className="text-sm">README Documentation Setup</span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  factors.has_readme ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {factors.has_readme ? 'Found' : 'Missing'}
                                </span>
                              </div>

                              <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                                  <span className="text-sm">Setup Guidelines Score</span>
                                </div>
                                <span className="text-sm font-bold text-white">
                                  {factors.environment_instructions_score || 'N/A'}/10
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-dark-950 border border-slate-800">
                            <h4 className="text-xs font-bold text-white mb-2">Analysis Executive Summary</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {analysis.summary || "No summary report compiled."}
                            </p>
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No reproducibility analysis runs are currently recorded.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: SURVIVABILITY */}
              {activeTab === 'survivability' && (
                <div className="space-y-6">
                  {selectedRepo.analyses && selectedRepo.analyses.length > 0 ? (
                    (() => {
                      const analysis = selectedRepo.analyses[0]
                      const factors = analysis.findings?.survivability_factors || {}
                      
                      return (
                        <div className="space-y-6">
                          <div className="flex justify-center py-4">
                            <ScoreDial 
                              score={analysis.survivability_score || 0} 
                              label="Survivability Index" 
                              colorClass="stroke-brand-cyan" 
                            />
                          </div>

                          <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Project Health Metrics</h3>
                            <div className="space-y-3">
                              <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-brand-cyan"></span>
                                  <span className="text-sm">Active Commits & Maintenance</span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  factors.active_maintenance ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {factors.active_maintenance ? 'Healthy' : 'Dormant'}
                                </span>
                              </div>

                              <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-brand-cyan"></span>
                                  <span className="text-sm">Permissive Open Source License</span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  factors.license_permissive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {factors.license_permissive ? 'Permissive' : 'Restrictive'}
                                </span>
                              </div>

                              <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-brand-cyan"></span>
                                  <span className="text-sm">Dependency Safety / Health</span>
                                </div>
                                <span className="text-sm font-semibold capitalize text-emerald-400">
                                  {factors.dependency_health || 'Good'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No survivability logs or indexes are recorded.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: EXECUTION LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-brand-indigo" />
                    Agent State Machine Execution Trace
                  </h3>
                  
                  {selectedRepo.analyses && selectedRepo.analyses.length > 0 ? (
                    <div className="p-4 rounded-xl bg-dark-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-2 max-h-[400px] overflow-y-auto shadow-inner leading-relaxed">
                      {(selectedRepo.analyses[0].logs || []).map((log, index) => (
                        <div key={index} className="flex gap-2">
                          <span className="text-slate-600 shrink-0">[{index + 1}]</span>
                          <span className="text-emerald-400 shrink-0">&gt;</span>
                          <span className="whitespace-pre-wrap">{log}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No logs available yet.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer info */}
            <div className="p-4 border-t border-slate-800/80 bg-dark-950/50 flex justify-between items-center text-[10px] text-slate-500 px-6">
              <span>Aegis Platform 1.0</span>
              <span>Workspace: Local Sandbox</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
