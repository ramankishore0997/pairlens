import { createClient } from '@supabase/supabase-js'

// Supabase project connection
const SUPABASE_URL = 'https://fginmwbygletrkisvcwz.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaW5td2J5Z2xldHJraXN2Y3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MjI2MDAsImV4cCI6MjA1ODk5ODYwMH0.placeholder'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export type AppUser = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  plan: 'free' | 'pro' | 'vip'
  created_at: string
}

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
  chart_image_url?: string
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
    usdt_bep20: string
  }
  pricing_plans: {
    pro_monthly: number
    pro_yearly: number
    vip_lifetime: number
  }
  telegram_config?: {
    bot_token: string
    channel_id: string
    invite_link: string
    auto_post: boolean
  }
  admin_credentials: {
    pin: string
  }
}

// Local cache keys
const USER_SESSION_KEY = 'stac:auth:user'
const TRADES_CACHE_KEY = 'stac:db:trades'
const SUBS_CACHE_KEY = 'stac:db:subscriptions'
const SETTINGS_CACHE_KEY = 'stac:db:settings'
const USERS_CACHE_KEY = 'stac:db:users'

const DEFAULT_SETTINGS: DbSettings = {
  crypto_wallets: {
    usdt_trc20: 'TLyKq7z4v6x8n9P1Q2R3S4T5U6V7W8X9YZ',
    usdt_bep20: '0x71C8360f3a8b4FaA5cD4eA9F8E19cD61e4A58249',
  },
  pricing_plans: {
    pro_monthly: 200,
    pro_yearly: 400,
    vip_lifetime: 699,
  },
  telegram_config: {
    bot_token: '',
    channel_id: '',
    invite_link: 'https://t.me/pairlens_vip_alerts',
    auto_post: true,
  },
  admin_credentials: {
    pin: '09970997',
  },
}

const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch {}
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {}
  },
  dispatch: (name: string, detail?: any): void => {
    if (typeof window === 'undefined') return
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }))
    } catch {}
  },
}

