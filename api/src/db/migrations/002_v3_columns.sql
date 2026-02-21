ALTER TABLE markets ADD COLUMN source_chain_id INTEGER;
ALTER TABLE markets ADD COLUMN source_pool TEXT;
ALTER TABLE markets ADD COLUMN source_token TEXT;
ALTER TABLE markets ADD COLUMN oracle_endpoint TEXT;
ALTER TABLE markets ADD COLUMN snapshot_price TEXT;
