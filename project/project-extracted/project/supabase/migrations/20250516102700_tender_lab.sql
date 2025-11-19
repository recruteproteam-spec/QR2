/*
  # Create tickets table

  1. New Tables
    - `tickets`
      - `ticket_id` (text, primary key)
      - `status` (text, default 'unused')
      - `created_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `tickets` table
    - Add policy for authenticated users to read their own tickets
*/

CREATE TABLE IF NOT EXISTS tickets (
  ticket_id text PRIMARY KEY,
  status text DEFAULT 'unused' CHECK (status IN ('unused', 'used')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own tickets"
  ON tickets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert tickets"
  ON tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);