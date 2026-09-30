import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  Target,
  BarChart3,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  DollarSign,
  Activity,
  Globe,
  Layers,
  ChevronRight,
  Star,
  Users,
  Award,
} from 'lucide-react'
import { Button } from '@pairlens/ui/components/ui/button'
import { Badge } from '@pairlens/ui/components/ui/badge'
import { CryptoCheckoutModal, SubscriptionPlan } from '@/components/subscription/crypto-checkout-modal'
import { AdminPanel } from '@/components/admin/admin-panel'
import { AuthModal } from '@/components/auth/auth-modal'
import { Dialog, DialogContent } from '@pairlens/ui/components/ui/dialog'
import { SupabaseDataService, DbTrade, DbSettings, DbUser } from '@/lib/services/supabase-service'

export function LandingPage({
  onLaunchTerminal,
}: {
  onLaunchTerminal: () => void
}) {
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('monthly')
  const [adminOpen, setAdminOpen] = useState(false)
  const [trades, setTrades] = useState<Array<DbTrade>>([])
  const [settings, setSettings] = useState<DbSettings | null>(null)

  useEffect(() => {
    SupabaseDataService.getTrades().then((t) => setTrades(t.slice(0, 3)))
    SupabaseDataService.getSettings().then(setSettings)
    setCurrentUser(SupabaseDataService.getCurrentUser())

    const handleAuthChange = () => {
      setCurrentUser(SupabaseDataService.getCurrentUser())
    }
    window.addEventListener('stac:auth:changed', handleAuthChange)
    return () => window.removeEventListener('stac:auth:changed', handleAuthChange)
  }, [])

  const handleOpenCheckout = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setCheckoutOpen(true)
  }

  const prices = {
    monthly: settings?.pricing_plans?.pro_monthly ?? 29,
    yearly: settings?.pricing_plans?.pro_yearly ?? 199,
    lifetime: settings?.pricing_plans?.vip_lifetime ?? 499,
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-cyan-500/20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-cyan-500/20">
              P
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">
                Pairlens <span className="text-cyan-400 font-mono text-xs">PRO</span>
              </span>
              <span className="block text-[10px] text-muted-foreground -mt-0.5">
                Institutional Forex & Signals Suite
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#signals" className="hover:text-foreground transition-colors">
              Live Signals
            </a>
            <a href="#track-record" className="hover:text-foreground transition-colors">
              Track Record
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              VIP Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-card/60 border border-border/60 px-2.5 py-1 rounded-lg text-xs">
                <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/40 text-cyan-400 uppercase">
                  {currentUser.plan || 'Free'}
                </Badge>
                <span className="font-mono text-muted-foreground text-[11px] max-w-[120px] truncate">
                  {currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={() => SupabaseDataService.signOut()}
                  className="text-[10px] text-rose-400 hover:underline ml-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAuthOpen(true)}
                className="h-8 text-xs font-mono border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 gap-1.5"
              >
                <Users className="size-3" /> Sign In / Sign Up
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdminOpen(true)}
              className="h-8 text-xs font-mono border-border/60 gap-1.5"
            >
              <Lock className="size-3 text-cyan-400" /> Admin
            </Button>

            <Button
              size="sm"
              onClick={onLaunchTerminal}
              className="h-8 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5 shadow-lg shadow-cyan-500/20"
            >
              Launch Terminal <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Live Market Ticker */}
      <div className="bg-card/40 border-b border-border/40 py-2 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-8 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">EUR/USD:</span>
            <span className="text-emerald-400 font-bold">1.08520</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded">+0.42%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">XAU/USD (Gold):</span>
            <span className="text-emerald-400 font-bold">2,738.40</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded">+1.15%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">GBP/USD:</span>
            <span className="text-rose-400 font-bold">1.29410</span>
            <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1 rounded">-0.18%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">BTC/USDT:</span>
            <span className="text-emerald-400 font-bold">$94,520</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded">+2.84%</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <Badge
            variant="outline"
            className="mb-4 py-1 px-3 border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-mono text-xs gap-1.5"
          >
            <Sparkles className="size-3.5" /> High-Accuracy Forex & Crypto Signals Suite
          </Badge>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Trade Smarter with{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Institutional Grade Signals
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Get instant Forex, Gold, and Crypto trade setups directly from expert analysts with entry price, exact stop loss, and 3 high-profit take-profit targets.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button
              size="lg"
              onClick={() => handleOpenCheckout('monthly')}
              className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-12 px-8 text-sm gap-2 shadow-xl shadow-cyan-500/20"
            >
              Get VIP Access (${prices.monthly}/mo) <ArrowRight className="size-4" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={onLaunchTerminal}
              className="w-full sm:w-auto h-12 px-8 text-sm font-semibold border-border/80"
            >
              Explore Live Terminal
            </Button>
          </div>

          {/* Social Proof */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span><strong>87.4%</strong> Win Rate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span><strong>+3,450</strong> Monthly Pips</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span><strong>Instant</strong> Crypto Checkout (USDT/SOL)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Signals Preview Cards */}
      <section id="signals" className="py-12 px-6 border-y border-border/40 bg-card/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                Real-Time Feeds
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                Latest Live Signals from Supabase DB
              </h2>
            </div>
            <Button
              size="sm"
              onClick={onLaunchTerminal}
              variant="outline"
              className="text-xs gap-1.5"
            >
              View Full Terminal <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {trades.map((trade) => {
              const isBuy = trade.type === 'BUY'
              return (
                <div
                  key={trade.id}
                  className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isBuy
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {trade.type}
                        </span>
                        <span className="font-mono text-base font-bold text-foreground">
                          {trade.symbol}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {trade.asset_class ?? 'Forex'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-lg bg-background/80 font-mono text-xs">
                      <div>
                        <span className="text-[9px] text-muted-foreground block">ENTRY</span>
                        <span className="font-bold text-foreground">{trade.entry_price}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-rose-400 block">STOP LOSS</span>
                        <span className="font-bold text-rose-400">{trade.sl_price}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-400 block">TARGET 1</span>
                        <span className="font-bold text-emerald-400">{trade.tp1_price}</span>
                      </div>
                    </div>

                    {trade.notes && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/20 p-2 rounded">
                        "{trade.notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Status: <strong className="text-emerald-400">ACTIVE</strong>
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenCheckout('monthly')}
                      className="h-7 text-[11px] bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600 hover:text-white font-bold"
                    >
                      Get VIP Alerts
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge
              variant="outline"
              className="mb-3 py-1 px-3 border-cyan-500/30 text-cyan-400 font-mono text-xs"
            >
              CRYPTO PRICING PLANS
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Select Your VIP Subscription
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Pay securely in USDT (TRC-20 / ERC-20) or Solana. Instant account activation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Monthly */}
            <div className="rounded-2xl border border-border/80 bg-card/60 p-7 flex flex-col justify-between hover:border-border transition-all">
              <div>
                <h3 className="text-lg font-bold text-foreground">Pro Monthly</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Ideal for active traders seeking daily high-probability setups.
                </p>

                <div className="mt-6 mb-6">
                  <span className="font-mono text-4xl font-black text-foreground">${prices.monthly}</span>
                  <span className="text-xs text-muted-foreground font-mono"> / USDT monthly</span>
                </div>

                <ul className="space-y-3 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-400" /> All Daily Forex & Gold Signals
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-400" /> Entry, SL & 3 Target Levels
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-400" /> Full Pro Charting Suite
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-400" /> Instant In-App Notifications
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => handleOpenCheckout('monthly')}
                className="w-full mt-8 bg-card border border-border/80 hover:bg-accent text-foreground font-bold h-11 text-xs"
              >
                Pay ${prices.monthly} USDT
              </Button>
            </div>

            {/* Yearly - Highlighted */}
            <div className="rounded-2xl border-2 border-cyan-500 bg-card/80 p-7 flex flex-col justify-between relative shadow-xl shadow-cyan-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 font-black text-[10px] tracking-wider uppercase px-3.5 py-1 rounded-full">
                Most Popular · Save 45%
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">Pro Yearly</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Full 12-month uninterrupted access with VIP priority alerts.
                </p>

                <div className="mt-6 mb-6">
                  <span className="font-mono text-4xl font-black text-cyan-400">${prices.yearly}</span>
                  <span className="text-xs text-muted-foreground font-mono"> / USDT yearly</span>
                </div>

                <ul className="space-y-3 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-4 text-cyan-400" /> Everything in Monthly Plan
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400" /> VIP Private Telegram Group Access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400" /> Weekly Market Analysis & Forecasts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400" /> 24/7 Priority Support
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => handleOpenCheckout('yearly')}
                className="w-full mt-8 bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-11 text-xs shadow-lg shadow-cyan-500/20"
              >
                Pay ${prices.yearly} USDT with Crypto
              </Button>
            </div>

            {/* Lifetime */}
            <div className="rounded-2xl border border-border/80 bg-card/60 p-7 flex flex-col justify-between hover:border-border transition-all">
              <div>
                <h3 className="text-lg font-bold text-foreground">VIP Lifetime</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  One-time payment. Never pay monthly fees again.
                </p>

                <div className="mt-6 mb-6">
                  <span className="font-mono text-4xl font-black text-amber-400">${prices.lifetime}</span>
                  <span className="text-xs text-muted-foreground font-mono"> / USDT One-Time</span>
                </div>

                <ul className="space-y-3 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-4 text-amber-400" /> Lifetime Full Signals Access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-amber-400" /> Direct Access to Senior Analysts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-amber-400" /> Custom Indicator Scripts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-amber-400" /> VIP Elite Discord Channel
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => handleOpenCheckout('lifetime')}
                className="w-full mt-8 bg-card border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold h-11 text-xs"
              >
                Pay ${prices.lifetime} USDT One-Time
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/40 py-8 px-6 bg-card/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Pairlens Pro</span> © 2026. All rights reserved.
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <Lock className="size-3" /> Admin Gateway
            </button>
            <button type="button" onClick={onLaunchTerminal} className="hover:text-foreground">
              Trading Terminal
            </button>
          </div>
        </div>
      </footer>

      {/* Crypto Checkout Modal */}
      <CryptoCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        initialPlan={selectedPlan}
        onSuccess={onLaunchTerminal}
      />

      {/* User Auth Modal */}
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          setAuthOpen(false)
        }}
      />

      {/* Admin Panel Dialog */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-background">
          <AdminPanel onClose={() => setAdminOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
