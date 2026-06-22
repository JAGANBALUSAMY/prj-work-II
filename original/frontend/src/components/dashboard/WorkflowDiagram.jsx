import React from 'react'
import { Layers, Github, Cpu, Database, Terminal, BookOpen, RefreshCw } from 'lucide-react'

export default function WorkflowDiagram() {
  const nodes = [
    { step: "01", name: "Clone & Cache", icon: Github, desc: "Clones repository files locally and retrieves Github repo API metadata stats." },
    { step: "02", name: "Stack Scan", icon: Cpu, desc: "Scans configuration files and markers to detect languages, database models, and engines." },
    { step: "03", name: "Dependency Audit", icon: Database, desc: "Reviews packages for duplicates, missing version constraints, and deprecated declaration threats." },
    { step: "04", name: "Env Compile", icon: Terminal, desc: "Analyzes variable statements in code, maps missing templates, and reconstructs .env template files." },
    { step: "05", name: "Documentation", icon: BookOpen, desc: "Parses and grades the completeness of the README file structures and installation guidelines." },
    { step: "06", name: "ChromaDB Index", icon: RefreshCw, desc: "Calculates stability grades and writes all records to Postgres and code snippets to vector stores." }
  ]

  return (
    <div className="glass-panel p-6 rounded-2xl border border-border-subtle space-y-6 relative overflow-hidden bg-gradient-to-r from-bg-surface to-transparent">
      {/* Decorative Blur Blob */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-indigo/3 rounded-full blur-3xl pointer-events-none"></div>
      
      <div>
        <div className="flex items-center gap-2">
          <Layers className="w-4.5 h-4.5 text-brand-purple" />
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">LangGraph Analysis Workflow</h3>
        </div>
        <p className="text-[10px] text-text-muted mt-1 leading-normal font-light">
          Multi-agent flow executing sequentially to inspect, audit, grade, and vectorize codebase files.
        </p>
      </div>

      <div className="relative pt-6">
        {/* Horizontal connecting vector line for desktop views */}
        <div className="hidden lg:block absolute top-[52px] left-[5%] right-[5%] h-[1px] bg-gradient-to-r from-brand-indigo via-brand-purple to-brand-cyan opacity-20 z-0"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 relative z-10">
          {nodes.map((node, i) => {
            const Icon = node.icon
            return (
              <div 
                key={i} 
                className="p-4 rounded-xl bg-bg-input/60 border border-border-subtle hover:border-brand-indigo/35 transition duration-300 group flex flex-col justify-between h-full relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-brand-cyan font-mono">{node.step}</span>
                    <div className="p-2 rounded-lg bg-bg-panel border border-border-subtle text-text-tertiary group-hover:text-text-primary transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-text-primary block">{node.name}</span>
                  <p className="text-[10px] text-text-muted mt-2 leading-relaxed font-light">{node.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
