import React from 'react'
import { Cpu, RefreshCw, Sun, Moon } from 'lucide-react'
import { Button } from '../ui/Button'

export default function Header({
  currentView,
  onViewChange,
  activeReposCount = 0,
  refreshing = false,
  onRefresh,
  theme = 'dark',
  onToggleTheme,
  user = null,
  onLogout
}) {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-border-subtle px-6 py-4 bg-bg-surface/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand logo & metadata */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-purple shadow-lg shadow-brand-indigo/35 animate-slow-pulse">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black font-sans tracking-widest text-gradient">AEGIS</h1>
            <p className="text-[9px] text-text-muted font-bold tracking-widest uppercase mt-0.5">Systems Diagnostics Dashboard</p>
          </div>
        </div>
        
        {/* Controls, views & actions */}
        <div className="flex flex-wrap items-center gap-4 self-end md:self-auto">
          {/* Navigation link triggers */}
          <nav className="flex items-center gap-1 bg-bg-input p-1 rounded-xl border border-border-subtle shadow-inner">
            {[
              { id: 'home', label: 'Home' },
              { id: 'analysis', label: 'Analysis Console', badge: activeReposCount },
              { id: 'history', label: 'History & Logs' }
            ].map(tab => {
              const isActive = currentView === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onViewChange(tab.id)}
                  className={`
                    px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-200 flex items-center gap-1.5
                    ${isActive 
                      ? 'bg-gradient-to-r from-brand-indigo to-brand-purple text-white shadow-md shadow-brand-indigo/25' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-panel/50'
                    }
                  `}
                >
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-status-error text-[8px] font-extrabold text-white animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
          
          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl bg-bg-panel hover:bg-bg-panel/80 border border-border-subtle hover:border-border-glow transition text-text-secondary hover:text-text-primary flex items-center justify-center"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-brand-cyan" /> : <Moon className="w-4 h-4 text-brand-purple" />}
          </button>
          
          {/* User Profile / Logout */}
          {user && (
            <div className="flex items-center gap-2 border-r border-border-subtle pr-4 h-full">
              <div className="text-right">
                <span className="text-[10px] font-bold text-text-secondary block font-mono leading-none">{user.email}</span>
                <button 
                  onClick={onLogout}
                  className="text-[9px] font-black text-status-error hover:text-status-error/85 transition leading-none mt-1 hover:underline uppercase block tracking-wider"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Connection status tag */}
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold bg-status-success-bg text-status-success border border-status-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
            API Online
          </span>
          
          {/* Sync Trigger button */}
          <button 
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-bg-panel hover:bg-bg-panel/80 border border-border-subtle hover:border-border-glow transition duration-150 text-text-secondary disabled:opacity-50 flex items-center justify-center"
            title="Sync Database Status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-indigo' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  )
}
