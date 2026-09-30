import { useState, useEffect } from 'react'
import {
  Wallet,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  Clock,
  ArrowRight,
  QrCode,
  DollarSign,
  Lock,
} from 'lucide-react'
import { Button } from '@pairlens/ui/components/ui/button'
import { Input } from '@pairlens/ui/components/ui/input'
import { Badge } from '@pairlens/ui/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@pairlens/ui/components/ui/dialog'
import { toast } from 'sonner'
import { SupabaseDataService, DbSettings } from '@/lib/services/supabase-service'

export type SubscriptionPlan = 'monthly' | 'yearly' | 'lifetime'

export function CryptoCheckoutModal({
  open,
  onOpenChange,
  initialPlan = 'monthly',
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPlan?: SubscriptionPlan
  onSuccess?: () => void
}) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(initialPlan)
  const [selectedChain, setSelectedChain] = useState<'TRC20' | 'ERC20' | 'SOL'>('TRC20')
  const [settings, setSettings] = useState<DbSettings | null>(null)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'SELECT' | 'PAY' | 'CONFIRM'>('SELECT')

  // Customer submission form
  const [email, setEmail] = useState('')
  const [txHash, setTxHash] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    SupabaseDataService.getSettings().then(setSettings)
  }, [open])

  useEffect(() => {
    setSelectedPlan(initialPlan)
  }, [initialPlan])

  const planPrices = {
    monthly: settings?.pricing_plans?.pro_monthly ?? 29,
    yearly: settings?.pricing_plans?.pro_yearly ?? 199,
    lifetime: settings?.pricing_plans?.vip_lifetime ?? 499,
  }

  const walletAddresses = {
    TRC20: settings?.crypto_wallets?.usdt_trc20 || 'TLyKq7z4v6x8n9P1Q2R3S4T5U6V7W8X9YZ',
    ERC20: settings?.crypto_wallets?.usdt_erc20 || '0x71C8360f3a8b4FaA5cD4eA9F8E19cD61e4A58249',
    SOL: settings?.crypto_wallets?.solana || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  }

  const activeWallet = walletAddresses[selectedChain]
  const amountToPay = planPrices[selectedPlan]

  const handleCopy = () => {
    navigator.clipboard.writeText(activeWallet)
    setCopied(true)
    toast.success('Wallet address copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email')
      return
    }

    setSubmitting(true)
    try {
      await SupabaseDataService.createSubscription({
        email: email.trim(),
        plan: selectedPlan === 'lifetime' ? 'vip' : 'pro',
        status: 'active', // Auto activate or pending
        chain: selectedChain,
        tx_hash: txHash.trim() || 'SUBMITTED_FOR_VERIFICATION',
        amount_usdt: amountToPay,
      })

      // Store local session VIP access
      localStorage.setItem('stac:vip:active', 'true')
      localStorage.setItem('stac:vip:email', email.trim())
      window.dispatchEvent(new CustomEvent('stac:vip:activated', { detail: { email, plan: selectedPlan } }))

      setStep('CONFIRM')
      toast.success('Subscription activated! Welcome to VIP Terminal.')
      if (onSuccess) onSuccess()
    } catch (err) {
      toast.error('Error recording payment. Please contact support.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-card border-border/80">
        {step === 'SELECT' && (
          <div>
            <DialogHeader className="mb-4">
              <div className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
                <Sparkles className="size-5" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Unlock VIP Signals & Pro Terminal
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Get real-time Forex & Crypto institutional signals with entry, SL and 3 target levels.
              </DialogDescription>
            </DialogHeader>

            {/* Plan Cards */}
            <div className="space-y-2.5 mb-5">
              <div
                onClick={() => setSelectedPlan('monthly')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedPlan === 'monthly'
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-sm shadow-cyan-500/10'
                    : 'border-border/60 hover:border-border bg-background/50'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    Pro Monthly
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Live Signals + Charts + Instant Alerts
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-cyan-400">${planPrices.monthly}</div>
                  <div className="text-[10px] text-muted-foreground">USDT / month</div>
                </div>
              </div>

              <div
                onClick={() => setSelectedPlan('yearly')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedPlan === 'yearly'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
                    : 'border-border/60 hover:border-border bg-background/50'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    Pro Yearly <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400">Save 45%</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    12 Months Full Pro Access + Priority Support
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-emerald-400">${planPrices.yearly}</div>
                  <div className="text-[10px] text-muted-foreground">USDT / year</div>
                </div>
              </div>

              <div
                onClick={() => setSelectedPlan('lifetime')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedPlan === 'lifetime'
                    ? 'border-amber-500 bg-amber-500/10 shadow-sm shadow-amber-500/10'
                    : 'border-border/60 hover:border-border bg-background/50'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    VIP Lifetime <Badge className="text-[9px] bg-amber-500/20 text-amber-400">BEST VALUE</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    One-time payment · Never pay again
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-amber-400">${planPrices.lifetime}</div>
                  <div className="text-[10px] text-muted-foreground">USDT One-Time</div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStep('PAY')}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-10 gap-2 shadow-lg shadow-cyan-500/15"
            >
              Pay ${amountToPay} USDT with Crypto <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {step === 'PAY' && (
          <div>
            <DialogHeader className="mb-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[10px] text-cyan-400 border-cyan-500/30">
                  Step 2: Send Payment
                </Badge>
                <button
                  type="button"
                  onClick={() => setStep('SELECT')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Change Plan
                </button>
              </div>
              <DialogTitle className="text-lg font-bold">
                Send <strong className="text-cyan-400">${amountToPay} USDT</strong>
              </DialogTitle>
            </DialogHeader>

            {/* Select Network */}
            <div className="mb-4">
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">
                Select Crypto Network:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChain('TRC20')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                    selectedChain === 'TRC20'
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  USDT (TRC20)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChain('ERC20')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                    selectedChain === 'ERC20'
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  USDT (ERC20)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChain('SOL')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                    selectedChain === 'SOL'
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Solana (SOL)
                </button>
              </div>
            </div>

            {/* Wallet Address Box */}
            <div className="rounded-xl border border-border bg-background/80 p-3.5 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Receiving Address ({selectedChain}):</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-mono font-bold"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-2.5 rounded bg-muted/40 font-mono text-[11px] break-all border border-border/60 text-foreground font-semibold">
                {activeWallet}
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Your Email (for VIP account activation) *
                </label>
                <Input
                  type="email"
                  placeholder="alex@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Transaction Hash / TxID (Optional or paste after sending)
                </label>
                <Input
                  placeholder="e.g. 0x8f3c... or TRC20 TXID"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 gap-2 mt-2"
              >
                <CheckCircle2 className="size-4" />
                {submitting ? 'Verifying...' : 'I Have Completed Payment'}
              </Button>
            </form>
          </div>
        )}

        {step === 'CONFIRM' && (
          <div className="text-center py-4 space-y-4">
            <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="size-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Welcome to VIP Access!</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Your subscription has been recorded in our Supabase PostgreSQL database. All live signals and VIP features are now unlocked.
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-10"
            >
              Open Trading Terminal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
