import React from 'react'
import { Server, Layout, Database, BrainCircuit, ArrowRight, ArrowDown } from 'lucide-react'

export default function ArchitectureView({ repo }) {
  const stack = repo.detected_stack || {}
  const frontend = stack.frontend || []
  const backend = stack.backend || []
  const databases = stack.databases || []

  // Check if AI layer is detected (from analyses or dependencies)
  const isAIActive = repo.analyses?.length > 0 || (repo.dependencies_profile?.dependencies || []).some(d => 
    d.name.toLowerCase().includes('chroma') || 
    d.name.toLowerCase().includes('langgraph') || 
    d.name.toLowerCase().includes('langchain') || 
    d.name.toLowerCase().includes('openai')
  )

  const architectureLayers = [
    {
      id: 'frontend',
      title: 'Frontend Client Layer',
      icon: Layout,
      color: 'text-brand-pink border-border-subtle hover:border-brand-pink/30 hover:bg-bg-panel/30',
      techs: frontend.length > 0 ? frontend : ['HTML5 / Vanilla JS']
    },
    {
      id: 'backend',
      title: 'Backend API Layer',
      icon: Server,
      color: 'text-brand-indigo border-border-subtle hover:border-brand-indigo/30 hover:bg-bg-panel/30',
      techs: backend.length > 0 ? backend : ['Python / Native CLI']
    },
    {
      id: 'databases',
      title: 'Data Store Layer',
      icon: Database,
      color: 'text-brand-cyan border-border-subtle hover:border-brand-cyan/30 hover:bg-bg-panel/30',
      techs: databases.length > 0 ? databases : ['Local Filesystem']
    },
    {
      id: 'ai_layer',
      title: 'AI Intelligence Layer',
      icon: BrainCircuit,
      color: 'text-brand-purple border-border-subtle hover:border-brand-purple/30 hover:bg-bg-panel/30',
      techs: isAIActive ? ['LangGraph Orchestrator', 'ChromaDB VectorStore'] : ['Rule-based Scraper']
    }
  ]

  return (
    <div className="p-6 rounded-xl bg-bg-surface border border-border-subtle space-y-6">
      <div>
        <span className="text-[9px] text-brand-indigo font-bold uppercase tracking-wider block mb-1">
          System Stack Discovery
        </span>
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wide">
          Discovered Repository Architecture Map
        </h3>
      </div>

      {/* Grid of Stack Layers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
        {architectureLayers.map((layer) => {
          const LayerIcon = layer.icon
          return (
            <div 
              key={layer.id} 
              className={`p-5 rounded-xl border flex flex-col justify-between space-y-3 relative group transition-all duration-300 ${layer.color}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-bg-panel border border-border-subtle text-text-secondary">
                    <LayerIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-text-primary">{layer.title}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {layer.techs.map((t, idx) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-1 rounded bg-bg-panel border border-border-subtle text-[10px] font-bold text-text-secondary"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
