import { Client } from 'pg';

const connectionString = 'postgresql://postgres.fginmwbygletrkisvcwz:Raman0997%40%23@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function updateDb() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected!');

    // Create app_users table for Sign Up / Sign In
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        plan VARCHAR(20) DEFAULT 'free',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Table "app_users" verified/created.');

    // Remove all demo trades
    await client.query('DELETE FROM trades;');
    console.log('All demo trades removed.');

    // Remove all demo subscriptions
    await client.query('DELETE FROM subscriptions;');
    console.log('All demo subscriptions removed.');

    // Update admin PIN to 09970997
    await client.query(`
      INSERT INTO admin_settings (key, value)
      VALUES ('admin_credentials', '{"pin": "09970997"}'::jsonb)
      ON CONFLICT (key) DO UPDATE
      SET value = '{"pin": "09970997"}'::jsonb, updated_at = NOW();
    `);
    console.log('Admin password / PIN set to 09970997 in database.');

    console.log('Done!');
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await client.end();
  }
}

updateDb();
