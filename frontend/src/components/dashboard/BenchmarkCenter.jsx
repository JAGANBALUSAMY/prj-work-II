import React, { useState } from 'react'
import { 
  BarChart3, Search, ChevronUp, ChevronDown, CheckCircle, 
  XCircle, AlertTriangle, ExternalLink, Globe
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

export default function BenchmarkCenter({
  repos = [],
  onSelectRepo = () => {},
  formatDate = (d) => d
}) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('repro') // name, repro, surv, stars
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc

  const historyRepos = repos.filter(r => !(r.status === 'cloning' || (r.analyses && r.analyses.some(a => a.status === 'running'))))

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Filter and Sort Repositories
  const filteredRepos = historyRepos.filter(repo => {
    const q = search.toLowerCase()
    return (
      repo.name.toLowerCase().includes(q) ||
      (repo.owner && repo.owner.toLowerCase().includes(q))
    )
  }).sort((a, b) => {
    let valA, valB

    if (sortField === 'name') {
      valA = `${a.owner}/${a.name}`.toLowerCase()
      valB = `${b.owner}/${b.name}`.toLowerCase()
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }

    if (sortField === 'repro') {
      valA = a.analyses?.[0]?.reproducibility_score || 0
      valB = b.analyses?.[0]?.reproducibility_score || 0
    } else if (sortField === 'surv') {
      valA = a.analyses?.[0]?.survivability_score || 0
      valB = b.analyses?.[0]?.survivability_score || 0
    } else if (sortField === 'stars') {
      valA = a.stars || 0
      valB = b.stars || 0
    }

    return sortOrder === 'asc' ? valA - valB : valB - valA
  })

  // Chart values calculation
  const maxScore = 100
  const topRepos = filteredRepos.slice(0, 5)

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h2 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-indigo" />
            Repository Benchmark Matrix
          </h2>
          <p className="text-xs text-text-muted mt-1 font-light">
            Compare stability parameters, reproducibility indices, and build outcomes across scanned repositories.
          </p>
        </div>
      </div>

      {/* SVG Comparison Graph */}
      {topRepos.length > 0 && (
        <Card className="p-6 border border-border-subtle bg-bg-panel/10">
          <span className="text-[9px] text-text-muted font-extrabold uppercase tracking-widest block mb-4">
            Top Scored Repositories Comparison
          </span>
          
          <div className="space-y-4">
            {topRepos.map((repo, i) => {
              const latest = repo.analyses?.[0]
              const repro = latest?.reproducibility_score || 0
              const surv = latest?.survivability_score || 0
              
              return (
                <div key={repo.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary">
                    <span className="truncate max-w-[200px]">{repo.owner}/{repo.name}</span>
                    <span className="font-mono text-text-muted">
                      Repro: <span className="text-brand-purple">{repro}%</span> · Surv: <span className="text-brand-cyan">{surv}%</span>
                    </span>
                  </div>

                  {/* Dual Bar Graphic Chart */}
                  <div className="space-y-1">
                    <div className="w-full bg-bg-input h-2 rounded-full overflow-hidden border border-border-subtle/50 flex">
                      <div 
                        className="bg-brand-purple h-full rounded-l-full transition-all duration-1000"
                        style={{ width: `${(repro / 2)}%` }}
                      />
                      <div 
                        className="bg-brand-cyan h-full rounded-r-full transition-all duration-1000"
                        style={{ width: `${(surv / 2)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Benchmark List Search and Grid table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input 
            placeholder="Search repositories in benchmark..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
            icon={Search}
          />
        </div>

        {filteredRepos.length === 0 ? (
          <div className="p-12 rounded-2xl text-center border border-border-subtle bg-bg-panel/20">
            <Globe className="w-10 h-10 text-text-muted/40 mx-auto mb-3" />
            <p className="text-xs text-text-muted italic">No repository data compiled yet.</p>
          </div>
        ) : (
          <div className="border border-border-subtle rounded-2xl overflow-hidden bg-bg-panel/10">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bg-panel/85 border-b border-border-subtle text-text-muted font-bold uppercase tracking-wider select-none">
                    <th 
                      onClick={() => handleSort('name')}
                      className="p-4 cursor-pointer hover:text-text-primary transition"
                    >
                      <div className="flex items-center gap-1.5">
                        Repository Name {sortField === 'name' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : null}
                      </div>
                    </th>
                    <th className="p-4">Primary Stacks</th>
                    <th className="p-4">Build Track</th>
                    <th 
                      onClick={() => handleSort('repro')}
                      className="p-4 cursor-pointer hover:text-text-primary transition"
                    >
                      <div className="flex items-center gap-1.5">
                        Reproducibility {sortField === 'repro' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : null}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('surv')}
                      className="p-4 cursor-pointer hover:text-text-primary transition"
                    >
                      <div className="flex items-center gap-1.5">
                        Survivability {sortField === 'surv' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : null}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('stars')}
                      className="p-4 cursor-pointer hover:text-text-primary transition"
                    >
                      <div className="flex items-center gap-1.5">
                        GitHub Stars {sortField === 'stars' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : null}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRepos.map((repo) => {
                    const latest = repo.analyses?.[0]
                    const repro = latest?.reproducibility_score || 0
                    const surv = latest?.survivability_score || 0
                    const buildOk = repo.build_result?.build_success

                    const backend = repo.detected_stack?.backend || []
                    const primaryStack = backend[0] || 'Unknown'

                    return (
                      <tr 
                        key={repo.id} 
                        onClick={() => onSelectRepo(repo)}
                        className="border-b border-border-subtle/50 hover:bg-bg-panel/40 transition cursor-pointer select-none"
                      >
                        <td className="p-4 font-bold text-text-primary truncate max-w-[200px]">
                          {repo.owner}/{repo.name}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-lg bg-bg-panel border border-border-subtle text-[9px] font-bold text-text-secondary">
                            {primaryStack}
                          </span>
                        </td>
                        <td className="p-4">
                          {repo.build_result ? (
                            buildOk ? (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-status-success">
                                <CheckCircle className="w-3.5 h-3.5" /> Passing
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-status-error">
                                <XCircle className="w-3.5 h-3.5 animate-pulse" /> Failing
                              </span>
                            )
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-text-muted">
                              <AlertTriangle className="w-3.5 h-3.5" /> Unchecked
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-brand-purple">
                          {repro}%
                        </td>
                        <td className="p-4 font-mono font-bold text-brand-cyan">
                          {surv}%
                        </td>
                        <td className="p-4 font-mono text-text-muted">
                          {repo.stars || 0}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
