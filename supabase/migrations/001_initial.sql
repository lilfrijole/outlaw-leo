-- Players table: tracks wallet addresses and their credit balance
CREATE TABLE IF NOT EXISTS players (
  wallet_address TEXT PRIMARY KEY,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leaderboard table: stores high scores
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address),
  initials TEXT NOT NULL CHECK (char_length(initials) = 3),
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leaderboard_score ON leaderboard(score DESC);

-- Transactions table: records credit purchases for audit
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES players(wallet_address),
  tx_hash TEXT UNIQUE NOT NULL,
  amount_microcredits BIGINT NOT NULL,
  credits_granted INTEGER NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_wallet ON transactions(wallet_address);

-- Auto-update updated_at on players
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for leaderboard"
  ON leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Service role full access to players"
  ON players FOR ALL
  USING (true);

CREATE POLICY "Service role full access to leaderboard"
  ON leaderboard FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role full access to transactions"
  ON transactions FOR ALL
  USING (true);
