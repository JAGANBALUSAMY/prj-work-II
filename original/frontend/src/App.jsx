import React, { useState, useEffect } from 'react'
import { 
  getRepositories, 
  analyzeRepository, 
  deleteRepository, 
  deleteAllRepositories 
} from './services/repositories'

// Reusable UI components
import { ConfirmModal } from './components/ui/Modal'

// Modular dashboard components
import Header from './components/dashboard/Header'
import DashboardHero from './components/dashboard/DashboardHero'
import KPIStats from './components/dashboard/KPIStats'
import TechDistribution from './components/dashboard/TechDistribution'
import WorkflowDiagram from './components/dashboard/WorkflowDiagram'
import RecentActivity from './components/dashboard/RecentActivity'
import AnalysisPanel from './components/dashboard/AnalysisPanel'
import HistoryPanel from './components/dashboard/HistoryPanel'
import Login from './components/dashboard/Login'
import Register from './components/dashboard/Register'

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
  
  // Authentication states
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [authView, setAuthView] = useState(() => {
    return localStorage.getItem('access_token') ? 'authenticated' : 'login'
  })

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
    setAuthView('login')
    setRepos([])
    setSelectedRepo(null)
    setCurrentView('home')
  }

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

  const stackDist = getStackDistribution()
  const allTech = [
    ...Object.entries(stackDist.frontend).map(([name, val]) => ({ name, count: val, type: 'Frontend' })),
    ...Object.entries(stackDist.backend).map(([name, val]) => ({ name, count: val, type: 'Backend' })),
    ...Object.entries(stackDist.databases).map(([name, val]) => ({ name, count: val, type: 'Database' }))
  ].sort((a, b) => b.count - a.count)

  const maxCount = allTech.length > 0 ? Math.max(...allTech.map(t => t.count)) : 1

  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo)
    if (repo) {
      setCurrentView('history')
      setActiveTab('overview')
    }
  }

  // --- 5. Main Return Render ---
  if (authView === 'login') {
    return (
      <Login
        apiBaseUrl={import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}
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
        apiBaseUrl={import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}
        onRegisterSuccess={() => setAuthView('login')}
        onBackToLogin={() => setAuthView('login')}
      />
    )
  }

  return (
    <div className="min-h-full relative overflow-hidden bg-bg-base text-text-primary pb-16 transition-colors duration-300">
      {/* Decorative Neon Blur Blobs */}
      <div className="glow-blob-purple top-[-100px] right-[-100px] animate-slow-pulse"></div>
      <div className="glow-blob-blue bottom-[-100px] left-[-100px]"></div>

      <Header 
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view)
          setSelectedRepo(null)
        }}
        activeReposCount={activeRepos.length}
        refreshing={refreshing}
        onRefresh={() => fetchRepos()}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        user={user}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10">
        {currentView === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            <DashboardHero 
              onScanNew={() => setCurrentView('analysis')}
              onViewHistory={() => setCurrentView('history')}
            />
            <KPIStats 
              avgReproducibility={avgReproducibility}
              avgSurvivability={avgSurvivability}
              totalRepos={totalRepos}
              activeReposCount={activeRepos.length}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <TechDistribution allTech={allTech} maxCount={maxCount} />
              </div>
              <div className="lg:col-span-1">
                <RecentActivity 
                  historyRepos={historyRepos} 
                  onSelectRepo={handleSelectRepo}
                  onViewAll={() => setCurrentView('history')}
                />
              </div>
            </div>
            <WorkflowDiagram />
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

        {currentView === 'history' && (
          <HistoryPanel 
            repos={repos}
            selectedRepo={selectedRepo}
            onSelectRepo={handleSelectRepo}
            onDeleteRepo={confirmDeleteRepo}
            onDeleteAll={confirmDeleteAll}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            formatDate={formatDate}
          />
        )}
      </main>

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
