<?php
require_once 'config.php';

// Ensure request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Create connection using centralized config with your database credentials
    $pdo = createDatabaseConnection();
    
    // Get JSON payload
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!isset($data['userId'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing userId']);
        exit();
    }
    
    $userId = $data['userId'];
    
    // Create user_statistics table if it doesn't exist
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
    
    // Create monthly_statistics table if it doesn't exist
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
    
    // Calculate statistics from tickets table
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
    
    // Get favorite category (most frequent category from events)
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
    
    // Insert or update user statistics
    $statsId = 'stats_' . $userId;
    $stmt = $pdo->prepare("
        INSERT INTO user_statistics (
            id, user_id, total_tickets, custom_tickets, total_spent, 
            events_attended, favorite_category, last_ticket_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            total_tickets = VALUES(total_tickets),
            custom_tickets = VALUES(custom_tickets),
            total_spent = VALUES(total_spent),
            events_attended = VALUES(events_attended),
            favorite_category = VALUES(favorite_category),
            last_ticket_date = VALUES(last_ticket_date),
            updated_at = NOW()
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
    
    // Update monthly statistics for the current month
    $currentYear = date('Y');
    $currentMonth = date('n');
    
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as monthly_tickets,
            COALESCE(SUM(CASE WHEN custom_price IS NOT NULL THEN custom_price ELSE price END), 0) as monthly_spent,
            COUNT(DISTINCT event_id) as monthly_events
        FROM tickets 
        WHERE user_id = ? 
        AND YEAR(generated_at) = ? 
        AND MONTH(generated_at) = ?
    ");
    
    $stmt->execute([$userId, $currentYear, $currentMonth]);
    $monthlyStats = $stmt->fetch();
    
    $monthlyStatsId = 'monthly_' . $userId . '_' . $currentYear . '_' . $currentMonth;
    $stmt = $pdo->prepare("
        INSERT INTO monthly_statistics (
            id, user_id, year, month, tickets_generated, amount_spent, events_attended
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            tickets_generated = VALUES(tickets_generated),
            amount_spent = VALUES(amount_spent),
            events_attended = VALUES(events_attended),
            updated_at = NOW()
    ");
    
    $stmt->execute([
        $monthlyStatsId,
        $userId,
        (int)$currentYear,
        (int)$currentMonth,
        (int)$monthlyStats['monthly_tickets'],
        (float)$monthlyStats['monthly_spent'],
        (int)$monthlyStats['monthly_events']
    ]);
    
    // Also update statistics for previous months if tickets exist
    $stmt = $pdo->prepare("
        SELECT DISTINCT YEAR(generated_at) as year, MONTH(generated_at) as month
        FROM tickets 
        WHERE user_id = ? 
        AND generated_at IS NOT NULL
        ORDER BY year DESC, month DESC
        LIMIT 12
    ");
    
    $stmt->execute([$userId]);
    $months = $stmt->fetchAll();
    
    foreach ($months as $monthData) {
        $year = $monthData['year'];
        $month = $monthData['month'];
        
        if ($year == $currentYear && $month == $currentMonth) {
            continue; // Already processed above
        }
        
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as monthly_tickets,
                COALESCE(SUM(CASE WHEN custom_price IS NOT NULL THEN custom_price ELSE price END), 0) as monthly_spent,
                COUNT(DISTINCT event_id) as monthly_events
            FROM tickets 
            WHERE user_id = ? 
            AND YEAR(generated_at) = ? 
            AND MONTH(generated_at) = ?
        ");
        
        $stmt->execute([$userId, $year, $month]);
        $monthStats = $stmt->fetch();
        
        $monthStatsId = 'monthly_' . $userId . '_' . $year . '_' . $month;
        $stmt = $pdo->prepare("
            INSERT INTO monthly_statistics (
                id, user_id, year, month, tickets_generated, amount_spent, events_attended
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                tickets_generated = VALUES(tickets_generated),
                amount_spent = VALUES(amount_spent),
                events_attended = VALUES(events_attended),
                updated_at = NOW()
        ");
        
        $stmt->execute([
            $monthStatsId,
            $userId,
            (int)$year,
            (int)$month,
            (int)$monthStats['monthly_tickets'],
            (float)$monthStats['monthly_spent'],
            (int)$monthStats['monthly_events']
        ]);
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Statistics updated successfully',
        'database' => 'u845174030_qrticketpro',
        'user' => 'u845174030_qrticketadmin',
        'statistics' => [
            'total_tickets' => (int)$stats['total_tickets'],
            'custom_tickets' => (int)$stats['custom_tickets'],
            'total_spent' => (float)$stats['total_spent'],
            'events_attended' => (int)$stats['events_attended'],
            'favorite_category' => $favoriteCategory['category'] ?? null,
            'last_ticket_date' => $stats['last_ticket_date'],
            'monthly' => [
                'tickets_generated' => (int)$monthlyStats['monthly_tickets'],
                'amount_spent' => (float)$monthlyStats['monthly_spent'],
                'events_attended' => (int)$monthlyStats['monthly_events']
            ]
        ],
        'months_processed' => count($months)
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in update_user_stats.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage(),
        'database' => 'u845174030_qrticketpro',
        'user' => 'u845174030_qrticketadmin'
    ]);
} catch (Exception $e) {
    error_log("General error in update_user_stats.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>