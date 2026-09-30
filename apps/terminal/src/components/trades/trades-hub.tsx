import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  ShieldAlert,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
  Code2,
  Trash2,
  Layers,
  Sparkles,
  DollarSign,
  Activity,
  ChevronRight,
  Check,
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
import { SupabaseDataService, DbTrade } from '@/lib/services/supabase-service'
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

const DEFAULT_TRADES: Array<TradeSignal> = [
  {
    id: 'tr-1',
    symbol: 'EUR/USD',
    type: 'BUY',
    category: 'Forex',
    entryPrice: 1.0845,
    stopLoss: 1.0815,
    target1: 1.089,
    target2: 1.0935,
    target3: 1.098,
    timeframe: '4H',
    leverage: '1:100',
    notes: 'Key 4H support bounce with bullish fair value gap fill and London liquidity sweep.',
    status: 'ACTIVE',
    createdAt: Date.now() - 3600000 * 4,
  },
  {
    id: 'tr-2',
    symbol: 'XAU/USD',
    type: 'BUY',
    category: 'Commodity',
    entryPrice: 2650.0,
    stopLoss: 2635.0,
    target1: 2675.0,
    target2: 2700.0,
    target3: 2725.0,
    timeframe: '1H',
    leverage: '1:50',
    notes: 'Gold breakout above resistance trendline with strong institutional volume.',
    status: 'ACTIVE',
    createdAt: Date.now() - 3600000 * 8,
  },
  {
    id: 'tr-3',
    symbol: 'GBP/JPY',
    type: 'SELL',
    category: 'Forex',
    entryPrice: 194.5,
    stopLoss: 195.2,
    target1: 193.6,
    target2: 192.8,
    target3: 191.9,
    timeframe: '1H',
    leverage: '1:100',
    notes: 'Double top rejection at psychological 195.00 resistance with bearish divergence.',
    status: 'ACTIVE',
    createdAt: Date.now() - 3600000 * 12,
  },
  {
    id: 'tr-4',
    symbol: 'BTC/USDT',
    type: 'BUY',
    category: 'Crypto',
    entryPrice: 62400.0,
    stopLoss: 61200.0,
    target1: 64500.0,
    target2: 66800.0,
    target3: 69000.0,
    timeframe: 'Daily',
    leverage: '10x',
    notes: 'Weekly bull flag breakout continuation.',
    status: 'CLOSED',
    closeReason: 'TP2',
    closePrice: 66800.0,
    pnlPercent: 7.05,
    createdAt: Date.now() - 86400000 * 3,
    closedAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'tr-5',
    symbol: 'USD/JPY',
    type: 'SELL',
    category: 'Forex',
    entryPrice: 153.2,
    stopLoss: 153.8,
    target1: 152.4,
    target2: 151.6,
    target3: 150.8,
    timeframe: '4H',
    leverage: '1:100',
    notes: 'BoJ policy shift expectations causing strong yen demand.',
    status: 'CLOSED',
    closeReason: 'TP3',
    closePrice: 150.8,
    pnlPercent: 1.57,
    createdAt: Date.now() - 86400000 * 5,
    closedAt: Date.now() - 86400000 * 2,
  },
]

