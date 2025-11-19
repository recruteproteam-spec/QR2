/*
  # Schéma initial Event Ticket Scanner avec stockage de fichiers optimisé

  1. Nouvelles Tables
    - `users` - Utilisateurs de l'application avec authentification
      - `id` (uuid, clé primaire)
      - `auth_id` (uuid, référence vers auth.users)
      - `email` (text, unique)
      - `name` (text)
      - `role` (text: admin, organizer, user)
      - `created_at`, `updated_at` (timestamptz)
      
    - `events` - Événements pouvant avoir des tickets
      - `id` (uuid, clé primaire)
      - `title`, `description` (text)
      - `date` (timestamptz)
      - `location` (text)
      - `max_tickets` (integer)
      - `price` (decimal)
      - `image_url` (text) - URL vers Supabase Storage
      - `organizer_id` (uuid, référence vers users)
      - `created_at`, `updated_at` (timestamptz)
      
    - `tickets` - Tickets individuels pour les événements
      - `id` (uuid, clé primaire)
      - `event_id` (uuid, référence vers events)
      - `user_id` (uuid, référence vers users)
      - `ticket_number` (text, unique)
      - `qr_code_url` (text) - URL vers Supabase Storage (au lieu de stocker les données)
      - `image_url` (text) - URL vers Supabase Storage
      - `status` (text: valid, used, cancelled)
      - `price` (decimal)
      - `created_at`, `used_at` (timestamptz)
      
    - `scans` - Historique de scan des tickets
      - `id` (uuid, clé primaire)
      - `ticket_id` (uuid, référence vers tickets)
      - `scanned_by` (uuid, référence vers users)
      - `scanned_at` (timestamptz)
      - `location`, `notes` (text)

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour utilisateurs authentifiés
    - Accès sécurisé basé sur les rôles
    - Les fichiers (QR codes, images) sont stockés dans Supabase Storage

  3. Fonctionnalités
    - Gestion des utilisateurs avec rôles
    - Création et gestion d'événements
    - Génération de tickets avec QR codes (stockés comme fichiers)
    - Suivi et validation des scans
    - Optimisation du stockage: URLs au lieu de données binaires
*/

-- Créer la table users (étend auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'organizer', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer la table events
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

-- Créer la table tickets avec URLs au lieu de données binaires
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ticket_number text UNIQUE NOT NULL,
  qr_code_url text,
  image_url text,
  status text DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
  price decimal(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);

-- Créer la table scans pour le suivi de l'utilisation des tickets
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  scanned_by uuid REFERENCES users(id) ON DELETE CASCADE,
  scanned_at timestamptz DEFAULT now(),
  location text,
  notes text
);

-- Activer Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Politiques pour users
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

-- Politiques pour events
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

-- Politiques pour tickets
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

-- Politiques pour scans
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

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_scans_ticket_id ON scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_by ON scans(scanned_by);

-- Ajouter des commentaires pour documenter les colonnes de stockage
COMMENT ON COLUMN tickets.qr_code_url IS 'URL du QR code stocké dans Supabase Storage - NE PAS stocker les données dans la base';
COMMENT ON COLUMN tickets.image_url IS 'URL de l''image du ticket stockée dans Supabase Storage - NE PAS stocker les données dans la base';
COMMENT ON COLUMN events.image_url IS 'URL de l''image de l''événement stockée dans Supabase Storage - NE PAS stocker les données dans la base';

-- Créer une fonction pour créer automatiquement un profil utilisateur lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer un trigger pour les nouveaux utilisateurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Créer des buckets de storage (cette partie sera exécutée via l'API Supabase)
-- Les buckets suivants doivent être créés:
-- 1. ticket-qrcodes (public: false) - pour les QR codes des tickets
-- 2. ticket-images (public: false) - pour les images personnalisées des tickets  
-- 3. event-images (public: true) - pour les images des événements