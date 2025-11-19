/*
  # Event Ticket Scanner Database Schema

  1. New Tables
    - `users` - Application users with authentication
    - `events` - Events that can have tickets
    - `tickets` - Individual tickets for events
    - `scans` - Ticket scan history

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure access based on user roles

  3. Features
    - User management with roles (admin, organizer, user)
    - Event creation and management
    - Ticket generation with QR codes
    - Scan tracking and validation
*/

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'organizer', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date timestamptz NOT NULL,
  location text NOT NULL,
  max_tickets integer DEFAULT 100,
  price decimal(10,2) DEFAULT 0.00,
  image_url text,
  organizer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ticket_number text UNIQUE NOT NULL,
  qr_code text NOT NULL,
  status text DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
  price decimal(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);

-- Create scans table for tracking ticket usage
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  scanned_by uuid REFERENCES users(id) ON DELETE CASCADE,
  scanned_at timestamptz DEFAULT now(),
  location text,
  notes text
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Events policies
CREATE POLICY "Anyone can read events"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Organizers and admins can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

CREATE POLICY "Event organizers and admins can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    organizer_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Tickets policies
CREATE POLICY "Users can read own tickets"
  ON tickets
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

CREATE POLICY "Authenticated users can create tickets"
  ON tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers and admins can update tickets"
  ON tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = event_id AND u.auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Scans policies
CREATE POLICY "Organizers and admins can read scans"
  ON scans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN events e ON t.event_id = e.id
      JOIN users u ON e.organizer_id = u.id
      WHERE t.id = ticket_id AND u.auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Organizers and admins can create scans"
  ON scans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    scanned_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_scans_ticket_id ON scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_by ON scans(scanned_by);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();