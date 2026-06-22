import React from 'react'
import { AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react'
import { CircularProgress } from '../ui/CircularProgress'

export default function DocumentationIntelligencePanel({ repo }) {
  if (!repo || !repo.documentation_profile) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
        No documentation checks recorded.
      </div>
    )
  }

  const profile = repo.documentation_profile
  const score = profile.completeness_score || 0
  const scannedFile = profile.scanned_file || "None"
  const sections = profile.sections || []
  const suggestions = profile.suggestions || []
  const preview = profile.readme_preview || ""
  const detectedCount = sections.filter(s => s.found).length

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-1 flex justify-center">
          <CircularProgress 
            score={score} 
            label="Completeness Grade" 
            size={110} 
          />
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between">
            <span className="text-[10px] text-text-muted font-bold uppercase font-sans">Scanned File</span>
            <span className="text-xs font-bold text-text-secondary mt-2 truncate select-all" title={scannedFile}>
              {scannedFile !== "None" ? scannedFile : "README Not Found"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between">
            <span className="text-[10px] text-text-muted font-bold uppercase font-sans">Detected Sections</span>
            <span className="text-xl font-bold text-text-primary mt-1">{detectedCount} / 6</span>
          </div>
          <div className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between col-span-2">
            <span className="text-[10px] text-text-muted font-bold uppercase font-sans">Documentation Insight</span>
            <span className="text-[11px] text-text-secondary mt-2 leading-relaxed font-light">
              {suggestions.length > 0 
                ? `Detected ${suggestions.length} key recommendations to improve codebase onboarding setup layout.` 
                : "Repository documentation matches completeness criteria."
              }
            </span>
          </div>
        </div>
      </div>

      {/* Suggestions Box */}
      {suggestions.length > 0 && (
        <div className="p-4 rounded-xl bg-status-warning-bg border border-status-warning/20 text-xs text-status-warning space-y-2 animate-fadeIn select-all">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px]">
            <ShieldAlert className="w-4 h-4 text-status-warning" /> Onboarding Recommendations
          </div>
          <ul className="list-disc pl-4 space-y-1.5 leading-relaxed font-light">
            {suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
          </ul>
        </div>
      )}

      {/* Sections checklist */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Onboarding Sections Evaluation</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((sec, idx) => {
            let tagStyles = 'bg-status-success-bg text-status-success border-status-success/20'
            if (sec.score < 50) tagStyles = 'bg-status-error-bg text-status-error border-status-error/20'
            else if (sec.score < 80) tagStyles = 'bg-status-warning-bg text-status-warning border-status-warning/20'
            
            return (
              <div key={idx} className="p-4 rounded-xl bg-bg-panel/40 border border-border-subtle flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">{sec.category}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${tagStyles}`}>
                    {sec.score}%
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-normal font-light">{sec.details}</p>
                <div className="flex items-center gap-1.5 pt-1">
                  {sec.found ? (
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-status-success">
                      <CheckCircle className="w-3.5 h-3.5" /> Section Present
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-status-error">
                      <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> Section Missing
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Readme File preview */}
      {preview && (
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">File Preview ({scannedFile})</h4>
          <pre className="p-4 rounded-xl bg-bg-input border border-border-subtle font-mono text-[11px] text-text-secondary overflow-x-auto max-h-[220px] shadow-inner leading-relaxed whitespace-pre-wrap select-all scrollbar-thin">
            {preview}
          </pre>
        </div>
      )}
    </div>
  )
}
