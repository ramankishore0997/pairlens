import { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { Button } from '@pairlens/ui/components/ui/button'
import { Input } from '@pairlens/ui/components/ui/input'
import { Badge } from '@pairlens/ui/components/ui/badge'
import { Dialog, DialogContent } from '@pairlens/ui/components/ui/dialog'
import { SupabaseDataService, DbTrade, DbUser } from '@/lib/services/supabase-service'
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

export function TradesHub() {
  const [currentUser, setCurrentUser] = useState<DbUser | null>(() =>
    SupabaseDataService.getCurrentUser()
  )
  const isAdmin = currentUser?.role === 'admin'

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

  // Listen to auth state
  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(SupabaseDataService.getCurrentUser())
    }
    window.addEventListener('stac:auth:changed', handleAuthChange)
    return () => window.removeEventListener('stac:auth:changed', handleAuthChange)
  }, [])

  // Fetch from Supabase PostgreSQL
  const loadFromSupabase = async () => {
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
          timeframe: '4H',
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
      }
    } catch {}
  }

  useEffect(() => {
    loadFromSupabase()
    const handleDbSync = () => loadFromSupabase()
    window.addEventListener('stac:db:trades:updated', handleDbSync)
    window.addEventListener('stac:trades:updated', handleDbSync)
    return () => {
      window.removeEventListener('stac:db:trades:updated', handleDbSync)
      window.removeEventListener('stac:trades:updated', handleDbSync)
    }
  }, [])

  // Computed metrics
  const activeTrades = useMemo(() => trades.filter((t) => t.status === 'ACTIVE'), [trades])
  const pastTrades = useMemo(() => trades.filter((t) => t.status === 'CLOSED'), [trades])

  const winCount = useMemo(
    () => pastTrades.filter((t) => (t.pnlPercent ?? 0) > 0).length,
    [pastTrades]
  )
  const winRate = pastTrades.length > 0 ? Math.round((winCount / pastTrades.length) * 100) : 100
  const totalReturn = useMemo(
    () => pastTrades.reduce((acc, t) => acc + (t.pnlPercent ?? 0), 0),
    [pastTrades]
  )

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
    <div className="flex flex-col flex-1 h-full min-h-0 bg-background overflow-y-auto px-6 py-4">
      {/* Top Header & Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Active Signals
            </span>
            <Activity className="size-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {activeTrades.length} <span className="text-xs font-normal text-muted-foreground">live</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Completed Trades
            </span>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {pastTrades.length} <span className="text-xs font-normal text-muted-foreground">signals</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Signal Win Rate
            </span>
            <Target className="size-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-400">
            {winRate}%
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Total Cumulative ROI
            </span>
            <DollarSign className="size-4 text-emerald-400" />
          </div>
          <div
            className={`mt-2 text-2xl font-bold tracking-tight ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {totalReturn >= 0 ? `+${totalReturn.toFixed(2)}%` : `${totalReturn.toFixed(2)}%`}
          </div>
        </div>
      </div>

      {/* Action Bar & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        {/* Tabs: Active vs Past */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/40">
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'ACTIVE'
                ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Signals ({activeTrades.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAST')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'PAST'
                ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Past Results ({pastTrades.length})
          </button>
        </div>

        {/* Filters & VIP */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs w-[150px] bg-card/60"
            />
          </div>

          <div className="flex items-center gap-1">
            {['ALL', 'Forex', 'Commodity', 'Crypto'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-accent text-accent-foreground border border-border font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setCheckoutModalOpen(true)}
            className="h-8 gap-1.5 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold shadow-sm shadow-amber-500/10"
          >
            <Sparkles className="size-3.5 text-amber-400" />
            VIP Plans
          </Button>

          {/* Admin Portal Gateway - Only Visible to Authenticated Admin */}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdminModalOpen(true)}
              className="h-8 gap-1.5 text-xs border-cyan-500/60 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 font-bold"
            >
              <ShieldAlert className="size-3.5 text-cyan-400" />
              Admin Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Trades Grid View */}
      <div className="mt-6 flex-1">
        {displayedTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/60 rounded-2xl bg-card/20">
            <Target className="size-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-semibold text-foreground">
              {activeTab === 'ACTIVE' ? 'No Active Signals Right Now' : 'No Past Signals Record'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-2">
              {activeTab === 'ACTIVE'
                ? 'Institutional trade signals with Entry, Stop Loss, and 3 Target Levels will be published here in real-time by the Lead Analyst.'
                : 'Closed trade results with final ROI and PnL percentage will appear here once active trades reach their targets.'}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono mt-2">
              <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
              Live Scanner Active
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTrades.map((trade) => {
              const isBuy = trade.type === 'BUY'
              const rr = (
                Math.abs(trade.target1 - trade.entryPrice) /
                Math.max(0.0001, Math.abs(trade.entryPrice - trade.stopLoss))
              ).toFixed(2)

              return (
                <div
                  key={trade.id}
                  className="flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-4.5 hover:border-primary/40 transition-all shadow-sm"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                            isBuy
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isBuy ? (
                            <TrendingUp className="size-3" />
                          ) : (
                            <TrendingDown className="size-3" />
                          )}
                          {trade.type}
                        </span>
                        <span className="font-bold text-base tracking-tight text-foreground font-mono">
                          {trade.symbol}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {trade.category}
                        </Badge>
                        {trade.leverage && (
                          <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">
                            {trade.leverage}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Trade Parameters */}
                    <div className="grid grid-cols-3 gap-2 my-3.5 p-2.5 rounded-lg bg-background/50 border border-border/40 text-xs font-mono text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">
                          Entry Price
                        </span>
                        <span className="font-bold text-foreground">{trade.entryPrice}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-rose-400 uppercase block mb-0.5">
                          Stop Loss
                        </span>
                        <span className="font-semibold text-rose-400">{trade.stopLoss}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">
                          Risk : Reward
                        </span>
                        <span className="font-semibold text-cyan-400">1 : {rr}</span>
                      </div>
                    </div>

                    {/* Take Profit Targets */}
                    <div className="space-y-1.5 my-3 text-xs font-mono">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-emerald-400 font-medium text-[11px]">Target 1 (TP1)</span>
                        <span className="font-bold text-emerald-400">{trade.target1}</span>
                      </div>
                      {trade.target2 && (
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-emerald-500/5 border border-emerald-500/20">
                          <span className="text-emerald-400/90 font-medium text-[11px]">Target 2 (TP2)</span>
                          <span className="font-bold text-emerald-400/90">{trade.target2}</span>
                        </div>
                      )}
                      {trade.target3 && (
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-emerald-500/5 border border-emerald-500/20">
                          <span className="text-emerald-400/80 font-medium text-[11px]">Target 3 (TP3)</span>
                          <span className="font-bold text-emerald-400/80">{trade.target3}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {trade.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-md italic line-clamp-2 mt-2">
                        "{trade.notes}"
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="size-3" />
                      {new Date(trade.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {trade.status === 'ACTIVE' ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-cyan-500/40 text-cyan-400 bg-cyan-500/10 flex items-center gap-1.5"
                      >
                        <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live Tracking
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs font-bold ${
                          (trade.pnlPercent ?? 0) >= 0
                            ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                            : 'text-rose-400 border-rose-500/40 bg-rose-500/10'
                        }`}
                      >
                        {trade.closeReason ?? 'CLOSED'} ·{' '}
                        {(trade.pnlPercent ?? 0) >= 0
                          ? `+${trade.pnlPercent}%`
                          : `${trade.pnlPercent}%`}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Crypto Checkout Modal */}
      <CryptoCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        initialPlan="monthly"
      />

      {/* Admin Panel Dialog (Accessible only if Admin) */}
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
