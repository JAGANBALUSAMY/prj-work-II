import React from 'react'
import { Terminal } from 'lucide-react'

export default function AgentLogsIntelligencePanel({ repo }) {
  const logs = (repo && repo.analyses && repo.analyses[0] && repo.analyses[0].logs) || []
  
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
