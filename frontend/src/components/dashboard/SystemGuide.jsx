import React, { useState } from 'react'
import { 
  GraduationCap, Workflow, Database, Terminal, 
  BookOpen, Hammer, Cpu, Github, Settings, 
  ShieldAlert, Heart, Layers, Sparkles 
} from 'lucide-react'

const scoreWeights = [
  {
    name: "Reproducibility",
    icon: Layers,
    colorClass: "text-brand-cyan border-brand-cyan/20 bg-brand-cyan/5",
    desc: "Measures setup reliability and ease of onboarding.",
    items: [
      { label: "Base Repository Access", val: 30, desc: "Validates that the source code repository is publicly reachable, clones successfully to the disk, and contains readable filesystem directories." },
      { label: "Containerization Config", val: 30, desc: "Verifies the presence of configuration manifests like Dockerfile or docker-compose.yml to establish an isolated, deterministic execution sandbox." },
      { label: "README File presence", val: 10, desc: "Checks that a README file is present in the repository root directory, acting as the entry point for developer onboarding." },
      { label: "README Instructions Grade", val: 30, desc: "Grades the completeness of the documentation on how to configure, set up, and boot the codebase, scoring the presence of environment and system instructions." }
    ]
  },
  {
    name: "Survivability",
    icon: Heart,
    colorClass: "text-brand-pink border-brand-pink/20 bg-brand-pink/5",
    desc: "Measures codebase architecture decay and active maintenance index.",
    items: [
      { label: "Commit Cadence", val: 25, desc: "Evaluates the frequency and consistency of git commits over time, identifying if the codebase is actively maintained or abandoned." },
      { label: "Contributor Pool Size", val: 20, desc: "Measures the number and diversity of unique active developers contributing code, determining dependency risk on a single maintainer." },
      { label: "Release Frequency", val: 15, desc: "Audits the frequency and versioning standards of tagged release events, verifying if standard deployment cycles are followed." },
      { label: "Dependency Freshness", val: 15, desc: "Measures version drift by checking how outdated the project's dependency libraries are compared to their latest releases." },
      { label: "Security Vulnerabilities", val: 15, desc: "Scans libraries against databases to flag known vulnerabilities (CVEs) or outdated, high-risk packages in codebase manifests." },
      { label: "Issue Resolution Rate", val: 10, desc: "Tracks the average response time and closure percentage for issues, reflecting how quickly the project maintainers resolve bugs." }
    ]
  },
  {
    name: "Documentation",
    icon: BookOpen,
    colorClass: "text-brand-indigo border-brand-indigo/20 bg-brand-indigo/5",
    desc: "Measures README structural completeness.",
    items: [
      { label: "Readme File Found", val: 20, desc: "Verifies the presence of README.md, README.txt, or similar documentation files in the project's root folder." },
      { label: "Installation Section", val: 30, desc: "Scans for explicit setup steps, prerequisite checklists, library package installation scripts, and system setup commands." },
      { label: "Usage Instructions", val: 30, desc: "Grades the availability of quickstart run code snippets, CLI parameters list, executable examples, and runtime commands." },
      { label: "Licensing Declaration", val: 20, desc: "Checks for a declared LICENSE file or section in the root directory to clarify copyright, redistribution, and legal usage terms." }
    ]
  },
  {
    name: "Dependency Health",
    icon: Database,
    colorClass: "text-status-info border-status-info/20 bg-status-info-bg",
    desc: "Evaluates dependency version drift and duplication issues.",
    items: [
      { label: "Manifest Validation", val: 40, desc: "Checks that the package manager configuration files (e.g. package.json, requirements.txt) are valid, structurally correct, and parseable." },
      { label: "Zero Duplicate Packages", val: 30, desc: "Scans the package manifest to ensure that there are no duplicate version declarations or version conflicts for the same libraries." },
      { label: "Registry Verification", val: 30, desc: "Ensures all libraries are pulled from official, secure package repositories (like PyPI, npm, Maven) rather than unverified URLs." }
    ]
  },
  {
    name: "Security",
    icon: ShieldAlert,
    colorClass: "text-status-error border-status-error/20 bg-status-error-bg",
    desc: "Validates license models and secrets exposure.",
    items: [
      { label: "Permissive Open License", val: 50, desc: "Verifies if the software uses open-source friendly licenses (e.g. MIT, Apache 2.0, BSD) that permit free integration and modification." },
      { label: "Environment variable safety", val: 50, desc: "Uses static analysis to scan files and configurations, confirming that no sensitive API keys, databases passwords, or secrets are hardcoded." }
    ]
  },
  {
    name: "Maturity Index",
    icon: Sparkles,
    colorClass: "text-brand-purple border-brand-purple/20 bg-brand-purple/5",
    desc: "Evaluates stack architecture alignment and readiness.",
    items: [
      { label: "Language/Stack Match", val: 35, desc: "Checks if the code structures and file arrangements align with the identified software languages and modern framework best practices." },
      { label: "Architecture Consistency", val: 35, desc: "Evaluates the modularity of the directory layout, clean division of source files, and proper isolation between backend and frontend logic." },
      { label: "Production Readiness", val: 30, desc: "Validates the presence of standard production readiness configurations such as health-check endpoints, proper loggers, and system run scripts." }
    ]
  }
]

