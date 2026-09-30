import { useState } from 'react'
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  ShieldAlert,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@pairlens/ui/components/ui/button'
import { Input } from '@pairlens/ui/components/ui/input'
import { Badge } from '@pairlens/ui/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@pairlens/ui/components/ui/dialog'
import { toast } from 'sonner'
import { SupabaseDataService, AppUser } from '@/lib/services/supabase-service'

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (user: AppUser) => void
}) {
  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'ADMIN'>('SIGN_IN')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'ADMIN') {
      if (!adminPin.trim()) {
        setError('Please enter Admin Master PIN')
        return
      }
      setLoading(true)
      try {
        if (adminPin.trim() === '09970997') {
          const adminUser: AppUser = {
            id: 'admin_master',
            name: 'Master Admin',
            email: 'admin@pairlens.pro',
            role: 'admin',
            plan: 'vip',
            created_at: new Date().toISOString(),
          }
          localStorage.setItem('stac:auth:user', JSON.stringify(adminUser))
          window.dispatchEvent(new CustomEvent('stac:auth:changed', { detail: adminUser }))
          toast.success('Admin Master Access Granted!')
          if (onSuccess) onSuccess(adminUser)
          onOpenChange(false)
        } else {
          setError('Invalid Admin Master PIN. Access Denied.')
        }
      } catch (err: any) {
        setError(err.message || 'Admin verification failed.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'SIGN_UP') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.')
        }
        const user = await SupabaseDataService.signUp(name, email, password)
        toast.success(`Welcome ${user.name || user.email}! Account created.`)
        if (onSuccess) onSuccess(user)
        onOpenChange(false)
      } else {
        const user = await SupabaseDataService.signIn(email, password)
        toast.success(`Welcome back, ${user.name || user.email}!`)
        if (onSuccess) onSuccess(user)
        onOpenChange(false)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-card border-border/80 shadow-2xl shadow-black/80 rounded-2xl">
        <DialogHeader className="mb-3 text-center">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-cyan-500/20 mb-2">
            P
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {mode === 'SIGN_UP'
              ? 'Create Your Account'
              : mode === 'ADMIN'
                ? 'Admin Terminal Gateway'
                : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {mode === 'SIGN_UP'
              ? 'Join to access institutional Forex & Crypto charts and trade signals.'
              : mode === 'ADMIN'
                ? 'Enter your master credentials to unlock admin control.'
                : 'Sign in to sync your portfolio, watchlists and VIP signals.'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/60 border border-border/40 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('SIGN_IN')
              setError(null)
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'SIGN_IN'
                ? 'bg-background text-foreground shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('SIGN_UP')
              setError(null)
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'SIGN_UP'
                ? 'bg-background text-foreground shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'ADMIN' ? (
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                Master Admin PIN *
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 size-4 text-cyan-400" />
                <Input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter 8-digit PIN"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="pl-9 bg-background/50 h-10 text-sm font-mono tracking-widest"
                />
              </div>
            </div>
          ) : (
            <>
              {mode === 'SIGN_UP' && (
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Alex Rivera"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 bg-background/50 h-10 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    placeholder="trader@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-background/50 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 bg-background/50 h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-10 text-sm shadow-lg shadow-cyan-500/20 mt-1"
          >
            {loading ? (
              'Authenticating...'
            ) : mode === 'SIGN_UP' ? (
              <>Create Free Account <ArrowRight className="size-4 ml-1.5" /></>
            ) : mode === 'ADMIN' ? (
              <>Unlock Admin Controls <ShieldCheck className="size-4 ml-1.5 text-cyan-300" /></>
            ) : (
              <>Sign In <ArrowRight className="size-4 ml-1.5" /></>
            )}
          </Button>
        </form>

        {/* Footer info & discreet admin link */}
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-emerald-400" />
            <span>Secure 256-bit Encryption</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'ADMIN' ? 'SIGN_IN' : 'ADMIN')
              setError(null)
            }}
            className="hover:text-cyan-400 font-mono text-[10px] transition-colors"
          >
            {mode === 'ADMIN' ? '← User Login' : 'Admin PIN Login'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
