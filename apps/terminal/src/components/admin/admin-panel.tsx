import { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck,
  Lock,
  Plus,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Users,
  Wallet,
  Settings,
  Sparkles,
  Search,
  Trash2,
  Edit,
  DollarSign,
  Activity,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  LogOut,
  Send,
  MessageSquare,
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
import {
  SupabaseDataService,
  DbTrade,
  DbSubscription,
  DbSettings,
} from '@/lib/services/supabase-service'

export function AdminPanel({ onClose }: { onClose?: () => void }) {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('stac:admin:auth') === 'true'
      } catch {}
    }
    return false
  })
  const [pinInput, setPinInput] = useState('')
  const [activeTab, setActiveTab] = useState<'SIGNALS' | 'CUSTOMERS' | 'SETTINGS'>('SIGNALS')

  // Data states
  const [trades, setTrades] = useState<Array<DbTrade>>([])
  const [subscriptions, setSubscriptions] = useState<Array<DbSubscription>>([])
  const [settings, setSettings] = useState<DbSettings | null>(null)
  const [loading, setLoading] = useState(true)

  // Signals form state
  const [createTradeOpen, setCreateTradeOpen] = useState(false)
  const [closeTradeOpen, setCloseTradeOpen] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<DbTrade | null>(null)
  const [tradeForm, setTradeForm] = useState({
    symbol: 'EUR/USD',
    type: 'BUY' as 'BUY' | 'SELL',
    asset_class: 'Forex',
    entry_price: '',
    sl_price: '',
    tp1_price: '',
    tp2_price: '',
    tp3_price: '',
    leverage: '50',
    notes: '',
    chart_image_url: '',
  })
  const [closeOutcome, setCloseOutcome] = useState<DbTrade['outcome']>('tp1')
  const [customExitPrice, setCustomExitPrice] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [closeProofUrl, setCloseProofUrl] = useState('')
  const [closePnlPercent, setClosePnlPercent] = useState('')
  const [closePips, setClosePips] = useState('')
  const [closeTvLinkInput, setCloseTvLinkInput] = useState('')
  const [tvLinkInput, setTvLinkInput] = useState('')

  const handleImportTvLink = (url: string) => {
    setTvLinkInput(url)
    const trimmed = url.trim()
    if (!trimmed) return

    const matchFull = trimmed.match(/tradingview\.com\/chart\/([A-Za-z0-9_]+)\/([A-Za-z0-9]+)(?:-([^\s/?#]+))?/i)
    const matchShort = trimmed.match(/tradingview\.com\/(?:chart|x|symbols)\/([A-Za-z0-9]+)/i)

    let symbol = ''
    let ideaId = ''
    let rawTitle = ''

    if (matchFull) {
      symbol = matchFull[1].toUpperCase()
      ideaId = matchFull[2]
      rawTitle = matchFull[3] || ''
    } else if (matchShort) {
      ideaId = matchShort[1]
    }

    if (ideaId) {
      const firstChar = ideaId.charAt(0).toLowerCase()
      const imageUrl = `https://s3.tradingview.com/${firstChar}/${ideaId}_big.png`
      
      let assetClass = 'Forex'
      if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') || symbol.includes('USDT')) {
        assetClass = 'Crypto'
      } else if (symbol.includes('XAU') || symbol.includes('GOLD') || symbol.includes('OIL')) {
        assetClass = 'Commodity'
      }

      const cleanTitle = rawTitle ? decodeURIComponent(rawTitle).replace(/[-_+]/g, ' ').trim() : ''

      setTradeForm((prev) => ({
        ...prev,
        symbol: symbol || prev.symbol,
        asset_class: assetClass,
        notes: cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : prev.notes,
        chart_image_url: imageUrl,
      }))

      toast.success(`TradingView Idea Attached! Snapshot & ${symbol || 'Pair'} loaded.`)
    }
  }

  const handleImportCloseTvLink = (url: string) => {
    setCloseTvLinkInput(url)
    const trimmed = url.trim()
    if (!trimmed) return

    const matchFull = trimmed.match(/tradingview\.com\/chart\/([A-Za-z0-9_]+)\/([A-Za-z0-9]+)(?:-([^\s/?#]+))?/i)
    const matchShort = trimmed.match(/tradingview\.com\/(?:chart|x|symbols)\/([A-Za-z0-9]+)/i)

    let ideaId = ''
    if (matchFull) ideaId = matchFull[2]
    else if (matchShort) ideaId = matchShort[1]

    if (ideaId) {
      const firstChar = ideaId.charAt(0).toLowerCase()
      const imageUrl = `https://s3.tradingview.com/${firstChar}/${ideaId}_big.png`
      setCloseProofUrl(imageUrl)
      toast.success('TradingView Profit / Result Snapshot Attached!')
    }
  }

  // Edit Trade state
  const [editTradeOpen, setEditTradeOpen] = useState(false)
  const [editTradeForm, setEditTradeForm] = useState<{
    id: string
    symbol: string
    type: 'BUY' | 'SELL'
    asset_class: string
    entry_price: string
    sl_price: string
    tp1_price: string
    tp2_price: string
    tp3_price: string
    current_price: string
    pnl_percent: string
    pips: string
    leverage: string
    notes: string
    chart_image_url: string
    close_image_url: string
    status: 'active' | 'closed'
    outcome: DbTrade['outcome']
  }>({
    id: '',
    symbol: '',
    type: 'BUY',
    asset_class: 'Forex',
    entry_price: '',
    sl_price: '',
    tp1_price: '',
    tp2_price: '',
    tp3_price: '',
    current_price: '',
    pnl_percent: '',
    pips: '',
    leverage: '50',
    notes: '',
    chart_image_url: '',
    close_image_url: '',
    status: 'active',
    outcome: 'open',
  })

  // Customer form state
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerForm, setCustomerForm] = useState({
    email: '',
    wallet_address: '',
    plan: 'pro' as 'pro' | 'vip',
    status: 'active' as 'active' | 'pending',
    chain: 'TRC20',
    tx_hash: '',
    amount_usdt: '99',
  })

  // Settings form state
  const [walletsForm, setWalletsForm] = useState({
    usdt_trc20: '',
    usdt_bep20: '',
  })
  const [pricingForm, setPricingForm] = useState({
    pro_monthly: 99,
    pro_6months: 199,
    pro_yearly: 399,
    vip_lifetime: 699,
  })
  const [telegramForm, setTelegramForm] = useState({
    bot_token: '',
    channel_id: '',
    invite_link: 'https://t.me/pairlens_vip_alerts',
    auto_post: true,
  })
  const [testingTelegram, setTestingTelegram] = useState(false)

  // Load data
  const loadData = async () => {
    setLoading(true)
    try {
      const [tData, sData, conf] = await Promise.all([
        SupabaseDataService.getTrades(),
        SupabaseDataService.getSubscriptions(),
        SupabaseDataService.getSettings(),
      ])
      setTrades(tData)
      setSubscriptions(sData)
      setSettings(conf)
      setWalletsForm(conf.crypto_wallets)
      setPricingForm({
        pro_monthly: conf.pricing_plans.pro_monthly ?? 99,
        pro_6months: conf.pricing_plans.pro_6months ?? 199,
        pro_yearly: conf.pricing_plans.pro_yearly ?? 399,
        vip_lifetime: conf.pricing_plans.vip_lifetime ?? 699,
      })
      if (conf.telegram_config) {
        setTelegramForm({
          bot_token: conf.telegram_config.bot_token || '',
          channel_id: conf.telegram_config.channel_id || '',
          invite_link: conf.telegram_config.invite_link || 'https://t.me/pairlens_vip_alerts',
          auto_post: conf.telegram_config.auto_post !== false,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Admin PIN Auth
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const correctPin = settings?.admin_credentials?.pin || '09970997'
    if (pinInput.trim() === correctPin || pinInput.trim() === '09970997') {
      setIsAuthenticated(true)
      sessionStorage.setItem('stac:admin:auth', 'true')
      toast.success('Admin authentication successful')
    } else {
      toast.error('Invalid PIN code. Try 09970997')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('stac:admin:auth')
    setPinInput('')
    toast.info('Logged out from Admin Panel')
  }

  // Broadcast trade directly to Telegram
  const handleBroadcastTrade = async (trade: DbTrade) => {
    toast.loading(`Broadcasting ${trade.symbol} to Telegram VIP Channel...`, { id: `tg-${trade.id}` })
    const res = await SupabaseDataService.broadcastToTelegram(
      trade,
      trade.status === 'active' ? 'NEW_SIGNAL' : 'TRADE_CLOSED'
    )
    if (res.success) {
      toast.success(`⚡ ${trade.symbol} broadcasted to Telegram successfully!`, { id: `tg-${trade.id}` })
    } else {
      toast.error(`Telegram broadcast failed: ${res.message || 'Check bot token/channel ID in Settings'}`, { id: `tg-${trade.id}` })
    }
  }

  // Handle create trade
  const handleCreateTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tradeForm.symbol || !tradeForm.entry_price || !tradeForm.sl_price || !tradeForm.tp1_price) {
      toast.error('Please fill required fields (Symbol, Entry, SL, TP1)')
      return
    }

    try {
      await SupabaseDataService.createTrade({
        symbol: tradeForm.symbol.toUpperCase().trim(),
        type: tradeForm.type,
        asset_class: tradeForm.asset_class,
        entry_price: parseFloat(tradeForm.entry_price),
        sl_price: parseFloat(tradeForm.sl_price),
        tp1_price: parseFloat(tradeForm.tp1_price),
        tp2_price: tradeForm.tp2_price ? parseFloat(tradeForm.tp2_price) : undefined,
        tp3_price: tradeForm.tp3_price ? parseFloat(tradeForm.tp3_price) : undefined,
        leverage: tradeForm.leverage ? parseFloat(tradeForm.leverage) : 1,
        notes: tradeForm.notes,
        chart_image_url: tradeForm.chart_image_url.trim() || undefined,
        status: 'active',
        outcome: 'open',
      })
      toast.success(`Trade posted to Supabase: ${tradeForm.symbol} (${tradeForm.type})`)
      setCreateTradeOpen(false)
      loadData()
      setTradeForm({
        symbol: 'EUR/USD',
        type: 'BUY',
        asset_class: 'Forex',
        entry_price: '',
        sl_price: '',
        tp1_price: '',
        tp2_price: '',
        tp3_price: '',
        leverage: '50',
        notes: '',
        chart_image_url: '',
      })
    } catch (err) {
      toast.error('Failed to post trade')
    }
  }

  // Open Close Trade Modal with pre-fills
  const openCloseModal = (trade: DbTrade, defaultOutcome: DbTrade['outcome'] = 'tp1') => {
    setSelectedTrade(trade)
    setCloseOutcome(defaultOutcome)
    let p = trade.tp1_price ? String(trade.tp1_price) : ''
    if (defaultOutcome === 'tp2' && trade.tp2_price) p = String(trade.tp2_price)
    if (defaultOutcome === 'tp3' && trade.tp3_price) p = String(trade.tp3_price)
    if (defaultOutcome === 'sl') p = String(trade.sl_price)
    setCustomExitPrice(p)
    setCloseNotes('')
    setCloseProofUrl(trade.close_image_url || '')
    setCloseTvLinkInput('')
    setClosePnlPercent('')
    setClosePips('')
    setCloseTradeOpen(true)
  }

  // Handle close trade
  const handleCloseTradeConfirm = async () => {
    if (!selectedTrade) return
    const exitP = customExitPrice ? parseFloat(customExitPrice) : undefined
    const customPnl = closePnlPercent !== '' ? parseFloat(closePnlPercent) : undefined
    const customP = closePips !== '' ? parseInt(closePips, 10) : undefined

    await SupabaseDataService.closeTrade(
      selectedTrade.id,
      closeOutcome,
      exitP,
      closeNotes.trim() || undefined,
      closeProofUrl.trim() || undefined,
      customPnl,
      customP
    )
    toast.success(`✓ Trade closed with Profit Proof (${closeOutcome.toUpperCase()})`)
    setCloseTradeOpen(false)
    setSelectedTrade(null)
    loadData()
  }

  const handleDeleteTrade = async (id: string) => {
    await SupabaseDataService.deleteTrade(id)
    toast.info('Trade deleted from database')
    loadData()
  }

  // Open Edit Trade
  const handleOpenEditTrade = (trade: DbTrade) => {
    setEditTradeForm({
      id: trade.id,
      symbol: trade.symbol,
      type: trade.type,
      asset_class: trade.asset_class || 'Forex',
      entry_price: trade.entry_price ? String(trade.entry_price) : '',
      sl_price: trade.sl_price ? String(trade.sl_price) : '',
      tp1_price: trade.tp1_price ? String(trade.tp1_price) : '',
      tp2_price: trade.tp2_price ? String(trade.tp2_price) : '',
      tp3_price: trade.tp3_price ? String(trade.tp3_price) : '',
      current_price: trade.current_price ? String(trade.current_price) : '',
      pnl_percent: trade.pnl_percent !== undefined ? String(trade.pnl_percent) : '',
      pips: trade.pips !== undefined ? String(trade.pips) : '',
      leverage: trade.leverage ? String(trade.leverage) : '50',
      notes: trade.notes || '',
      chart_image_url: trade.chart_image_url || '',
      close_image_url: trade.close_image_url || '',
      status: trade.status,
      outcome: trade.outcome || (trade.status === 'active' ? 'open' : 'tp1'),
    })
    setEditTradeOpen(true)
  }

  // Submit Edit Trade
  const handleEditTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !editTradeForm.id ||
      !editTradeForm.symbol ||
      !editTradeForm.entry_price ||
      !editTradeForm.sl_price ||
      !editTradeForm.tp1_price
    ) {
      toast.error('Please fill required fields (Symbol, Entry, SL, TP1)')
      return
    }

    try {
      const updates: Partial<DbTrade> = {
        symbol: editTradeForm.symbol.toUpperCase().trim(),
        type: editTradeForm.type,
        asset_class: editTradeForm.asset_class,
        entry_price: parseFloat(editTradeForm.entry_price),
        sl_price: parseFloat(editTradeForm.sl_price),
        tp1_price: parseFloat(editTradeForm.tp1_price),
        tp2_price: editTradeForm.tp2_price ? parseFloat(editTradeForm.tp2_price) : undefined,
        tp3_price: editTradeForm.tp3_price ? parseFloat(editTradeForm.tp3_price) : undefined,
        current_price: editTradeForm.current_price ? parseFloat(editTradeForm.current_price) : undefined,
        pnl_percent: editTradeForm.pnl_percent !== '' ? parseFloat(editTradeForm.pnl_percent) : undefined,
        pips: editTradeForm.pips !== '' ? parseInt(editTradeForm.pips, 10) : undefined,
        leverage: editTradeForm.leverage ? parseFloat(editTradeForm.leverage) : 1,
        notes: editTradeForm.notes.trim() || undefined,
        chart_image_url: editTradeForm.chart_image_url.trim() || undefined,
        close_image_url: editTradeForm.close_image_url.trim() || undefined,
        status: editTradeForm.status,
        outcome: editTradeForm.outcome,
      }

      await SupabaseDataService.updateTrade(editTradeForm.id, updates)
      toast.success(`Trade ${editTradeForm.symbol} updated successfully!`)
      setEditTradeOpen(false)
      loadData()
    } catch {
      toast.error('Failed to update trade')
    }
  }

  // Handle Add Customer
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerForm.email) {
      toast.error('Email is required')
      return
    }

    await SupabaseDataService.createSubscription({
      email: customerForm.email.trim(),
      wallet_address: customerForm.wallet_address.trim(),
      plan: customerForm.plan,
      status: customerForm.status,
      chain: customerForm.chain,
      tx_hash: customerForm.tx_hash.trim(),
      amount_usdt: parseFloat(customerForm.amount_usdt) || 0,
    })

    toast.success(`Subscriber added: ${customerForm.email}`)
    setAddCustomerOpen(false)
    loadData()
    setCustomerForm({
      email: '',
      wallet_address: '',
      plan: 'pro',
      status: 'active',
      chain: 'TRC20',
      tx_hash: '',
      amount_usdt: '29',
    })
  }

  const handleApproveSub = async (sub: DbSubscription) => {
    try {
      await SupabaseDataService.approveSubscription(sub.id)
      toast.success(`✓ Payment Confirmed! ${sub.email} activated for ${sub.plan.toUpperCase()} plan.`)
      loadData()
    } catch {
      toast.error('Failed to approve subscription')
    }
  }

  const handleRejectSub = async (sub: DbSubscription) => {
    try {
      await SupabaseDataService.rejectSubscription(sub.id)
      toast.info(`✗ Payment Rejected for ${sub.email}`)
      loadData()
    } catch {
      toast.error('Failed to reject subscription')
    }
  }

  const handleDeleteSub = async (id: string) => {
    await SupabaseDataService.deleteSubscription(id)
    toast.info('Subscription deleted')
    loadData()
  }

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    const updated: DbSettings = {
      ...settings,
      crypto_wallets: walletsForm,
      pricing_plans: pricingForm,
      telegram_config: telegramForm,
    }
    await SupabaseDataService.saveSettings(updated)
    setSettings(updated)
    toast.success('Settings & Telegram configuration saved to Supabase')
  }

  // Test Telegram Bot Message
  const handleTestTelegram = async () => {
    if (!telegramForm.bot_token || !telegramForm.channel_id) {
      toast.error('Please enter Bot Token and Channel ID first')
      return
    }

    setTestingTelegram(true)
    try {
      const testTrade: DbTrade = {
        id: 'test_sample',
        symbol: 'EUR/USD',
        type: 'BUY',
        asset_class: 'Forex',
        entry_price: 1.085,
        sl_price: 1.0815,
        tp1_price: 1.0895,
        tp2_price: 1.094,
        leverage: 50,
        notes: 'Institutional Test Broadcast from Pairlens Admin Panel',
        status: 'active',
        outcome: 'open',
        created_at: new Date().toISOString(),
      }

      // Temporarily save to settings so service can access it
      if (settings) {
        await SupabaseDataService.saveSettings({
          ...settings,
          telegram_config: { ...telegramForm, auto_post: true },
        })
      }

      const res = await SupabaseDataService.broadcastToTelegram(testTrade, 'NEW_SIGNAL')
      if (res.success) {
        toast.success('✓ Test message sent successfully to your Telegram channel!')
      } else {
        toast.error(`Telegram Error: ${res.message || 'Check Bot Token and Channel ID'}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test message')
    } finally {
      setTestingTelegram(false)
    }
  }

  // Filtered subscribers
  const filteredSubs = useMemo(() => {
    return subscriptions.filter(
      (s) =>
        !customerSearch ||
        s.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (s.wallet_address && s.wallet_address.toLowerCase().includes(customerSearch.toLowerCase())) ||
        (s.tx_hash && s.tx_hash.toLowerCase().includes(customerSearch.toLowerCase()))
    )
  }, [subscriptions, customerSearch])

  const pendingSubs = useMemo(() => filteredSubs.filter((s) => s.status === 'pending'), [filteredSubs])
  const activeSubs = useMemo(() => filteredSubs.filter((s) => s.status !== 'pending'), [filteredSubs])

  // Active vs Closed trades
  const activeTradesList = useMemo(() => trades.filter((t) => t.status === 'active'), [trades])
  const closedTradesList = useMemo(() => trades.filter((t) => t.status === 'closed'), [trades])

  // If not authenticated, show PIN Screen
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <div className="size-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
          <Lock className="size-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Admin Control Portal
        </h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-6">
          Enter your 8-digit Master PIN to manage trade signals, customer subscriptions, and crypto wallet settings.
        </p>

        <form onSubmit={handlePinSubmit} className="flex flex-col items-center gap-3 w-full max-w-xs">
          <Input
            type="password"
            maxLength={12}
            placeholder="Enter Admin PIN (09970997)"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className="text-center text-base tracking-widest font-mono h-11 bg-card/60"
            autoFocus
          />
          <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-10">
            Unlock Admin Panel
          </Button>
          {onClose && (
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground">
              Cancel
            </Button>
          )}
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-background text-foreground overflow-y-auto px-6 py-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Master Admin Engine
              </h2>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 font-mono">
                Postgres Connected
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage Live Forex/Crypto Signals, Paid Subscribers & Crypto Checkout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadData} className="h-8 gap-1 text-xs">
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" variant="destructive" onClick={handleLogout} className="h-8 gap-1 text-xs">
            <LogOut className="size-3.5" />
            Lock
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 my-4 p-1 rounded-xl bg-muted/40 border border-border/40 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('SIGNALS')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'SIGNALS'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="size-3.5 text-cyan-400" />
          Signals & Trades ({activeTradesList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'CUSTOMERS'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="size-3.5 text-emerald-400" />
          Subscribers ({subscriptions.length})
          {pendingSubs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
              {pendingSubs.length} Pending
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SETTINGS')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'SETTINGS'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wallet className="size-3.5 text-amber-400" />
          Crypto Wallets & Pricing
        </button>
      </div>

      {/* TAB 1: SIGNALS & TRADES */}
      {activeTab === 'SIGNALS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Active Live Signals: <strong className="text-foreground">{activeTradesList.length}</strong>
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Completed Trades: <strong className="text-foreground">{closedTradesList.length}</strong>
              </span>
            </div>

            <Button
              size="sm"
              onClick={() => setCreateTradeOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold gap-1.5 text-xs h-8"
            >
              <Plus className="size-4" /> Post New Signal
            </Button>
          </div>

          {/* Active Trades Cards */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Signals (Live on Subscribers Terminal)
            </h3>

            {activeTradesList.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border/60 rounded-xl">
                <p className="text-xs text-muted-foreground">No active signals currently open.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTradesList.map((trade) => {
                  const isBuy = trade.type === 'BUY'
                  return (
                    <div
                      key={trade.id}
                      className="rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-border/40">
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
                            <span className="font-mono text-base font-bold">{trade.symbol}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {trade.asset_class ?? 'Forex'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 my-3 p-2 rounded bg-background/80 font-mono text-xs">
                          <div>
                            <span className="text-[9px] text-muted-foreground block">ENTRY</span>
                            <span className="font-bold">{trade.entry_price}</span>
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

                        {(trade.tp2_price || trade.tp3_price) && (
                          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground mb-2">
                            {trade.tp2_price && <span>TP2: <strong className="text-emerald-400/90">{trade.tp2_price}</strong></span>}
                            {trade.tp3_price && <span>TP3: <strong className="text-emerald-400/80">{trade.tp3_price}</strong></span>}
                          </div>
                        )}

                        {trade.notes && (
                          <p className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/20 p-2 rounded">
                            "{trade.notes}"
                          </p>
                        )}
                      </div>

                      {/* Quick Status Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap gap-1.5 items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={() => openCloseModal(trade, 'tp1')}
                            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                          >
                            Hit TP1 🎯
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openCloseModal(trade, 'tp2')}
                            className="h-6 text-[10px] px-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                          >
                            Hit TP2 🎯
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openCloseModal(trade, 'sl')}
                            className="h-6 text-[10px] px-2 bg-rose-600 hover:bg-rose-500 text-white font-bold"
                          >
                            Hit SL ❌
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBroadcastTrade(trade)}
                            className="h-6 text-[10px] px-2 border-sky-500/40 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 gap-1 font-bold"
                            title="Broadcast Live Signal to Telegram VIP Channel"
                          >
                            <Send className="size-3" /> Telegram
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditTrade(trade)}
                            className="h-6 text-[10px] px-2 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 gap-1 font-bold"
                            title="Edit Signal, Prices & Screenshot"
                          >
                            <Edit className="size-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-400"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Past Closed Trades */}
          <div className="mt-8">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Past Closed Trades Track Record
            </h3>

            <div className="border border-border/60 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="p-3">Symbol</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Entry</th>
                    <th className="p-3">Exit / Reason</th>
                    <th className="p-3">P&L / Pips</th>
                    <th className="p-3">Closed Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {closedTradesList.map((t) => (
                    <tr key={t.id} className="hover:bg-card/40">
                      <td className="p-3 font-bold text-foreground">{t.symbol}</td>
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            t.type === 'BUY' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="p-3">{t.entry_price}</td>
                      <td className="p-3 font-semibold text-emerald-400">
                        {t.outcome?.toUpperCase()} ({t.current_price ?? t.tp1_price})
                      </td>
                      <td className="p-3">
                        <span className={(t.pnl_percent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {(t.pnl_percent ?? 0) >= 0 ? `+${t.pnl_percent}%` : `${t.pnl_percent}%`} ({t.pips ?? 0} pips)
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {t.closed_at ? new Date(t.closed_at).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleBroadcastTrade(t)}
                          className="h-6 px-1.5 text-[10px] text-sky-400 hover:bg-sky-500/10 gap-1"
                          title="Broadcast Outcome Result to Telegram VIP Channel"
                        >
                          <Send className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditTrade(t)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-cyan-400"
                          title="Edit Trade, Prices, PnL & Screenshot"
                        >
                          <Edit className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTrade(t.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-400"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIBERS / CUSTOMERS */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-6">
          {/* PENDING PAYMENT APPROVALS SECTION */}
          {pendingSubs.length > 0 && (
            <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4 space-y-3 shadow-lg shadow-amber-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Clock className="size-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      🟡 Pending Payment Approvals ({pendingSubs.length})
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      User submitted crypto checkout. Verify transaction on blockchain explorer then click Confirm or Reject.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {pendingSubs.map((sub) => {
                  const isTron = (sub.chain || '').toUpperCase().includes('TRC') || (sub.chain || '').toUpperCase() === 'TRC20'
                  const explorerUrl = sub.tx_hash
                    ? isTron
                      ? `https://tronscan.org/#/transaction/${sub.tx_hash}`
                      : `https://bscscan.com/tx/${sub.tx_hash}`
                    : null

                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-lg bg-card/90 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs shadow-sm"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{sub.email}</span>
                          <Badge
                            variant="outline"
                            className={
                              sub.plan === 'vip' || (sub.amount_usdt && sub.amount_usdt >= 600)
                                ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                                : 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10'
                            }
                          >
                            {sub.plan.toUpperCase()} PLAN (${sub.amount_usdt ?? 99} USDT)
                          </Badge>
                          <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                            {sub.chain || 'USDT'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {sub.created_at ? new Date(sub.created_at).toLocaleString() : 'Just now'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase">TxID:</span>
                          <span className="font-mono text-foreground/90 bg-muted/60 px-2 py-0.5 rounded border border-border/50 truncate max-w-[280px] sm:max-w-md select-all">
                            {sub.tx_hash || 'No Tx Hash Provided'}
                          </span>
                          {sub.tx_hash && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(sub.tx_hash || '')
                                toast.success('TxID copied to clipboard')
                              }}
                              className="p-1 hover:text-cyan-400 text-muted-foreground transition-colors"
                              title="Copy TxID"
                            >
                              <Copy className="size-3.5" />
                            </button>
                          )}
                          {explorerUrl && (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline ml-1"
                            >
                              View on Explorer <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                        <Button
                          size="sm"
                          onClick={() => handleApproveSub(sub)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 gap-1.5 shadow-md shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="size-3.5" /> Confirm & Unlock VIP
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectSub(sub)}
                          className="text-xs h-8 px-3 gap-1.5"
                        >
                          <XCircle className="size-3.5" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSub(sub.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ACTIVE & ALL SUBSCRIBERS TABLE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="size-4 text-emerald-400" /> Confirmed & Active Subscribers ({activeSubs.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Subscribers currently active or registered in Supabase database.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search email, wallet, tx..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="h-8 pl-8 text-xs bg-card/60"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={() => setAddCustomerOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 text-xs h-8"
                >
                  <Plus className="size-4" /> Add Manual
                </Button>
              </div>
            </div>

            <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="p-3">Customer Email</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Chain & TX Hash</th>
                    <th className="p-3">Amount Paid</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        No subscribers found.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((sub) => {
                      const isTron = (sub.chain || '').toUpperCase().includes('TRC') || (sub.chain || '').toUpperCase() === 'TRC20'
                      const explorerUrl = sub.tx_hash
                        ? isTron
                          ? `https://tronscan.org/#/transaction/${sub.tx_hash}`
                          : `https://bscscan.com/tx/${sub.tx_hash}`
                        : null

                      return (
                        <tr key={sub.id} className="hover:bg-card/60">
                          <td className="p-3 font-semibold text-foreground">{sub.email}</td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={
                                sub.plan === 'vip'
                                  ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                  : 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10'
                              }
                            >
                              {sub.plan.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {sub.status === 'active' ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                <Check className="size-3" /> Active
                              </span>
                            ) : sub.status === 'pending' ? (
                              <span className="text-amber-400 flex items-center gap-1 font-bold">
                                <Clock className="size-3 animate-pulse" /> Pending Approval
                              </span>
                            ) : (
                              <span className="text-rose-400 flex items-center gap-1 font-bold">
                                <XCircle className="size-3" /> {sub.status.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            <span className="block text-[10px] text-cyan-400 font-bold">{sub.chain || 'USDT'}</span>
                            {sub.tx_hash ? (
                              <span className="flex items-center gap-1">
                                <span className="font-mono text-[10px] truncate max-w-[100px] inline-block">
                                  {sub.tx_hash}
                                </span>
                                {explorerUrl && (
                                  <a
                                    href={explorerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300"
                                    title="View on Explorer"
                                  >
                                    <ExternalLink className="size-3" />
                                  </a>
                                )}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Direct Manual</span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-foreground">${sub.amount_usdt ?? 29}</td>
                          <td className="p-3 text-muted-foreground">
                            {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'Lifetime'}
                          </td>
                          <td className="p-3 text-right space-x-1">
                            {sub.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleApproveSub(sub)}
                                className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                              >
                                Confirm
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSub(sub.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-400"
                              title="Delete subscriber record"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CRYPTO WALLETS & PRICING */}
      {activeTab === 'SETTINGS' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
          <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Wallet className="size-4 text-cyan-400" /> Crypto Receiving Wallets (Shown on Checkout)
            </h3>
            <p className="text-xs text-muted-foreground">
              Subscribers will send payments to these wallet addresses during crypto checkout.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  USDT (TRC-20 Tron) Deposit Address
                </label>
                <Input
                  value={walletsForm.usdt_trc20}
                  onChange={(e) => setWalletsForm({ ...walletsForm, usdt_trc20: e.target.value })}
                  placeholder="e.g. TLyKq7z4v6x8n9P1Q2R3S4T5U6V7W8X9YZ"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  USDT (BEP-20 BNB Smart Chain) Deposit Address
                </label>
                <Input
                  value={walletsForm.usdt_bep20}
                  onChange={(e) => setWalletsForm({ ...walletsForm, usdt_bep20: e.target.value })}
                  placeholder="e.g. 0x71C8360f3a8b4FaA5cD4eA9F8E19cD61e4A58249"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <DollarSign className="size-4 text-emerald-400" /> Subscription Pricing ($ USD / USDT)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  VIP Monthly ($)
                </label>
                <Input
                  type="number"
                  value={pricingForm.pro_monthly}
                  onChange={(e) => setPricingForm({ ...pricingForm, pro_monthly: parseFloat(e.target.value) || 0 })}
                  className="font-mono font-bold text-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  VIP 6 Months ($)
                </label>
                <Input
                  type="number"
                  value={pricingForm.pro_6months ?? 200}
                  onChange={(e) => setPricingForm({ ...pricingForm, pro_6months: parseFloat(e.target.value) || 0 })}
                  className="font-mono font-bold text-sky-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  VIP 1 Year ($)
                </label>
                <Input
                  type="number"
                  value={pricingForm.pro_yearly}
                  onChange={(e) => setPricingForm({ ...pricingForm, pro_yearly: parseFloat(e.target.value) || 0 })}
                  className="font-mono font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  VIP Lifetime ($)
                </label>
                <Input
                  type="number"
                  value={pricingForm.vip_lifetime}
                  onChange={(e) => setPricingForm({ ...pricingForm, vip_lifetime: parseFloat(e.target.value) || 0 })}
                  className="font-mono font-bold text-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Send className="size-4 text-cyan-400" /> Telegram VIP Channel Auto-Broadcast
              </h3>
              <Badge
                variant="outline"
                className={
                  telegramForm.auto_post
                    ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 font-mono text-[10px]'
                    : 'border-border text-muted-foreground font-mono text-[10px]'
                }
              >
                {telegramForm.auto_post ? '🟢 Auto-Post Enabled' : '⚪ Disabled'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatically broadcast new signals and TP/SL outcome updates to your private Telegram VIP Channel with charts and formatted parameters.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  Telegram Bot API Token (from @BotFather)
                </label>
                <Input
                  type="password"
                  value={telegramForm.bot_token}
                  onChange={(e) => setTelegramForm({ ...telegramForm, bot_token: e.target.value })}
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  Telegram Channel ID or Username (e.g. @pairlens_vip or -100192837482)
                </label>
                <Input
                  value={telegramForm.channel_id}
                  onChange={(e) => setTelegramForm({ ...telegramForm, channel_id: e.target.value })}
                  placeholder="e.g. @your_vip_channel or -100123456789"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  Public Telegram Channel Invite / Join Link (for Subscribers)
                </label>
                <Input
                  value={telegramForm.invite_link}
                  onChange={(e) => setTelegramForm({ ...telegramForm, invite_link: e.target.value })}
                  placeholder="e.g. https://t.me/your_vip_signals_channel"
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-mono cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={telegramForm.auto_post}
                    onChange={(e) => setTelegramForm({ ...telegramForm, auto_post: e.target.checked })}
                    className="size-4 rounded border-border text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Enable Auto-Post on New Signals & Target Hits</span>
                </label>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleTestTelegram}
                  disabled={testingTelegram || !telegramForm.bot_token || !telegramForm.channel_id}
                  className="h-8 text-xs font-mono border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 gap-1.5"
                >
                  <Send className="size-3" />
                  {testingTelegram ? 'Sending Test...' : 'Send Test to Telegram'}
                </Button>
              </div>
            </div>
          </div>

          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-6">
            Save Settings & Telegram to Supabase
          </Button>
        </form>
      )}

      {/* CREATE TRADE MODAL */}
      <Dialog open={createTradeOpen} onOpenChange={setCreateTradeOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-6 bg-card border-border/80 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="size-5 text-cyan-400" /> Post New Signal (Supabase DB)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This signal will be stored in PostgreSQL and delivered to all subscriber terminals.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTradeSubmit} className="space-y-3.5 py-2">
            {/* 1-Click TradingView Idea Link Auto-Importer */}
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5">
              <label className="text-xs font-bold text-cyan-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> 1-Click TradingView Idea Link Auto-Fill
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Auto-Extract</span>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste https://www.tradingview.com/chart/AUDUSD/7WSJ7lSF... link"
                  value={tvLinkInput}
                  onChange={(e) => handleImportTvLink(e.target.value)}
                  className="font-mono text-xs h-8 bg-background/80"
                />
                {tvLinkInput && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setTvLinkInput('')}
                    className="h-8 text-xs px-2 text-muted-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {tradeForm.chart_image_url && (
                <div className="mt-2 rounded-lg border border-border/60 overflow-hidden bg-black/40 flex items-center gap-3 p-2">
                  <img
                    src={tradeForm.chart_image_url}
                    alt="Chart preview"
                    className="h-14 w-24 object-cover rounded border border-border/40 shrink-0"
                    onError={(e) => {
                      // Fallback if big doesn't exist
                      const target = e.currentTarget
                      if (target.src.includes('_big.png')) {
                        target.src = target.src.replace('_big.png', '_mid.png')
                      }
                    }}
                  />
                  <div className="text-[11px] overflow-hidden">
                    <span className="text-emerald-400 font-bold block">✓ TradingView Chart Attached</span>
                    <span className="text-muted-foreground font-mono truncate block text-[10px]">
                      {tradeForm.chart_image_url}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Symbol</label>
                <Input
                  placeholder="e.g. EUR/USD, XAU/USD, BTC"
                  value={tradeForm.symbol}
                  onChange={(e) => setTradeForm({ ...tradeForm, symbol: e.target.value })}
                  className="font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Direction</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTradeForm({ ...tradeForm, type: 'BUY' })}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      tradeForm.type === 'BUY'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeForm({ ...tradeForm, type: 'SELL' })}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      tradeForm.type === 'SELL'
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <select
                  value={tradeForm.asset_class}
                  onChange={(e) => setTradeForm({ ...tradeForm, asset_class: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="Forex">Forex</option>
                  <option value="Commodity">Gold / Commodity</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Indices">Indices</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Leverage</label>
                <Input
                  placeholder="e.g. 50"
                  value={tradeForm.leverage}
                  onChange={(e) => setTradeForm({ ...tradeForm, leverage: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Entry Price *</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="1.08500"
                  value={tradeForm.entry_price}
                  onChange={(e) => setTradeForm({ ...tradeForm, entry_price: e.target.value })}
                  className="font-mono font-bold text-foreground"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-rose-400 mb-1 block">Stop Loss *</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="1.08150"
                  value={tradeForm.sl_price}
                  onChange={(e) => setTradeForm({ ...tradeForm, sl_price: e.target.value })}
                  className="font-mono font-bold text-rose-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-400 mb-1 block">Target 1 (TP1) *</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="1.08950"
                  value={tradeForm.tp1_price}
                  onChange={(e) => setTradeForm({ ...tradeForm, tp1_price: e.target.value })}
                  className="font-mono font-bold text-emerald-400"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Target 2 (Optional)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="1.09400"
                  value={tradeForm.tp2_price}
                  onChange={(e) => setTradeForm({ ...tradeForm, tp2_price: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Target 3 (Optional)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="1.10000"
                  value={tradeForm.tp3_price}
                  onChange={(e) => setTradeForm({ ...tradeForm, tp3_price: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Analysis / Strategy Notes</label>
              <Input
                placeholder="e.g. 4H resistance breakout with strong volume"
                value={tradeForm.notes}
                onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-cyan-400 mb-1 block">
                📸 Trade Setup Chart Screenshot (Paste Image URL / Link - Optional)
              </label>
              <Input
                placeholder="https://i.imgur.com/... or https://www.tradingview.com/x/..."
                value={tradeForm.chart_image_url}
                onChange={(e) => setTradeForm({ ...tradeForm, chart_image_url: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Leave blank to automatically generate dynamic vector candlestick chart proof with Entry, SL, and TP zones.
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setCreateTradeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                Publish Signal Live
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CLOSE TRADE / ATTACH PROFIT PROOF DIALOG */}
      <Dialog open={closeTradeOpen} onOpenChange={setCloseTradeOpen}>
        <DialogContent className="w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-6 bg-card border-border/80 rounded-2xl shadow-2xl font-mono text-xs">
          <DialogHeader>
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    selectedTrade?.type === 'BUY'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                      : 'border-rose-500 text-rose-400 bg-rose-500/10'
                  }
                >
                  {selectedTrade?.type}
                </Badge>
                <span className="text-base font-bold text-foreground">{selectedTrade?.symbol}</span>
              </div>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                Closing Desk
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold mt-2 flex items-center gap-2">
              🏆 Close Signal & Attach Profit Proof Evidence
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select outcome trigger, attach a screenshot proof showing the profit/exit, and move to completed track record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Outcome Selection */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">
                1. Select Exit Trigger Outcome *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCloseOutcome('tp1')
                    if (selectedTrade?.tp1_price) setCustomExitPrice(String(selectedTrade.tp1_price))
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                    closeOutcome === 'tp1'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm'
                      : 'border-border/60 hover:border-border text-muted-foreground'
                  }`}
                >
                  🎯 Target 1 ({selectedTrade?.tp1_price})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCloseOutcome('tp2')
                    if (selectedTrade?.tp2_price) setCustomExitPrice(String(selectedTrade.tp2_price))
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                    closeOutcome === 'tp2'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm'
                      : 'border-border/60 hover:border-border text-muted-foreground'
                  }`}
                >
                  🎯 Target 2 ({selectedTrade?.tp2_price ?? 'N/A'})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCloseOutcome('sl')
                    if (selectedTrade?.sl_price) setCustomExitPrice(String(selectedTrade.sl_price))
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                    closeOutcome === 'sl'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-400 shadow-sm'
                      : 'border-border/60 hover:border-border text-muted-foreground'
                  }`}
                >
                  ❌ Stop Loss ({selectedTrade?.sl_price})
                </button>

                <button
                  type="button"
                  onClick={() => setCloseOutcome('manual')}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                    closeOutcome === 'manual'
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400 shadow-sm'
                      : 'border-border/60 hover:border-border text-muted-foreground'
                  }`}
                >
                  ⚖️ Custom Exit
                </button>
              </div>
            </div>

            {/* 📸 Attach Profit Proof Screenshot */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> 📸 2. Attach Profit Proof / Result Screenshot (TradingView / Image Link)
                </label>
                {closeProofUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCloseProofUrl('')
                      setCloseTvLinkInput('')
                    }}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Clear Proof
                  </button>
                )}
              </div>

              {/* 1-Click Auto-Fill from TradingView Idea Link */}
              <div className="flex gap-2">
                <Input
                  placeholder="Paste TradingView chart link (e.g. https://www.tradingview.com/chart/AUDUSD/...)"
                  value={closeTvLinkInput}
                  onChange={(e) => handleImportCloseTvLink(e.target.value)}
                  className="text-xs h-8 bg-background/80"
                />
              </div>

              {/* Direct Image URL input */}
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">
                  Or Paste Direct Screenshot Link (Imgur, PostImage, MT5 / Broker screenshot):
                </span>
                <Input
                  placeholder="https://i.imgur.com/... or https://..."
                  value={closeProofUrl}
                  onChange={(e) => setCloseProofUrl(e.target.value)}
                  className="text-xs h-8 bg-background/80"
                />
              </div>

              {/* Live Proof Screenshot Preview */}
              {closeProofUrl && closeProofUrl.trim().length > 5 && (
                <div className="rounded-lg border border-amber-500/40 bg-black/60 p-2.5 flex items-center justify-between gap-3 mt-1">
                  <div className="h-16 w-28 rounded overflow-hidden bg-black flex items-center justify-center shrink-0 border border-white/10">
                    <img
                      src={closeProofUrl}
                      alt="Profit proof preview"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        const target = e.currentTarget
                        if (target.src.includes('_big.png')) {
                          target.src = target.src.replace('_big.png', '_mid.png')
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-[11px] space-y-0.5">
                    <span className="text-emerald-400 font-bold block flex items-center gap-1">
                      <Check className="size-3" /> Profit Proof Image Attached
                    </span>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{closeProofUrl}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(closeProofUrl, '_blank')}
                    className="h-7 text-[10px] gap-1 px-2 border-amber-500/40 text-amber-400 shrink-0"
                  >
                    <ExternalLink className="size-3" /> View
                  </Button>
                </div>
              )}
            </div>

            {/* Price Levels & PnL Adjustment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Exit Price ($)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.08950"
                  value={customExitPrice}
                  onChange={(e) => setCustomExitPrice(e.target.value)}
                  className="h-8 font-bold text-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Custom P&L % (Optional)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Auto-calculated if blank"
                  value={closePnlPercent}
                  onChange={(e) => setClosePnlPercent(e.target.value)}
                  className="h-8 font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Pips Gain (Optional)</label>
                <Input
                  type="number"
                  placeholder="e.g. 85"
                  value={closePips}
                  onChange={(e) => setClosePips(e.target.value)}
                  className="h-8 font-bold text-cyan-400"
                />
              </div>
            </div>

            {/* Closing / Strategy Outcome Notes */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">
                Closing Commentary / Result Summary (Shown to Users)
              </label>
              <Input
                placeholder="e.g. Target 1 reached with +85 pips profit. Secured 50% lot and moved SL to Entry."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button variant="ghost" onClick={() => setCloseTradeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCloseTradeConfirm}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Check className="size-4" /> Confirm & Publish Profit Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT TRADE / PHOTO & PRICES DIALOG */}
      <Dialog open={editTradeOpen} onOpenChange={setEditTradeOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-6 bg-card border-border/80 rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    editTradeForm.type === 'BUY'
                      ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                      : 'border-rose-500/50 text-rose-400 bg-rose-500/10'
                  }
                >
                  {editTradeForm.type}
                </Badge>
                <span className="font-mono text-base font-bold text-foreground">{editTradeForm.symbol || 'Edit Trade'}</span>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] text-cyan-400 border-cyan-500/30">
                Admin Editor
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold mt-2 flex items-center gap-2">
              <Edit className="size-4 text-cyan-400" /> Edit Trade Details, Prices & Screenshot Proof
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify entry/SL/TP levels, PnL %, strategy notes, or upload/change the chart screenshot. All changes sync live immediately.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditTradeSubmit} className="space-y-3.5 py-2 font-mono text-xs">
            {/* Symbol, Direction & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Symbol *</label>
                <Input
                  placeholder="e.g. EUR/USD, XAU/USD, BTC"
                  value={editTradeForm.symbol}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, symbol: e.target.value })}
                  className="font-bold text-foreground"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Direction</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditTradeForm({ ...editTradeForm, type: 'BUY' })}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      editTradeForm.type === 'BUY'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTradeForm({ ...editTradeForm, type: 'SELL' })}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      editTradeForm.type === 'SELL'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Trade Lifecycle Status</label>
                <select
                  value={editTradeForm.status}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, status: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="active">🟢 Active (Live Signal)</option>
                  <option value="closed">🏁 Closed (Past Track Record)</option>
                </select>
              </div>
            </div>

            {/* Category & Leverage */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Category</label>
                <select
                  value={editTradeForm.asset_class}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, asset_class: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="Forex">Forex</option>
                  <option value="Commodity">Gold / Commodity</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Indices">Indices</option>
                  <option value="Stocks">Stocks</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Leverage</label>
                <Input
                  placeholder="50"
                  value={editTradeForm.leverage}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, leverage: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Outcome / Trigger</label>
                <select
                  value={editTradeForm.outcome}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, outcome: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="open">Open (Active)</option>
                  <option value="tp1">Target 1 Hit (TP1)</option>
                  <option value="tp2">Target 2 Hit (TP2)</option>
                  <option value="tp3">Target 3 Hit (TP3)</option>
                  <option value="sl">Stop Loss Hit (SL)</option>
                  <option value="manual">Manual Exit</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Price Levels: Entry, SL, TP1 */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-background/60 border border-border/40">
              <div>
                <label className="text-[11px] font-medium text-cyan-400 mb-1 block">Entry Price *</label>
                <Input
                  type="number"
                  step="any"
                  value={editTradeForm.entry_price}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, entry_price: e.target.value })}
                  className="font-bold text-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-rose-400 mb-1 block">Stop Loss (SL) *</label>
                <Input
                  type="number"
                  step="any"
                  value={editTradeForm.sl_price}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, sl_price: e.target.value })}
                  className="font-bold text-rose-400"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-emerald-400 mb-1 block">Target 1 (TP1) *</label>
                <Input
                  type="number"
                  step="any"
                  value={editTradeForm.tp1_price}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, tp1_price: e.target.value })}
                  className="font-bold text-emerald-400"
                  required
                />
              </div>
            </div>

            {/* Target 2, Target 3 & Exit Price */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Target 2 (TP2)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Optional"
                  value={editTradeForm.tp2_price}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, tp2_price: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Target 3 (TP3)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Optional"
                  value={editTradeForm.tp3_price}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, tp3_price: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Exit / Current Price</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. Close Price"
                  value={editTradeForm.current_price}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, current_price: e.target.value })}
                />
              </div>
            </div>

            {/* PnL % and Pips */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">P&L Percent (%)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 34.5 or -12.0"
                  value={editTradeForm.pnl_percent}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, pnl_percent: e.target.value })}
                  className="text-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Pips Gain / Loss</label>
                <Input
                  type="number"
                  placeholder="e.g. 84 or -35"
                  value={editTradeForm.pips}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, pips: e.target.value })}
                />
              </div>
            </div>

            {/* Strategy / Notes */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Analysis & Strategy Notes</label>
              <Input
                placeholder="e.g. 4H break and retest of key institutional resistance"
                value={editTradeForm.notes}
                onChange={(e) => setEditTradeForm({ ...editTradeForm, notes: e.target.value })}
              />
            </div>

            {/* Screenshot URL & Live Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Entry Setup Screenshot */}
              <div className="p-3 rounded-xl bg-background/80 border border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                    📸 1. Entry Setup Screenshot (URL)
                  </label>
                  {editTradeForm.chart_image_url && (
                    <button
                      type="button"
                      onClick={() => setEditTradeForm({ ...editTradeForm, chart_image_url: '' })}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <Input
                  placeholder="Paste Entry Chart Link / Imgur URL"
                  value={editTradeForm.chart_image_url}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, chart_image_url: e.target.value })}
                  className="text-xs"
                />

                {editTradeForm.chart_image_url && editTradeForm.chart_image_url.trim().length > 5 ? (
                  <div className="mt-2 rounded-lg border border-border/60 overflow-hidden bg-black/60 p-2 flex items-center justify-between gap-2">
                    <div className="h-14 w-24 rounded overflow-hidden bg-black flex items-center justify-center shrink-0 border border-white/10">
                      <img
                        src={editTradeForm.chart_image_url}
                        alt="Entry Setup Preview"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget
                          if (target.src.includes('_big.png')) {
                            target.src = target.src.replace('_big.png', '_mid.png')
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-[10px] text-muted-foreground">
                      <span className="text-cyan-400 font-bold block">✓ Entry Chart</span>
                      <p className="truncate">{editTradeForm.chart_image_url}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Closing Profit Proof Screenshot */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    🏆 2. Profit Proof / Exit Screenshot (URL)
                  </label>
                  {editTradeForm.close_image_url && (
                    <button
                      type="button"
                      onClick={() => setEditTradeForm({ ...editTradeForm, close_image_url: '' })}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <Input
                  placeholder="Paste Profit Proof Link / TradingView update URL"
                  value={editTradeForm.close_image_url}
                  onChange={(e) => setEditTradeForm({ ...editTradeForm, close_image_url: e.target.value })}
                  className="text-xs"
                />

                {editTradeForm.close_image_url && editTradeForm.close_image_url.trim().length > 5 ? (
                  <div className="mt-2 rounded-lg border border-amber-500/40 overflow-hidden bg-black/60 p-2 flex items-center justify-between gap-2">
                    <div className="h-14 w-24 rounded overflow-hidden bg-black flex items-center justify-center shrink-0 border border-white/10">
                      <img
                        src={editTradeForm.close_image_url}
                        alt="Profit Proof Preview"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget
                          if (target.src.includes('_big.png')) {
                            target.src = target.src.replace('_big.png', '_mid.png')
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-[10px] text-muted-foreground">
                      <span className="text-amber-400 font-bold block">✓ Profit Proof</span>
                      <p className="truncate">{editTradeForm.close_image_url}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setEditTradeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono">
                <Check className="size-4 mr-1" /> Save All Changes (Sync Live)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD SUBSCRIBER DIALOG */}
      <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="size-5 text-emerald-400" /> Add Subscriber Manual
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCustomerSubmit} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Email *</label>
              <Input
                type="email"
                placeholder="customer@gmail.com"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Plan</label>
                <select
                  value={customerForm.plan}
                  onChange={(e) => {
                    const nextVal = e.target.value
                    const nextPlan: 'pro' | 'vip' = nextVal === 'vip' ? 'vip' : 'pro'
                    let nextAmount = '99'
                    if (nextVal === 'pro_6m') nextAmount = '199'
                    if (nextVal === 'yearly') nextAmount = '399'
                    if (nextVal === 'vip') nextAmount = '699'
                    setCustomerForm({ ...customerForm, plan: nextPlan, amount_usdt: nextAmount })
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="pro">VIP Monthly ($99)</option>
                  <option value="pro_6m">VIP 6 Months ($199)</option>
                  <option value="yearly">VIP 1 Year ($399)</option>
                  <option value="vip">VIP Lifetime ($699)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <select
                  value={customerForm.status}
                  onChange={(e) => setCustomerForm({ ...customerForm, status: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="pending">Pending Verification</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Chain</label>
                <Input
                  value={customerForm.chain}
                  onChange={(e) => setCustomerForm({ ...customerForm, chain: e.target.value })}
                  placeholder="TRC20, BEP20"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount ($ USDT)</label>
                <Input
                  type="number"
                  value={customerForm.amount_usdt}
                  onChange={(e) => setCustomerForm({ ...customerForm, amount_usdt: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">TX Hash / Notes (Optional)</label>
              <Input
                placeholder="0x... or TRC20 Transaction ID"
                value={customerForm.tx_hash}
                onChange={(e) => setCustomerForm({ ...customerForm, tx_hash: e.target.value })}
                className="font-mono text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setAddCustomerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                Save Subscriber
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
