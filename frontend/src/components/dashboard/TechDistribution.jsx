import React from 'react'
import { Code } from 'lucide-react'

export default function TechDistribution({ allTech = [], maxCount = 1 }) {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-border-subtle space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Code className="w-4.5 h-4.5 text-brand-indigo" />
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Discovered Tech Distribution</h3>
        </div>
        <p className="text-[10px] text-text-muted mt-1 leading-normal font-light">
          Relative frequency of stacks, languages, and frameworks identified across repository sources.
        </p>
      </div>

      {allTech.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
          No repository stack profile data mapped.
        </div>
      ) : (
        <div className="space-y-4">
          {allTech.slice(0, 5).map((tech, idx) => {
            const percent = Math.round((tech.count / maxCount) * 100)
            
            let barColor = 'bg-brand-indigo'
            let textTagStyles = 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20'
            
            if (tech.type === 'Frontend') {
              barColor = 'bg-brand-purple'
              textTagStyles = 'bg-brand-purple/10 text-brand-purple border-brand-purple/20'
            } else if (tech.type === 'Database') {
              barColor = 'bg-brand-cyan'
              textTagStyles = 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20'
            }
            
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-secondary">{tech.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${textTagStyles}`}>
                      {tech.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted font-bold font-mono">
                    {tech.count} {tech.count === 1 ? 'Repository' : 'Repositories'}
                  </span>
                </div>
                <div className="w-full bg-bg-input h-2 rounded-full overflow-hidden border border-border-subtle">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
