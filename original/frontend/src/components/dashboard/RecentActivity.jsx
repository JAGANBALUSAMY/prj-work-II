import React from 'react'
import { Clock, ChevronRight, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'

export default function RecentActivity({ 
  historyRepos = [], 
  onSelectRepo, 
  onViewAll 
}) {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-border-subtle space-y-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 text-brand-cyan" />
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Recent Activity</h3>
        </div>
        <p className="text-[10px] text-text-muted mt-1 leading-normal font-light">
          Shortcuts to view recent compilation reports.
        </p>
      </div>

      {historyRepos.length === 0 ? (
        <p className="text-xs text-text-muted italic py-8 text-center bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
          No completed pipeline runs available.
        </p>
      ) : (
        <div className="space-y-3 flex-1 mt-4">
          {historyRepos.slice(0, 3).map(repo => {
            const latestAnalysis = repo.analyses && repo.analyses[0]
            const avgScore = latestAnalysis ? Math.round((latestAnalysis.reproducibility_score + latestAnalysis.survivability_score) / 2) : 0
            return (
              <div 
                key={repo.id}
                onClick={() => onSelectRepo(repo)}
                className="p-3 rounded-xl bg-bg-panel hover:bg-bg-panel/80 border border-border-subtle hover:border-border-glow transition flex items-center justify-between cursor-pointer group"
              >
                <div className="truncate max-w-[70%]">
                  <span className="text-xs font-bold text-text-secondary block truncate group-hover:text-brand-indigo transition-colors">{repo.name}</span>
                  <span className="text-[9px] text-text-muted font-mono mt-0.5 block truncate">{repo.owner}</span>
                </div>
                <div className="flex items-center gap-2">
                  {latestAnalysis && (
                    <span className="px-2 py-0.5 rounded bg-brand-indigo/10 border border-brand-indigo/20 text-brand-cyan text-[9px] font-bold font-mono">
                      {avgScore}%
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      <Button 
        variant="secondary" 
        size="sm"
        onClick={onViewAll}
        className="w-full py-2.5 mt-2 flex items-center justify-center gap-1.5"
      >
        See all logs <ArrowRight className="w-3.5 h-3.5 text-brand-purple" />
      </Button>
    </div>
  )
}
