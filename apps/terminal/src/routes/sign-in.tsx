// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Mail,
  Lock,
  User,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react'
import { Button } from '@pairlens/ui/components/ui/button'
import { Input } from '@pairlens/ui/components/ui/input'
import { Badge } from '@pairlens/ui/components/ui/badge'
import { toast } from 'sonner'
import { SupabaseDataService } from '@/lib/services/supabase-service'

export const Route = createFileRoute('/sign-in')({ component: SignInPage })

function SignInPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const user = SupabaseDataService.getCurrentUser()
    if (user) {
      void navigate({ to: '/', replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (tab === 'signup') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please fill in all required fields.')
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.')
        }
        const user = await SupabaseDataService.signUp(name, email, password)
        toast.success(`Welcome ${user.name || user.email}! Account created.`)
        void navigate({ to: '/', replace: true })
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter email and password.')
        }
        const user = await SupabaseDataService.signIn(email, password)
        toast.success(`Welcome back, ${user.name || user.email}!`)
        void navigate({ to: '/', replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 relative selection:bg-cyan-500/20">
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-blue-600/5 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigate({ to: '/' })}
            className="text-muted-foreground hover:text-foreground text-xs gap-1.5 -ml-2"
          >
            <ChevronLeft className="size-4" /> Back to Terminal
          </Button>
          <Badge variant="outline" className="font-mono text-[10px] border-cyan-500/40 text-cyan-400">
            PRO SUITE
          </Badge>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-cyan-500/20 mb-3">
              P
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {tab === 'signin' ? 'Sign In to Pairlens' : 'Create Free Account'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === 'signin'
                ? 'Access your institutional charts, signals & VIP trades'
                : 'Join thousands of active traders with live market edge'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-muted/60 p-1 rounded-xl mb-6 border border-border/40 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setTab('signin')
                setError(null)
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                tab === 'signin'
                  ? 'bg-background text-foreground shadow font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup')
                setError(null)
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                tab === 'signup'
                  ? 'bg-background text-foreground shadow font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Trader Alex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 bg-background/50 h-10 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-background/50 h-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-background/50 h-10 text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-10 text-sm shadow-lg shadow-cyan-500/20 mt-2"
            >
              {loading ? (
                'Processing...'
              ) : tab === 'signin' ? (
                <>Sign In <ArrowRight className="size-4 ml-1.5" /></>
              ) : (
                <>Create Account <ArrowRight className="size-4 ml-1.5" /></>
              )}
            </Button>
          </form>

          {/* Perks Footer */}
          <div className="mt-6 pt-5 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              <span>Free Forever Tier</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              <span>Realtime Forex & Crypto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              <span>Institutional Feeds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              <span>Instant VIP Upgrades</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