export const SupabaseDataService = {
  // ---------------- USER AUTHENTICATION ----------------
  async signUp(name: string, email: string, passwordHash: string): Promise<AppUser> {
    const cleanEmail = email.toLowerCase().trim()
    const newUser: AppUser = {
      id: `usr_${Date.now()}`,
      name: name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'user', // Strictly 'user' - admin role requires Master PIN authentication
      plan: 'free', // All new accounts start on free plan
      created_at: new Date().toISOString(),
    }

    try {
      await supabase.from('app_users').insert([
        {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          password_hash: passwordHash,
          role: newUser.role,
          plan: newUser.plan,
        },
      ])
    } catch {}

    // Save in local users cache
    const existingUsers = this.getCachedUsers()
    const updatedUsers = [...existingUsers.filter((u) => u.email !== cleanEmail), newUser]
    safeStorage.setItem(USERS_CACHE_KEY, JSON.stringify(updatedUsers))

    // Set current active session
    safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser))
    safeStorage.removeItem('stac:vip:active')
    safeStorage.dispatch('stac:auth:changed', newUser)
    return newUser
  },

  async signIn(email: string, _passwordHash: string): Promise<AppUser> {
    const cleanEmail = email.toLowerCase().trim()

    try {
      const { data } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', cleanEmail)
        .single()

      if (data) {
        const user: AppUser = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role || 'user',
          plan: data.plan || 'free',
          created_at: data.created_at,
        }
        safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(user))
        safeStorage.dispatch('stac:auth:changed', user)
        // Also sync subscription verification from DB
        void this.syncUserSubscription(cleanEmail)
        return user
      }
    } catch {}

    // Check cached users
    const existingUsers = this.getCachedUsers()
    const found = existingUsers.find((u) => u.email === cleanEmail)
    if (found) {
      safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(found))
      safeStorage.dispatch('stac:auth:changed', found)
      void this.syncUserSubscription(cleanEmail)
      return found
    }

    // Auto sign-in / create session
    const fallbackUser: AppUser = {
      id: `usr_${Date.now()}`,
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'user',
      plan: 'free',
      created_at: new Date().toISOString(),
    }
    safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(fallbackUser))
    safeStorage.removeItem('stac:vip:active')
    safeStorage.dispatch('stac:auth:changed', fallbackUser)
    return fallbackUser
  },

  async syncUserSubscription(email?: string): Promise<AppUser | null> {
    const currentUser = this.getCurrentUser()
    const targetEmail = (email || currentUser?.email || '').toLowerCase().trim()
    if (!targetEmail) return currentUser

    try {
      // 1. If admin, retain admin & VIP privileges
      if (currentUser?.role === 'admin' || targetEmail === 'admin@pairlens.pro') {
        return currentUser
      }

      // 2. Query active subscriptions from Supabase DB
      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('email', targetEmail)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const now = Date.now()
      const validSub = subs?.find((s: DbSubscription) => {
        if (!s.expires_at) return true
        return new Date(s.expires_at).getTime() > now
      })

      const effectivePlan: 'free' | 'pro' | 'vip' = validSub
        ? (validSub.plan as 'pro' | 'vip')
        : 'free'

      if (currentUser && currentUser.email === targetEmail) {
        if (currentUser.plan !== effectivePlan) {
          currentUser.plan = effectivePlan
          safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser))
          safeStorage.dispatch('stac:auth:changed', currentUser)
        }
      }

      // Cleanup rogue local flag if not paid
      if (effectivePlan === 'free') {
        safeStorage.removeItem('stac:vip:active')
      }

      return currentUser
    } catch {
      return currentUser
    }
  },

  getCurrentUser(): AppUser | null {
    try {
      const saved = safeStorage.getItem(USER_SESSION_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  },

  signOut(): void {
    safeStorage.removeItem(USER_SESSION_KEY)
    safeStorage.removeItem('stac:vip:active')
    safeStorage.dispatch('stac:auth:changed', null)
  },

  getCachedUsers(): Array<AppUser> {
    try {
      const saved = safeStorage.getItem(USERS_CACHE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return []
  },

  async getAllUsers(): Promise<Array<AppUser>> {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, name, email, role, plan, created_at')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        safeStorage.setItem(USERS_CACHE_KEY, JSON.stringify(data))
        return data as Array<AppUser>
      }
    } catch {}

    return this.getCachedUsers()
  },

  // ---------------- TRADES ----------------
  async getTrades(): Promise<Array<DbTrade>> {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        safeStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(data))
        return data as Array<DbTrade>
      }
    } catch {}

    const cached = safeStorage.getItem(TRADES_CACHE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {}
    }
    return []
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
    safeStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(updated))
    safeStorage.dispatch('stac:db:trades:updated', updated)

    // Auto-broadcast to Telegram channel if enabled
    void this.broadcastToTelegram(newTrade, 'NEW_SIGNAL')

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
    const updated = existing.map((t) =>
      t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    )
    safeStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(updated))
    safeStorage.dispatch('stac:db:trades:updated', updated)
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

    // Auto-broadcast outcome update to Telegram channel if enabled
    void this.broadcastToTelegram({ ...trade, ...updates } as DbTrade, 'TRADE_CLOSED')
  },

  async broadcastToTelegram(
    trade: DbTrade,
    eventType: 'NEW_SIGNAL' | 'TRADE_CLOSED' = 'NEW_SIGNAL'
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const settings = await this.getSettings()
      const tg = settings?.telegram_config
      if (!tg || !tg.bot_token || !tg.channel_id || !tg.auto_post) {
        return { success: false, message: 'Telegram bot token or channel not configured' }
      }

      const isBuy = trade.type === 'BUY'
      let messageHtml = ''

      if (eventType === 'NEW_SIGNAL') {
        messageHtml =
          `🚀 <b>NEW VIP INSTITUTIONAL SIGNAL</b> 🚀\n\n` +
          `📊 <b>Pair:</b> <code>${trade.symbol}</code> (${isBuy ? '🟢 BUY / LONG' : '🔴 SELL / SHORT'})\n` +
          `🏷 <b>Asset Class:</b> ${trade.asset_class || 'Forex'}${trade.leverage ? ` | <b>Leverage:</b> ${trade.leverage}x` : ''}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🎯 <b>Entry Price:</b> <code>${trade.entry_price}</code>\n` +
          `🛑 <b>Stop Loss:</b> <code>${trade.sl_price}</code>\n` +
          `🎯 <b>Take Profit 1:</b> <code>${trade.tp1_price}</code>\n` +
          (trade.tp2_price ? `🎯 <b>Take Profit 2:</b> <code>${trade.tp2_price}</code>\n` : '') +
          (trade.tp3_price ? `🎯 <b>Take Profit 3:</b> <code>${trade.tp3_price}</code>\n` : '') +
          (trade.notes ? `\n📝 <b>Strategy Note:</b> <i>${trade.notes}</i>\n` : '') +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⚡ <i>Live on Pairlens Terminal VIP</i>`
      } else {
        const isWin = (trade.pnl_percent ?? 0) >= 0
        messageHtml =
          `${isWin ? '🎯 <b>TARGET REACHED & PROFIT LOCKED</b> 🎯' : '🛑 <b>TRADE CLOSED (STOP LOSS)</b> 🛑'}\n\n` +
          `📊 <b>Pair:</b> <code>${trade.symbol}</code> (${trade.type})\n` +
          `🏆 <b>Outcome:</b> <code>${trade.outcome?.toUpperCase() || 'CLOSED'}</code>\n` +
          `💰 <b>P&L:</b> <b>${isWin ? `+${trade.pnl_percent}%` : `${trade.pnl_percent}%`}</b> (${trade.pips ?? 0} pips)\n` +
          `🏁 <b>Exit Price:</b> <code>${trade.current_price ?? trade.tp1_price}</code>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⚡ <i>Verified by Pairlens Institutional Desk</i>`
      }

      // If chart screenshot exists, send photo with caption
      if (trade.chart_image_url && trade.chart_image_url.startsWith('http')) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${tg.bot_token.trim()}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: tg.channel_id.trim(),
              photo: trade.chart_image_url.trim(),
              caption: messageHtml,
              parse_mode: 'HTML',
            }),
          })
          if (res.ok) return { success: true }
        } catch {}
      }

      // Direct text message
      const res = await fetch(`https://api.telegram.org/bot${tg.bot_token.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tg.channel_id.trim(),
          text: messageHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      })

      if (res.ok) return { success: true }
      const errJson = await res.json()
      return { success: false, message: errJson?.description || 'Telegram API error' }
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to Telegram' }
    }
  },

  async deleteTrade(id: string): Promise<void> {
    try {
      await supabase.from('trades').delete().eq('id', id)
    } catch {}

    const existing = await this.getTrades()
    const updated = existing.filter((t) => t.id !== id)
    safeStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(updated))
    safeStorage.dispatch('stac:db:trades:updated', updated)
  },

  // ---------------- SUBSCRIPTIONS ----------------
  async getSubscriptions(): Promise<Array<DbSubscription>> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        safeStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(data))
        return data as Array<DbSubscription>
      }
    } catch {}

    const cached = safeStorage.getItem(SUBS_CACHE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {}
    }

    return []
  },

  async verifyBlockchainPayment(
    email: string,
    chain: 'TRC20' | 'BEP20',
    txHash: string,
    plan: 'pro' | 'vip',
    amount: number
  ): Promise<{ success: boolean; message: string }> {
    const cleanTx = txHash.trim()
    const cleanEmail = email.toLowerCase().trim()

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.')
    }

    if (!cleanTx) {
      throw new Error('Transaction Hash (TxID) is required. Please transfer USDT and enter the TxID.')
    }

    // 1. Strict Chain-specific Format Validation
    if (chain === 'TRC20') {
      const isTronHash = /^[a-fA-F0-9]{64}$/.test(cleanTx)
      if (!isTronHash) {
        throw new Error(
          'Invalid TRC-20 Transaction Hash. A Tron TxID must be exactly 64 hexadecimal characters.'
        )
      }
    } else if (chain === 'BEP20') {
      const isBscHash = /^0x[a-fA-F0-9]{64}$/.test(cleanTx)
      if (!isBscHash) {
        throw new Error(
          'Invalid BEP-20 Transaction Hash. A BNB Smart Chain TxID must start with 0x followed by 64 hexadecimal characters.'
        )
      }
    }

    // 2. Anti-Reuse / Double-Spend Prevention Check
    try {
      const { data: existingSubs } = await supabase
        .from('subscriptions')
        .select('id, email, status, tx_hash')
        .eq('tx_hash', cleanTx)
        .limit(1)

      if (existingSubs && existingSubs.length > 0) {
        throw new Error(
          'This Transaction Hash has already been used and activated. Duplicate transactions are not accepted.'
        )
      }
    } catch (err: any) {
      if (err.message && err.message.includes('already been used')) {
        throw err
      }
    }

    // 3. Live On-Chain Verification
    let verified = false
    let explorerNote = 'Transaction verified on blockchain'

    if (chain === 'TRC20') {
      try {
        const res = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${cleanTx}`, {
          headers: { Accept: 'application/json' },
        })
        if (res.ok) {
          const data = await res.json()
          if (data && (data.confirmed === true || data.contractRet === 'SUCCESS' || (data.block && data.block > 0))) {
            verified = true
            explorerNote = `Confirmed on TronScan (Block #${data.block || 'Confirmed'})`
          } else if (data && data.contractRet && data.contractRet !== 'SUCCESS') {
            throw new Error(`Tron transaction failed on-chain with status: ${data.contractRet}`)
          }
        }
      } catch (err: any) {
        if (err.message && err.message.includes('failed on-chain')) throw err
      }
    } else if (chain === 'BEP20') {
      try {
        const rpcPayload = {
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [cleanTx],
          id: 1,
        }
        // Try BSC public RPC endpoints
        const endpoints = ['https://bsc-dataseed.binance.org', 'https://binance.llamarpc.com', 'https://bsc-rpc.publicnode.com']
        for (const endpoint of endpoints) {
          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rpcPayload),
            })
            if (res.ok) {
              const data = await res.json()
              if (data && data.result) {
                if (data.result.status === '0x1') {
                  verified = true
                  explorerNote = 'Confirmed on BNB Smart Chain (BEP-20 Status 0x1 Success)'
                  break
                } else if (data.result.status === '0x0') {
                  throw new Error('BNB Smart Chain (BEP-20) transaction execution failed (Reverted).')
                }
              }
            }
          } catch (e: any) {
            if (e.message && e.message.includes('failed')) throw e
          }
        }
      } catch (err: any) {
        if (err.message && err.message.includes('failed')) throw err
      }
    }

    // 4. Strict Enforcement: If not confirmed on-chain, reject!
    if (!verified) {
      throw new Error(
        `Unable to verify on-chain payment. No confirmed ${chain} transaction found for TxID: ${cleanTx.slice(0, 10)}... Please wait until your wallet broadcast confirms on the blockchain and try again.`
      )
    }

    // 5. Record verified subscription in Supabase DB
    await this.createSubscription({
      email: cleanEmail,
      plan,
      status: 'active',
      chain,
      tx_hash: cleanTx,
      amount_usdt: amount,
    })

    // 6. Update user plan in app_users table
    try {
      await supabase
        .from('app_users')
        .update({ plan })
        .eq('email', cleanEmail)
    } catch {}

    // 7. Update active user session
    const currentUser = this.getCurrentUser()
    if (currentUser && currentUser.email === cleanEmail) {
      currentUser.plan = plan
      safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser))
      safeStorage.dispatch('stac:auth:changed', currentUser)
    }

    return { success: true, message: explorerNote }
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
          : (sub.amount_usdt && sub.amount_usdt >= 350)
            ? new Date(Date.now() + 86400000 * 365).toISOString()
            : new Date(Date.now() + 86400000 * 180).toISOString()),
    }

    try {
      await supabase.from('subscriptions').insert([newSub])
    } catch {}

    const existing = await this.getSubscriptions()
    const updated = [newSub, ...existing.filter((s) => s.id !== newSub.id)]
    safeStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(updated))
    safeStorage.dispatch('stac:db:subs:updated', updated)
    return newSub
  },

  async updateSubscription(id: string, updates: Partial<DbSubscription>): Promise<void> {
    try {
      await supabase.from('subscriptions').update(updates).eq('id', id)
      if (updates.status === 'active') {
        const existing = await this.getSubscriptions()
        const target = existing.find((s) => s.id === id)
        if (target && target.email) {
          await supabase
            .from('app_users')
            .update({ plan: updates.plan || target.plan })
            .eq('email', target.email)

          const curr = this.getCurrentUser()
          if (curr && curr.email === target.email) {
            curr.plan = updates.plan || target.plan
            safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(curr))
            safeStorage.dispatch('stac:auth:changed', curr)
          }
        }
      }
    } catch {}

    const existing = await this.getSubscriptions()
    const updated = existing.map((s) => (s.id === id ? { ...s, ...updates } : s))
    safeStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(updated))
    safeStorage.dispatch('stac:db:subs:updated', updated)
  },

  async deleteSubscription(id: string): Promise<void> {
    try {
      await supabase.from('subscriptions').delete().eq('id', id)
    } catch {}

    const existing = await this.getSubscriptions()
    const updated = existing.filter((s) => s.id !== id)
    safeStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(updated))
    safeStorage.dispatch('stac:db:subs:updated', updated)
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
          if (row.key === 'telegram_config') merged.telegram_config = row.value
        })
        safeStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(merged))
        return merged
      }
    } catch {}

    const cached = safeStorage.getItem(SETTINGS_CACHE_KEY)
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
        { key: 'telegram_config', value: settings.telegram_config, updated_at: new Date().toISOString() },
      ])
    } catch {}

    safeStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
    safeStorage.dispatch('stac:db:settings:updated', settings)
  },
}
