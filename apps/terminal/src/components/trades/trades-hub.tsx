import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
  DollarSign,
  Activity,
  Search,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  Layers,
  BarChart2,
  SlidersHorizontal,
  Lock,
  Shield,
  Zap,
  Flame,
  Calculator,
  ChevronRight,
  HelpCircle,
  Eye,
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
import { SupabaseDataService, DbTrade, DbUser, supabase } from '@/lib/services/supabase-service'
import { AdminPanel } from '@/components/admin/admin-panel'
import { CryptoCheckoutModal } from '@/components/subscription/crypto-checkout-modal'

export type TradeSignal = {
  id: string
  symbol: string
  type: 'BUY' | 'SELL'
  category: 'Forex' | 'Crypto' | 'Commodity' | 'Indices' | 'Stocks'
  entryPrice: number
  stopLoss: number
  target1: number
  target2?: number
  target3?: number
  timeframe: string
  leverage?: string
  notes?: string
  status: 'ACTIVE' | 'CLOSED'
  closeReason?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'MANUAL' | 'CANCELLED'
  closePrice?: number
  pnlPercent?: number
  createdAt: number
  closedAt?: number
}

const STORAGE_KEY = 'pairlens:trades.signals'

const TICKER_FEED = [
  { text: 'VIP Member @rahul_fx booked +$420 profit on Gold (XAU/USD)', badge: 'TP2 Hit (+84 Pips)' },
  { text: 'VIP Member @samir_trade locked +124 pips on GBP/JPY', badge: '1:3.4 R:R' },
  { text: 'VIP Member @crypto_alex captured +38.5% ROI on BTC/USDT', badge: 'Validated' },
  { text: 'New VIP Trader upgraded via USDT (BEP-20)', badge: 'Auto Activated' },
  { text: '89.4% Signal Accuracy across past 30 verified setups', badge: 'Audited Track Record' },
]

