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
  ChevronLeft,
  Flame,
  Star,
  Send,
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
  const [selectedChain, setSelectedChain] = useState<'TRC20' | 'BEP20'>('TRC20')
  const [settings, setSettings] = useState<DbSettings | null>(null)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'SELECT' | 'PAY' | 'CONFIRM'>('SELECT')

  // Customer submission form
  const [email, setEmail] = useState('')
  const [txHash, setTxHash] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    SupabaseDataService.getSettings().then(setSettings)
    const currentUser = SupabaseDataService.getCurrentUser()
    if (currentUser?.email) {
      setEmail(currentUser.email)
    }
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
    BEP20: settings?.crypto_wallets?.usdt_bep20 || '0x71C8360f3a8b4FaA5cD4eA9F8E19cD61e4A58249',
  }

  const activeWallet = walletAddresses[selectedChain]
  const amountToPay = planPrices[selectedPlan]

  const handleCopy = () => {
    navigator.clipboard.writeText(activeWallet)
    setCopied(true)
    toast.success('Wallet address copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const [verifyStatus, setVerifyStatus] = useState<string>('')

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your registered email')
      return
    }

    const cleanHash = txHash.trim()
    if (!cleanHash) {
      toast.error(`Please enter the ${selectedChain} Transaction Hash (TxID) after sending ${amountToPay} USDT.`)
      return
    }

    if (selectedChain === 'TRC20' && !/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
      toast.error('Invalid TRC-20 TxID: Tron transaction hashes must be exactly 64 hexadecimal characters.')
      return
    }

    if (selectedChain === 'BEP20' && !/^0x[a-fA-F0-9]{64}$/.test(cleanHash)) {
      toast.error('Invalid BEP-20 TxID: BNB Smart Chain transaction hashes must start with 0x and be 66 characters.')
      return
    }

    setSubmitting(true)
    setVerifyStatus(`Querying ${selectedChain} network mempool & ledger...`)

    try {
      const targetPlan = selectedPlan === 'lifetime' ? 'vip' : 'pro'
      const result = await SupabaseDataService.verifyBlockchainPayment(
        email.trim(),
        selectedChain,
        cleanHash,
        targetPlan,
        amountToPay
      )

      setVerifyStatus(result.message)
      setStep('CONFIRM')
      toast.success('VIP Membership Activated Successfully!')
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Error verifying blockchain payment. Please check your TxID.')
    } finally {
      setSubmitting(false)
      setVerifyStatus('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 bg-card border-border/80 shadow-2xl shadow-black/80 rounded-2xl">
        {step === 'SELECT' && (
          <div>
            <DialogHeader className="mb-4 text-center">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-amber-500/20 mb-2">
                <Sparkles className="size-6" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                VIP Signals & Institutional Edge
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground max-w-sm mx-auto">
                Get real-time Forex, Commodities & Crypto trade signals with precise Entry, Stop Loss, and 3 Target Levels.
              </DialogDescription>
            </DialogHeader>

            {/* Plan Cards */}
            <div className="space-y-3 mb-5">
              {/* Monthly */}
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
                    Live Signals + Automated TP/SL Tracking
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-cyan-400">${planPrices.monthly}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">USDT / Month</div>
                </div>
              </div>

              {/* Yearly */}
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
                    Pro Yearly <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 font-mono">SAVE 45%</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    12 Months VIP Access + Priority Feeds
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-emerald-400">${planPrices.yearly}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">USDT / Year</div>
                </div>
              </div>

              {/* Lifetime */}
              <div
                onClick={() => setSelectedPlan('lifetime')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between relative overflow-hidden ${
                  selectedPlan === 'lifetime'
                    ? 'border-amber-500 bg-amber-500/10 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30'
                    : 'border-border/60 hover:border-border bg-background/50'
                }`}
              >
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-black text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Most Popular
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    VIP Lifetime <Flame className="size-3.5 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Lifetime Access · Unlimited Signals · Never Pay Again
                  </div>
                </div>
                <div className="text-right pt-2">
                  <div className="font-mono text-lg font-bold text-amber-400">${planPrices.lifetime}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">USDT One-Time</div>
                </div>
              </div>
            </div>

            {/* Feature Perks */}
            <div className="grid grid-cols-2 gap-2 mb-5 p-3 rounded-xl bg-muted/40 border border-border/40 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span>Entry, SL & 3 TP Targets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span>Forex, Gold & Crypto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span>Instant Push Alerts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span>Institutional Risk Ratio</span>
              </div>
            </div>

            <Button
              onClick={() => setStep('PAY')}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold h-11 gap-2 shadow-lg shadow-amber-500/20"
            >
              Pay ${amountToPay} USDT via Crypto <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {step === 'PAY' && (
          <div>
            <DialogHeader className="mb-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('SELECT')}
                  className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1 px-2"
                >
                  <ChevronLeft className="size-3.5" /> Back to Plans
                </Button>
                <Badge variant="outline" className="font-mono text-[10px] text-cyan-400 border-cyan-500/30">
                  Step 2 of 2
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold mt-2">
                Send <strong className="text-amber-400 font-mono">${amountToPay} USDT</strong>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select your preferred blockchain network and send exact USDT amount.
              </DialogDescription>
            </DialogHeader>

            {/* Select Network */}
            <div className="mb-4">
              <label className="text-[11px] font-mono text-muted-foreground mb-1.5 block uppercase">
                Select Network:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedChain('TRC20')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                    selectedChain === 'TRC20'
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10'
                      : 'border-border/60 text-muted-foreground hover:text-foreground bg-background/50'
                  }`}
                >
                  <span className="font-mono text-[12px] font-bold">TRC-20</span>
                  <span className="text-[10px] font-normal opacity-80">Tron Network (USDT)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChain('BEP20')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                    selectedChain === 'BEP20'
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10'
                      : 'border-border/60 text-muted-foreground hover:text-foreground bg-background/50'
                  }`}
                >
                  <span className="font-mono text-[12px] font-bold">BEP-20</span>
                  <span className="text-[10px] font-normal opacity-80">BNB Smart Chain (USDT)</span>
                </button>
              </div>
            </div>

            {/* Wallet Address Box */}
            <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono text-[11px]">USDT Deposit Address ({selectedChain}):</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-6 text-[10px] text-cyan-400 border-cyan-500/30 gap-1 px-2 font-mono"
                >
                  {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  {copied ? 'Copied!' : 'Copy Address'}
                </Button>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/60 font-mono text-[11px] break-all border border-border/60 text-foreground font-semibold select-all">
                {activeWallet}
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase mb-1 block">
                  Your Registered Email *
                </label>
                <Input
                  type="email"
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-xs h-9 bg-background/50"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase mb-1 block flex items-center justify-between">
                  <span>{selectedChain} Transaction Hash / TxID *</span>
                  <span className="text-[10px] text-amber-400 font-normal">Required for verification</span>
                </label>
                <Input
                  placeholder={
                    selectedChain === 'TRC20'
                      ? 'Paste 64-character Tron TxID'
                      : '0x... (66-character BNB Smart Chain TxID)'
                  }
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  required
                  className="font-mono text-xs h-9 bg-background/50 border-border/80 focus:border-cyan-500"
                />
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                  Transfer exact <strong className="text-foreground font-mono">${amountToPay} USDT</strong> to the {selectedChain} address above, then paste your TxID here.
                </p>
              </div>

              {verifyStatus && (
                <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono flex items-center gap-2 animate-pulse">
                  <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
                  {verifyStatus}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 gap-2 mt-2 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="size-4" />
                {submitting ? 'Verifying on Blockchain...' : 'Verify & Unlock VIP Signals'}
              </Button>
            </form>
          </div>
        )}

        {step === 'CONFIRM' && (
          <div className="text-center py-6 space-y-4 font-mono">
            <div className="size-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20 animate-pulse">
              <CheckCircle2 className="size-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">VIP Access Activated!</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
                Your blockchain payment has been verified on-chain. You now have full institutional signal access unlocked.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-left space-y-2">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <Send className="size-4" /> Next Step: Join Private VIP Telegram
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Connect directly to our VIP Telegram bot channel to receive 0.1s instant push alerts for every trade setup, entry trigger, and take-profit hit on your mobile device.
              </p>
              <Button
                type="button"
                onClick={() =>
                  window.open(
                    settings?.telegram_config?.invite_link || 'https://t.me/pairlens_vip_alerts',
                    '_blank'
                  )
                }
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-9 text-xs gap-1.5 shadow-md shadow-sky-500/20 mt-1"
              >
                <Send className="size-3.5" /> Join VIP Telegram Channel Now
              </Button>
            </div>

            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full font-mono text-xs h-9"
            >
              Continue to Terminal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
