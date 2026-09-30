import { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  LogOut,
  Shield,
  Key,
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
  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_UP')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      if (mode === 'SIGN_UP') {
        const user = await SupabaseDataService.signUp(name, email, password)
        toast.success(`Account created! Welcome, ${user.name || user.email}`)
        if (onSuccess) onSuccess(user)
        onOpenChange(false)
      } else {
        const user = await SupabaseDataService.signIn(email, password)
        toast.success(`Welcome back, ${user.name || user.email}!`)
        if (onSuccess) onSuccess(user)
        onOpenChange(false)
      }
    } catch (err) {
      toast.error('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-card border-border/80">
        <DialogHeader className="mb-4">
          <div className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
            <User className="size-5" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {mode === 'SIGN_UP' ? 'Create Your Account' : 'Sign In to Your Account'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {mode === 'SIGN_UP'
              ? 'Join to access institutional Forex & Crypto signals, live charting, and VIP alerts.'
              : 'Enter your credentials to access your terminal session.'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted/40 border border-border/40 mb-4">
          <button
            type="button"
            onClick={() => setMode('SIGN_UP')}
            className={`py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'SIGN_UP'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign Up (New User)
          </button>
          <button
            type="button"
            onClick={() => setMode('SIGN_IN')}
            className={`py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'SIGN_IN'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'SIGN_UP' && (
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Full Name</label>
              <Input
                placeholder="Raman Kishore"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs h-10"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Email Address *</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-xs h-10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Password *</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-xs h-10"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-11 gap-2 mt-2 shadow-lg shadow-cyan-500/20"
          >
            {loading
              ? 'Processing...'
              : mode === 'SIGN_UP'
              ? 'Complete Sign Up'
              : 'Sign In to Terminal'}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-border/40 text-center text-xs text-muted-foreground">
          {mode === 'SIGN_UP' ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('SIGN_IN')}
                className="text-cyan-400 font-bold hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setMode('SIGN_UP')}
                className="text-cyan-400 font-bold hover:underline"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
