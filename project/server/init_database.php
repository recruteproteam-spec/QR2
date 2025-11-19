<?php
require_once 'config.php';

// Set content type to HTML for better display in browser
header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html lang='fr'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Initialisation de la base de données QRticketPro</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        .info { color: #3b82f6; }
        .warning { color: #f59e0b; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .step { margin: 20px 0; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🚀 Initialisation de la base de données QRticketPro</h1>";

try {
    echo "<div class='step'>";
    echo "<h2>🔗 Connexion à la base de données</h2>";
    echo "<p class='info'>Tentative de connexion à la base de données u845174030_qrticketpro...</p>";
    
    // Create connection using your credentials
    $pdo = createDatabaseConnection();
    
    // Verify connection with your specific database
    $stmt = $pdo->query("SELECT DATABASE() as current_db, VERSION() as mysql_version");
    $dbInfo = $stmt->fetch();
    
    echo "<p class='success'>✅ Connexion réussie !</p>";
    echo "<ul>";
    echo "<li><strong>Base de données :</strong> " . $dbInfo['current_db'] . "</li>";
    echo "<li><strong>Version MySQL :</strong> " . $dbInfo['mysql_version'] . "</li>";
    echo "<li><strong>Utilisateur :</strong> u845174030_qrticketadmin</li>";
    echo "</ul>";
    echo "</div>";

    echo "<div class='step'>";
    echo "<h2>📋 Création des tables</h2>";
    
    // Create tickets table with proper schema
    $createTicketsTable = "
        CREATE TABLE IF NOT EXISTS tickets (
            id VARCHAR(100) PRIMARY KEY,
            event_id VARCHAR(50) NOT NULL,
            user_id VARCHAR(50) NOT NULL,
            event_name VARCHAR(255) NOT NULL,
            event_date DATE NOT NULL,
            location VARCHAR(255) NOT NULL,
            ticket_type VARCHAR(100) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            custom_price DECIMAL(10, 2) NULL,
            qr_code VARCHAR(255) UNIQUE NOT NULL,
            is_custom BOOLEAN DEFAULT FALSE,
            image TEXT NULL,
            start_time TIME NULL,
            end_time TIME NULL,
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_used BOOLEAN DEFAULT FALSE,
            INDEX idx_event_id (event_id),
            INDEX idx_user_id (user_id),
            INDEX idx_qr_code (qr_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createTicketsTable);
    echo "<p class='success'>✅ Table 'tickets' créée ou mise à jour avec succès</p>";
    
    // Update users table to match the existing schema
    $createUsersTable = "
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createUsersTable);
    echo "<p class='success'>✅ Table 'users' créée ou mise à jour avec succès</p>";
    
    // Update events table to match the application schema
    $createEventsTable = "
        CREATE TABLE IF NOT EXISTS events (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            event_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            location VARCHAR(255) NOT NULL,
            address VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            capacity INT NOT NULL,
            image TEXT NULL,
            logo TEXT NULL,
            whatsapp_number VARCHAR(20) NOT NULL,
            tickets_sold INT DEFAULT 0,
            revenue DECIMAL(10, 2) DEFAULT 0.00,
            organizer_id VARCHAR(50) NOT NULL,
            ticket_types JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_event_date (event_date),
            INDEX idx_organizer (organizer_id),
            INDEX idx_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createEventsTable);
    echo "<p class='success'>✅ Table 'events' créée ou mise à jour avec succès</p>";
    
    // Create user_statistics table
    $createUserStatsTable = "
        CREATE TABLE IF NOT EXISTS user_statistics (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            total_tickets INT DEFAULT 0,
            custom_tickets INT DEFAULT 0,
            total_spent DECIMAL(10, 2) DEFAULT 0.00,
            events_attended INT DEFAULT 0,
            favorite_category VARCHAR(100) NULL,
            last_ticket_date DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createUserStatsTable);
    echo "<p class='success'>✅ Table 'user_statistics' créée ou mise à jour avec succès</p>";
    
    // Create monthly_statistics table
    $createMonthlyStatsTable = "
        CREATE TABLE IF NOT EXISTS monthly_statistics (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            year INT NOT NULL,
            month INT NOT NULL,
            tickets_generated INT DEFAULT 0,
            amount_spent DECIMAL(10, 2) DEFAULT 0.00,
            events_attended INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_month (user_id, year, month),
            INDEX idx_user_date (user_id, year, month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createMonthlyStatsTable);
    echo "<p class='success'>✅ Table 'monthly_statistics' créée ou mise à jour avec succès</p>";
    echo "</div>";

    echo "<div class='step'>";
    echo "<h2>👤 Création de l'utilisateur administrateur</h2>";
    
    // Insert default admin user if not exists
    $adminPassword = 'admin123!';
    $adminPasswordHash = password_hash($adminPassword, PASSWORD_DEFAULT);
    
    // Check if admin user already exists
    $checkAdminStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND role = 'admin'");
    $checkAdminStmt->execute(['admin@eventticket.com']);
    
    if (!$checkAdminStmt->fetch()) {
        // Create admin user
        $insertAdminStmt = $pdo->prepare("
            INSERT INTO users (id, name, email, password_hash, role, is_active, monthly_ticket_limit, created_at) 
            VALUES (?, ?, ?, ?, 'admin', TRUE, -1, NOW())
        ");
        
        $insertAdminStmt->execute([
            'admin_default',
            'Administrateur',
            'admin@eventticket.com',
            $adminPasswordHash
        ]);
        
        echo "<p class='success'>✅ Utilisateur admin créé avec succès</p>";
    } else {
        // Update existing admin password
        $updateAdminStmt = $pdo->prepare("
            UPDATE users 
            SET password_hash = ?, name = 'Administrateur', is_active = TRUE, monthly_ticket_limit = -1 
            WHERE email = ? AND role = 'admin'
        ");
        
        $updateAdminStmt->execute([$adminPasswordHash, 'admin@eventticket.com']);
        echo "<p class='success'>✅ Utilisateur admin mis à jour avec succès</p>";
    }
    
    echo "<div style='background: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b;'>";
    echo "<h4>🔑 Identifiants de connexion administrateur :</h4>";
    echo "<ul>";
    echo "<li><strong>Email :</strong> admin@eventticket.com</li>";
    echo "<li><strong>Mot de passe :</strong> admin123!</li>";
    echo "</ul>";
    echo "</div>";
    echo "</div>";

    echo "<div class='step'>";
    echo "<h2>🧪 Test des fonctionnalités</h2>";
    
    // Test insert permissions
    try {
        $testId = 'test_' . uniqid();
        $stmt = $pdo->prepare("INSERT INTO tickets (id, event_id, user_id, event_name, event_date, location, ticket_type, price, qr_code) VALUES (?, 'test', 'test', 'Test Event', CURDATE(), 'Test Location', 'Test', 0.00, ?)");
        $stmt->execute([$testId, 'TEST-' . $testId]);
        
        // Clean up test record
        $stmt = $pdo->prepare("DELETE FROM tickets WHERE id = ?");
        $stmt->execute([$testId]);
        
        echo "<p class='success'>✅ Test d'insertion/suppression réussi</p>";
    } catch (Exception $e) {
        echo "<p class='error'>❌ Erreur lors du test d'insertion: " . $e->getMessage() . "</p>";
    }
    
    // Count existing records
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tickets");
    $ticketsCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $usersCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM events");
    $eventsCount = $stmt->fetch()['count'];
    
    echo "<h4>📊 État actuel de la base de données :</h4>";
    echo "<ul>";
    echo "<li><strong>Tickets :</strong> $ticketsCount</li>";
    echo "<li><strong>Utilisateurs :</strong> $usersCount</li>";
    echo "<li><strong>Événements :</strong> $eventsCount</li>";
    echo "<li><strong>Tables de statistiques :</strong> Créées</li>";
    echo "</ul>";
    echo "</div>";
    
    echo "<div class='step' style='border-left-color: #22c55e; background: #f0fdf4;'>";
    echo "<h2>🎉 Initialisation terminée avec succès !</h2>";
    echo "<p class='success'>Votre base de données QRticketPro est maintenant prête à être utilisée.</p>";
    echo "<h4>📋 Prochaines étapes :</h4>";
    echo "<ol>";
    echo "<li>Retournez à votre application : <a href='https://qrticketpro.com' target='_blank'>https://qrticketpro.com</a></li>";
    echo "<li>Connectez-vous avec les identifiants admin ci-dessus</li>";
    echo "<li>Commencez à créer des événements et générer des tickets</li>";
    echo "</ol>";
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>🔧 Informations techniques</h2>";
    echo "<ul>";
    echo "<li><strong>Base de données :</strong> u845174030_qrticketpro</li>";
    echo "<li><strong>Utilisateur :</strong> u845174030_qrticketadmin</li>";
    echo "<li><strong>Serveur API :</strong> https://qrticketpro.com/server</li>";
    echo "<li><strong>Frontend :</strong> https://qrticketpro.com</li>";
    echo "</ul>";
    echo "</div>";
    
} catch (PDOException $e) {
    echo "<div class='step' style='border-left-color: #ef4444; background: #fef2f2;'>";
    echo "<h2>❌ Erreur de base de données</h2>";
    echo "<p class='error'>Erreur lors de l'initialisation : " . $e->getMessage() . "</p>";
    echo "<h4>💡 Solutions possibles :</h4>";
    echo "<ul>";
    echo "<li>Vérifiez que MySQL est démarré</li>";
    echo "<li>Vérifiez que la base de données 'u845174030_qrticketpro' existe</li>";
    echo "<li>Vérifiez les permissions de l'utilisateur 'u845174030_qrticketadmin'</li>";
    echo "<li>Vérifiez les identifiants de connexion dans server/config.php</li>";
    echo "</ul>";
    echo "<h4>🔍 Détails de l'erreur :</h4>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
    echo "</div>";
} catch (Exception $e) {
    echo "<div class='step' style='border-left-color: #ef4444; background: #fef2f2;'>";
    echo "<h2>❌ Erreur générale</h2>";
    echo "<p class='error'>Erreur : " . $e->getMessage() . "</p>";
    echo "</div>";
}

echo "</div></body></html>";
?>