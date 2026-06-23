import React, { useState, useEffect } from 'react'
import { 
  getRepositories, 
  analyzeRepository, 
  deleteRepository, 
  deleteAllRepositories,
  downloadRepositoryReport
} from './services/repositories'

// Reusable UI components
import { ConfirmModal } from './components/ui/Modal'
import { Button } from './components/ui/Button'
import { Card } from './components/ui/Card'
import { CircularProgress } from './components/ui/CircularProgress'

// Modular dashboard components
import Sidebar from './components/dashboard/Sidebar'
import RightPanel from './components/dashboard/RightPanel'
import BenchmarkCenter from './components/dashboard/BenchmarkCenter'
import AnalysisPanel from './components/dashboard/AnalysisPanel'
import Login from './components/dashboard/Login'
import Register from './components/dashboard/Register'

// Scoped metric visualization upgrades
import RadialGauge from './components/ui/RadialGauge'
import BuildWorkflow from './components/ui/BuildWorkflow'
import ArchitectureView from './components/ui/ArchitectureView'

// Intelligence Panels
import ExecutiveIntelligencePanel from './components/intelligence/ExecutiveIntelligencePanel'
import MaturityPanel from './components/intelligence/MaturityPanel'
import BuildReproducibilityPanel from './components/intelligence/BuildReproducibilityPanel'
import AIReasoningPanel from './components/intelligence/AIReasoningPanel'
import RiskForecastPanel from './components/intelligence/RiskForecastPanel'
import DependencyIntelligencePanel from './components/intelligence/DependencyIntelligencePanel'
import ActionPlanPanel from './components/intelligence/ActionPlanPanel'
import ExecutionGuidePanel from './components/intelligence/ExecutionGuidePanel'
import EnvironmentIntelligencePanel from './components/intelligence/EnvironmentIntelligencePanel'
import DocumentationIntelligencePanel from './components/intelligence/DocumentationIntelligencePanel'
import SurvivabilityIntelligencePanel from './components/intelligence/SurvivabilityIntelligencePanel'
import VulnerabilityIntelligencePanel from './components/intelligence/VulnerabilityIntelligencePanel'
import AgentLogsIntelligencePanel from './components/intelligence/AgentLogsIntelligencePanel'
import VisualizationsPanel from './components/intelligence/VisualizationsPanel'

// Global View sections
import KPIStats from './components/dashboard/KPIStats'
import TechDistribution from './components/dashboard/TechDistribution'
import RecentActivity from './components/dashboard/RecentActivity'
import SystemGuide from './components/dashboard/SystemGuide'

// Lucide icon assets
import { 
  Github, Download, Trash2, Hammer, Brain, ShieldAlert, 
  TrendingDown, Minus, TrendingUp, Sun, Moon, RefreshCw, 
  Play, Check, AlertCircle, BookOpen, Layers, Database,
  Terminal, Activity, Globe, Sparkles, Heart, FileText,
  ChevronLeft, ChevronRight, LayoutDashboard, PlusCircle,
  BarChart3, Settings, HeartHandshake, Clock, LogOut,
  FolderGit, ChevronDown, Cpu
} from 'lucide-react'

