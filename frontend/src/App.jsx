import React, { useState, useEffect } from 'react'
import { 
  Github, Plus, RefreshCw, Star, GitFork, AlertCircle, 
  CheckCircle, Loader2, ArrowRight, ExternalLink, Calendar, 
  Users, Terminal, Code, Database, ShieldAlert, Cpu, HeartHandshake,
  Layers, ChevronRight, X, Clock, BookOpen, Trash2
} from 'lucide-react'
import { 
  getRepositories, 
  analyzeRepository, 
  getRepositoryDetails, 
  deleteRepository, 
  deleteAllRepositories 
} from './services/repositories'

function App() {
  // --- 1. State Declarations ---
  const [repos, setRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [currentView, setCurrentView] = useState('home') // home, analysis, history
  const [cloneUrl, setCloneUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview') // overview, dependencies, environment, documentation, reproducibility, survivability, logs
  const [depSearch, setDepSearch] = useState('')
  const [depFilter, setDepFilter] = useState('all') // all, production, development, direct, warnings
  const [envCopied, setEnvCopied] = useState(false)

  // --- 2. Data Fetching ---
  const fetchRepos = async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const data = await getRepositories()
      setRepos(data)
      
      // Keep selected repository state synchronized
      if (selectedRepo) {
        const updatedSelected = data.find(r => r.id === selectedRepo.id)
        if (updatedSelected) {
          setSelectedRepo(updatedSelected)
        }
      }
    } catch (err) {
      console.error("Failed to sync repositories:", err)
      setError("Failed to sync with API. Verify backend server connection.")
    } finally {
      if (!silent) setRefreshing(false)
    }
  }

  // Load repositories on mount
  useEffect(() => {
    fetchRepos()
  }, [])

  // Smart Polling: Refresh active cloning/running analyses every 3 seconds
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

  // --- 3. Calculated Statistics (Declared at top-level to prevent ReferenceErrors) ---
  const totalRepos = repos.length
  
  const completedAnalyses = repos.flatMap(r => r.analyses || []).filter(a => a.status === 'completed')
  
  const avgReproducibility = completedAnalyses.length > 0
    ? Math.round(completedAnalyses.reduce((acc, a) => acc + (a.reproducibility_score || 0), 0) / completedAnalyses.length)
    : 0
    
  const avgSurvivability = completedAnalyses.length > 0
    ? Math.round(completedAnalyses.reduce((acc, a) => acc + (a.survivability_score || 0), 0) / completedAnalyses.length)
    : 0

  const activeRepos = repos.filter(r => r.status === 'cloning' || (r.analyses && r.analyses.some(a => a.status === 'running')))
  const historyRepos = repos.filter(r => !(r.status === 'cloning' || (r.analyses && r.analyses.some(a => a.status === 'running'))))

  const getStackDistribution = () => {
    const counts = { frontend: {}, backend: {}, databases: {} }
    repos.forEach(repo => {
      const stack = repo.detected_stack
      if (stack) {
        if (stack.frontend) stack.frontend.forEach(t => counts.frontend[t] = (counts.frontend[t] || 0) + 1)
        if (stack.backend) stack.backend.forEach(t => counts.backend[t] = (counts.backend[t] || 0) + 1)
        if (stack.databases) stack.databases.forEach(t => counts.databases[t] = (counts.databases[t] || 0) + 1)
      }
    })
    return counts
  }

  // --- 4. Event Handlers ---
  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!cloneUrl.trim()) return

    setError('')
    setLoading(true)

    try {
      const newRepo = await analyzeRepository(cloneUrl.trim())
      setRepos(prev => [newRepo, ...prev])
      setCloneUrl('')
      // Instantly switch view to monitor logs
      setCurrentView('analysis')
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.detail || "An error occurred during submission."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRepo = async (id, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this repository analysis?")) return
    try {
      await deleteRepository(id)
      setRepos(prev => prev.filter(r => r.id !== id))
      if (selectedRepo?.id === id) {
        setSelectedRepo(null)
      }
    } catch (err) {
      console.error("Failed to delete repository:", err)
      setError("Failed to delete repository from history.")
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL repositories and their analyses? This cannot be undone.")) return
    try {
      await deleteAllRepositories()
      setRepos([])
      setSelectedRepo(null)
    } catch (err) {
      console.error("Failed to delete all repositories:", err)
      setError("Failed to clear repository history.")
    }
  }

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

  // --- 5. Render Dials and Charts ---
  const ScoreDial = ({ score, label, colorClass, shadowClass }) => {
    const radius = 38
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference

    return (
      <div className={`flex flex-col items-center p-6 rounded-2xl bg-dark-900/60 border border-white/5 hover:border-white/10 transition duration-300 relative group overflow-hidden ${shadowClass}`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/2 rounded-full blur-2xl pointer-events-none transition group-hover:bg-white/5"></div>
        <div className="relative flex items-center justify-center w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="48" cy="48" r={radius} className="stroke-slate-900" strokeWidth="6.5" fill="transparent" />
            <circle
              cx="48"
              cy="48"
              r={radius}
              className={`transition-all duration-1000 ease-out ${colorClass}`}
              strokeWidth="6.5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xl font-extrabold font-sans text-white tracking-tight">{score}%</span>
        </div>
        <span className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
    )
  }

  // --- 6. Helper Views ---
  const renderHeader = () => (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-purple shadow-lg shadow-brand-indigo/35 animate-slow-pulse">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black font-sans tracking-widest text-gradient">AEGIS</h1>
            <p className="text-[9px] text-slate-450 font-bold tracking-widest uppercase mt-0.5">Systems Diagnostics Dashboard</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 self-end md:self-auto">
          <nav className="flex items-center gap-1 bg-dark-950/90 p-1.5 rounded-xl border border-white/5 shadow-inner">
            <button
              onClick={() => { setCurrentView('home'); setSelectedRepo(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide uppercase transition-all duration-200 ${
                currentView === 'home' 
                  ? 'bg-gradient-to-r from-brand-indigo to-brand-purple text-white shadow-md shadow-brand-indigo/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/2'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => { setCurrentView('analysis'); setSelectedRepo(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide uppercase transition-all duration-200 flex items-center gap-1.5 ${
                currentView === 'analysis' 
                  ? 'bg-gradient-to-r from-brand-indigo to-brand-purple text-white shadow-md shadow-brand-indigo/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/2'
              }`}
            >
              Analysis Repo
              {activeRepos.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-[9px] font-bold text-white animate-pulse">{activeRepos.length}</span>
              )}
            </button>
            <button
              onClick={() => { setCurrentView('history'); setSelectedRepo(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide uppercase transition-all duration-200 ${
                currentView === 'history' 
                  ? 'bg-gradient-to-r from-brand-indigo to-brand-purple text-white shadow-md shadow-brand-indigo/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/2'
              }`}
            >
              History
            </button>
          </nav>
          
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse"></span>
            API Online
          </span>
          
          <button 
            onClick={() => fetchRepos()}
            disabled={refreshing}
            className="p-2 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/5 hover:border-white/10 transition duration-150 text-slate-350 disabled:opacity-50"
            title="Sync status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-indigo' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  )

  const renderHomeView = () => {
    const stackDist = getStackDistribution()
    const allTech = [
      ...Object.entries(stackDist.frontend).map(([name, val]) => ({ name, count: val, type: 'Frontend' })),
      ...Object.entries(stackDist.backend).map(([name, val]) => ({ name, count: val, type: 'Backend' })),
      ...Object.entries(stackDist.databases).map(([name, val]) => ({ name, count: val, type: 'Database' }))
    ].sort((a, b) => b.count - a.count)

    const maxCount = allTech.length > 0 ? Math.max(...allTech.map(t => t.count)) : 1

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Futuristic Landing Hero Section */}
        <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden bg-gradient-to-br from-dark-900/40 via-brand-indigo/5 to-brand-purple/5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-indigo/15 to-brand-purple/15 rounded-full blur-3xl pointer-events-none animate-slow-pulse"></div>
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-3xl space-y-6 relative z-10">
            <span className="px-3.5 py-1 rounded-full text-[9px] font-extrabold tracking-widest uppercase bg-brand-indigo/15 text-brand-cyan border border-brand-indigo/25 shadow-inner">
              SYSTEM LIVE CORE STATUS
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight font-sans tracking-tight">
              Evaluate Repository Health & <br />
              <span className="text-gradient">Onboarding Reproducibility</span>
            </h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl font-light">
              Evaluate dependency drift, code decay, missing environment templates, and documentation gaps using an automated multi-agent LangGraph workflow pipeline.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <button 
                onClick={() => setCurrentView('analysis')}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-indigo via-brand-purple to-brand-indigo bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white text-xs font-black shadow-lg shadow-brand-indigo/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                Scan New Codebase
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentView('history')}
                className="px-6 py-3.5 rounded-xl bg-dark-900/60 hover:bg-dark-800 border border-white/5 hover:border-white/10 transition text-slate-300 text-xs font-extrabold flex items-center gap-2"
              >
                Historical Logs
                <Clock className="w-4 h-4 text-brand-purple" />
              </button>
            </div>
          </div>
        </div>

        {/* Global Core Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Index Dials */}
          <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-6 relative overflow-hidden bg-gradient-to-b from-dark-900/50 to-transparent">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-brand-purple" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">System Stability Index</h3>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">System-wide averages calculated across all scanned environment files.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-2">
              <ScoreDial score={avgReproducibility} label="Reproducibility" colorClass="stroke-brand-purple" shadowClass="shadow-glass-glow" />
              <ScoreDial score={avgSurvivability} label="Survivability" colorClass="stroke-brand-cyan" shadowClass="shadow-glass-glow" />
            </div>
          </div>

          {/* Quick Metrics stats */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-brand-indigo/20 transition duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-indigo/5 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-indigo/10 transition duration-300"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monitored Repositories</span>
                <div className="p-3 rounded-xl bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo">
                  <Database className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-6">
                <h4 className="text-5xl font-black text-white tracking-tight">{totalRepos}</h4>
                <p className="text-[10px] text-slate-500 mt-2 font-light">Index repositories verified in Vector database.</p>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/20 transition duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition duration-300"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Run-Jobs</span>
                <div className={`p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 ${activeRepos.length > 0 ? 'animate-pulse' : ''}`}>
                  <RefreshCw className={`w-5 h-5 ${activeRepos.length > 0 ? 'animate-spin' : ''}`} />
                </div>
              </div>
              <div className="mt-6">
                <h4 className="text-5xl font-black text-emerald-400 tracking-tight">{activeRepos.length}</h4>
                <p className="text-[10px] text-slate-500 mt-2 font-light">LangGraph active scan worker processes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Technology Stack Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Code className="w-4.5 h-4.5 text-brand-indigo" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Discovered Tech Distribution</h3>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Relative frequency of stacks, languages, and frameworks identified across sources.</p>
            </div>

            {allTech.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 italic bg-dark-900/20 border border-white/5 rounded-xl">
                No repository stack profile data mapped.
              </div>
            ) : (
              <div className="space-y-4">
                {allTech.slice(0, 5).map((tech, idx) => {
                  const percent = Math.round((tech.count / maxCount) * 100)
                  const typeColor = tech.type === 'Frontend' 
                    ? 'bg-purple-500' 
                    : tech.type === 'Backend' 
                      ? 'bg-blue-500' 
                      : 'bg-cyan-500'
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{tech.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${tech.type === 'Frontend' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : tech.type === 'Backend' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>{tech.type}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{tech.count} {tech.count === 1 ? 'Repository' : 'Repositories'}</span>
                      </div>
                      <div className="w-full bg-slate-900/60 h-2.5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${typeColor}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Scans Shortcut Timeline */}
          <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-white/5 space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-brand-cyan" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Activity</h3>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Shortcuts to view recent compilation reports.</p>
            </div>

            {historyRepos.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-8 text-center bg-dark-900/10 border border-white/5 rounded-xl">No completed pipeline runs available.</p>
            ) : (
              <div className="space-y-3 flex-1 mt-4">
                {historyRepos.slice(0, 3).map(repo => {
                  const latestAnalysis = repo.analyses && repo.analyses[0]
                  const avgScore = latestAnalysis ? Math.round((latestAnalysis.reproducibility_score + latestAnalysis.survivability_score) / 2) : 0
                  return (
                    <div 
                      key={repo.id}
                      onClick={() => {
                        setSelectedRepo(repo);
                        setCurrentView('history');
                        setActiveTab('overview');
                      }}
                      className="p-3 rounded-xl bg-dark-900/40 hover:bg-dark-850/60 border border-white/5 hover:border-white/10 transition flex items-center justify-between cursor-pointer group"
                    >
                      <div className="truncate max-w-[70%]">
                        <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-brand-indigo transition">{repo.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5 block truncate">{repo.owner}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {latestAnalysis && (
                          <span className="px-2 py-0.5 rounded bg-brand-indigo/10 border border-brand-indigo/20 text-brand-cyan text-[9px] font-bold font-mono">
                            {avgScore}%
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            <button 
              onClick={() => setCurrentView('history')}
              className="w-full py-2.5 rounded-xl bg-dark-900 hover:bg-dark-850 border border-white/5 hover:border-white/10 text-xs text-slate-300 font-bold transition flex items-center justify-center gap-1.5"
            >
              See all logs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* LangGraph Pipeline State Machine Diagram */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 relative overflow-hidden bg-gradient-to-r from-dark-900/50 to-transparent">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-indigo/5 rounded-full blur-3xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-brand-purple" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">LangGraph Analysis Workflow</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Multi-agent flow executing sequentially to inspect, audit, grade, and vectorize codebase files.</p>
          </div>

          <div className="relative pt-6">
            <div className="hidden lg:block absolute top-[52px] left-[5%] right-[5%] h-[1px] bg-gradient-to-r from-brand-indigo via-brand-purple to-brand-cyan opacity-25 z-0"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 relative z-10">
              {[
                { step: "01", name: "Clone & Cache", icon: Github, desc: "Clones repository files locally and retrieves Github repo API metadata stats." },
                { step: "02", name: "Stack Scan", icon: Cpu, desc: "Scans configuration files and markers to detect languages, database models, and engines." },
                { step: "03", name: "Dependency Audit", icon: Database, desc: "Reviews packages for duplicates, missing version constraints, and deprecated declaration threats." },
                { step: "04", name: "Env Compile", icon: Terminal, desc: "Analyzes variable statements in code, maps missing templates, and reconstructs .env template files." },
                { step: "05", name: "Documentation", icon: BookOpen, desc: "Parses and grades the completeness of the README file structures and installation guidelines." },
                { step: "06", name: "ChromaDB Index", icon: RefreshCw, desc: "Calculates stability grades and writes all records to Postgres and code snippets to vector stores." }
              ].map((node, i) => {
                const Icon = node.icon
                return (
                  <div key={i} className="p-4 rounded-xl bg-dark-950/60 border border-white/5 hover:border-brand-indigo/35 transition duration-300 group flex flex-col justify-between h-full relative">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-brand-cyan font-mono">{node.step}</span>
                        <div className="p-2 rounded-lg bg-white/2 border border-white/5 text-slate-400 group-hover:text-white transition">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white block">{node.name}</span>
                      <p className="text-[10px] text-slate-500 mt-2 leading-relaxed font-light">{node.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAnalysisView = () => {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Repo Input form console */}
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5 shadow-glass max-w-3xl mx-auto relative overflow-hidden bg-gradient-to-br from-dark-900/60 to-brand-indigo/5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-indigo/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-indigo" />
            Analyze New Repository
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed font-light">
            Connect a GitHub repository URL. Aegis will clone, parse, and verify codebase safety, dependency drift, environment templates, and documentation health in real-time.
          </p>

          <form onSubmit={handleAnalyze} className="space-y-5">
            <div>
              <label htmlFor="clone-url" className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">Repository Clone URL</label>
              <div className="relative">
                <input
                  id="clone-url"
                  type="text"
                  required
                  placeholder="https://github.com/owner/repository"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  className="w-full pl-4 pr-12 py-3.5 rounded-xl glass-input text-xs text-slate-200 font-mono tracking-wide placeholder-slate-700"
                />
                <div className="absolute right-4 top-3.5 text-slate-600">
                  <Github className="w-5 h-5" />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !cloneUrl.trim()}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-purple hover:from-brand-indigo/90 hover:to-brand-purple/90 transition text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] duration-150"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Acquiring Repository...
                </>
              ) : (
                <>
                  Trigger Analysis
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Active Scanning pipelines */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
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
            <div className="glass-panel p-12 rounded-2xl text-center border border-white/5 max-w-3xl mx-auto flex flex-col items-center">
              <CheckCircle className="w-10 h-10 text-emerald-500/70 mb-4" />
              <h3 className="text-sm font-bold text-slate-200">All Pipelines Idle</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed font-light">
                No repository is currently being scanned. Provide a clone URL above to launch a new pipeline.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeRepos.map((repo) => {
                const logs = (repo.analyses && repo.analyses[0] && repo.analyses[0].logs) || []
                const status = repo.status
                const hasLog = (pattern) => logs.some(l => l.includes(pattern))
                
                let step1 = 'pending', step2 = 'pending', step3 = 'pending', step4 = 'pending', step5 = 'pending', step6 = 'pending'
                if (status === 'cloning') step1 = 'active'
                if (status === 'cloned' || hasLog('Node [technology_discovery]')) step1 = 'completed'
                if (hasLog('Node [technology_discovery]')) step2 = 'active'
                if (hasLog('Node [dependency_analysis]')) step2 = 'completed'
                if (hasLog('Node [dependency_analysis]')) step3 = 'active'
                if (hasLog('Node [environment_reconstruction]')) step3 = 'completed'
                if (hasLog('Node [environment_reconstruction]')) step4 = 'active'
                if (hasLog('Node [documentation_analysis]')) step4 = 'completed'
                if (hasLog('Node [documentation_analysis]')) step5 = 'active'
                if (hasLog('Node [store_results]')) step5 = 'completed'
                if (hasLog('Node [store_results]')) step6 = 'active'
                if (repo.analyses && repo.analyses[0] && repo.analyses[0].status === 'completed') step6 = 'completed'

                return (
                  <div key={repo.id} className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 bg-gradient-to-br from-dark-900/35 to-transparent animate-fadeIn">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block font-mono">{repo.owner}</span>
                        <h3 className="text-sm font-bold text-white mt-1 font-sans">{repo.name}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] text-slate-500 font-mono select-all bg-dark-950 px-2.5 py-1 rounded border border-white/5">{repo.clone_url}</span>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> ACTIVE RUNNER
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Flow stepper */}
                      <div className="lg:col-span-1 space-y-4">
                        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Pipeline Node Stepper</h4>
                        <div className="relative pl-6 border-l border-white/5 space-y-5 text-xs">
                          {[
                            { label: "01. Acquisition", state: step1, desc: "Cloning repo files & fetching stats" },
                            { label: "02. Stack Discovery", state: step2, desc: "Mapping core engine configuration markers" },
                            { label: "03. Dependency Audit", state: step3, desc: "Analyzing duplicates and security warnings" },
                            { label: "04. Env Reconstruction", state: step4, desc: "Resolving reference vars to .env templates" },
                            { label: "05. Doc Grading", state: step5, desc: "Checking documentation completeness criteria" },
                            { label: "06. Indexing & Save", state: step6, desc: "Saving data and indexing vectors to ChromaDB" }
                          ].map((step, idx) => {
                            const isCompleted = step.state === 'completed'
                            const isActive = step.state === 'active'
                            return (
                              <div key={idx} className="relative">
                                <div className={`absolute left-[-31px] top-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                                  isCompleted ? 'bg-emerald-500/20 border-emerald-405 text-emerald-405' : isActive ? 'bg-brand-indigo/25 border-brand-indigo text-brand-indigo animate-pulse' : 'bg-dark-900 border-white/5 text-slate-700'
                                }`}>
                                  {isCompleted ? <CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> : <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand-indigo' : 'bg-slate-800'}`} />}
                                </div>
                                <div>
                                  <span className={`font-extrabold block text-[11px] ${isCompleted ? 'text-emerald-400' : isActive ? 'text-brand-indigo' : 'text-slate-400'}`}>{step.label}</span>
                                  <span className="text-[10px] text-slate-500 mt-1 block leading-tight font-light">{step.desc}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Execution Terminal */}
                      <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
                        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                          <Terminal className="w-4 h-4 text-brand-indigo" /> 
                          Diagnostic logs stream
                        </h4>
                        <div className="p-4 rounded-xl bg-dark-950 border border-white/5 font-mono text-[10px] text-slate-300 space-y-2 max-h-[260px] overflow-y-auto flex-1 shadow-inner leading-relaxed select-all">
                          {logs.length === 0 ? (
                            <div className="text-slate-600 italic py-16 text-center">Awaiting execution logs stream...</div>
                          ) : (
                            logs.map((log, index) => (
                              <div key={index} className="flex gap-2.5">
                                <span className="text-slate-700 shrink-0 select-none">[{index + 1}]</span>
                                <span className="text-emerald-400 shrink-0 select-none">&gt;</span>
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

  const renderHistoryDetails = (repo) => {
    const active = activeTab
    return (
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 relative bg-gradient-to-br from-dark-900/35 to-transparent animate-fadeIn">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setSelectedRepo(null)}
              className="px-3.5 py-2 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              ← Back to History
            </button>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-sans truncate max-w-md">
                {repo.owner} / {repo.name}
              </h2>
              <p className="text-[9px] text-slate-500 font-mono mt-1 tracking-wider">
                ID: {repo.id}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleDeleteRepo(repo.id)}
            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 border border-rose-500/20 hover:border-rose-500/35 transition flex items-center gap-1.5 text-xs font-bold"
            title="Delete this analysis"
          >
            <Trash2 className="w-4 h-4" />
            Delete Report
          </button>
        </div>

        {/* Sub Tab Navigation */}
        <div className="flex border-b border-white/5 bg-transparent overflow-x-auto scrollbar-none gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: Code },
            { id: 'dependencies', label: 'Dependencies', icon: Database },
            { id: 'environment', label: 'Environment', icon: Cpu },
            { id: 'documentation', label: 'Documentation', icon: BookOpen },
            { id: 'reproducibility', label: 'Reproducibility', icon: Layers },
            { id: 'survivability', label: 'Survivability', icon: HeartHandshake },
            { id: 'logs', label: 'Agent Logs', icon: Terminal }
          ].map(tab => {
            const Icon = tab.icon
            const isTabActive = active === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-3 px-4 text-xs font-extrabold border-b-2 transition -mb-px shrink-0 ${
                  isTabActive 
                    ? 'border-brand-indigo text-white font-bold' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Sub Tab Content Panels */}
        <div className="pt-2 space-y-6">
          {active === 'overview' && (
            <div className="space-y-6">
              {/* Acquisition Status banner */}
              <div className="p-4 rounded-xl bg-dark-950/60 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Acquisition status</span>
                  <span className="text-xs font-bold text-white mt-1 capitalize block">
                    {repo.status === 'cloned' ? 'Git Repository Cached' : repo.status === 'failed' ? 'Pipeline Failure' : repo.status}
                  </span>
                </div>
                <div>
                  {repo.status === 'cloned' && <CheckCircle className="w-5 h-5 text-emerald-450" />}
                  {repo.status === 'cloning' && <Loader2 className="w-5 h-5 text-brand-indigo animate-spin" />}
                  {repo.status === 'failed' && <ShieldAlert className="w-5 h-5 text-rose-450" />}
                </div>
              </div>

              {/* Grid for Repo Metrics */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3">Repository Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-550" /> Stars</span>
                    <span className="text-xl font-bold text-white mt-2">{repo.stars || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1.5"><GitFork className="w-3.5 h-3.5 text-brand-indigo" /> Forks</span>
                    <span className="text-xl font-bold text-white mt-2">{repo.forks || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Open Issues</span>
                    <span className="text-xl font-bold text-white mt-2">{repo.open_issues || 0}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-brand-cyan" /> Contributors</span>
                    <span className="text-xl font-bold text-white mt-2">{repo.contributors_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Detected Stack Panel */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3">Fingerprints Detected</h3>
                {repo.detected_stack && (
                  (repo.detected_stack.backend && repo.detected_stack.backend.length > 0) || 
                  (repo.detected_stack.frontend && repo.detected_stack.frontend.length > 0) || 
                  (repo.detected_stack.databases && repo.detected_stack.databases.length > 0)
                ) ? (
                  <div className="p-4 rounded-xl bg-dark-950/60 border border-white/5 space-y-3">
                    {repo.detected_stack.backend && repo.detected_stack.backend.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase w-20 shrink-0 font-mono">Backend:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {repo.detected_stack.backend.map(tech => (
                            <span key={tech} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">{tech}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {repo.detected_stack.frontend && repo.detected_stack.frontend.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase w-20 shrink-0 font-mono">Frontend:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {repo.detected_stack.frontend.map(tech => (
                            <span key={tech} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-semibold">{tech}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {repo.detected_stack.databases && repo.detected_stack.databases.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase w-20 shrink-0 font-mono">Databases:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {repo.detected_stack.databases.map(tech => (
                            <span key={tech} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-semibold">{tech}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-dark-950/20 border border-white/5 text-xs text-slate-550 italic">No technology fingerprints cataloged.</div>
                )}
              </div>

              {/* Description Card */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Metadata Description</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-dark-950/60 p-4 rounded-xl border border-white/5 font-light">
                  {repo.description || "No description cataloged for this repository."}
                </p>
              </div>

              {/* File Info / Timestamps */}
              <div className="space-y-3.5 text-xs bg-dark-950/30 p-4 rounded-xl border border-white/5 font-light">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-450 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-brand-indigo" /> Last Commit Date</span>
                  <span className="text-slate-300 font-semibold">{formatDate(repo.last_commit_date)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-450 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-brand-purple" /> Analysis Timestamp</span>
                  <span className="text-slate-300 font-semibold">{formatDate(repo.created_at)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-450 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5 text-brand-cyan" /> Repository URL</span>
                  <a href={repo.clone_url} target="_blank" rel="noreferrer" className="text-brand-indigo hover:underline font-mono truncate max-w-xs flex items-center gap-1">
                    {repo.clone_url} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {repo.local_path && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-450 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-slate-500" /> Disk Path</span>
                    <span className="text-slate-400 font-mono truncate max-w-xs" title={repo.local_path}>
                      {repo.local_path}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {active === 'dependencies' && (
            <div className="space-y-6">
              {repo.dependencies_profile ? (
                (() => {
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
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Total Packages</span>
                          <span className="text-xl font-bold text-white mt-2">{report.total_count || 0}</span>
                        </div>
                        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${report.duplicates?.length > 0 ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-dark-900/40 border-white/5 text-slate-500'}`}>
                          <span className="text-[10px] font-bold uppercase">Duplicates</span>
                          <span className="text-xl font-bold text-white mt-2">{report.duplicates?.length || 0}</span>
                        </div>
                        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${report.missing_versions?.length > 0 ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-dark-900/40 border-white/5 text-slate-500'}`}>
                          <span className="text-[10px] font-bold uppercase">Missing Versions</span>
                          <span className="text-xl font-bold text-white mt-2">{report.missing_versions?.length || 0}</span>
                        </div>
                        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${report.suspicious_declarations?.length > 0 ? 'bg-rose-500/5 border-rose-500/20 text-rose-455' : 'bg-dark-900/40 border-white/5 text-slate-500'}`}>
                          <span className="text-[10px] font-bold uppercase">Suspicious Ref</span>
                          <span className="text-xl font-bold text-white mt-2">{report.suspicious_declarations?.length || 0}</span>
                        </div>
                      </div>

                      {(report.duplicates?.length > 0 || report.missing_versions?.length > 0 || report.suspicious_declarations?.length > 0) && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-350 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                            Security warnings ({report.duplicates.length + report.missing_versions.length + report.suspicious_declarations.length})
                          </h4>
                          <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 select-all">
                            {report.duplicates.map((dup, i) => (
                              <div key={`dup-${i}`} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <div>Duplicate declaration: package <code>{dup.name}</code> defined multiple times in <code>{dup.source_file}</code> (versions: {dup.versions.join(', ')}).</div>
                              </div>
                            ))}
                            {report.missing_versions.map((m, i) => (
                              <div key={`m-${i}`} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <div>Missing constraint: package <code>{m.name}</code> in <code>{m.source_file}</code> version constraint unspecified.</div>
                              </div>
                            ))}
                            {report.suspicious_declarations.map((s, i) => (
                              <div key={`s-${i}`} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
                                <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <div>Suspicious declaration: package <code>{s.name}</code> (version: <code>{s.version}</code>) in <code>{s.source_file}</code>. Reason: {s.reason}.</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          placeholder="Search package catalog..."
                          value={depSearch}
                          onChange={(e) => setDepSearch(e.target.value)}
                          className="px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-200 flex-1 font-sans"
                        />
                        <select
                          value={depFilter}
                          onChange={(e) => setDepFilter(e.target.value)}
                          className="px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-350 bg-dark-900 border border-white/5 font-sans"
                        >
                          <option value="all">All Dependencies</option>
                          <option value="production">Production / Compile</option>
                          <option value="development">Development / Test</option>
                          <option value="direct">Direct (Python)</option>
                          <option value="warnings">Warnings / Threats Only</option>
                        </select>
                      </div>

                      <div className="border border-white/5 rounded-2xl overflow-hidden bg-dark-950/40">
                        <div className="max-h-[300px] overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-dark-950/80 border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider">
                                <th className="p-3.5">Package</th>
                                <th className="p-3.5">Version</th>
                                <th className="p-3.5">Type</th>
                                <th className="p-3.5">Source File</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredDeps.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-500 italic">No packages cataloged in dependencies.</td></tr>
                              ) : (
                                filteredDeps.map((d, idx) => {
                                  const isDuplicate = report.duplicates.some(dup => dup.name.toLowerCase() === d.name.toLowerCase() && dup.source_file === d.source_file)
                                  const isMissing = !d.version || d.version === '*' || d.version === 'unspecified'
                                  const isSuspicious = report.suspicious_declarations.some(susp => susp.name.toLowerCase() === d.name.toLowerCase() && susp.source_file === d.source_file)
                                  const hasWarning = isDuplicate || isMissing || isSuspicious
                                  return (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-dark-900/40 transition">
                                      <td className="p-3.5 font-bold text-slate-205 flex items-center gap-2">
                                        {d.name}
                                        {hasWarning && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSuspicious ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`}></span>}
                                      </td>
                                      <td className="p-3.5 font-mono text-slate-400">
                                        {d.version ? d.version : <span className="text-amber-500/80 italic font-sans text-[10px]">unspecified</span>}
                                      </td>
                                      <td className="p-3.5">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${d.dependency_type === 'production' || d.dependency_type === 'compile' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : d.dependency_type === 'development' || d.dependency_type === 'test' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-500/10 text-slate-350 border border-slate-700/30'}`}>
                                          {d.dependency_type}
                                        </span>
                                      </td>
                                      <td className="p-3.5 font-mono text-slate-500 text-[10px] select-all">{d.source_file}</td>
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
                <div className="p-8 text-center text-slate-550 text-xs italic bg-dark-950/20 border border-white/5 rounded-xl">No dependency analysis cataloged.</div>
              )}
            </div>
          )}

          {active === 'environment' && (
            <div className="space-y-6">
              {repo.environment_profile ? (
                (() => {
                  const profile = repo.environment_profile
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Total Variables</span>
                          <span className="text-xl font-bold text-white mt-1">{vars.length}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Scanned Files</span>
                          <span className="text-xl font-bold text-white mt-1">{scannedCount}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Templates Found</span>
                          <span className="text-xs font-bold text-slate-300 mt-2.5 truncate" title={templatesFound.join(', ')}>{templatesFound.length > 0 ? templatesFound.join(', ') : 'None'}</span>
                        </div>
                        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${missingVars.length > 0 ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-dark-900/40 border-white/5 text-slate-505'}`}>
                          <span className="text-[10px] font-bold uppercase">Undocumented Vars</span>
                          <span className="text-xl font-bold text-white mt-1">{missingVars.length}</span>
                        </div>
                      </div>

                      {missingVars.length > 0 && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2 animate-fadeIn">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] font-sans">
                            <ShieldAlert className="w-4 h-4 text-amber-400" /> Configuration Discrepancies
                          </div>
                          <p className="leading-relaxed font-light">The following variables are invoked in your code statements but absent from the `.env` template config files:</p>
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {missingVars.map(v => (
                              <span key={v.name} className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/35 text-amber-250 font-mono text-[9px] select-all">{v.name}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-slate-350 uppercase tracking-widest">Reconstructed .env Template</h4>
                          <button onClick={handleCopyText} disabled={!template} className="px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/5 text-[9px] font-bold text-slate-300 transition flex items-center gap-1 font-sans">
                            {envCopied ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Copied!</> : <><RefreshCw className="w-3.5 h-3.5 text-brand-indigo" /> Copy Template</>}
                          </button>
                        </div>
                        <pre className="p-4 rounded-xl bg-dark-950 border border-white/5 font-mono text-xs text-emerald-450 overflow-x-auto max-h-[180px] shadow-inner select-all leading-relaxed">
                          {template || "# No variables cataloged to compile template."}
                        </pre>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Environment Variable Registry</h4>
                        <div className="border border-white/5 rounded-2xl overflow-hidden bg-dark-950/40">
                          <div className="max-h-[260px] overflow-y-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-dark-950/80 border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider">
                                  <th className="p-3.5">Variable Key</th>
                                  <th className="p-3.5">Status</th>
                                  <th className="p-3.5">Source Files</th>
                                </tr>
                              </thead>
                              <tbody>
                                {vars.length === 0 ? (
                                  <tr><td colSpan="3" className="p-8 text-center text-slate-500 italic">No variables registered.</td></tr>
                                ) : (
                                  vars.map((v, idx) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-dark-900/40 transition">
                                      <td className="p-3.5 font-bold font-mono text-slate-200 select-all">{v.name}</td>
                                      <td className="p-3.5">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${v.is_missing_from_template ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'}`}>
                                          {v.is_missing_from_template ? 'Missing Template' : 'Documented'}
                                        </span>
                                      </td>
                                      <td className="p-3.5 text-slate-450 font-mono leading-relaxed select-all">
                                        <div className="flex flex-wrap gap-1">
                                          {v.sources.map((s, sIdx) => (
                                            <span key={sIdx} className="bg-dark-950 px-1.5 py-0.5 rounded border border-white/5 text-[9px]" title={s}>{s.split('/').pop()}</span>
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
                <div className="p-8 text-center text-slate-550 text-xs italic bg-dark-950/20 border border-white/5 rounded-xl">No environment audit logs registered.</div>
              )}
            </div>
          )}

          {active === 'documentation' && (
            <div className="space-y-6">
              {repo.documentation_profile ? (
                (() => {
                  const profile = repo.documentation_profile
                  const score = profile.completeness_score || 0
                  const scannedFile = profile.scanned_file || "None"
                  const sections = profile.sections || []
                  const suggestions = profile.suggestions || []
                  const preview = profile.readme_preview || ""
                  const detectedCount = sections.filter(s => s.found).length

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-1 flex justify-center">
                          <ScoreDial score={score} label="Completeness Grade" colorClass={score >= 80 ? "stroke-emerald-450" : score >= 50 ? "stroke-amber-450" : "stroke-rose-455"} shadowClass="shadow-glass" />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Scanned File</span>
                            <span className="text-xs font-bold text-slate-205 mt-2 truncate select-all" title={scannedFile}>{scannedFile !== "None" ? scannedFile : "README Not Found"}</span>
                          </div>
                          <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Detected Sections</span>
                            <span className="text-xl font-bold text-white mt-1">{detectedCount} / 6</span>
                          </div>
                          <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex flex-col justify-between col-span-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Documentation Insight</span>
                            <span className="text-[11px] text-slate-400 mt-2 leading-relaxed font-light">{suggestions.length > 0 ? `Detected ${suggestions.length} checklist guidelines to improve codebase setup guidelines.` : "Repository contains comprehensive setup files."}</span>
                          </div>
                        </div>
                      </div>

                      {suggestions.length > 0 && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-305 space-y-2 animate-fadeIn select-all">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] font-sans">
                            <ShieldAlert className="w-4 h-4 text-amber-400" /> Onboarding recommendations
                          </div>
                          <ul className="list-disc pl-4 space-y-1.5 leading-relaxed font-light">
                            {suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-350 uppercase tracking-widest">Onboarding Sections Evaluation</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sections.map((sec, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-dark-950/60 border border-white/5 flex flex-col justify-between space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">{sec.category}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${sec.score >= 80 ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : sec.score > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'}`}>{sec.score}%</span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-normal font-light">{sec.details}</p>
                              <div className="flex items-center gap-1.5 pt-1">
                                {sec.found ? <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> Present</span> : <span className="flex items-center gap-1.5 text-[9px] font-bold text-rose-400"><AlertCircle className="w-3.5 h-3.5" /> Missing</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {preview && (
                        <div className="space-y-2.5">
                          <h4 className="text-[10px] font-bold text-slate-350 uppercase tracking-widest">File Preview ({scannedFile})</h4>
                          <pre className="p-4 rounded-xl bg-dark-950 border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[220px] shadow-inner leading-relaxed whitespace-pre-wrap select-all">{preview}</pre>
                        </div>
                      )}
                    </div>
                  )
                })()
              ) : (
                <div className="p-8 text-center text-slate-550 text-xs italic bg-dark-950/20 border border-white/5 rounded-xl">No documentation checks recorded.</div>
              )}
            </div>
          )}

          {active === 'reproducibility' && (
            <div className="space-y-6">
              {repo.analyses && repo.analyses.length > 0 ? (
                (() => {
                  const analysis = repo.analyses[0]
                  const findings = analysis.findings || {}
                  const factors = findings.reproducibility_factors || {}
                  return (
                    <div className="space-y-6">
                      <div className="flex justify-center py-2">
                        <ScoreDial score={analysis.reproducibility_score || 0} label="Reproducibility Score" colorClass="stroke-brand-purple" shadowClass="shadow-glass" />
                      </div>
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3">Verification Factors</h3>
                        <div className="space-y-3">
                          <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-purple"></span> <span className="text-xs text-slate-200 font-semibold">Dockerfile / Container Specs</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${factors.has_dockerfile ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'}`}>{factors.has_dockerfile ? 'Found' : 'Missing'}</span>
                          </div>
                          <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-purple"></span> <span className="text-xs text-slate-200 font-semibold">README Setup Guidelines</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${factors.has_readme ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'}`}>{factors.has_readme ? 'Found' : 'Missing'}</span>
                          </div>
                          <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-purple"></span> <span className="text-xs text-slate-200 font-semibold">Installation Guidelines Grade</span>
                            </div>
                            <span className="text-xs font-bold text-white font-mono">{factors.environment_instructions_score || 0} / 10</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-dark-950 border border-white/5 select-all">
                        <h4 className="text-[10px] font-bold text-slate-350 uppercase tracking-widest mb-2.5">Executive Summary Report</h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-light">{analysis.summary || "No stability report compiled."}</p>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="p-8 text-center text-slate-550 text-xs italic bg-dark-950/20 border border-white/5 rounded-xl">No stability grade data recorded.</div>
              )}
            </div>
          )}

          {active === 'survivability' && (
            <div className="space-y-6">
              {repo.analyses && repo.analyses.length > 0 ? (
                (() => {
                  const analysis = repo.analyses[0]
                  const findings = analysis.findings || {}
                  const factors = findings.survivability_factors || {}
                  return (
                    <div className="space-y-6">
                      <div className="flex justify-center py-2">
                        <ScoreDial score={analysis.survivability_score || 0} label="Survivability Score" colorClass="stroke-brand-cyan" shadowClass="shadow-glass" />
                      </div>
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3">Project Health Metrics</h3>
                        <div className="space-y-3">
                          <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span> <span className="text-xs text-slate-200 font-semibold">Repository Maintenance Activity</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${factors.active_maintenance ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'}`}>{factors.active_maintenance ? 'Active' : 'Dormant'}</span>
                          </div>
                          <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span> <span className="text-xs text-slate-200 font-semibold">Permissive Open Source License</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${factors.license_permissive ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'}`}>{factors.license_permissive ? 'Permissive' : 'Missing/Strict'}</span>
                          </div>
                          <div className="p-4 rounded-xl bg-dark-900/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span> <span className="text-xs text-slate-200 font-semibold">Dependencies Security Index</span>
                            </div>
                            <span className="text-xs font-semibold capitalize text-emerald-400">{factors.dependency_health || 'Healthy'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="p-8 text-center text-slate-550 text-xs italic bg-dark-950/20 border border-white/5 rounded-xl">No survivability metric data recorded.</div>
              )}
            </div>
          )}

          {active === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Terminal className="w-4 h-4 text-brand-indigo" /> 
                Agent State Machine Execution Trace
              </h3>
              {repo.analyses && repo.analyses.length > 0 ? (
                <div className="p-4 rounded-xl bg-dark-950 border border-white/5 font-mono text-[10px] text-slate-300 space-y-2 max-h-[400px] overflow-y-auto shadow-inner leading-relaxed select-all">
                  {(repo.analyses[0].logs || []).map((log, index) => (
                    <div key={index} className="flex gap-2.5">
                      <span className="text-slate-700 shrink-0 select-none">[{index + 1}]</span>
                      <span className="text-emerald-400 shrink-0 select-none">&gt;</span>
                      <span className="whitespace-pre-wrap">{log}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-550 text-xs italic bg-dark-950/20 border border-white/5 rounded-xl">No logs archived yet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderHistoryView = () => {
    if (selectedRepo) {
      return renderHistoryDetails(selectedRepo)
    }

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-brand-indigo" />
              Analysis Registry History
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-light">
              Displaying {historyRepos.length} completed or failed codebase scanning reports.
            </p>
          </div>

          {historyRepos.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/35 text-rose-455 transition text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Records
            </button>
          )}
        </div>

        {historyRepos.length === 0 ? (
          <div className="glass-panel p-16 rounded-2xl text-center border border-white/5 max-w-3xl mx-auto flex flex-col items-center">
            <Github className="w-12 h-12 text-slate-700 mb-4" />
            <h3 className="text-sm font-bold text-slate-200">No History Records</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed font-light">
              No previous scans were found. Connect a repository clone URL under the Analysis tab.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyRepos.map((repo) => {
              const latestAnalysis = repo.analyses && repo.analyses.length > 0 ? repo.analyses[0] : null
              const hasScore = latestAnalysis?.status === 'completed'
              const averageScore = hasScore 
                ? Math.round(((latestAnalysis.reproducibility_score || 0) + (latestAnalysis.survivability_score || 0)) / 2)
                : null
              
              return (
                <div 
                  key={repo.id}
                  onClick={() => {
                    setSelectedRepo(repo);
                    setActiveTab('overview');
                  }}
                  className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-brand-indigo/35 hover:bg-dark-900/30 transition duration-300 flex flex-col justify-between space-y-4 cursor-pointer group shadow-glass relative overflow-hidden animate-fadeIn"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/2 rounded-full blur-2xl pointer-events-none transition group-hover:bg-brand-indigo/5"></div>
                  
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">{repo.owner}</span>
                      {repo.status === 'cloned' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[9px] font-bold">Ready</span>
                      ) : repo.status === 'failed' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-455 border border-rose-500/20 text-[9px] font-bold font-sans">Failed</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-700/20 text-[9px] font-bold">{repo.status}</span>
                      )}
                    </div>
                    
                    <h3 className="text-sm font-bold text-white group-hover:text-brand-indigo transition truncate">{repo.name}</h3>
                    <p className="text-xs text-slate-450 line-clamp-2 leading-relaxed font-light" title={repo.description}>
                      {repo.description || "No metadata description provided."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-[10px] relative z-10 font-mono">
                    <span className="text-slate-500">{formatDate(repo.created_at)}</span>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {hasScore && (
                        <span className="px-2 py-0.5 rounded bg-brand-indigo/10 border border-brand-indigo/20 text-brand-cyan font-bold font-mono" title="Composite Health Grade">
                          {averageScore}%
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteRepo(repo.id, e)}
                        className="p-1.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 transition duration-150"
                        title="Delete from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // --- 7. Main Return ---
  return (
    <div className="min-h-full relative overflow-hidden bg-dark-950 text-slate-100 pb-16">
      {/* Decorative Neon Blur Blobs */}
      <div className="glow-blob-purple top-[-100px] right-[-100px] animate-slow-pulse"></div>
      <div className="glow-blob-blue bottom-[-100px] left-[-100px]"></div>

      {renderHeader()}

      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10">
        {currentView === 'home' && renderHomeView()}
        {currentView === 'analysis' && renderAnalysisView()}
        {currentView === 'history' && renderHistoryView()}
      </main>
    </div>
  )
}

export default App
