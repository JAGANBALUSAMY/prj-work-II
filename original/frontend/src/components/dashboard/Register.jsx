import React, { useState } from 'react'
import { Cpu, Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import axios from 'axios'

export default function Register({ onRegisterSuccess, onBackToLogin, apiBaseUrl }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password || !confirmPassword) return
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await axios.post(`${apiBaseUrl}/auth/register`, { email, password })
      setSuccess('Registration successful! Redirecting to login...')
      setTimeout(() => {
        onRegisterSuccess()
      }, 1500)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Registration failed. Check details or email uniqueness.')
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
            <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase mt-0.5">Initialize System Operator Credentials</p>
          </div>
        </div>

        <Card className="p-8 border border-border-subtle bg-bg-surface/65 backdrop-blur-md shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-xl bg-status-error-bg border border-status-error/20 text-xs font-semibold text-status-error">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-xl bg-status-success-bg border border-status-success/20 text-xs font-semibold text-status-success">
                {success}
              </div>
            )}

            <Input
              id="reg-email"
              label="Operator Email"
              type="email"
              placeholder="operator@aegis.sys"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <Input
              id="reg-password"
              label="Access Keyphrase"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              required
            />

            <Input
              id="reg-confirm-password"
              label="Confirm Keyphrase"
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={Lock}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              icon={UserPlus}
            >
              Register Credentials
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border-subtle text-center">
            <button
              onClick={onBackToLogin}
              className="text-text-secondary hover:text-text-primary font-semibold hover:underline flex items-center gap-1.5 mx-auto text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
