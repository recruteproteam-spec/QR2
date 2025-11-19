<?php
require_once 'config.php';

try {
    // Create connection using centralized config with your database credentials
    $pdo = createDatabaseConnection();
    
    // Get query parameters
    $userId = $_GET['userId'] ?? null;
    
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing userId parameter']);
        exit();
    }
    
    // Create tables if they don't exist
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
    
    // Get user statistics - calculate from tickets table in real-time
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
    $realTimeStats = $stmt->fetch();
    
    // Get favorite category
    $stmt = $pdo->prepare("
        SELECT e.category, COUNT(*) as count
        FROM tickets t
        LEFT JOIN events e ON t.event_id = e.id
        WHERE t.user_id = ? AND e.category IS NOT NULL
        GROUP BY e.category
        ORDER BY count DESC
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    $favoriteCategory = $stmt->fetch();
    
    // Get monthly statistics for the last 12 months
    $stmt = $pdo->prepare("
        SELECT 
            YEAR(generated_at) as year,
            MONTH(generated_at) as month,
            COUNT(*) as tickets_generated,
            COALESCE(SUM(CASE WHEN custom_price IS NOT NULL THEN custom_price ELSE price END), 0) as amount_spent,
            COUNT(DISTINCT event_id) as events_attended
        FROM tickets 
        WHERE user_id = ? 
        AND generated_at IS NOT NULL
        AND generated_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY YEAR(generated_at), MONTH(generated_at)
        ORDER BY year DESC, month DESC
        LIMIT 12
    ");
    $stmt->execute([$userId]);
    $monthlyStats = $stmt->fetchAll();
    
    // Format user statistics
    $userStats = [
        'total_tickets' => (int)$realTimeStats['total_tickets'],
        'custom_tickets' => (int)$realTimeStats['custom_tickets'],
        'total_spent' => (float)$realTimeStats['total_spent'],
        'events_attended' => (int)$realTimeStats['events_attended'],
        'favorite_category' => $favoriteCategory['category'] ?? null,
        'last_ticket_date' => $realTimeStats['last_ticket_date']
    ];
    
    // Format monthly statistics
    $formattedMonthlyStats = array_map(function($stat) {
        $monthNames = [
            1 => 'Jan', 2 => 'Fév', 3 => 'Mar', 4 => 'Avr', 5 => 'Mai', 6 => 'Juin',
            7 => 'Juil', 8 => 'Août', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Déc'
        ];
        
        return [
            'year' => (int)$stat['year'],
            'month' => (int)$stat['month'],
            'month_name' => $monthNames[$stat['month']] ?? 'Inconnu',
            'tickets_generated' => (int)$stat['tickets_generated'],
            'amount_spent' => (float)$stat['amount_spent'],
            'events_attended' => (int)$stat['events_attended']
        ];
    }, $monthlyStats);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'database' => 'u845174030_qrticketpro',
        'user' => 'u845174030_qrticketadmin',
        'statistics' => $userStats,
        'monthly_statistics' => $formattedMonthlyStats,
        'summary' => [
            'data_source' => 'real_time_calculation',
            'monthly_records' => count($formattedMonthlyStats),
            'tables_created' => true
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in get_user_stats.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage(),
        'database' => 'u845174030_qrticketpro',
        'user' => 'u845174030_qrticketadmin'
    ]);
} catch (Exception $e) {
    error_log("General error in get_user_stats.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>