function App() {
  // --- 1. State Declarations ---
  const [repos, setRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard') // dashboard, analysis, build_validation, ai_intelligence, risk_center, reports, benchmarks, settings
  const [cloneUrl, setCloneUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false)
  
  // Authentication states
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [authView, setAuthView] = useState(() => {
    return localStorage.getItem('access_token') ? 'authenticated' : 'login'
  })

  // Theme management state
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  // Custom modal state for confirm dialogues
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'primary',
    onConfirm: () => {}
  })

  // Synchronize document theme class with local state
  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
    } else {
      root.classList.remove('light')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
    setAuthView('login')
    setRepos([])
    setSelectedRepo(null)
    setCurrentView('dashboard')
  }

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

  // Load repositories on mount if authenticated
  useEffect(() => {
    if (authView === 'authenticated') {
      fetchRepos()
    }
  }, [authView])

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
  }, [repos, selectedRepo])

  // --- 3. Calculated Statistics ---
  const totalRepos = repos.length
  
  const completedAnalyses = repos.flatMap(r => r.analyses || []).filter(a => a.status === 'completed')
  
  const avgReproducibility = completedAnalyses.length > 0
    ? Math.round(completedAnalyses.reduce((acc, a) => acc + (a.reproducibility_score || 0), 0) / completedAnalyses.length)
    : 0
    
  const avgSurvivability = completedAnalyses.length > 0
    ? Math.round(completedAnalyses.reduce((acc, a) => acc + (a.survivability_score || 0), 0) / completedAnalyses.length)
    : 0

  const completedRepos = repos.filter(r => r.analyses?.some(a => a.status === 'completed'))

  const avgDocumentation = completedRepos.length > 0
    ? Math.round(completedRepos.reduce((acc, r) => acc + (r.documentation_profile?.completeness_score || 0), 0) / completedRepos.length)
    : 0

  const avgDependencyHealth = completedRepos.length > 0
    ? Math.round(completedRepos.reduce((acc, r) => {
        const total = r.dependencies_profile?.report?.total_count || 0
        const fails = (r.dependencies_profile?.report?.duplicates?.length || 0) + (r.dependencies_profile?.report?.suspicious_declarations?.length || 0)
        if (total === 0) return acc + 100
        return acc + Math.max(0, Math.round(100 - (fails / total) * 100))
      }, 0) / completedRepos.length)
    : 0

  const avgSecurity = completedRepos.length > 0
    ? Math.round(completedRepos.reduce((acc, r) => {
        return acc + (r.analyses?.[0]?.findings?.survivability_details?.metrics?.security_risks_score || 85)
      }, 0) / completedRepos.length)
    : 0

  const avgMaturity = completedRepos.length > 0
    ? Math.round(completedRepos.reduce((acc, r) => {
        return acc + (r.analyses?.[0]?.findings?.intelligence?.maturity?.score || 0)
      }, 0) / completedRepos.length)
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
    if (e) e.preventDefault()
    if (!cloneUrl.trim()) return

    setError('')
    setLoading(true)

    try {
      const newRepo = await analyzeRepository(cloneUrl.trim())
      setRepos(prev => [newRepo, ...prev])
      setCloneUrl('')
      // Switch view to logs
      setCurrentView('analysis')
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.detail || "An error occurred during submission."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRepo = async (id) => {
    try {
      await deleteRepository(id)
      setRepos(prev => prev.filter(r => r.id !== id))
      if (selectedRepo?.id === id) {
        setSelectedRepo(null)
      }
    } catch (err) {
      console.error("Failed to delete repository:", err)
      setError("Failed to delete repository from history.")
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }))
    }
  }

  const handleDeleteAll = async () => {
    try {
      await deleteAllRepositories()
      setRepos([])
      setSelectedRepo(null)
    } catch (err) {
      console.error("Failed to delete all repositories:", err)
      setError("Failed to clear repository history.")
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }))
    }
  }

  const handleDownloadReport = async (repo) => {
    try {
      const response = await downloadRepositoryReport(repo.id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      
      const contentDisposition = response.headers['content-disposition']
      let filename = `repository_report_${repo.owner}_${repo.name}.pdf`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1]
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to download PDF report:", err)
      setError("Failed to download PDF report. Make sure analysis was run.")
    }
  }

  const handleReanalyze = async (repo) => {
    setError('')
    setLoading(true)
    try {
      const updatedRepo = await analyzeRepository(repo.clone_url)
      setRepos(prev => prev.map(r => r.id === updatedRepo.id ? { ...r, ...updatedRepo } : r))
      setSelectedRepo({ ...selectedRepo, ...updatedRepo })
      setCurrentView('analysis')
    } catch (err) {
      console.error("Failed to trigger re-analysis:", err)
      setError(err.response?.data?.detail || "Failed to trigger re-analysis.")
    } finally {
      setLoading(false)
    }
  }

  // Trigger Confirmation Modal for Deletion
  const confirmDeleteRepo = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Repository Report',
      message: 'Are you sure you want to delete this repository analysis report? This action cannot be undone.',
      confirmText: 'Delete Report',
      confirmVariant: 'danger',
      onConfirm: () => handleDeleteRepo(id)
    })
  }

  // Trigger Confirmation Modal for Deleting All
  const confirmDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Repository Logs',
      message: 'Are you sure you want to delete ALL repositories and their analyses? This cannot be undone.',
      confirmText: 'Clear All Records',
      confirmVariant: 'danger',
      onConfirm: handleDeleteAll
    })
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

  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo)
    setCurrentView('dashboard')
  }

  const getHealthBadge = (repo) => {
    if (!repo) return null
    const analysis = repo.analyses?.[0] || null
    const repro = analysis?.reproducibility_score || 0
    const surv = analysis?.survivability_score || 0
    const composite = Math.round((repro + surv) / 2)

    let daysAgo = 0
    if (repo.last_commit_date) {
      const commitDate = new Date(repo.last_commit_date)
      const diffTime = Math.abs(new Date() - commitDate)
      daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    if (repo.status === 'failed' || (analysis && composite < 40)) {
      return { label: 'Abandoned', className: 'badge-abandoned' }
    }
    if (repo.last_commit_date && daysAgo > 180) {
      return { label: 'Dormant', className: 'badge-dormant' }
    }
    if (composite >= 85) {
      return { label: 'Elite', className: 'badge-elite' }
    }
    if (composite >= 70) {
      return { label: 'Healthy', className: 'badge-healthy' }
    }
    return { label: 'At Risk', className: 'badge-atrisk' }
  }

  // --- 5. Main Login/Register Routing renders ---
  if (authView === 'login') {
    return (
      <Login
        apiBaseUrl={window.RUNTIME_CONFIG?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}
        onLoginSuccess={(data) => {
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          localStorage.setItem('user', JSON.stringify(data.user))
          setUser(data.user)
          setAuthView('authenticated')
        }}
        onSwitchToRegister={() => setAuthView('register')}
      />
    )
  }

  if (authView === 'register') {
    return (
      <Register
        apiBaseUrl={window.RUNTIME_CONFIG?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}
        onRegisterSuccess={() => setAuthView('login')}
        onBackToLogin={() => setAuthView('login')}
      />
    )
  }

  // Tech stack distribution calculations
  const stackDist = getStackDistribution()
  const allTech = [
    ...Object.entries(stackDist.frontend).map(([name, val]) => ({ name, count: val, type: 'Frontend' })),
    ...Object.entries(stackDist.backend).map(([name, val]) => ({ name, count: val, type: 'Backend' })),
    ...Object.entries(stackDist.databases).map(([name, val]) => ({ name, count: val, type: 'Database' }))
  ].sort((a, b) => b.count - a.count)
  const maxCount = allTech.length > 0 ? Math.max(...allTech.map(t => t.count)) : 1

  // Score breakdowns calculations for selected repo
  const latestAnalysis = selectedRepo?.analyses?.[0] || null
  const findings = latestAnalysis?.findings || {}
  const repFactors = findings.reproducibility_factors || {}
  const survMetrics = findings.survivability_details?.metrics || {}

  const reproBreakdown = [
    { label: 'Base score', points: 30, max: 30, achieved: true },
    { label: 'Dockerfile / Container support', points: 30, max: 30, achieved: !!repFactors.has_dockerfile },
    { label: 'README file present', points: 10, max: 10, achieved: !!repFactors.has_readme },
    { label: 'README instructions score', points: Math.round((repFactors.environment_instructions_score || 0) * 3), max: 30, achieved: (repFactors.environment_instructions_score || 0) > 0 }
  ]

  const survBreakdown = [
    { label: 'Commit Frequency (25%)', points: Math.round((survMetrics.commit_frequency_score || 0) * 0.25), max: 25, achieved: (survMetrics.commit_frequency_score || 0) > 0 },
    { label: 'Contributor Activity (20%)', points: Math.round((survMetrics.contributor_activity_score || 0) * 0.20), max: 20, achieved: (survMetrics.contributor_activity_score || 0) > 0 },
    { label: 'Release Frequency (15%)', points: Math.round((survMetrics.release_frequency_score || 0) * 0.15), max: 15, achieved: (survMetrics.release_frequency_score || 0) > 0 },
    { label: 'Dependency Freshness (15%)', points: Math.round((survMetrics.dependency_freshness_score || 0) * 0.15), max: 15, achieved: (survMetrics.dependency_freshness_score || 0) > 0 },
    { label: 'Security Risk Index (15%)', points: Math.round((survMetrics.security_risks_score || 0) * 0.15), max: 15, achieved: (survMetrics.security_risks_score || 0) > 0 },
    { label: 'Issue Resolution (10%)', points: Math.round((survMetrics.issue_resolution_score || 0) * 0.10), max: 10, achieved: (survMetrics.issue_resolution_score || 0) > 0 }
  ]

  const globalMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analysis', label: 'Repository Analysis', icon: PlusCircle },
    { id: 'benchmarks', label: 'Benchmark Results', icon: BarChart3 },
    { id: 'settings', label: 'Global Settings', icon: Settings },
  ]

  const repoMenuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'documentation', label: 'Documentation', icon: BookOpen },
    { id: 'environment', label: 'Environment Config', icon: Terminal },
    { id: 'dependencies', label: 'Dependencies', icon: Database },
    { id: 'vulnerability', label: 'Vulnerabilities', icon: ShieldAlert },
    { id: 'build_validation', label: 'Build & Repro', icon: Hammer },
    { id: 'survivability', label: 'Survivability', icon: HeartHandshake },
    { id: 'ai_intelligence', label: 'AI Reasoning', icon: Brain },
    { id: 'risk_center', label: 'Risk Forecast', icon: ShieldAlert },
    { id: 'reports', label: 'Action Plan', icon: FileText },
    { id: 'visualizations', label: 'Visualizations', icon: BarChart3 },
    { id: 'logs', label: 'Agent Logs', icon: Clock },
    { id: 'settings', label: 'Repo Settings', icon: Settings },
  ]

  const menuItems = selectedRepo ? repoMenuItems : globalMenuItems

  const healthBadge = getHealthBadge(selectedRepo)

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="border-b border-border-subtle bg-bg-surface shrink-0 select-none">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          {/* Logo Brand & Repository Workspace Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-brand-indigo text-bg-base flex items-center justify-center font-black">
                <Cpu className="w-4 h-4 text-[#0a0a0c]" />
              </div>
              <span className="text-sm font-bold tracking-wider text-text-primary">AEGIS</span>
            </div>
            
            <div className="h-4 w-px bg-border-subtle" />

            {/* Scoped Repository Selector */}
            <div className="relative">
              <button
                onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
                className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded bg-bg-panel hover:bg-bg-panel/85 border border-border-subtle hover:border-border-glow text-xs font-bold text-text-primary transition"
              >
                <div className="flex items-center gap-1.5 max-w-[200px] truncate">
                  {selectedRepo ? (
                    <>
                      <FolderGit className="w-3.5 h-3.5 text-brand-indigo shrink-0" />
                      <span className="truncate">{selectedRepo.owner}/{selectedRepo.name}</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
                      <span className="truncate">Global Overview</span>
                    </>
                  )}
                </div>
                <ChevronDown className="w-3 h-3 text-text-muted shrink-0" />
              </button>

              {repoDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setRepoDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 rounded border border-border-subtle bg-bg-surface shadow-2xl z-50 py-1 w-56 max-h-60 overflow-y-auto scrollbar-thin">
                    <button
                      onClick={() => {
                        setSelectedRepo(null);
                        setCurrentView('dashboard');
                        setRepoDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-bg-panel text-text-secondary hover:text-text-primary border-b border-border-subtle/30"
                    >
                      <Globe className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>Global Overview</span>
                    </button>
                    {repos.length === 0 ? (
                      <span className="block px-3 py-2 text-[10px] text-text-muted italic">No repositories scanned</span>
                    ) : (
                      repos.map(r => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedRepo(r);
                            setCurrentView('dashboard');
                            setRepoDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-bg-panel truncate ${selectedRepo?.id === r.id ? 'text-brand-indigo bg-bg-panel/30' : 'text-text-secondary'}`}
                        >
                          <FolderGit className="w-3.5 h-3.5 text-text-muted" />
                          <span className="truncate">{r.owner}/{r.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Utilities (Theme, Refresh, Logout) */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-status-success-bg text-status-success border border-status-success/20 text-[9px] font-bold">
              <span className="w-1 h-1 rounded-full bg-status-success animate-pulse" />
              API Connected
            </span>

            <button
              onClick={() => fetchRepos()}
              disabled={refreshing}
              className="p-1.5 rounded bg-bg-panel hover:bg-bg-panel/85 border border-border-subtle hover:border-border-glow text-text-secondary disabled:opacity-50 transition"
              title="Refresh repository list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-indigo' : ''}`} />
            </button>

            <button
              onClick={handleToggleTheme}
              className="p-1.5 rounded bg-bg-panel hover:bg-bg-panel/85 border border-border-subtle hover:border-border-glow text-text-secondary hover:text-text-primary transition"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-brand-indigo" /> : <Moon className="w-3.5 h-3.5 text-brand-purple" />}
            </button>

            <div className="h-4 w-px bg-border-subtle" />

            {/* Logout control */}
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-panel hover:bg-bg-panel/85 border border-border-subtle hover:border-status-error/45 text-text-secondary hover:text-text-primary text-xs font-bold transition"
                title="Log out session"
              >
                <LogOut className="w-3.5 h-3.5 text-text-muted" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Header Navigation Tabs Bar */}
        <div className="border-t border-border-subtle bg-bg-surface shrink-0 flex items-center justify-between px-6 overflow-x-auto scrollbar-none select-none">
          <div className="flex gap-6">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`py-3 px-1 border-b-2 text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                    isActive 
                      ? 'border-brand-indigo text-brand-indigo' 
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Workspace Scroll Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            
            {/* Repository Context Header */}
            {selectedRepo && (
              <div className="p-6 rounded-2xl glass-panel border border-border-subtle bg-gradient-to-r from-bg-surface to-bg-panel/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-bg-panel border border-border-subtle text-text-tertiary">
                    <Github className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-text-primary font-sans leading-none">
                        {selectedRepo.owner} / {selectedRepo.name}
                      </h2>
                      {healthBadge && (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${healthBadge.className}`}>
                          {healthBadge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-text-muted font-mono mt-1 tracking-wider">
                      ID: {selectedRepo.id} · Scoped Repository Workspace
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleReanalyze(selectedRepo)}
                    icon={Hammer}
                  >
                    Re-run Diagnostics
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadReport(selectedRepo)}
                    icon={Download}
                  >
                    PDF Summary
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => confirmDeleteRepo(selectedRepo.id)}
                    icon={Trash2}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}

            {/* ERROR BANNERS */}
            {error && (
              <div className="p-3.5 rounded-xl bg-status-error-bg border border-status-error/20 text-status-error text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
                <button onClick={() => setError('')} className="ml-auto hover:underline font-bold text-[10px]">Dismiss</button>
              </div>
            )}

            {/* --- Scoped Views Rendering Switch --- */}
            {selectedRepo ? (
              // --- A. Repository Scoped Workspace ---
              <>
                {currentView === 'dashboard' && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Insights & Warnings Section */}
                    {(() => {
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Left 2 Cols: Alerts & Recommendations */}
                          <div className="lg:col-span-2 space-y-4">
                            {alerts.length > 0 ? (
                              <div className="p-5 rounded-xl border border-border-subtle bg-bg-surface space-y-3">
                                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block border-b border-border-subtle pb-1.5">
                                  Critical Diagnostic Alerts
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {alerts.map((alert, i) => (
                                    <div 
                                      key={i} 
                                      className={`p-3 rounded border text-[10px] flex items-start gap-2.5 font-medium leading-relaxed ${
                                        alert.type === 'error' 
                                          ? 'bg-status-error-bg border-status-error/15 text-status-error' 
                                          : 'bg-status-warning-bg border-status-warning/15 text-status-warning'
                                      }`}
                                    >
                                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                      <span>{alert.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="p-5 rounded-xl border border-border-subtle bg-bg-surface flex items-center gap-2.5 text-status-success text-[10px] font-bold">
                                <Check className="w-4 h-4 text-status-success shrink-0" />
                                <span>All diagnostic variables and configuration matrices are healthy.</span>
                              </div>
                            )}

                            {(buildResult && !buildResult.build_success || missingEnv.length > 0) && (
                              <div className="p-5 rounded-xl border border-border-subtle bg-bg-surface space-y-3">
                                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block border-b border-border-subtle pb-1.5">
                                  Suggested Remediation Actions
                                </span>
                                <div className="flex flex-wrap gap-3">
                                  {buildResult && !buildResult.build_success && (
                                    <button 
                                      onClick={() => setCurrentView('build_validation')}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded bg-bg-panel hover:bg-bg-panel/80 border border-border-subtle text-[10px] font-bold text-text-secondary hover:text-text-primary transition"
                                    >
                                      <span>Inspect Build Failure Logs</span>
                                      <ChevronRight className="w-3 h-3 text-text-muted" />
                                    </button>
                                  )}
                                  {missingEnv.length > 0 && (
                                    <button 
                                      onClick={() => setCurrentView('environment')}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded bg-bg-panel hover:bg-bg-panel/80 border border-border-subtle text-[10px] font-bold text-text-secondary hover:text-text-primary transition"
                                    >
                                      <span>Reconstruct Config Template</span>
                                      <ChevronRight className="w-3 h-3 text-text-muted" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right 1 Col: AI Summary */}
                          <div className="lg:col-span-1 p-5 rounded-xl border border-border-subtle bg-bg-surface flex flex-col justify-between">
                            <div className="space-y-2">
                              <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block border-b border-border-subtle pb-1.5">
                                AI Intelligence Summary
                              </span>
                              {aiSummary?.executive_summary ? (
                                <p className="text-[10px] text-text-secondary leading-relaxed font-light line-clamp-5" title={aiSummary.executive_summary}>
                                  {aiSummary.executive_summary}
                                </p>
                              ) : (
                                <p className="text-[10px] text-text-muted italic font-light">
                                  Run analysis with an active AI endpoint to generate a summary.
                                </p>
                              )}
                            </div>
                            {aiSummary?.executive_summary && (
                              <button 
                                onClick={() => setCurrentView('ai_intelligence')}
                                className="mt-4 w-full text-center text-[9px] font-bold text-brand-indigo hover:underline"
                              >
                                View Detailed AI Reasoning →
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      <RadialGauge 
                        name="Reproducibility"
                        score={selectedRepo.analyses?.[0]?.reproducibility_score || 0}
                        icon={Layers}
                        desc="Cloning, manifest variables, and docker setups grade"
                        breakdown={reproBreakdown}
                      />
                      <RadialGauge 
                        name="Survivability"
                        score={selectedRepo.analyses?.[0]?.survivability_score || 0}
                        icon={Heart}
                        desc="Activity, resolution times, and community maintenance index"
                        breakdown={survBreakdown}
                      />
                      <RadialGauge 
                        name="Documentation"
                        score={selectedRepo.documentation_profile?.completeness_score || 0}
                        icon={BookOpen}
                        desc="README onboarding completeness checklist grade"
                        breakdown={[
                          { label: 'README found', points: 20, max: 20, achieved: selectedRepo.documentation_profile?.scanned_file !== 'None' },
                          { label: 'Installation instructions', points: 30, max: 30, achieved: selectedRepo.documentation_profile?.sections?.some(s => s.category.toLowerCase().includes('install') && s.found) },
                          { label: 'Usage sections', points: 30, max: 30, achieved: selectedRepo.documentation_profile?.sections?.some(s => s.category.toLowerCase().includes('usage') && s.found) },
                          { label: 'License section', points: 20, max: 20, achieved: selectedRepo.documentation_profile?.sections?.some(s => s.category.toLowerCase().includes('lic') && s.found) }
                        ]}
                      />
                      <RadialGauge 
                        name="Dependency Health"
                        score={(() => {
                          const total = selectedRepo.dependencies_profile?.report?.total_count || 0
                          const fails = (selectedRepo.dependencies_profile?.report?.duplicates?.length || 0) + (selectedRepo.dependencies_profile?.report?.suspicious_declarations?.length || 0)
                          if (total === 0) return 100
                          return Math.max(0, Math.round(100 - (fails / total) * 100))
                        })()}
                        icon={Database}
                        desc="Duplicate package manifestations and version drift vulnerabilities"
                        breakdown={[
                          { label: 'Dependencies declared', points: 40, max: 40, achieved: (selectedRepo.dependencies_profile?.dependencies?.length || 0) > 0 },
                          { label: 'Zero duplicate alerts', points: 30, max: 30, achieved: (selectedRepo.dependencies_profile?.report?.duplicates?.length || 0) === 0 },
                          { label: 'No suspicious refs', points: 30, max: 30, achieved: (selectedRepo.dependencies_profile?.report?.suspicious_declarations?.length || 0) === 0 }
                        ]}
                      />
                      <RadialGauge 
                        name="Security"
                        score={selectedRepo.analyses?.[0]?.findings?.survivability_details?.metrics?.security_risks_score || 85}
                        icon={ShieldAlert}
                        desc="Permissive licensing models and environment safety ratings"
                        breakdown={[
                          { label: 'Permissive open license', points: 50, max: 50, achieved: selectedRepo.analyses?.[0]?.findings?.survivability_factors?.license_permissive },
                          { label: 'Scanned environment config', points: 50, max: 50, achieved: (selectedRepo.environment_profile?.variables?.length || 0) > 0 }
                        ]}
                      />
                    </div>

                    <ArchitectureView repo={selectedRepo} />
                    <MaturityPanel repo={selectedRepo} />

                    <ExecutiveIntelligencePanel repo={selectedRepo} />
                  </div>
                )}

                {currentView === 'analysis' && (
                  <AnalysisPanel 
                    cloneUrl={cloneUrl}
                    onCloneUrlChange={setCloneUrl}
                    onSubmit={handleAnalyze}
                    loading={loading}
                    error={error}
                    activeRepos={activeRepos}
                  />
                )}

                {currentView === 'documentation' && (
                  <DocumentationIntelligencePanel repo={selectedRepo} />
                )}

                {currentView === 'environment' && (
                  <EnvironmentIntelligencePanel repo={selectedRepo} />
                )}

                {currentView === 'dependencies' && (
                  <DependencyIntelligencePanel repo={selectedRepo} />
                )}

                {currentView === 'vulnerability' && (
                  <VulnerabilityIntelligencePanel repo={selectedRepo} />
                )}

                {currentView === 'build_validation' && (
                  <div className="space-y-6 animate-fadeIn">
                    <BuildWorkflow repo={selectedRepo} />
                    <BuildReproducibilityPanel repo={selectedRepo} />
                  </div>
                )}

                {currentView === 'survivability' && (
                  <SurvivabilityIntelligencePanel repo={selectedRepo} />
                )}

                {currentView === 'ai_intelligence' && (
                  <AIReasoningPanel repo={selectedRepo} />
                )}

                {currentView === 'risk_center' && (
                  <RiskForecastPanel repo={selectedRepo} />
                )}

                {currentView === 'reports' && (
                  <div className="space-y-6 animate-fadeIn">
                    <ExecutionGuidePanel repo={selectedRepo} />
                    <ActionPlanPanel repo={selectedRepo} />
                  </div>
                )}

                {currentView === 'visualizations' && (
                  <VisualizationsPanel repo={selectedRepo} />
                )}

                {currentView === 'logs' && (
                  <AgentLogsIntelligencePanel repo={selectedRepo} />
                )}

                {currentView === 'benchmarks' && (
                  <BenchmarkCenter repos={repos} onSelectRepo={handleSelectRepo} formatDate={formatDate} />
                )}

                {currentView === 'settings' && (
                  <Card className="p-6 border border-border-subtle bg-bg-panel/20 space-y-4">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">Repository Settings</h3>
                    <p className="text-xs text-text-secondary font-light">Scope actions specifically relating to this repository.</p>
                    <div className="pt-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => confirmDeleteRepo(selectedRepo.id)}
                        icon={Trash2}
                      >
                        Delete Repository Scan
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              // --- B. Global Overview Workspace ---
              <>
                {currentView === 'dashboard' && (
                  <div className="space-y-8 animate-fadeIn">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
                      <div>
                        <h2 className="text-xl font-bold text-text-primary tracking-tight">Global Codebase Intelligence</h2>
                        <p className="text-xs text-text-secondary mt-1 font-light">Aggregated diagnostic metrics and health tracking across all monitored repositories.</p>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={() => setCurrentView('analysis')}
                          icon={PlusCircle}
                        >
                          Scan New Codebase
                        </Button>
                      </div>
                    </div>
                    
                    <KPIStats 
                      totalRepos={totalRepos}
                      activeReposCount={activeRepos.length}
                    />

                    <SystemGuide />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2">
                        <TechDistribution allTech={allTech} maxCount={maxCount} />
                      </div>
                      <div className="lg:col-span-1">
                        <RecentActivity 
                          historyRepos={historyRepos} 
                          onSelectRepo={handleSelectRepo}
                          onViewAll={() => setCurrentView('benchmarks')}
                        />
                      </div>
                    </div>

                    {/* Repository Grid Selection */}
                    <div className="space-y-4 pt-4">
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wide">
                        Monitored Codebases
                      </h3>
                      {historyRepos.length === 0 ? (
                        <p className="text-xs text-text-muted italic">No repository scans mapped yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {historyRepos.map(repo => {
                            const latest = repo.analyses?.[0]
                            const score = latest ? Math.round(((latest.reproducibility_score || 0) + (latest.survivability_score || 0)) / 2) : null
                            return (
                              <div
                                key={repo.id}
                                onClick={() => handleSelectRepo(repo)}
                                className="p-4 rounded-xl border border-border-subtle bg-bg-panel/20 hover:bg-bg-panel/40 transition cursor-pointer flex flex-col justify-between space-y-3 group hover:border-brand-indigo/35"
                              >
                                <div>
                                  <span className="block text-[8px] text-text-muted font-extrabold uppercase font-mono">{repo.owner}</span>
                                  <h4 className="text-xs font-bold text-text-primary group-hover:text-brand-indigo transition truncate mt-0.5">{repo.name}</h4>
                                  <p className="text-[10px] text-text-muted mt-2 font-light line-clamp-2">{repo.description || 'No description provided.'}</p>
                                </div>
                                <div className="flex items-center justify-between border-t border-border-subtle/50 pt-2.5 text-[9px] font-bold text-text-muted font-mono">
                                  <span>{formatDate(repo.created_at)}</span>
                                  {score && <span className="text-brand-cyan">{score}% score</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentView === 'analysis' && (
                  <AnalysisPanel 
                    cloneUrl={cloneUrl}
                    onCloneUrlChange={setCloneUrl}
                    onSubmit={handleAnalyze}
                    loading={loading}
                    error={error}
                    activeRepos={activeRepos}
                  />
                )}

                {currentView === 'build_validation' && (
                  <div className="space-y-6 animate-fadeIn">
                    <Card className="p-8 text-center border border-border-subtle bg-bg-panel/15 flex flex-col items-center max-w-xl mx-auto mt-12">
                      <Hammer className="w-12 h-12 text-text-muted/40 mb-3" />
                      <h4 className="text-sm font-bold text-text-primary">Build Scoping Required</h4>
                      <p className="text-xs text-text-muted font-light mt-1.5 max-w-sm leading-relaxed">
                        Please select a repository workspace from the Left Sidebar dropdown selector to inspect its Docker build logs and workflows.
                      </p>
                    </Card>
                  </div>
                )}

                {currentView === 'ai_intelligence' && (
                  <div className="space-y-6 animate-fadeIn">
                    <Card className="p-8 text-center border border-border-subtle bg-bg-panel/15 flex flex-col items-center max-w-xl mx-auto mt-12">
                      <Brain className="w-12 h-12 text-text-muted/40 mb-3" />
                      <h4 className="text-sm font-bold text-text-primary">AI Scoping Required</h4>
                      <p className="text-xs text-text-muted font-light mt-1.5 max-w-sm leading-relaxed">
                        Select a repository from the selector dropdown to review automated summaries, architecture analyses, and failure diagnostics.
                      </p>
                    </Card>
                  </div>
                )}

                {currentView === 'risk_center' && (
                  <div className="space-y-6 animate-fadeIn">
                    <Card className="p-8 text-center border border-border-subtle bg-bg-panel/15 flex flex-col items-center max-w-xl mx-auto mt-12">
                      <ShieldAlert className="w-12 h-12 text-text-muted/40 mb-3" />
                      <h4 className="text-sm font-bold text-text-primary">Risk Scoping Required</h4>
                      <p className="text-xs text-text-muted font-light mt-1.5 max-w-sm leading-relaxed">
                        Select a repository workspace from the sidebar dropdown selector to evaluate dependency risks and vulnerability audit parameters.
                      </p>
                    </Card>
                  </div>
                )}

                {currentView === 'reports' && (
                  <div className="space-y-6 animate-fadeIn">
                    <Card className="p-8 text-center border border-border-subtle bg-bg-panel/15 flex flex-col items-center max-w-xl mx-auto mt-12">
                      <FileText className="w-12 h-12 text-text-muted/40 mb-3" />
                      <h4 className="text-sm font-bold text-text-primary">Reports Scoping Required</h4>
                      <p className="text-xs text-text-muted font-light mt-1.5 max-w-sm leading-relaxed">
                        Select a repository workspace from the sidebar dropdown selector to generate execution wizard guides or download PDF summaries.
                      </p>
                    </Card>
                  </div>
                )}

                {currentView === 'benchmarks' && (
                  <BenchmarkCenter repos={repos} onSelectRepo={handleSelectRepo} formatDate={formatDate} />
                )}

                {currentView === 'settings' && (
                  <div className="space-y-6 animate-fadeIn">
                    <Card className="p-6 border border-border-subtle bg-bg-panel/20 space-y-4">
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Global Configuration Settings</h3>
                      <p className="text-[11px] text-text-secondary font-light">Perform administration level actions on the database catalog.</p>
                      
                      <div className="pt-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={confirmDeleteAll}
                        >
                          Clear All Scan Records
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmVariant={confirmModal.confirmVariant}
      />
    </div>
  )
}

export default App
