import React, { useState, useEffect } from 'react'
import { 
  BarChart3, RefreshCw, CheckCircle, 
  XCircle, Play, Download, Settings, Activity, Gauge
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { CircularProgress } from '../ui/CircularProgress'

export default function BenchmarkCenter() {
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const fetchLatestRun = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const res = await fetch('http://localhost:8000/api/benchmarks/latest', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch benchmark run')
      const data = await res.json()
      if (data.status === 'none') {
        setRun(null)
      } else {
        setRun(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLatestRun()
    const interval = setInterval(() => {
      fetchLatestRun()
    }, 5000) // Poll every 5s for updates
    return () => clearInterval(interval)
  }, [])

  const handleRunBenchmark = async () => {
    try {
      setRunning(true)
      const token = localStorage.getItem('access_token')
      const res = await fetch('http://localhost:8000/api/benchmarks/run', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to start benchmark')
      await fetchLatestRun()
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const handleDownloadReport = () => {
    const token = localStorage.getItem('access_token')
    window.open(`http://localhost:8000/api/benchmarks/latest/report?token=${token}`, '_blank')
  }

  if (loading && !run) {
    return (
      <div className="p-12 flex justify-center">
        <CircularProgress className="w-8 h-8 text-brand-indigo" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h2 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <Gauge className="w-5 h-5 text-brand-indigo" />
            Framework Evaluation Benchmark
          </h2>
          <p className="text-xs text-text-muted mt-1 font-light">
            Measure detection accuracy across multiple language ecosystems.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {run && run.status === 'completed' && (
            <Button variant="outline" size="sm" onClick={handleDownloadReport}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </Button>
          )}
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleRunBenchmark}
            disabled={running || (run && run.status === 'running')}
          >
            {(running || (run && run.status === 'running')) ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Benchmark Suite
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded border border-status-error/30 bg-status-error-bg text-status-error text-xs font-bold">
          {error}
        </div>
      )}

      {!run ? (
        <div className="p-12 rounded-2xl text-center border border-border-subtle bg-bg-panel/20">
          <Activity className="w-10 h-10 text-text-muted/40 mx-auto mb-3" />
          <p className="text-xs text-text-muted italic">No benchmarks have been executed yet.</p>
          <p className="text-[10px] text-text-muted mt-2">Click "Run Benchmark Suite" to evaluate against 15 ground-truth repositories.</p>
        </div>
      ) : (
        <>
          {/* Status Bar */}
          <div className="flex items-center justify-between p-4 rounded bg-bg-panel/40 border border-border-subtle text-xs">
            <div className="flex gap-4">
              <span className="text-text-muted font-bold">Status:</span>
              <span className={`font-mono font-bold ${run.status === 'completed' ? 'text-status-success' : 'text-brand-purple'}`}>
                {run.status.toUpperCase()}
              </span>
            </div>
            <div className="flex gap-4">
              <span className="text-text-muted font-bold">Progress:</span>
              <span className="font-mono">{run.completed_repos} / {run.total_repos} Repositories Evaluated</span>
            </div>
          </div>

          {/* Dials / Accuracies */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <AccuracyCard title="Tech Accuracy" score={run.tech_accuracy} />
            <AccuracyCard title="Dep Accuracy" score={run.dependency_accuracy} />
            <AccuracyCard title="Env Accuracy" score={run.environment_accuracy} />
            <AccuracyCard title="Build Accuracy" score={run.build_accuracy} />
            <AccuracyCard title="Docs Accuracy" score={run.docs_accuracy} />
          </div>

          {/* Results Table */}
          {run.results && run.results.length > 0 && (
            <div className="border border-border-subtle rounded-2xl overflow-hidden bg-bg-panel/10">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-bg-panel/85 border-b border-border-subtle text-text-muted font-bold uppercase tracking-wider select-none">
                      <th className="p-4">Repository</th>
                      <th className="p-4">Expected Ecosystem</th>
                      <th className="p-4">Predicted Ecosystem</th>
                      <th className="p-4">Tech Match</th>
                      <th className="p-4">Dep Match</th>
                      <th className="p-4">Env Match</th>
                      <th className="p-4">Build Match</th>
                      <th className="p-4">Docs Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.results.map((r, i) => (
                      <tr key={i} className="border-b border-border-subtle/50 hover:bg-bg-panel/40 transition">
                        <td className="p-4 font-bold text-text-primary truncate max-w-[200px]">
                          {r.repo_url}
                        </td>
                        <td className="p-4 text-text-secondary">{r.expected_ecosystem}</td>
                        <td className="p-4 text-text-secondary">{r.predicted_ecosystem || '-'}</td>
                        <td className="p-4">
                          {r.tech_match ? <CheckCircle className="w-4 h-4 text-status-success" /> : <XCircle className="w-4 h-4 text-status-error" />}
                        </td>
                        <td className="p-4">
                          {r.dep_match ? <CheckCircle className="w-4 h-4 text-status-success" /> : <XCircle className="w-4 h-4 text-status-error" />}
                        </td>
                        <td className="p-4">
                          {r.env_match ? <CheckCircle className="w-4 h-4 text-status-success" /> : <XCircle className="w-4 h-4 text-status-error" />}
                        </td>
                        <td className="p-4">
                          {r.build_match ? <CheckCircle className="w-4 h-4 text-status-success" /> : <XCircle className="w-4 h-4 text-status-error" />}
                        </td>
                        <td className="p-4">
                          {r.docs_match ? <CheckCircle className="w-4 h-4 text-status-success" /> : <XCircle className="w-4 h-4 text-status-error" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AccuracyCard({ title, score }) {
  let color = 'text-status-error'
  if (score >= 80) color = 'text-status-success'
  else if (score >= 50) color = 'text-status-warning'

  return (
    <Card className="p-4 border border-border-subtle flex flex-col items-center justify-center bg-bg-panel/20">
      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">{title}</span>
      <div className={`text-2xl font-mono font-extrabold ${color}`}>
        {score}%
      </div>
    </Card>
  )
}
