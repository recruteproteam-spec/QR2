<?php
require_once 'config.php';

// Set content type to JSON for clean output
header('Content-Type: application/json');

// Disable HTML error output to ensure JSON responses
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Get current date and time for comparison
    $currentDate = date('Y-m-d');
    $currentTime = date('H:i:s');
    
    error_log("🧹 CLEANUP: Starting expired tickets cleanup at {$currentDate} {$currentTime}");
    
    // Find expired tickets and corrupted data
    $findExpiredStmt = $pdo->prepare("
        SELECT id, event_name, event_date, end_time, generated_at
        FROM tickets 
        WHERE 
            -- Tickets with past event dates
            (event_date IS NOT NULL AND DATE(event_date) < CURDATE())
            OR 
            -- Tickets with today's date but past end time
            (event_date IS NOT NULL AND end_time IS NOT NULL AND 
             DATE(event_date) = CURDATE() AND TIME(end_time) < CURTIME())
            OR
            -- Corrupted tickets with NULL essential data
            (event_date IS NULL OR event_name IS NULL OR event_name = '')
    ");
    
    $findExpiredStmt->execute();
    $expiredTickets = $findExpiredStmt->fetchAll();
    
    error_log("🔍 Found " . count($expiredTickets) . " expired/corrupted tickets to delete");
    
    if (count($expiredTickets) > 0) {
        // Log tickets that will be deleted
        foreach ($expiredTickets as $ticket) {
            error_log("🗑️ Will delete: ID={$ticket['id']}, Event={$ticket['event_name']}, Date={$ticket['event_date']}");
        }
        
        // Delete expired tickets
        $deleteStmt = $pdo->prepare("
            DELETE FROM tickets 
            WHERE 
                -- Delete tickets with past event dates
                (event_date IS NOT NULL AND DATE(event_date) < CURDATE())
                OR 
                -- Delete tickets with today's date but past end time
                (event_date IS NOT NULL AND end_time IS NOT NULL AND 
                 DATE(event_date) = CURDATE() AND TIME(end_time) < CURTIME())
                OR
                -- Delete corrupted tickets with NULL essential data
                (event_date IS NULL OR event_name IS NULL OR event_name = '')
        ");
        
        $result = $deleteStmt->execute();
        $deletedCount = $deleteStmt->rowCount();
        
        error_log("✅ CLEANUP: Deleted {$deletedCount} expired/corrupted tickets");
        
        // Categorize deleted tickets
        $deletedByDate = 0;
        $deletedByTime = 0;
        $deletedCorrupted = 0;
        
        foreach ($expiredTickets as $ticket) {
            if (is_null($ticket['event_date']) || is_null($ticket['event_name']) || empty($ticket['event_name'])) {
                $deletedCorrupted++;
            } elseif ($ticket['event_date'] < $currentDate) {
                $deletedByDate++;
            } else {
                $deletedByTime++;
            }
        }
        
        echo json_encode([
            'status' => 'success',
            'deleted' => $deletedCount,
            'message' => "Suppression réussie de {$deletedCount} tickets expirés/corrompus",
            'timestamp' => date('Y-m-d H:i:s'),
            'criteria' => [
                'date_check' => "event_date < {$currentDate}",
                'time_check' => "event_date = {$currentDate} AND end_time < {$currentTime}",
                'corruption_check' => "NULL or empty essential fields"
            ],
            'breakdown' => [
                'deleted_by_past_date' => $deletedByDate,
                'deleted_by_past_time' => $deletedByTime,
                'deleted_corrupted' => $deletedCorrupted
            ]
        ]);
    } else {
        error_log("ℹ️ CLEANUP: No expired tickets found to delete");
        
        echo json_encode([
            'status' => 'success',
            'deleted' => 0,
            'message' => 'Aucun ticket expiré trouvé',
            'timestamp' => date('Y-m-d H:i:s'),
            'criteria' => [
                'date_check' => "event_date < {$currentDate}",
                'time_check' => "event_date = {$currentDate} AND end_time < {$currentTime}",
                'corruption_check' => "NULL or empty essential fields"
            ]
        ]);
    }
    
} catch (PDOException $e) {
    error_log("❌ Database error in cleanup_expired_tickets.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    error_log("❌ General error in cleanup_expired_tickets.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>