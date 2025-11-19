<?php
require_once 'config.php';

// Force cleanup script for testing - removes test tickets regardless of date
// WARNING: This script will delete tickets with "Test" in the name

header('Content-Type: application/json');

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Get current date and time for logging
    $currentDate = date('Y-m-d');
    $currentTime = date('H:i:s');
    
    error_log("🧹 FORCE CLEANUP: Starting test ticket cleanup at {$currentDate} {$currentTime}");
    
    // Find test tickets (tickets with "Test" in event_name)
    $findTestTicketsStmt = $pdo->prepare("
        SELECT id, event_name, event_date, end_time, generated_at
        FROM tickets 
        WHERE 
            event_name LIKE '%Test%'
            OR event_name LIKE '%test%'
            OR location LIKE '%Test%'
            OR location LIKE '%test%'
            OR event_name IS NULL
            OR event_name = ''
    ");
    
    $findTestTicketsStmt->execute();
    $testTickets = $findTestTicketsStmt->fetchAll();
    
    error_log("🔍 Found " . count($testTickets) . " test/corrupted tickets to delete");
    
    if (count($testTickets) > 0) {
        // Log tickets that will be deleted
        foreach ($testTickets as $ticket) {
            error_log("🗑️ Will delete: ID={$ticket['id']}, Event={$ticket['event_name']}, Date={$ticket['event_date']}");
        }
        
        // Delete test tickets
        $deleteStmt = $pdo->prepare("
            DELETE FROM tickets 
            WHERE 
                event_name LIKE '%Test%'
                OR event_name LIKE '%test%'
                OR location LIKE '%Test%'
                OR location LIKE '%test%'
                OR event_name IS NULL
                OR event_name = ''
        ");
        
        $result = $deleteStmt->execute();
        $deletedCount = $deleteStmt->rowCount();
        
        error_log("✅ FORCE CLEANUP: Deleted {$deletedCount} test/corrupted tickets");
        
        echo json_encode([
            'status' => 'success',
            'deleted' => $deletedCount,
            'message' => "Force cleanup: supprimé {$deletedCount} tickets de test/corrompus",
            'timestamp' => date('Y-m-d H:i:s'),
            'criteria' => [
                'test_tickets' => "event_name LIKE '%Test%' OR '%test%'",
                'corrupted_tickets' => "event_name IS NULL OR event_name = ''"
            ],
            'warning' => 'This was a FORCE cleanup - deleted test tickets regardless of date'
        ]);
    } else {
        error_log("ℹ️ FORCE CLEANUP: No test tickets found to delete");
        
        echo json_encode([
            'status' => 'success',
            'deleted' => 0,
            'message' => 'Aucun ticket de test trouvé à supprimer',
            'timestamp' => date('Y-m-d H:i:s'),
            'criteria' => [
                'test_tickets' => "event_name LIKE '%Test%' OR '%test%'",
                'corrupted_tickets' => "event_name IS NULL OR event_name = ''"
            ]
        ]);
    }
    
} catch (PDOException $e) {
    error_log("❌ Database error in force_cleanup_test_tickets.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    error_log("❌ General error in force_cleanup_test_tickets.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>