const workflowSteps = [
  {
    step: "01",
    name: "Acquisition & Metadata Pull",
    module: "Git Cloner Module",
    icon: Github,
    desc: "Validates repository URLs and clones all source files locally to secure sandboxes. In parallel, retrieves repository metrics (stars, forks, issues, and contributors list) using the Github REST API."
  },
  {
    step: "02",
    name: "Stack Signature Scanner",
    module: "Stack Scanner Module",
    icon: Cpu,
    desc: "Traverses directories looking for framework indicators (package.json, setup.py, requirements.txt, cargo.toml). Dynamically constructs the technology fingerprint including active backend/frontend structures and databases."
  },
  {
    step: "03",
    name: "Dependency Health Auditor",
    module: "Dependency Auditor",
    icon: Database,
    desc: "Scans manifest declarations and compiles dependency lists. Audits package configurations to flag duplicates, version drift, and outdated or insecure package declarations."
  },
  {
    step: "04",
    name: "Env Template Scanner",
    module: "Config Scanner Module",
    icon: Terminal,
    desc: "Reads all source files (Python, JS, Go, etc.) recursively to extract environment variables referenced in code. Compares them to `.env` files to generate a unified, missing-variables `.env.example` template."
  },
  {
    step: "05",
    name: "README Documentation Grader",
    module: "Documentation Analyzer",
    icon: BookOpen,
    desc: "Parses markdown structure to check sections and grades installation, configuration, licensing, and usage content depth using a hybrid scoring algorithm."
  },
  {
    step: "06",
    name: "Build Sandbox Evaluator",
    module: "Build Sandbox Module",
    icon: Hammer,
    desc: "Launches Docker builds inside isolated testbeds to check compilation status. Captures compiler stdout, stderr logs, and network state, ensuring the project builds cleanly without human intervention."
  },
  {
    step: "07",
    name: "Agent Logic Synthesis",
    module: "LangGraph Orchestrator",
    icon: Settings,
    desc: "A multi-agent state graph compiles reports, triggers AI executive summaries, saves records to the PostgreSQL database, and writes code indices to ChromaDB vector databases."
  }
]

