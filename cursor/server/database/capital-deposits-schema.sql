-- Capital Balance (자본금 잔액) Table
-- Stores monthly capital balance snapshots, always on the 1st of each month
CREATE TABLE IF NOT EXISTS capital_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  balance_date DATE NOT NULL UNIQUE, -- Always the 1st of the month (YYYY-MM-01)
  amount DECIMAL(15, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_balance_date_first_of_month CHECK (EXTRACT(DAY FROM balance_date) = 1)
);

CREATE INDEX IF NOT EXISTS idx_capital_balance_date ON capital_balance(balance_date DESC);

-- Deposits (보증금) Table
-- Stores deposit information for various properties and services
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name VARCHAR(255) NOT NULL UNIQUE, -- e.g., "대표 집", "미유씨 집", etc.
  amount DECIMAL(15, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deposits_item_name ON deposits(item_name);

-- Insert initial capital balance data (2023-10-01 to 2025-11-01)
INSERT INTO capital_balance (balance_date, amount) VALUES
  ('2023-10-01', 3333683),
  ('2023-11-01', 3090368),
  ('2023-12-01', 6287181),
  ('2024-01-01', 7637317),
  ('2024-02-01', 9022407),
  ('2024-03-01', 11236021),
  ('2024-04-01', 13771702),
  ('2024-05-01', 15667907),
  ('2024-06-01', 19325857),
  ('2024-07-01', 14039504),
  ('2024-08-01', 12432043),
  ('2024-09-01', 12811274),
  ('2024-10-01', 15615363),
  ('2024-11-01', 16257668),
  ('2024-12-01', 19482447),
  ('2025-01-01', 21353061),
  ('2025-02-01', 16619846),
  ('2025-03-01', 20061068),
  ('2025-04-01', 20057090),
  ('2025-05-01', 21307983),
  ('2025-06-01', 21519439),
  ('2025-07-01', 22226795),
  ('2025-08-01', 21152712),
  ('2025-09-01', 23600364),
  ('2025-10-01', 28329901),
  ('2025-11-01', 31799866)
ON CONFLICT (balance_date) DO NOTHING;

-- Insert initial deposit data
INSERT INTO deposits (item_name, amount) VALUES
  ('대표 집', 360000),
  ('미유씨 집', 104000),
  ('docomo', 50000),
  ('가치도키 사무실', 8749440),
  ('제이씨 집', 116000)
ON CONFLICT (item_name) DO NOTHING;

