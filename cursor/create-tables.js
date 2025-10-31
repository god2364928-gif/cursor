const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

const createTablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  team VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  status VARCHAR(50) DEFAULT 'todo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test user
INSERT INTO users (name, email, password, team, role) VALUES
  ('테스트 사용자', 'test@example.com', 'hashedpassword123', '마케팅팀', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert test team
INSERT INTO teams (name) VALUES ('마케팅팀') ON CONFLICT DO NOTHING;
`;

async function createTables() {
  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    
    console.log('✅ Connected!');
    console.log('📝 Creating tables...');
    
    await client.query(createTablesSQL);
    
    console.log('✅ Tables created successfully!');
    console.log('📊 Database is ready to use!');
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

createTables();