export default function SystemGuide() {
  const [activeTab, setActiveTab] = useState('weights') // 'weights' or 'workflow'
  const [hoveredItem, setHoveredItem] = useState(null)

  return (
    <div className="glass-panel p-6 rounded-2xl border border-border-subtle bg-gradient-to-b from-bg-surface to-bg-panel/20 space-y-6">
      
      {/* Component Title & Tabs Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
            Aegis Intelligence Blueprint
          </h3>
          <p className="text-[10px] text-text-muted mt-1 leading-normal font-light">
            Understand how codebase stability scores are computed and explore the backend module orchestration flow.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-bg-panel p-1 rounded-xl border border-border-subtle self-start sm:self-auto shrink-0 select-none">
          <button
            onClick={() => setActiveTab('weights')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
              activeTab === 'weights'
                ? 'bg-bg-surface text-brand-indigo border border-border-subtle shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Score Calculation & Weights</span>
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
              activeTab === 'workflow'
                ? 'bg-bg-surface text-brand-indigo border border-border-subtle shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Workflow Pipeline & Modules</span>
          </button>
        </div>
      </div>

      {/* Tab Contents: Score Calculations */}
      {activeTab === 'weights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fadeIn">
          {scoreWeights.map((metric, idx) => {
            const Icon = metric.icon
            return (
              <div 
                key={idx} 
                className="p-5 rounded-xl border border-border-subtle bg-bg-surface flex flex-col justify-start space-y-4 hover:border-border-glow transition-colors group"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded border ${metric.colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-text-primary uppercase tracking-wide">
                      {metric.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary font-light leading-relaxed">
                    {metric.desc}
                  </p>
                </div>

                {/* Weights List */}
                <div className="space-y-2 pt-2 border-t border-border-subtle/50">
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">
                    Criteria Breakdown
                  </span>
                  <div className="space-y-1.5">
                    {metric.items.map((item, itemIdx) => (
                      <div 
                        key={itemIdx} 
                        className="flex justify-between items-start gap-3 text-[10px] leading-tight relative cursor-help py-1"
                        onMouseEnter={() => setHoveredItem(item)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div className="font-light text-text-secondary min-w-0">
                          <span className="font-semibold text-text-primary block truncate">{item.label}</span>
                        </div>
                        <span className="font-bold text-brand-indigo font-mono whitespace-nowrap bg-brand-indigo/5 border border-brand-indigo/10 px-1.5 py-0.5 rounded text-[9px]">
                          {item.val} pts
                        </span>

                        {/* Floating Tooltip Explanation */}
                        {hoveredItem === item && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 rounded-xl border border-border-subtle bg-bg-panel shadow-2xl text-[10px] text-text-secondary font-light leading-relaxed z-50 text-center animate-fadeIn pointer-events-none">
                            <span className="font-bold text-brand-indigo block mb-1 uppercase tracking-wider text-[8px] border-b border-border-subtle/50 pb-1">
                              {item.label}
                            </span>
                            {item.desc}
                            {/* Arrow design */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-border-subtle" />
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-bg-panel mt-[-1px]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab Contents: Workflow & Module Roles */}
      {activeTab === 'workflow' && (
        <div className="relative pl-6 sm:pl-8 border-l border-border-subtle space-y-6 max-w-4xl mx-auto py-2 animate-fadeIn">
          {/* Timeline Connector Line */}
          <div className="absolute left-[5px] sm:left-[7px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-brand-indigo via-brand-purple to-brand-cyan opacity-25"></div>

          {workflowSteps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={idx} className="relative group space-y-2">
                {/* Timeline node dot */}
                <div className="absolute -left-[31px] sm:-left-[37px] top-1.5 w-6 h-6 rounded-full bg-bg-base border border-border-subtle flex items-center justify-center text-[9px] font-bold text-text-secondary font-mono group-hover:border-brand-indigo group-hover:text-brand-indigo transition duration-300">
                  {step.step}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-brand-indigo" />
                    <h4 className="text-xs font-bold text-text-primary">
                      {step.name}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo text-[8px] font-black uppercase tracking-wider self-start sm:self-auto">
                    {step.module}
                  </span>
                </div>

                <p className="text-[10px] text-text-secondary font-light leading-relaxed pl-6 sm:pl-6 max-w-3xl">
                  {step.desc}
                </p>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
