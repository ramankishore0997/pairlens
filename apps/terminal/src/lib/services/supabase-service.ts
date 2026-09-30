import { createClient } from '@supabase/supabase-js'

// Supabase project connection
const SUPABASE_URL = 'https://fginmwbygletrkisvcwz.supabase.co'
// Public Anon Key for client operations
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaW5td2J5Z2xldHJraXN2Y3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MjI2MDAsImV4cCI6MjA1ODk5ODYwMH0.placeholder'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export type DbTrade = {
  id: string
  symbol: string
  type: 'BUY' | 'SELL'
  asset_class?: string
  entry_price: number
  sl_price: number
  tp1_price: number
  tp2_price?: number
  tp3_price?: number
  current_price?: number
  leverage?: number
  notes?: string
  status: 'active' | 'closed'
  outcome: 'open' | 'tp1' | 'tp2' | 'tp3' | 'sl' | 'manual'
  pnl_percent?: number
  pips?: number
  created_at: string
  closed_at?: string
  updated_at?: string
}

export type DbSubscription = {
  id: string
  email: string
  wallet_address?: string
  plan: 'free' | 'pro' | 'vip'
  status: 'active' | 'pending' | 'expired'
  tx_hash?: string
  amount_usdt?: number
  chain?: string
  starts_at?: string
  expires_at?: string
  created_at?: string
}

export type DbSettings = {
  crypto_wallets: {
    usdt_trc20: string
    usdt_erc20: string
    solana: string
  }
  pricing_plans: {
    pro_monthly: number
    pro_yearly: number
    vip_lifetime: number
  }
  admin_credentials: {
    pin: string
  }
}

// Local cache keys
const TRADES_CACHE_KEY = 'stac:db:trades'
const SUBS_CACHE_KEY = 'stac:db:subscriptions'
const SETTINGS_CACHE_KEY = 'stac:db:settings'

const DEFAULT_SETTINGS: DbSettings = {
  crypto_wallets: {
    usdt_trc20: 'TLyKq7z4v6x8n9P1Q2R3S4T5U6V7W8X9YZ',
    usdt_erc20: '0x71C8360f3a8b4FaA5cD4eA9F8E19cD61e4A58249',
    solana: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  },
  pricing_plans: {
    pro_monthly: 29,
    pro_yearly: 199,
    vip_lifetime: 499,
  },
  admin_credentials: {
    pin: '9970',
  },
}

