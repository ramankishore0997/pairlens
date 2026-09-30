import { Client } from 'pg';

const connectionString = 'postgresql://postgres.fginmwbygletrkisvcwz:Raman0997%40%23@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function initDb() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected successfully!');

    // Create trades table
    await client.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id VARCHAR(64) PRIMARY KEY,
        symbol VARCHAR(32) NOT NULL,
        type VARCHAR(10) NOT NULL,
        asset_class VARCHAR(20) DEFAULT 'forex',
        entry_price NUMERIC NOT NULL,
        sl_price NUMERIC NOT NULL,
        tp1_price NUMERIC NOT NULL,
        tp2_price NUMERIC,
        tp3_price NUMERIC,
        current_price NUMERIC,
        leverage NUMERIC DEFAULT 1,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'active',
        outcome VARCHAR(20) DEFAULT 'open',
        pnl_percent NUMERIC DEFAULT 0,
        pips NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        closed_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Table "trades" verified/created.');

    // Create subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        wallet_address VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'pro',
        status VARCHAR(20) DEFAULT 'active',
        tx_hash VARCHAR(255),
        amount_usdt NUMERIC DEFAULT 0,
        chain VARCHAR(50) DEFAULT 'TRC20',
        starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Table "subscriptions" verified/created.');

    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Table "admin_settings" verified/created.');

    // Insert initial default settings if not exists
    await client.query(`
      INSERT INTO admin_settings (key, value)
      VALUES 
        ('crypto_wallets', '{"usdt_trc20": "TXYZ1234567890USDTAddressHere", "usdt_erc20": "0x1234567890123456789012345678901234567890", "solana": "SOL1234567890SolanaWalletAddressHere"}'::jsonb),
        ('pricing_plans', '{"pro_monthly": 29, "pro_yearly": 199, "vip_lifetime": 499}'::jsonb),
        ('admin_credentials', '{"pin": "9970", "password_hash": "admin123"}'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `);

    // Insert sample trades if table is empty
    const tradesCount = await client.query('SELECT COUNT(*) FROM trades');
    if (parseInt(tradesCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO trades (id, symbol, type, asset_class, entry_price, sl_price, tp1_price, tp2_price, tp3_price, leverage, notes, status, outcome, pnl_percent, pips)
        VALUES 
          ('tr_1', 'EUR/USD', 'BUY', 'forex', 1.08500, 1.08150, 1.08950, 1.09400, 1.10000, 50, 'Strong bullish momentum following ECB rate release. Watch 1.0890 resistance.', 'active', 'open', 0, 0),
          ('tr_2', 'XAU/USD', 'BUY', 'forex', 2735.50, 2718.00, 2755.00, 2775.00, 2800.00, 20, 'Gold breakout above daily flag pattern. Target 1 reached soon.', 'active', 'open', 0, 0),
          ('tr_3', 'GBP/JPY', 'SELL', 'forex', 194.200, 195.100, 193.000, 192.100, 191.000, 30, 'Rejection from 4H resistance zone. Bearish confluence.', 'active', 'open', 0, 0),
          ('tr_4', 'BTC/USDT', 'BUY', 'crypto', 94200.00, 92500.00, 96500.00, 98000.00, 102000.00, 10, 'Daily trend continuation. SL below swing low.', 'active', 'open', 0, 0),
          ('tr_5', 'USD/JPY', 'BUY', 'forex', 152.100, 151.400, 153.200, 154.000, 155.000, 50, 'Hit Target 1 (+110 pips). Move SL to breakeven.', 'closed', 'tp1', 4.5, 110)
      `);
      console.log('Sample trades inserted.');
    }

    console.log('Database initialization completed successfully!');
  } catch (err) {
    console.error('Database connection / init error:', err);
  } finally {
    await client.end();
  }
}

initDb();