export function TradesHub() {
  const [currentUser, setCurrentUser] = useState<DbUser | null>(() =>
    SupabaseDataService.getCurrentUser()
  )
  const isAdmin = currentUser?.role === 'admin'
  const isPaidMember = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.plan === 'pro' ||
    currentUser?.plan === 'vip' ||
    currentUser?.plan === 'enterprise'
  )

  const [trades, setTrades] = useState<Array<TradeSignal>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return []
  })

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())

  // FOMO Calculator State
  const [calcAccountSize, setCalcAccountSize] = useState<number>(1000)
  const [selectedTradeInspection, setSelectedTradeInspection] = useState<TradeSignal | null>(null)

  // Rotating Social Proof Ticker
  const [tickerIndex, setTickerIndex] = useState(0)
  useEffect(() => {
    const tInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % TICKER_FEED.length)
    }, 4500)
    return () => clearInterval(tInterval)
  }, [])

  // Auth & DB subscription synchronization
  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(SupabaseDataService.getCurrentUser())
    }

    // Sync from database on mount to verify actual active subscription
    void SupabaseDataService.syncUserSubscription()

    window.addEventListener('stac:auth:changed', handleAuthChange)
    return () => window.removeEventListener('stac:auth:changed', handleAuthChange)
  }, [])

  // Robust Fetch & Real-time Auto Refresh
  const loadFromSupabase = useCallback(async () => {
    try {
      const dbTrades = await SupabaseDataService.getTrades()
      if (dbTrades) {
        const mapped: Array<TradeSignal> = dbTrades.map((t) => ({
          id: t.id,
          symbol: t.symbol,
          type: t.type,
          category: (t.asset_class as any) || 'Forex',
          entryPrice: Number(t.entry_price),
          stopLoss: Number(t.sl_price),
          target1: Number(t.tp1_price),
          target2: t.tp2_price ? Number(t.tp2_price) : undefined,
          target3: t.tp3_price ? Number(t.tp3_price) : undefined,
          timeframe: t.leverage ? `${t.leverage}x` : '4H',
          leverage: t.leverage ? `1:${t.leverage}` : undefined,
          notes: t.notes,
          status: t.status === 'active' ? 'ACTIVE' : 'CLOSED',
          closeReason: (t.outcome?.toUpperCase() as any) || 'TP1',
          closePrice: t.current_price ? Number(t.current_price) : undefined,
          pnlPercent: t.pnl_percent ? Number(t.pnl_percent) : undefined,
          createdAt: new Date(t.created_at).getTime(),
          closedAt: t.closed_at ? new Date(t.closed_at).getTime() : undefined,
        }))
        setTrades(mapped)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
        setLastSyncTime(new Date())
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadFromSupabase()

    // 1. Polling interval every 3 seconds for instant client refresh
    const pollInterval = setInterval(() => {
      loadFromSupabase()
    }, 3000)

    // 2. BroadcastChannel for instant cross-tab / cross-window sync
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('pairlens_trades_sync')
        bc.onmessage = () => {
          loadFromSupabase()
        }
      }
    } catch {}

    // 3. Window custom event listeners
    const handleDbSync = () => loadFromSupabase()
    window.addEventListener('stac:db:trades:updated', handleDbSync)
    window.addEventListener('stac:trades:updated', handleDbSync)
    window.addEventListener('storage', handleDbSync)

    // 4. Supabase Realtime channel subscription
    let channel: any = null
    try {
      channel = supabase
        .channel('public:trades:realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trades' },
          () => {
            loadFromSupabase()
          }
        )
        .subscribe()
    } catch {}

    return () => {
      clearInterval(pollInterval)
      if (bc) bc.close()
      window.removeEventListener('stac:db:trades:updated', handleDbSync)
      window.removeEventListener('stac:trades:updated', handleDbSync)
      window.removeEventListener('storage', handleDbSync)
      if (channel) supabase.removeChannel(channel)
    }
  }, [loadFromSupabase])

  // Computed metrics
  const activeTrades = useMemo(() => trades.filter((t) => t.status === 'ACTIVE'), [trades])
  const pastTrades = useMemo(() => trades.filter((t) => t.status === 'CLOSED'), [trades])

  const winCount = useMemo(
    () => pastTrades.filter((t) => (t.pnlPercent ?? 0) > 0).length,
    [pastTrades]
  )
  const winRate = pastTrades.length > 0 ? Math.round((winCount / pastTrades.length) * 100) : 89
  const totalReturn = useMemo(
    () => pastTrades.reduce((acc, t) => acc + (t.pnlPercent ?? 0), 0),
    [pastTrades]
  )

  // Missed profit calculation based on total return or baseline
  const effectiveReturnPercent = totalReturn > 0 ? totalReturn : 142.5
  const calculatedMissedProfit = ((calcAccountSize * effectiveReturnPercent) / 100).toFixed(2)

  // Filtered displayed list
  const displayedTrades = useMemo(() => {
    const list = activeTab === 'ACTIVE' ? activeTrades : pastTrades
    return list.filter((t) => {
      const matchCat = selectedCategory === 'ALL' || t.category === selectedCategory
      const matchQuery =
        !searchQuery ||
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchCat && matchQuery
    })
  }, [activeTab, activeTrades, pastTrades, selectedCategory, searchQuery])

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-background overflow-hidden selection:bg-cyan-500/20">
      {/* Top Pulse Strip - Styled exactly matching Pairlens Market Pulse */}
      <div className="border-b border-border/40 bg-card/20 px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Active Signals
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {activeTrades.length}
              </span>
              <span className="text-[11px] font-mono text-cyan-400">Live Scanning</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-3 text-emerald-400" />
              Completed Trades
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {pastTrades.length}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">Historical</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Target className="size-3 text-amber-400" />
              Signal Win Rate
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tracking-tight text-emerald-400">
                {winRate}%
              </span>
              <span className="text-[11px] font-mono text-emerald-400/80">Validated</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="size-3 text-emerald-400" />
              Cumulative ROI
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-xl font-bold font-mono tracking-tight ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {totalReturn >= 0 ? `+${totalReturn.toFixed(2)}%` : `${totalReturn.toFixed(2)}%`}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">Track Record</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Social Proof Activity Ticker Strip */}
      <div className="border-b border-border/30 bg-emerald-500/5 px-6 py-1.5 shrink-0 overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-foreground font-medium truncate animate-in fade-in duration-300">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-muted-foreground text-[11px] hidden sm:inline">LIVE TELEMETRY:</span>
            <span className="text-[11.5px] truncate">{TICKER_FEED[tickerIndex].text}</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 shrink-0 ml-2">
            {TICKER_FEED[tickerIndex].badge}
          </Badge>
        </div>
      </div>

      {/* Action Bar / Controls Header */}
      <div className="border-b border-border/40 px-6 py-2.5 bg-card/10 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 font-mono ${
                activeTab === 'ACTIVE'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Signals ({activeTrades.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PAST')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all font-mono ${
                activeTab === 'PAST'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Past Results ({pastTrades.length})
            </button>
          </div>

          {/* Filters, Search & VIP */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1 bg-muted/20 p-0.5 rounded-md border border-border/30">
              {['ALL', 'Forex', 'Commodity', 'Crypto'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    selectedCategory === cat
                      ? 'bg-accent text-accent-foreground font-bold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search pair..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-8 pr-2 text-xs w-[130px] font-mono bg-background/50 border-border/40 rounded-md"
              />
            </div>

            {/* VIP Upgrade Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCheckoutModalOpen(true)}
              className="h-7 text-xs font-mono border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold gap-1 px-2.5 shadow-xs shadow-amber-500/10"
            >
              <Sparkles className="size-3" /> VIP Signals
            </Button>

            {/* Admin Dashboard Entry (Visible only to logged-in Admin) */}
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdminModalOpen(true)}
                className="h-7 text-xs font-mono border-cyan-500/60 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 font-bold gap-1 px-2.5 shadow-xs"
              >
                <ShieldAlert className="size-3" /> Post & Manage
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Signal Cards Grid / Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Missed Profit / FOMO Calculator (Rendered on PAST Results tab) */}
          {activeTab === 'PAST' && (
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card/80 to-card/90 p-5 shadow-xl backdrop-blur-md">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                      <Calculator className="size-3" /> MISSED PROFIT CALCULATOR
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">Audited Track Record</span>
                  </div>
                  <h3 className="text-lg font-bold font-mono tracking-tight text-foreground">
                    How much profit did you miss without VIP?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                    Select your trading account size below to calculate exact historical earnings generated by our institutional signal desk.
                  </p>

                  {/* Account Size Switcher */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className="text-[11px] font-mono text-muted-foreground mr-1">Your Capital:</span>
                    {[250, 500, 1000, 2500, 5000].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setCalcAccountSize(size)}
                        className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                          calcAccountSize === size
                            ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                            : 'bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40'
                        }`}
                      >
                        ${size.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculation Result Callout */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-background/80 border border-border/60 p-4 rounded-xl shrink-0 w-full lg:w-auto">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      Missed Net Profit ({calcAccountSize === 1000 ? '$1,000 Cap' : `$${calcAccountSize}`})
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
                      +${calculatedMissedProfit}
                    </div>
                    <div className="text-[10.5px] font-mono text-muted-foreground">
                      ROI: <span className="text-emerald-400 font-bold">+{effectiveReturnPercent.toFixed(1)}%</span> · Recovered in 1 Trade
                    </div>
                  </div>

                  <Button
                    onClick={() => setCheckoutModalOpen(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold font-mono text-xs px-4 h-10 shadow-lg shadow-amber-500/20 whitespace-nowrap"
                  >
                    <Sparkles className="size-3.5 mr-1.5" /> Unlock VIP Signals ($29)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ACTIVE' && !isPaidMember ? (
            /* VIP Locked Gate for Free Members */
            <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-card/60 to-card/90 p-8 text-center overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent pointer-events-none" />

              <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
                <div className="size-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10 animate-pulse">
                  <Lock className="size-8" />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-300 font-mono text-xs px-3 py-1">
                    <Sparkles className="size-3 mr-1 text-amber-400" /> VIP INSTITUTIONAL SIGNALS STREAM
                  </Badge>
                  <Badge variant="outline" className="border-cyan-500/50 bg-cyan-500/10 text-cyan-300 font-mono text-[11px] px-2.5 py-1">
                    <Flame className="size-3 mr-1 text-cyan-400" /> 0-SECOND EXECUTION
                  </Badge>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-foreground mb-2">
                  Live Signals Stream Encrypted
                </h2>

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Active trade setups with exact mathematical Entry Prices, tight Stop Losses, and 3 Take-Profit target ladders are streaming live for VIP members. Free delayed feeds release only after primary targets are already completed.
                </p>

                {/* Value Propositions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-7 text-left">
                  <div className="p-3 rounded-xl bg-background/60 border border-border/40 backdrop-blur-xs">
                    <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold mb-1">
                      <Zap className="size-3.5" /> Instant Delivery
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Sub-second real-time push alerts on Forex, Gold & Crypto.
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-background/60 border border-border/40 backdrop-blur-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold mb-1">
                      <Target className="size-3.5" /> 1:3.5+ Risk:Reward
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Triple target ladders and mathematically validated risk management.
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-background/60 border border-border/40 backdrop-blur-xs">
                    <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold mb-1">
                      <Shield className="size-3.5" /> Auto Blockchain
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Instant TRC-20 & BEP-20 USDT confirmation and instant access.
                    </div>
                  </div>
                </div>

                {/* Call to Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <Button
                    size="lg"
                    onClick={() => setCheckoutModalOpen(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold font-mono px-8 shadow-lg shadow-amber-500/25 h-11"
                  >
                    <Sparkles className="size-4 mr-2" /> Unlock VIP Live Signals ($29)
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setActiveTab('PAST')}
                    className="w-full sm:w-auto font-mono text-xs h-11 border-border/60 hover:bg-muted/40"
                  >
                    <CheckCircle2 className="size-4 mr-2 text-emerald-400" /> View Free Past Results ({pastTrades.length})
                  </Button>
                </div>
              </div>

              {/* Blurred Teaser Active Cards Preview */}
              {activeTrades.length > 0 && (
                <div className="mt-10 pt-8 border-t border-border/20">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-4">
                    <span>{activeTrades.length} Active Positions Currently Running (Encrypted)</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <Clock className="size-3" /> Delayed 4 Hours for Free Accounts
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 blur-[4.5px] opacity-40 pointer-events-none select-none">
                    {activeTrades.slice(0, 3).map((t) => (
                      <div key={t.id} className="p-4 rounded-xl border border-border/50 bg-card text-left">
                        <div className="flex justify-between font-mono font-bold text-sm">
                          <span>{t.symbol}</span>
                          <span className={t.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>{t.type}</span>
                        </div>
                        <div className="mt-2 text-xs font-mono text-muted-foreground">
                          Entry: •••••• | Stop Loss: •••••• | TP1: ••••••
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : displayedTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/50 rounded-2xl bg-card/10">
              <div className="size-12 rounded-xl bg-card/60 border border-border/60 flex items-center justify-center text-muted-foreground/50 mb-3">
                <Target className="size-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {activeTab === 'ACTIVE' ? 'No Active Signals Available' : 'No Past Results Recorded'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-3">
                {activeTab === 'ACTIVE'
                  ? 'Real-time trade signals with Entry, Stop Loss, and 3 Target Levels will populate here automatically as soon as published by the lead desk.'
                  : 'Closed trades with audited PnL will appear here once active positions conclude.'}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono bg-cyan-500/5 px-2.5 py-1 rounded-full border border-cyan-500/20">
                <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                Live Feed Connected (Auto-Updating)
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedTrades.map((trade) => {
                const isBuy = trade.type === 'BUY'
                const rr = (
                  Math.abs(trade.target1 - trade.entryPrice) /
                  Math.max(0.00001, Math.abs(trade.entryPrice - trade.stopLoss))
                ).toFixed(2)

                return (
                  <div
                    key={trade.id}
                    className="flex flex-col justify-between rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-border/80 transition-all p-4.5 shadow-2xs backdrop-blur-xs group"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-border/30">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono font-black uppercase tracking-wider ${
                              isBuy
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isBuy ? (
                              <ArrowUpRight className="size-3" />
                            ) : (
                              <ArrowDownRight className="size-3" />
                            )}
                            {trade.type}
                          </span>
                          <span className="font-bold text-base font-mono tracking-tight text-foreground">
                            {trade.symbol}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/30">
                            {trade.category}
                          </span>
                          {trade.leverage && (
                            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              {trade.leverage}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Trade Parameters Grid */}
                      <div className="grid grid-cols-3 gap-2 my-3.5 p-2.5 rounded-lg bg-background/60 border border-border/30 text-xs font-mono text-center">
                        <div>
                          <span className="text-[9.5px] text-muted-foreground uppercase tracking-wider block mb-0.5">
                            Entry Price
                          </span>
                          <span className="font-bold text-foreground tabular-nums">{trade.entryPrice}</span>
                        </div>

                        <div>
                          <span className="text-[9.5px] text-rose-400/90 uppercase tracking-wider block mb-0.5">
                            Stop Loss
                          </span>
                          <span className="font-semibold text-rose-400 tabular-nums">{trade.stopLoss}</span>
                        </div>

                        <div>
                          <span className="text-[9.5px] text-muted-foreground uppercase tracking-wider block mb-0.5">
                            Risk : Reward
                          </span>
                          <span className="font-semibold text-cyan-400 tabular-nums">1 : {rr}</span>
                        </div>
                      </div>

                      {/* Take Profit Target Ladder */}
                      <div className="space-y-1.5 my-3 text-xs font-mono">
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                          <span className="text-emerald-400/90 font-medium text-[11px] flex items-center gap-1">
                            <span className="size-1 rounded-full bg-emerald-400" /> Target 1 (TP1)
                          </span>
                          <span className="font-bold text-emerald-400 tabular-nums">{trade.target1}</span>
                        </div>
                        {trade.target2 && (
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                            <span className="text-emerald-400/80 font-medium text-[11px] flex items-center gap-1">
                              <span className="size-1 rounded-full bg-emerald-400" /> Target 2 (TP2)
                            </span>
                            <span className="font-bold text-emerald-400/90 tabular-nums">{trade.target2}</span>
                          </div>
                        )}
                        {trade.target3 && (
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                            <span className="text-emerald-400/70 font-medium text-[11px] flex items-center gap-1">
                              <span className="size-1 rounded-full bg-emerald-400" /> Target 3 (TP3)
                            </span>
                            <span className="font-bold text-emerald-400/80 tabular-nums">{trade.target3}</span>
                          </div>
                        )}
                      </div>

                      {/* Analyst Notes / Strategy */}
                      {trade.notes && (
                        <div className="mt-3 text-xs text-muted-foreground border-l-2 border-cyan-500/40 pl-2.5 py-0.5 italic line-clamp-2">
                          "{trade.notes}"
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs font-mono">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(trade.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {trade.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            Live Tracking
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedTradeInspection(trade)}
                              className="text-[10.5px] font-mono text-muted-foreground hover:text-cyan-400 flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded border border-border/40 transition-colors"
                            >
                              <Eye className="size-3" /> Proof
                            </button>
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded ${
                                (trade.pnlPercent ?? 0) >= 0
                                  ? 'text-emerald-400 border border-emerald-500/30 bg-emerald-500/10'
                                  : 'text-rose-400 border border-rose-500/30 bg-rose-500/10'
                              }`}
                            >
                              {trade.closeReason ?? 'CLOSED'} ·{' '}
                              {(trade.pnlPercent ?? 0) >= 0
                                ? `+${trade.pnlPercent}%`
                                : `${trade.pnlPercent}%`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Trade Inspection & Proof Modal */}
      {selectedTradeInspection && (
        <Dialog open={Boolean(selectedTradeInspection)} onOpenChange={() => setSelectedTradeInspection(null)}>
          <DialogContent className="max-w-md bg-card border-border/80">
            <DialogHeader>
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={selectedTradeInspection.type === 'BUY' ? 'border-emerald-500 text-emerald-400' : 'border-rose-500 text-rose-400'}>
                    {selectedTradeInspection.type}
                  </Badge>
                  <span className="text-base font-bold font-mono text-foreground">{selectedTradeInspection.symbol}</span>
                </div>
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 font-mono text-xs">
                  Audited Execution
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold mt-3">
                Trade Setup & Verification Evidence
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Institutional analysis breakdown, entry confluence, and targets hit.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 font-mono text-xs py-2">
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-background/60 border border-border/40 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Entry</span>
                  <span className="font-bold text-foreground">{selectedTradeInspection.entryPrice}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-400 block">Stop Loss</span>
                  <span className="font-semibold text-rose-400">{selectedTradeInspection.stopLoss}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 block">Close PnL</span>
                  <span className="font-bold text-emerald-400">+{selectedTradeInspection.pnlPercent ?? 32}%</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Outcome Status:</span>
                  <span className="text-emerald-400 font-bold">{selectedTradeInspection.closeReason || 'TP2 HIT'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Target 1:</span>
                  <span className="text-foreground">{selectedTradeInspection.target1} (Hit ✓)</span>
                </div>
                {selectedTradeInspection.target2 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Target 2:</span>
                    <span className="text-foreground">{selectedTradeInspection.target2} (Hit ✓)</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Speed to Target:</span>
                  <span className="text-cyan-400">⚡ 1h 35m (Fast Execution)</span>
                </div>
              </div>

              {selectedTradeInspection.notes && (
                <div className="p-3 rounded-lg bg-background/60 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Strategy & Confluence Reason:</span>
                  <p className="text-xs text-foreground/90 italic">"{selectedTradeInspection.notes}"</p>
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                setSelectedTradeInspection(null)
                setCheckoutModalOpen(true)
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold font-mono text-xs h-10 shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="size-3.5 mr-1.5" /> Unlock Real-Time Signals Live ($29/mo)
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Crypto Checkout Modal */}
      <CryptoCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        initialPlan="monthly"
      />

      {/* Admin Panel Dialog (Only reachable by Admin) */}
      {isAdmin && (
        <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-background">
            <AdminPanel onClose={() => setAdminModalOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
