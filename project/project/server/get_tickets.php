<?php
require_once 'config.php';

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Get query parameters
    $userId = $_GET['userId'] ?? null;
    $eventId = $_GET['eventId'] ?? null;
    
    // Build query
    $sql = "
        SELECT id, event_id, user_id, event_name, event_date, location, 
               ticket_type, price, custom_price, purchase_date, qr_code, 
               is_used, is_custom, image, start_time, end_time, generated_at
        FROM tickets
        WHERE 1=1
    ";
    
    $params = [];
    
    if ($userId) {
        $sql .= " AND user_id = ?";
        $params[] = $userId;
    }
    
    if ($eventId) {
        $sql .= " AND event_id = ?";
        $params[] = $eventId;
    }
    
    $sql .= " ORDER BY generated_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format tickets for frontend
    $formattedTickets = array_map(function($ticket) {
        return [
            'id' => $ticket['id'],
            'eventId' => $ticket['event_id'],
            'userId' => $ticket['user_id'],
            'eventName' => $ticket['event_name'],
            'eventDate' => $ticket['event_date'],
            'location' => $ticket['location'],
            'ticketType' => $ticket['ticket_type'],
            'price' => (float)$ticket['price'],
            'customPrice' => $ticket['custom_price'] ? (float)$ticket['custom_price'] : null,
            'purchaseDate' => $ticket['purchase_date'],
            'qrCode' => $ticket['qr_code'],
            'used' => (bool)$ticket['is_used'],
            'isCustom' => (bool)$ticket['is_custom'],
            'image' => $ticket['image'],
            'startTime' => $ticket['start_time'],
            'endTime' => $ticket['end_time'],
            'generatedAt' => $ticket['generated_at']
        ];
    }, $tickets);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'tickets' => $formattedTickets
    ]);
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>