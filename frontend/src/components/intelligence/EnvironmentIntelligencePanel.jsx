import React, { useState } from 'react'
import { Server, CheckCircle, AlertTriangle, HelpCircle, Copy, Check } from 'lucide-react'

export default function EnvironmentIntelligencePanel({ repo }) {
  const [envCopied, setEnvCopied] = useState(false)
  
  const analysis = repo.analyses?.[0] || null
  const intel = analysis?.findings?.intelligence || {}
  const envIntel = intel.environment_intelligence || null
  const profile = repo.environment_profile || null

  const handleCopyText = (template) => {
    navigator.clipboard.writeText(template)
    setEnvCopied(true)
    setTimeout(() => setEnvCopied(false), 2000)
  }

  if (!envIntel && !profile) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
        No environment variables profiles cataloged.
      </div>
    )
  }

  const completeness = envIntel ? envIntel.completeness_percentage : (profile ? 100 : 0)
  const quality = envIntel ? envIntel.template_quality : 'Standard'
  const vars = profile?.variables || []
  const template = profile?.template || ""
  const scannedCount = profile?.scanned_files_count || 0
  const templatesFound = profile?.template_files_found || []
  const missingVars = vars.filter(v => v.is_missing_from_template)

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-brand-teal/5">
        <h3 className="text-sm font-extrabold text-brand-teal flex items-center gap-2 mb-2">
          <Server className="w-5 h-5" />
          Environment Intelligence
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed font-light">
          Analysis of environment variables required for successful deployment. Reconstructed from codebase scans.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Completeness</p>
          <p className="text-2xl font-black text-text-primary">{completeness}%</p>
        </div>
        <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Template Quality</p>
          <p className="text-2xl font-black text-text-primary">{quality}</p>
        </div>
        <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Scanned Files</p>
          <p className="text-2xl font-black text-text-primary">{scannedCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Templates Found</p>
          <p className="text-xs font-bold text-text-secondary mt-2 truncate" title={templatesFound.join(', ')}>
            {templatesFound.length > 0 ? templatesFound.join(', ') : 'None'}
          </p>
        </div>
      </div>

      {/* Undocumented / Missing Variables Warnings */}
      {missingVars.length > 0 && (
        <div className="p-4 rounded-xl bg-status-warning-bg border border-status-warning/20 text-xs text-status-warning space-y-2 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px]">
            <AlertTriangle className="w-4 h-4 text-status-warning" /> Configuration Discrepancies
          </div>
          <p className="leading-relaxed font-light">The following variables are referenced in the codebase but missing from the project's config template files (like <code>.env.example</code>):</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {missingVars.map(v => (
              <span key={v.name} className="px-2 py-0.5 rounded bg-status-warning/10 border border-status-warning/20 text-status-warning font-mono text-[9px] select-all">{v.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Reconstructed env file template view */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Reconstructed .env Template</h4>
          <button
            onClick={() => handleCopyText(template)}
            disabled={!template}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-panel hover:bg-bg-panel/80 border border-border-subtle text-xs text-text-secondary disabled:opacity-50 transition animate-fadeIn"
          >
            {envCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Template</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 rounded-xl bg-bg-input border border-border-subtle font-mono text-xs text-emerald-400 overflow-x-auto max-h-[180px] shadow-inner select-all leading-relaxed whitespace-pre scrollbar-thin">
          {template || "# No variables cataloged to compile template."}
        </pre>
      </div>

      {/* Registry Table */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Environment Variable Registry</h4>
        <div className="border border-border-subtle rounded-2xl overflow-hidden bg-bg-panel/20">
          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bg-panel/85 border-b border-border-subtle text-text-muted font-bold uppercase tracking-wider">
                  <th className="p-3.5">Variable Key</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Source Files</th>
                </tr>
              </thead>
              <tbody>
                {vars.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-text-muted italic font-light">
                      No variables registered.
                    </td>
                  </tr>
                ) : (
                  vars.map((v, idx) => (
                    <tr key={idx} className="border-b border-border-subtle/50 hover:bg-bg-panel/40 transition">
                      <td className="p-3.5 font-bold font-mono text-text-secondary select-all">{v.name}</td>
                      <td className="p-3.5">
                        <span className={`
                          px-2 py-0.5 rounded text-[9px] font-bold uppercase border
                          ${v.is_missing_from_template 
                            ? 'bg-status-warning-bg text-status-warning border-status-warning/20' 
                            : 'bg-status-success-bg text-status-success border-status-success/20'
                          }
                        `}>
                          {v.is_missing_from_template ? 'Missing Template' : 'Documented'}
                        </span>
                      </td>
                      <td className="p-3.5 text-text-tertiary font-mono leading-relaxed select-all">
                        <div className="flex flex-wrap gap-1">
                          {v.sources.map((s, sIdx) => (
                            <span key={sIdx} className="bg-bg-input px-1.5 py-0.5 rounded border border-border-subtle text-[9px]" title={s}>
                              {s.split('/').pop()}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
