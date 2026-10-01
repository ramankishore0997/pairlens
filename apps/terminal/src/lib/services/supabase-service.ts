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
    pro_monthly: 29,
    pro_yearly: 199,
    vip_lifetime: 499,
  },
  admin_credentials: {
    pin: '09970997',
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
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(updatedUsers))

    // Set current active session
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser))
    localStorage.removeItem('stac:vip:active')
    window.dispatchEvent(new CustomEvent('stac:auth:changed', { detail: newUser }))
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
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user))
        window.dispatchEvent(new CustomEvent('stac:auth:changed', { detail: user }))
        // Also sync subscription verification from DB
        void this.syncUserSubscription(cleanEmail)
        return user
      }
    } catch {}

    // Check cached users
    const existingUsers = this.getCachedUsers()
    const found = existingUsers.find((u) => u.email === cleanEmail)
    if (found) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(found))
      window.dispatchEvent(new CustomEvent('stac:auth:changed', { detail: found }))
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
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(fallbackUser))
    localStorage.removeItem('stac:vip:active')
    window.dispatchEvent(new CustomEvent('stac:auth:changed', { detail: fallbackUser }))
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
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser))
          window.dispatchEvent(new CustomEvent('stac:auth:changed', { detail: currentUser }))
        }
      }

      // Cleanup rogue local flag if not paid
      if (effectivePlan === 'free') {
        localStorage.removeItem('stac:vip:active')
      }

      return currentUser
    } catch {
      return currentUser
    }
  },

  getCurrentUser(): AppUser | null {
    try {
      const saved = localStorage.getItem(USER_SESSION_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  },

  signOut(): void {
    localStorage.removeItem(USER_SESSION_KEY)
    localStorage.removeItem('stac:vip:active')
    window.dispatchEvent(new CustomEvent('stac:auth:changed', { detail: null }))
  },

  getCachedUsers(): Array<AppUser> {
    try {
      const saved = localStorage.getItem(USERS_CACHE_KEY)
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
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(data))
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
    const updated = existing.map((t) =>
      t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    )
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

      if (!error && data) {
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
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser))
      window.dispatchEvent(new CustomEvent('stac:auth:changed', { detail: currentUser }))
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
            localStorage.setItem(USER_SESSION_KEY, JSON.stringify(curr))
            window.dispatchEvent(new CustomEvent('stac:auth:changed', { detail: curr }))
          }
        }
      }
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
