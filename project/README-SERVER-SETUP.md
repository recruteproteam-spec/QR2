# Server Setup Instructions

## ⚠️ IMPORTANT: Complete Setup Required

**The application requires both PHP backend AND frontend to be running simultaneously.**

### Quick Start (Recommended)

1. **Start both servers at once:**
   ```bash
   npm run start:full
   ```
   This will start both the PHP server (port 8080) and the frontend (port 5173).

2. **Initialize the database (REQUIRED):**
   Open http://localhost:8080/init_database.php in your browser and follow the instructions.

3. **Access the application:**
   Open http://localhost:5173 in your browser.

---

## Quick Start

1. **Start the PHP server:**
   ```bash
   npm run server
   ```

2. **Initialize the database:**
   ```bash
   npm run setup-db
   ```
   Then open http://localhost:8080/init_database.php in your browser.

3. **Start the frontend:**
   ```bash
   npm run dev
   ```

## Detailed Setup

### Prerequisites

- PHP 7.4 or higher installed on your system
- MySQL database server running
- Node.js and npm

### Step 1: Install PHP

**Windows:**
- Download PHP from https://www.php.net/downloads
- Or install XAMPP from https://www.apachefriends.org/

**macOS:**
```bash
brew install php
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install php php-mysql php-pdo
```

### Step 2: Verify PHP Installation

```bash
php --version
```

### Step 3: Start the PHP Server

```bash
npm run server
```

This will start a PHP development server on http://localhost:8080

### Step 4: Initialize Database

Open your browser and go to:
http://localhost:8080/init_database.php

This will:
- Create the necessary database tables
- Set up the default admin user
- Verify the database connection

### Step 5: Start Frontend

In a new terminal:
```bash
npm run dev
```

## Troubleshooting

### Error: "PHP is not installed or not in PATH"

**Solution:** Install PHP and make sure it's in your system PATH.

### Error: "ECONNREFUSED 127.0.0.1:8080"

**Solution:** Make sure the PHP server is running with `npm run server`.

### Error: "HTTP 500: Internal Server Error"

**Solutions:**
1. Check that MySQL is running
2. Verify database credentials in `server/config.php`
3. Run the database initialization: http://localhost:8080/init_database.php
4. Check PHP error logs

### Database Connection Issues

1. Make sure MySQL is running
2. Verify the database exists: `u845174030_qrticketpro`
3. Check user permissions for: `u845174030_qrticketadmin`
4. Update credentials in `server/config.php` if needed

## API Endpoints

Once the server is running, these endpoints will be available:

- `POST /create_ticket.php` - Create a new ticket
- `GET /get_tickets.php` - Get tickets (with optional userId parameter)
- `GET /validate.php?id=TICKET_ID` - Validate a ticket
- `POST /insert_ticket.php` - Insert ticket record
- `GET /init_database.php` - Initialize database

## Default Admin User

After running the database initialization:
- Email: admin@eventticket.com
- Password: admin123!

## Production Notes

For production deployment:
- Use a proper web server (Apache/Nginx)
- Configure SSL/HTTPS
- Use environment variables for database credentials
- Enable proper error logging
- Set up database backups