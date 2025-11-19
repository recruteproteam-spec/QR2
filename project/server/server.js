import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'u845174030_qrticketadmin',
  password: 'Amine@@@1991',
  database: 'u845174030_qrticketpro',
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
};

console.log('🔗 Tentative de connexion à MySQL...');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);

// Test de connexion MySQL
async function testConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion MySQL réussie !');
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion MySQL:', error.message);
    return false;
  }
}

// Initialisation de la base de données
app.get('/init_database.php', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Créer la table users
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        monthly_ticket_limit INT DEFAULT 50,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Créer la table events
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT,
        address VARCHAR(500),
        category VARCHAR(100),
        capacity INT DEFAULT 0,
        image VARCHAR(500),
        price DECIMAL(10,2) DEFAULT 0.00,
        logo VARCHAR(500),
        whatsapp_number VARCHAR(20),
        tickets_sold INT DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0.00,
        organizer_id VARCHAR(50),
        ticket_types JSON,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (organizer_id) REFERENCES users(id)
      )
    `);

    // Créer la table tickets
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(50) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        event_name VARCHAR(255),
        event_date DATE,
        location VARCHAR(255),
        price DECIMAL(10,2) DEFAULT 0.00,
        custom_price DECIMAL(10,2),
        qr_code TEXT,
        is_custom BOOLEAN DEFAULT FALSE,
        image VARCHAR(500),
        start_time TIME,
        end_time TIME,
        ticket_type VARCHAR(100) DEFAULT 'Standard',
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_used BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (event_id) REFERENCES events(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Créer l'admin par défaut
    const adminEmail = 'admin@eventticket.com';
    const adminPassword = 'admin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminId = uuidv4();

    await connection.execute(`
      INSERT IGNORE INTO users (id, email, password_hash, name, role, monthly_ticket_limit) 
      VALUES (?, ?, ?, 'Admin', 'admin', -1)
    `, [adminId, adminEmail, hashedPassword]);

    await connection.end();
    
    res.json({ 
      success: true, 
      message: 'Base de données initialisée avec succès',
      admin: { email: adminEmail, password: adminPassword }
    });
  } catch (error) {
    console.error('Erreur init_database:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login utilisateur
app.post('/login_user.php', async (req, res) => {
  try {
    const { email, password } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (rows.length === 0) {
      await connection.end();
      return res.status(401).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await connection.end();
      return res.status(401).json({ success: false, error: 'Mot de passe incorrect' });
    }

    // Mettre à jour last_login
    await connection.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    await connection.end();

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        monthlyTicketLimit: user.monthly_ticket_limit,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer tous les utilisateurs
app.get('/get_users.php', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT id, email, name, role, monthly_ticket_limit, is_active, last_login, created_at
      FROM users 
      ORDER BY created_at DESC
    `);

    // Mapper les noms de colonnes vers les propriétés attendues par le frontend
    const users = rows.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      monthlyTicketLimit: user.monthly_ticket_limit,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at
    }));

    await connection.end();
    
    res.json({ success: true, users: users });
  } catch (error) {
    console.error('Erreur get_users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Créer un utilisateur
app.post('/create_user.php', async (req, res) => {
  try {
    let { email, password, name, role = 'user', monthlyTicketLimit = 50 } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Générer un mot de passe si vide
    if (!password) {
      password = crypto.randomBytes(6).toString('hex');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    const [result] = await connection.execute(`
      INSERT INTO users (id, email, password_hash, name, role, monthly_ticket_limit) 
      VALUES (?, ?, ?, ?, ?)
    `, [userId, email, hashedPassword, name, role, monthlyTicketLimit]);

    await connection.end();
    
    res.json({ 
      success: true, 
      user: {
        id: userId,
        email: email,
        name: name,
        role: role,
        isActive: true,
        createdAt: new Date().toISOString(),
        monthlyTicketLimit: monthlyTicketLimit
      },
      password: password
    });
  } catch (error) {
    console.error('Erreur create_user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mettre à jour un utilisateur
app.post('/update_user.php', async (req, res) => {
  try {
    const { id, ...updates } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Construire la requête dynamiquement
    const updateFields = [];
    const values = [];
    
    if (updates.email !== undefined) {
      updateFields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.role !== undefined) {
      updateFields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.monthlyTicketLimit !== undefined) {
      updateFields.push('monthly_ticket_limit = ?');
      values.push(updates.monthlyTicketLimit);
    }
    if (updates.isActive !== undefined) {
      updateFields.push('is_active = ?');
      values.push(updates.isActive);
    }
    
    if (updateFields.length === 0) {
      await connection.end();
      return res.json({ success: true, message: 'Aucune mise à jour nécessaire' });
    }
    
    values.push(id);
    
    await connection.execute(`
      UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
    `, values);

    await connection.end();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur update_user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compter les tickets mensuels
app.get('/get_monthly_ticket_count.php', async (req, res) => {
  try {
    const { userId } = req.query;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM tickets 
      WHERE user_id = ? AND MONTH(generated_at) = ? AND YEAR(generated_at) = ?
    `, [userId, currentMonth, currentYear]);

    await connection.end();
    
    res.json({ success: true, count: rows[0].count });
  } catch (error) {
    console.error('Erreur get_monthly_ticket_count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Créer un ticket
app.post('/create_ticket.php', async (req, res) => {
  try {
    const { 
      eventId, 
      userId, 
      ticketType = 'Standard',
      eventName,
      eventDate,
      location,
      price,
      customPrice,
      qrCode,
      isCustom = false,
      image,
      startTime,
      endTime
    } = req.body;
    const ticketId = uuidv4();
    
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(`
      INSERT INTO tickets (
        id, event_id, user_id, ticket_type, event_name, event_date, 
        location, price, custom_price, qr_code, is_custom, image, 
        start_time, end_time, generated_at, purchase_date
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      ticketId, eventId, userId, ticketType, eventName, eventDate,
      location, price, customPrice, qrCode, isCustom, image,
      startTime, endTime
    ]);

    await connection.end();
    
    res.json({ success: true, ticketId: ticketId });
  } catch (error) {
    console.error('Erreur create_ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer les événements
app.get('/get_events.php', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT * FROM events 
      ORDER BY date ASC
    `);

    await connection.end();
    
    res.json({ success: true, events: rows });
  } catch (error) {
    console.error('Erreur get_events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Créer un événement
app.post('/create_event.php', async (req, res) => {
  try {
    const { name, date, startTime, endTime, location, description, price, logo, createdBy } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    const eventId = uuidv4();
    
    const [result] = await connection.execute(`
      INSERT INTO events (id, name, date, start_time, end_time, location, description, price, logo, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [eventId, name, date, startTime, endTime, location, description, price, logo, createdBy]);

    await connection.end();
    
    res.json({ success: true, eventId: eventId });
  } catch (error) {
    console.error('Erreur create_event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Démarrer le serveur
app.listen(PORT, async () => {
  console.log(`🚀 Serveur Node.js démarré sur le port ${PORT}`);
  
  // Tester la connexion MySQL au démarrage
  const connected = await testConnection();
  if (connected) {
    console.log('✅ Serveur prêt ! Visitez http://localhost:8080/init_database.php pour initialiser la DB');
  } else {
    console.log('⚠️  Serveur démarré mais problème de connexion MySQL');
  }
});