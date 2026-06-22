import React from 'react'
import { 
  GitFork, Cpu, Search, Hammer, ShieldAlert, Sparkles, 
  Check, ArrowRight, XCircle
} from 'lucide-react'

export default function BuildWorkflow({ repo }) {
  const buildResult = repo.build_result || null
  const diagnosis = repo.failure_diagnosis || null
  const status = repo.status

  // Determine stage status
  // clone, detect, analyze, build, diagnose, recommend
  let cloneState = 'pending'
  let detectState = 'pending'
  let analyzeState = 'pending'
  let buildState = 'pending'
  let diagnoseState = 'pending'
  let recommendState = 'pending'

  if (status === 'cloning') {
    cloneState = 'active'
  } else if (status === 'cloned' || repo.analyses?.length > 0) {
    cloneState = 'completed'
    detectState = 'completed'
    analyzeState = 'completed'
  } else if (status === 'failed') {
    cloneState = 'failed'
  }

  if (buildResult) {
    if (buildResult.build_success) {
      buildState = 'completed'
    } else {
      buildState = 'failed'
      if (diagnosis) {
        diagnoseState = 'completed'
        if (diagnosis.ai_recommendation) {
          recommendState = 'completed'
        }
      } else {
        diagnoseState = 'active'
      }
    }
  }

  const stages = [
    { id: 'clone', label: 'Clone', icon: GitFork, state: cloneState, desc: 'Repo cached locally' },
    { id: 'detect', label: 'Detect', icon: Cpu, state: detectState, desc: 'Fingerprints stack' },
    { id: 'analyze', label: 'Analyze', icon: Search, state: analyzeState, desc: 'Dependency audit' },
    { id: 'build', label: 'Build', icon: Hammer, state: buildState, desc: 'Docker compile' },
    { id: 'diagnose', label: 'Diagnose', icon: ShieldAlert, state: diagnoseState, desc: 'Log traceback' },
    { id: 'recommend', label: 'Recommend', icon: Sparkles, state: recommendState, desc: 'AI fix recommendation' }
  ]

  const getNodeStyles = (state) => {
    if (state === 'completed') {
      return 'bg-status-success-bg border-status-success text-status-success shadow-[0_0_12px_rgba(16,185,129,0.15)]'
    }
    if (state === 'active') {
      return 'bg-brand-indigo/10 border-brand-indigo text-brand-indigo animate-pulse'
    }
    if (state === 'failed') {
      return 'bg-status-error-bg border-status-error text-status-error animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]'
    }
    return 'bg-bg-panel border-border-subtle text-text-muted'
  }

  return (
    <div className="p-6 rounded-2xl glass-panel border border-border-subtle space-y-6">
      <div>
        <span className="text-[9px] text-brand-indigo font-extrabold uppercase tracking-widest block mb-1">
          Pipeline workflow engine
        </span>
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wide">
          Docker Build & Verification Stages
        </h3>
      </div>

      <div className="relative pt-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
        {/* Horizontal Connector Line for Desktop */}
        <div className="hidden md:block absolute top-[28px] left-[5%] right-[5%] h-[1px] bg-border-subtle z-0" />

        {stages.map((stage, idx) => {
          const StageIcon = stage.icon
          const nodeClass = getNodeStyles(stage.state)
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center text-center space-y-2 md:w-1/6">
              {/* Connector dots/arrows on Mobile */}
              {idx > 0 && (
                <div className="md:hidden flex items-center justify-center my-1 text-text-muted">
                  <ArrowRight className="w-4.5 h-4.5 transform rotate-90" />
                </div>
              )}
              
              {/* Icon Bubble */}
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${nodeClass}`}>
                {stage.state === 'completed' ? (
                  <Check className="w-5 h-5 text-status-success font-black" />
                ) : stage.state === 'failed' && stage.id === 'build' ? (
                  <XCircle className="w-5 h-5 text-status-error" />
                ) : (
                  <StageIcon className="w-4.5 h-4.5" />
                )}
              </div>

              {/* Title & Desc */}
              <div>
                <span className={`block text-[11px] font-bold ${stage.state === 'failed' ? 'text-status-error font-extrabold' : stage.state === 'completed' ? 'text-status-success' : 'text-text-primary'}`}>
                  {stage.label}
                </span>
                <span className="block text-[8px] text-text-muted font-light max-w-[90px] mx-auto mt-0.5 leading-tight">
                  {stage.desc}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
