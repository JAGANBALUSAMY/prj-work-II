import React, { useState } from 'react'
import { 
  Cpu, LayoutDashboard, PlusCircle, Hammer, Brain, 
  ShieldAlert, FileText, BarChart3, Settings, LogOut, 
  ChevronDown, Globe, FolderGit, BookOpen, Terminal, 
  Database, Clock, HeartHandshake
} from 'lucide-react'

export default function Sidebar({
  repos = [],
  selectedRepo,
  onSelectRepo,
  currentView,
  onViewChange,
  user,
  onLogout,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleRepoClick = (repo) => {
    onSelectRepo(repo)
    setDropdownOpen(false)
  }

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
    { id: 'build_validation', label: 'Build & Repro', icon: Hammer },
    { id: 'survivability', label: 'Survivability', icon: HeartHandshake },
    { id: 'ai_intelligence', label: 'AI Reasoning', icon: Brain },
    { id: 'risk_center', label: 'Risk Forecast', icon: ShieldAlert },
    { id: 'reports', label: 'Action Plan', icon: FileText },
    { id: 'visualizations', label: 'Visualizations', icon: BarChart3 },
    { id: 'logs', label: 'Agent Logs', icon: Clock },
    { id: 'settings', label: 'Repo Settings', icon: Settings },
  ]

  const menuItems = selectedRepo ? repoMenuItems : globalMenuItems;

  return (
    <aside className="sidebar-container bg-bg-surface border-r border-border-subtle flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-6 pb-4 flex items-center gap-2.5 border-b border-border-subtle">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-purple shadow-lg shadow-brand-indigo/35 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-black font-sans tracking-wider text-gradient leading-none">AEGIS</h2>
          <span className="text-[8px] text-text-muted font-bold tracking-widest uppercase">Intelligence Center</span>
        </div>
      </div>

      {/* Scoped Repository Selector */}
      <div className="p-4 border-b border-border-subtle relative">
        <span className="text-[8px] text-text-muted font-extrabold uppercase tracking-widest block mb-2 px-1">
          Active Workspace
        </span>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-bg-panel hover:bg-bg-panel/85 border border-border-subtle hover:border-border-glow text-left text-xs font-bold text-text-primary transition-all duration-200"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedRepo ? (
              <>
                <FolderGit className="w-4 h-4 text-brand-indigo shrink-0" />
                <span className="truncate">{selectedRepo.owner}/{selectedRepo.name}</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-brand-cyan shrink-0" />
                <span className="truncate">Global Overview</span>
              </>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
        </button>

        {/* Dropdown Options */}
        {dropdownOpen && (
          <div className="absolute top-full left-4 right-4 mt-1.5 rounded-xl border border-border-subtle bg-bg-panel shadow-2xl z-50 py-1.5 max-h-60 overflow-y-auto scrollbar-thin">
            <button
              onClick={() => handleRepoClick(null)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-bg-surface/80 text-text-secondary hover:text-text-primary border-b border-border-subtle/30"
            >
              <Globe className="w-3.5 h-3.5 text-brand-cyan" />
              <span>All Repositories (Global)</span>
            </button>
            {repos.length === 0 ? (
              <span className="block px-3 py-2 text-[10px] text-text-muted italic">No repositories scanned</span>
            ) : (
              repos.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleRepoClick(r)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-bg-surface/80 text-text-secondary hover:text-text-primary ${selectedRepo?.id === r.id ? 'bg-bg-surface/50 text-brand-indigo' : ''}`}
                >
                  <FolderGit className="w-3.5 h-3.5 text-text-muted" />
                  <span className="truncate">{r.owner}/{r.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-none">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 select-none
                ${isActive 
                  ? 'bg-gradient-to-r from-brand-indigo to-brand-purple text-white shadow-md shadow-brand-indigo/15' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-panel/40'
                }
              `}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-text-muted group-hover:text-text-primary'}`} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Profile Section & Logout */}
      {user && (
        <div className="p-4 border-t border-border-subtle flex items-center justify-between gap-3 bg-bg-panel/10">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-brand-indigo/10 border border-brand-indigo/25 text-brand-indigo font-black flex items-center justify-center text-xs shrink-0 select-none uppercase">
              {user.username ? user.username[0] : (user.email ? user.email[0] : 'U')}
            </div>
            <div className="truncate">
              <span className="block text-[10px] font-bold text-text-primary truncate">{user.username || 'System User'}</span>
              <span className="block text-[9px] text-text-muted truncate">{user.email || 'user@aegis.ai'}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg hover:bg-bg-panel text-text-muted hover:text-status-error transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  )
}
