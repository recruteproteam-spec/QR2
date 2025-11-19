<?php
require_once 'config.php';

try {
    // Create connection using centralized config with your database credentials
    $pdo = createDatabaseConnection();
    
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
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createUserStatsTable);
    
    // Create monthly_statistics table for tracking monthly data
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
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_month (user_id, year, month),
            INDEX idx_user_date (user_id, year, month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createMonthlyStatsTable);
    
    // Populate initial statistics for existing users
    $stmt = $pdo->query("SELECT DISTINCT user_id FROM tickets");
    $userIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($userIds as $userId) {
        // Calculate statistics for this user
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_tickets,
                COUNT(CASE WHEN is_custom = 1 THEN 1 END) as custom_tickets,
                COALESCE(SUM(CASE WHEN custom_price IS NOT NULL THEN custom_price ELSE price END), 0) as total_spent,
                COUNT(DISTINCT event_id) as events_attended,
                MAX(generated_at) as last_ticket_date
            FROM tickets 
            WHERE user_id = ?
        ");
        
        $stmt->execute([$userId]);
        $stats = $stmt->fetch();
        
        // Get favorite category
        $stmt = $pdo->prepare("
            SELECT e.category, COUNT(*) as count
            FROM tickets t
            JOIN events e ON t.event_id = e.id
            WHERE t.user_id = ?
            GROUP BY e.category
            ORDER BY count DESC
            LIMIT 1
        ");
        
        $stmt->execute([$userId]);
        $favoriteCategory = $stmt->fetch();
        
        // Insert user statistics
        $statsId = 'stats_' . $userId;
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO user_statistics (
                id, user_id, total_tickets, custom_tickets, total_spent, 
                events_attended, favorite_category, last_ticket_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $statsId,
            $userId,
            (int)$stats['total_tickets'],
            (int)$stats['custom_tickets'],
            (float)$stats['total_spent'],
            (int)$stats['events_attended'],
            $favoriteCategory['category'] ?? null,
            $stats['last_ticket_date']
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Tables de statistiques créées avec succès',
        'database' => 'u845174030_qrticketpro',
        'user' => 'u845174030_qrticketadmin',
        'tables_created' => [
            'user_statistics' => 'Statistiques globales par utilisateur',
            'monthly_statistics' => 'Statistiques mensuelles par utilisateur'
        ],
        'users_processed' => count($userIds)
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in create_user_stats.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage(),
        'database' => 'u845174030_qrticketpro',
        'user' => 'u845174030_qrticketadmin'
    ]);
} catch (Exception $e) {
    error_log("General error in create_user_stats.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>