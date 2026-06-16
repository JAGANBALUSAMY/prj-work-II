import React, { useState } from 'react'
import { Cpu, Mail, Lock, LogIn, ArrowRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import axios from 'axios'

export default function Login({ onLoginSuccess, onSwitchToRegister, apiBaseUrl }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(`${apiBaseUrl}/auth/login`, { email, password })
      onLoginSuccess(response.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Incorrect email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base text-text-primary px-6 relative overflow-hidden">
      {/* Glow blobs */}
      <div className="glow-blob-purple top-[-100px] right-[-100px] animate-slow-pulse"></div>
      <div className="glow-blob-blue bottom-[-100px] left-[-100px]"></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-brand-indigo to-brand-purple shadow-xl shadow-brand-indigo/35">
            <Cpu className="w-8 h-8 text-white animate-slow-pulse" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-widest text-gradient">AEGIS CORE</h1>
            <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase mt-0.5">Secure Authentication Console</p>
          </div>
        </div>

        <Card className="p-8 border border-border-subtle bg-bg-surface/65 backdrop-blur-md shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-xl bg-status-error-bg border border-status-error/20 text-xs font-semibold text-status-error">
                {error}
              </div>
            )}

            <Input
              id="login-email"
              label="Email Address"
              type="email"
              placeholder="operator@aegis.sys"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <Input
              id="login-password"
              label="Security Keyphrase"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              icon={LogIn}
            >
              Sign In to System
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border-subtle text-center">
            <p className="text-xs text-text-muted font-light">
              No active credentials?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-brand-indigo hover:text-brand-purple font-semibold hover:underline flex items-center gap-1.5 mx-auto mt-2"
              >
                Register New Credentials <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