export function TradesHub() {
  const [trades, setTrades] = useState<Array<TradeSignal>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return DEFAULT_TRADES
  })

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [apiModalOpen, setApiModalOpen] = useState(false)
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<TradeSignal | null>(null)

  // Fetch from Supabase PostgreSQL on mount
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        const dbTrades = await SupabaseDataService.getTrades()
        if (dbTrades && dbTrades.length > 0) {
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
    loadFromSupabase()
    const handleDbSync = () => loadFromSupabase()
    window.addEventListener('stac:db:trades:updated', handleDbSync)
    return () => window.removeEventListener('stac:db:trades:updated', handleDbSync)
  }, [])


  // Form states for creating a trade
  const [formData, setFormData] = useState({
    symbol: 'EUR/USD',
    type: 'BUY' as 'BUY' | 'SELL',
    category: 'Forex' as TradeSignal['category'],
    entryPrice: '',
    stopLoss: '',
    target1: '',
    target2: '',
    target3: '',
    timeframe: '1H',
    leverage: '1:100',
    notes: '',
  })

  // Form state for closing a trade
  const [closeReason, setCloseReason] = useState<'TP1' | 'TP2' | 'TP3' | 'SL' | 'MANUAL'>('TP1')
  const [customExitPrice, setCustomExitPrice] = useState('')

  // Persist trades to localStorage and trigger sync events
  const saveTrades = (updated: Array<TradeSignal>) => {
    setTrades(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('stac:trades:updated', { detail: updated }))
    } catch {}
  }

  // Window API hook for backend automation
  useEffect(() => {
    ;(window as any).stacTrades = {
      getTrades: () => trades,
      getActiveTrades: () => trades.filter((t) => t.status === 'ACTIVE'),
      getPastTrades: () => trades.filter((t) => t.status === 'CLOSED'),
      postTrade: (trade: Omit<TradeSignal, 'id' | 'createdAt' | 'status'>) => {
        const newTrade: TradeSignal = {
          ...trade,
          id: `tr-${Date.now()}`,
          createdAt: Date.now(),
          status: 'ACTIVE',
        }
        const updated = [newTrade, ...trades]
        saveTrades(updated)
        toast.success(`Trade posted: ${trade.symbol} (${trade.type})`)
        return newTrade
      },
      closeTrade: (
        tradeId: string,
        reason: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'MANUAL',
        exitPrice?: number
      ) => {
        const updated = trades.map((t) => {
          if (t.id !== tradeId) return t
          let price = exitPrice ?? t.target1
          if (reason === 'TP2' && t.target2) price = t.target2
          if (reason === 'TP3' && t.target3) price = t.target3
          if (reason === 'SL') price = t.stopLoss

          const isBuy = t.type === 'BUY'
          const diff = isBuy ? price - t.entryPrice : t.entryPrice - price
          const pnl = Number(((diff / t.entryPrice) * 100).toFixed(2))

          return {
            ...t,
            status: 'CLOSED' as const,
            closeReason: reason,
            closePrice: price,
            pnlPercent: pnl,
            closedAt: Date.now(),
          }
        })
        saveTrades(updated)
        toast.info(`Trade ${tradeId} marked as closed (${reason})`)
      },
      deleteTrade: (tradeId: string) => {
        const updated = trades.filter((t) => t.id !== tradeId)
        saveTrades(updated)
        toast.info(`Trade deleted`)
      },
      resetDefaults: () => {
        saveTrades(DEFAULT_TRADES)
        toast.success('Trades reset to default template')
      },
    }

    const handleSync = (e: any) => {
      if (e.detail) setTrades(e.detail)
    }
    window.addEventListener('stac:trades:updated', handleSync)
    return () => window.removeEventListener('stac:trades:updated', handleSync)
  }, [trades])

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

  // Handle trade submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.symbol || !formData.entryPrice || !formData.stopLoss || !formData.target1) {
      toast.error('Please fill symbol, entry price, stop loss, and target 1.')
      return
    }

    const newTrade: TradeSignal = {
      id: `tr-${Date.now()}`,
      symbol: formData.symbol.toUpperCase().trim(),
      type: formData.type,
      category: formData.category,
      entryPrice: parseFloat(formData.entryPrice),
      stopLoss: parseFloat(formData.stopLoss),
      target1: parseFloat(formData.target1),
      target2: formData.target2 ? parseFloat(formData.target2) : undefined,
      target3: formData.target3 ? parseFloat(formData.target3) : undefined,
      timeframe: formData.timeframe,
      leverage: formData.leverage,
      notes: formData.notes,
      status: 'ACTIVE',
      createdAt: Date.now(),
    }

    saveTrades([newTrade, ...trades])
    setCreateModalOpen(false)
    toast.success(`Trade posted successfully: ${newTrade.symbol}`)
    setFormData({
      symbol: 'EUR/USD',
      type: 'BUY',
      category: 'Forex',
      entryPrice: '',
      stopLoss: '',
      target1: '',
      target2: '',
      target3: '',
      timeframe: '1H',
      leverage: '1:100',
      notes: '',
    })
  }

  // Handle trade closing
  const handleCloseConfirm = () => {
    if (!selectedTrade) return

    let price = selectedTrade.target1
    if (closeReason === 'TP2' && selectedTrade.target2) price = selectedTrade.target2
    if (closeReason === 'TP3' && selectedTrade.target3) price = selectedTrade.target3
    if (closeReason === 'SL') price = selectedTrade.stopLoss
    if (closeReason === 'MANUAL' && customExitPrice) price = parseFloat(customExitPrice)

    const isBuy = selectedTrade.type === 'BUY'
    const diff = isBuy ? price - selectedTrade.entryPrice : selectedTrade.entryPrice - price
    const pnl = Number(((diff / selectedTrade.entryPrice) * 100).toFixed(2))

    const updated = trades.map((t) => {
      if (t.id !== selectedTrade.id) return t
      return {
        ...t,
        status: 'CLOSED' as const,
        closeReason,
        closePrice: price,
        pnlPercent: pnl,
        closedAt: Date.now(),
      }
    })

    saveTrades(updated)
    setCloseModalOpen(false)
    setSelectedTrade(null)
    toast.success(`Trade ${selectedTrade.symbol} marked as closed (${closeReason})`)
  }

  const handleDeleteTrade = (id: string) => {
    const updated = trades.filter((t) => t.id !== id)
    saveTrades(updated)
    toast.info('Trade deleted')
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-background overflow-y-auto px-6 py-4">
      {/* Top Header & Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
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

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
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

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
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

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
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
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Trades ({activeTrades.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAST')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'PAST'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="size-3.5" />
            Past Trades ({pastTrades.length})
          </button>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs w-[160px] bg-card/60"
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
                    ? 'bg-accent text-accent-foreground border border-border'
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
            className="h-8 gap-1.5 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold"
          >
            <Sparkles className="size-3.5 text-amber-400" />
            VIP Crypto Plans
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setAdminModalOpen(true)}
            className="h-8 gap-1.5 text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 font-bold"
          >
            <ShieldAlert className="size-3.5 text-cyan-400" />
            Admin Portal
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setApiModalOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Code2 className="size-3.5" />
            API
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-8 gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
          >
            <Plus className="size-3.5" />
            Post Trade
          </Button>
        </div>
      </div>

      {/* Trades Grid View */}
      <div className="mt-6 flex-1">
        {displayedTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/60 rounded-2xl">
            <Target className="size-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold text-foreground">
              {activeTab === 'ACTIVE' ? 'No Active Trades' : 'No Past Trades Found'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {activeTab === 'ACTIVE'
                ? 'You can post a new trade signal using the button above or send it via your backend script.'
                : 'Closed trades will appear here once you mark active signals as closed.'}
            </p>
            {activeTab === 'ACTIVE' && (
              <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-2">
                <Plus className="size-3.5" /> Post First Trade
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTrades.map((trade) => {
              const isBuy = trade.type === 'BUY'
              const rr = (
                Math.abs(trade.target1 - trade.entryPrice) /
                Math.abs(trade.entryPrice - trade.stopLoss)
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
                        <span className="font-mono text-base font-bold text-foreground">
                          {trade.symbol}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {trade.timeframe}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono opacity-80">
                          {trade.category}
                        </Badge>
                      </div>
                    </div>

                    {/* Price Targets & SL Grid */}
                    <div className="grid grid-cols-3 gap-2 my-3.5 p-2.5 rounded-lg bg-background/60 border border-border/40 font-mono text-xs">
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
                      <div className="flex items-center justify-between px-2.5 py-1 rounded bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-emerald-400 font-medium">Target 1 (TP1)</span>
                        <span className="font-bold text-emerald-400">{trade.target1}</span>
                      </div>
                      {trade.target2 && (
                        <div className="flex items-center justify-between px-2.5 py-1 rounded bg-emerald-500/5 border border-emerald-500/20">
                          <span className="text-emerald-400/90 font-medium">Target 2 (TP2)</span>
                          <span className="font-bold text-emerald-400/90">{trade.target2}</span>
                        </div>
                      )}
                      {trade.target3 && (
                        <div className="flex items-center justify-between px-2.5 py-1 rounded bg-emerald-500/5 border border-emerald-500/20">
                          <span className="text-emerald-400/80 font-medium">Target 3 (TP3)</span>
                          <span className="font-bold text-emerald-400/80">{trade.target3}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {trade.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded-md italic line-clamp-2">
                        "{trade.notes}"
                      </p>
                    )}
                  </div>

                  {/* Card Footer / Action */}
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
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTrade(trade)
                            setCloseModalOpen(true)
                          }}
                          className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                        >
                          Mark as Closed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTrade(trade.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTrade(trade.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Post New Trade Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="size-5 text-cyan-400" /> Post New Trade Signal
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This trade will be posted live and remain in the Active Trades tab until closed.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Symbol / Pair
                </label>
                <Input
                  placeholder="e.g. EUR/USD, XAU/USD"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  className="font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'BUY' })}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      formData.type === 'BUY'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'SELL' })}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      formData.type === 'SELL'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    SELL / SHORT
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                >
                  <option value="Forex">Forex</option>
                  <option value="Commodity">Commodity (Gold/Silver)</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Indices">Indices</option>
                  <option value="Stocks">Stocks</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Timeframe
                </label>
                <Input
                  placeholder="e.g. 15m, 1H, 4H, Daily"
                  value={formData.timeframe}
                  onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Leverage (Optional)
                </label>
                <Input
                  placeholder="e.g. 1:100, 10x"
                  value={formData.leverage}
                  onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Entry Price *
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.08450"
                  value={formData.entryPrice}
                  onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                  className="font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-rose-400 mb-1 block">
                  Stop Loss (SL) *
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.08150"
                  value={formData.stopLoss}
                  onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                  className="font-mono text-rose-400"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-emerald-400 mb-1 block">
                  Target 1 (TP1) *
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.08900"
                  value={formData.target1}
                  onChange={(e) => setFormData({ ...formData, target1: e.target.value })}
                  className="font-mono text-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-400/90 mb-1 block">
                  Target 2 (TP2)
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.09400"
                  value={formData.target2}
                  onChange={(e) => setFormData({ ...formData, target2: e.target.value })}
                  className="font-mono text-emerald-400/90"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-400/80 mb-1 block">
                  Target 3 (TP3)
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.10000"
                  value={formData.target3}
                  onChange={(e) => setFormData({ ...formData, target3: e.target.value })}
                  className="font-mono text-emerald-400/80"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Analysis / Strategy Notes (Optional)
              </label>
              <textarea
                placeholder="Add trade rationale, key levels, or execution details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                Publish Trade Signal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Trade Modal */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" /> Mark Trade as Closed
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedTrade?.symbol} ({selectedTrade?.type} @ {selectedTrade?.entryPrice})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Select Exit Outcome:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCloseReason('TP1')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    closeReason === 'TP1'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  🎯 Hit TP1 ({selectedTrade?.target1})
                </button>
                <button
                  type="button"
                  onClick={() => setCloseReason('TP2')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    closeReason === 'TP2'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  🎯 Hit TP2 ({selectedTrade?.target2 ?? 'N/A'})
                </button>
                <button
                  type="button"
                  onClick={() => setCloseReason('TP3')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    closeReason === 'TP3'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  🎯 Hit TP3 ({selectedTrade?.target3 ?? 'N/A'})
                </button>
                <button
                  type="button"
                  onClick={() => setCloseReason('SL')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    closeReason === 'SL'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  🛑 Hit Stop Loss ({selectedTrade?.stopLoss})
                </button>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setCloseReason('MANUAL')}
                className={`w-full p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                  closeReason === 'MANUAL'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                    : 'border-border text-muted-foreground'
                }`}
              >
                ⚙️ Custom Manual Exit Price
              </button>
              {closeReason === 'MANUAL' && (
                <div className="mt-2">
                  <Input
                    type="number"
                    step="any"
                    placeholder="Enter manual exit price..."
                    value={customExitPrice}
                    onChange={(e) => setCustomExitPrice(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseConfirm} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              Confirm & Move to Past
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backend API Helper Modal */}
      <Dialog open={apiModalOpen} onOpenChange={setApiModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Code2 className="size-5 text-cyan-400" /> Backend / Script Integration
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You can post and close trades directly from your python scripts, bots, or browser console.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs font-mono">
            <div>
              <span className="text-muted-foreground font-sans block font-semibold mb-1">
                1. Post Trade from Browser / Script:
              </span>
              <pre className="p-3 rounded-lg bg-muted/40 border border-border/60 overflow-x-auto text-cyan-300">
{`window.stacTrades.postTrade({
  symbol: "EUR/USD",
  type: "BUY",
  category: "Forex",
  entryPrice: 1.08450,
  stopLoss: 1.08150,
  target1: 1.08900,
  target2: 1.09400,
  target3: 1.10000,
  timeframe: "4H",
  notes: "London breakout"
});`}
              </pre>
            </div>

            <div>
              <span className="text-muted-foreground font-sans block font-semibold mb-1">
                2. Close Trade from Backend:
              </span>
              <pre className="p-3 rounded-lg bg-muted/40 border border-border/60 overflow-x-auto text-emerald-300">
{`// Mark trade as TP1, TP2, TP3, or SL
window.stacTrades.closeTrade("tr-1", "TP1");`}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setApiModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crypto Checkout Modal */}
      <CryptoCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
      />

      {/* Admin Panel Dialog */}
      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-background">
          <AdminPanel onClose={() => setAdminModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