const DEFAULT_INITIAL_TRADES: Array<DbTrade> = [
  {
    id: 'tr_1',
    symbol: 'EUR/USD',
    type: 'BUY',
    asset_class: 'Forex',
    entry_price: 1.085,
    sl_price: 1.0815,
    tp1_price: 1.0895,
    tp2_price: 1.094,
    tp3_price: 1.1,
    leverage: 50,
    notes: 'Strong bullish momentum following ECB rate release. London liquidity sweep.',
    status: 'active',
    outcome: 'open',
    pnl_percent: 0,
    pips: 0,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'tr_2',
    symbol: 'XAU/USD',
    type: 'BUY',
    asset_class: 'Commodity',
    entry_price: 2735.5,
    sl_price: 2718.0,
    tp1_price: 2755.0,
    tp2_price: 2775.0,
    tp3_price: 2800.0,
    leverage: 20,
    notes: 'Gold breakout above daily flag pattern. Target 1 reached soon.',
    status: 'active',
    outcome: 'open',
    pnl_percent: 0,
    pips: 0,
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'tr_3',
    symbol: 'GBP/JPY',
    type: 'SELL',
    asset_class: 'Forex',
    entry_price: 194.2,
    sl_price: 195.1,
    tp1_price: 193.0,
    tp2_price: 192.1,
    tp3_price: 191.0,
    leverage: 30,
    notes: 'Rejection from 4H resistance zone. Bearish confluence.',
    status: 'active',
    outcome: 'open',
    pnl_percent: 0,
    pips: 0,
    created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
  {
    id: 'tr_4',
    symbol: 'BTC/USDT',
    type: 'BUY',
    asset_class: 'Crypto',
    entry_price: 94200.0,
    sl_price: 92500.0,
    tp1_price: 96500.0,
    tp2_price: 98000.0,
    tp3_price: 102000.0,
    leverage: 10,
    notes: 'Daily trend continuation. SL below swing low.',
    status: 'active',
    outcome: 'open',
    pnl_percent: 0,
    pips: 0,
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'tr_5',
    symbol: 'USD/JPY',
    type: 'BUY',
    asset_class: 'Forex',
    entry_price: 152.1,
    sl_price: 151.4,
    tp1_price: 153.2,
    tp2_price: 154.0,
    tp3_price: 155.0,
    leverage: 50,
    notes: 'Hit Target 1 (+110 pips). Move SL to breakeven.',
    status: 'closed',
    outcome: 'tp1',
    pnl_percent: 4.5,
    pips: 110,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    closed_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
]

export const SupabaseDataService = {
  // ---------------- TRADES ----------------
  async getTrades(): Promise<Array<DbTrade>> {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        localStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(data))
        return data as Array<DbTrade>
      }
    } catch {}

    const cached = localStorage.getItem(TRADES_CACHE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {}
    }
    localStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(DEFAULT_INITIAL_TRADES))
    return DEFAULT_INITIAL_TRADES
  },

  async createTrade(trade: Omit<DbTrade, 'id' | 'created_at' | 'updated_at'>): Promise<DbTrade> {
    const newTrade: DbTrade = {
      ...trade,
      id: `tr_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      await supabase.from('trades').insert([newTrade])
    } catch {}

    const existing = await this.getTrades()
    const updated = [newTrade, ...existing.filter((t) => t.id !== newTrade.id)]
    localStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('stac:db:trades:updated', { detail: updated }))
    return newTrade
  },

  async updateTrade(id: string, updates: Partial<DbTrade>): Promise<void> {
    try {
      await supabase
        .from('trades')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
    } catch {}

    const existing = await this.getTrades()
    const updated = existing.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    localStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('stac:db:trades:updated', { detail: updated }))
  },

  async closeTrade(
    id: string,
    outcome: DbTrade['outcome'],
    exitPrice?: number,
    notes?: string
  ): Promise<void> {
    const existing = await this.getTrades()
    const trade = existing.find((t) => t.id === id)
    if (!trade) return

    let price = exitPrice ?? trade.tp1_price
    if (outcome === 'tp2' && trade.tp2_price) price = trade.tp2_price
    if (outcome === 'tp3' && trade.tp3_price) price = trade.tp3_price
    if (outcome === 'sl') price = trade.sl_price

    const isBuy = trade.type === 'BUY'
    const diff = isBuy ? price - trade.entry_price : trade.entry_price - price
    const pnl = Number(((diff / trade.entry_price) * 100).toFixed(2))
    const pips = Math.round(Math.abs(diff) * (trade.symbol.includes('JPY') ? 100 : 10000))

    const updates: Partial<DbTrade> = {
      status: 'closed',
      outcome,
      current_price: price,
      pnl_percent: pnl,
      pips: diff >= 0 ? pips : -pips,
      notes: notes ? `${trade.notes ? trade.notes + ' | ' : ''}${notes}` : trade.notes,
      closed_at: new Date().toISOString(),
    }

    await this.updateTrade(id, updates)
  },

  async deleteTrade(id: string): Promise<void> {
    try {
      await supabase.from('trades').delete().eq('id', id)
    } catch {}

    const existing = await this.getTrades()
    const updated = existing.filter((t) => t.id !== id)
    localStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('stac:db:trades:updated', { detail: updated }))
  },

  // ---------------- SUBSCRIPTIONS ----------------
  async getSubscriptions(): Promise<Array<DbSubscription>> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        localStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(data))
        return data as Array<DbSubscription>
      }
    } catch {}

    const cached = localStorage.getItem(SUBS_CACHE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {}
    }

    const sampleSubs: Array<DbSubscription> = [
      {
        id: 'sub_1',
        email: 'alex.trader@gmail.com',
        wallet_address: '0x389a...91b4',
        plan: 'vip',
        status: 'active',
        tx_hash: '0x8f3c...92a1',
        amount_usdt: 499,
        chain: 'ERC20',
        starts_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 365 * 10).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      },
      {
        id: 'sub_2',
        email: 'priya.forex@outlook.com',
        wallet_address: 'TKy7...mP92',
        plan: 'pro',
        status: 'active',
        tx_hash: '8f4c...b291',
        amount_usdt: 29,
        chain: 'TRC20',
        starts_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 25).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'sub_3',
        email: 'crypto.bull99@gmail.com',
        wallet_address: '9xPL...3nKs',
        plan: 'pro',
        status: 'pending',
        tx_hash: '5d9a...e41c',
        amount_usdt: 29,
        chain: 'SOLANA',
        starts_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ]
    localStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(sampleSubs))
    return sampleSubs
  },

  async createSubscription(sub: Omit<DbSubscription, 'id' | 'created_at'>): Promise<DbSubscription> {
    const newSub: DbSubscription = {
      ...sub,
      id: `sub_${Date.now()}`,
      created_at: new Date().toISOString(),
      starts_at: sub.starts_at || new Date().toISOString(),
      expires_at:
        sub.expires_at ||
        (sub.plan === 'vip'
          ? new Date(Date.now() + 86400000 * 365 * 10).toISOString()
          : new Date(Date.now() + 86400000 * 30).toISOString()),
    }

    try {
      await supabase.from('subscriptions').insert([newSub])
    } catch {}

    const existing = await this.getSubscriptions()
    const updated = [newSub, ...existing.filter((s) => s.id !== newSub.id)]
    localStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('stac:db:subs:updated', { detail: updated }))
    return newSub
  },

  async updateSubscription(id: string, updates: Partial<DbSubscription>): Promise<void> {
    try {
      await supabase.from('subscriptions').update(updates).eq('id', id)
    } catch {}

    const existing = await this.getSubscriptions()
    const updated = existing.map((s) => (s.id === id ? { ...s, ...updates } : s))
    localStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('stac:db:subs:updated', { detail: updated }))
  },

  async deleteSubscription(id: string): Promise<void> {
    try {
      await supabase.from('subscriptions').delete().eq('id', id)
    } catch {}

    const existing = await this.getSubscriptions()
    const updated = existing.filter((s) => s.id !== id)
    localStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('stac:db:subs:updated', { detail: updated }))
  },

  // ---------------- SETTINGS ----------------
  async getSettings(): Promise<DbSettings> {
    try {
      const { data, error } = await supabase.from('admin_settings').select('*')
      if (!error && data && data.length > 0) {
        const merged = { ...DEFAULT_SETTINGS }
        data.forEach((row: any) => {
          if (row.key === 'crypto_wallets') merged.crypto_wallets = row.value
          if (row.key === 'pricing_plans') merged.pricing_plans = row.value
          if (row.key === 'admin_credentials') merged.admin_credentials = row.value
        })
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(merged))
        return merged
      }
    } catch {}

    const cached = localStorage.getItem(SETTINGS_CACHE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {}
    }
    return DEFAULT_SETTINGS
  },

  async saveSettings(settings: DbSettings): Promise<void> {
    try {
      await supabase.from('admin_settings').upsert([
        { key: 'crypto_wallets', value: settings.crypto_wallets, updated_at: new Date().toISOString() },
        { key: 'pricing_plans', value: settings.pricing_plans, updated_at: new Date().toISOString() },
        { key: 'admin_credentials', value: settings.admin_credentials, updated_at: new Date().toISOString() },
      ])
    } catch {}

    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('stac:db:settings:updated', { detail: settings }))
  },
}
