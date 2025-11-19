<?php
require_once 'config.php';

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Get query parameters
    $organizerId = $_GET['organizerId'] ?? null;
    
    // Build query
    $sql = "
        SELECT id, title, description, event_date, start_time, end_time, 
               location, address, category, capacity, image, logo, 
               whatsapp_number, tickets_sold, revenue, organizer_id, 
               ticket_types, created_at, updated_at
        FROM events
    ";
    
    $params = [];
    
    if ($organizerId) {
        $sql .= " WHERE organizer_id = ?";
        $params[] = $organizerId;
    }
    
    $sql .= " ORDER BY created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format events for frontend
    $formattedEvents = array_map(function($event) {
        return [
            'id' => $event['id'],
            'title' => $event['title'],
            'description' => $event['description'],
            'date' => $event['event_date'],
            'startTime' => $event['start_time'],
            'endTime' => $event['end_time'],
            'location' => $event['location'],
            'address' => $event['address'],
            'category' => $event['category'],
            'capacity' => (int)$event['capacity'],
            'image' => $event['image'],
            'logo' => $event['logo'],
            'whatsappNumber' => $event['whatsapp_number'],
            'ticketsSold' => (int)$event['tickets_sold'],
            'revenue' => (float)$event['revenue'],
            'organizerId' => $event['organizer_id'],
            'ticketTypes' => json_decode($event['ticket_types'], true) ?: [],
            'createdAt' => $event['created_at'],
            'updatedAt' => $event['updated_at']
        ];
    }, $events);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'events' => $formattedEvents
    ]);
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
?>