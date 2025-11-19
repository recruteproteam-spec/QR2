-- Script SQL pour créer la table users dans votre base de données
-- Exécutez ce script dans votre base de données MySQL

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    ticket_limit INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- Insérer l'utilisateur admin par défaut avec le bon hash pour 'admin123!'
INSERT INTO users (id, name, email, password_hash, role, is_active, ticket_limit, created_at) 
VALUES (
    'admin_default', 
    'Administrateur', 
    'admin@eventticket.com', 
    '$2y$10$7wCkWtAFrYlpUqkqxjKOHOxTiaqQZtwGcU/Ra0LMy5.Jn5fQq3QJy', -- password: admin123!
    'admin', 
    TRUE, 
    -1, 
    NOW()
) ON DUPLICATE KEY UPDATE 
    password_hash = '$2y$10$7wCkWtAFrYlpUqkqxjKOHOxTiaqQZtwGcU/Ra0LMy5.Jn5fQq3QJy',
    name = 'Administrateur',
    role = 'admin',
    is_active = TRUE,
    ticket_limit = -1;