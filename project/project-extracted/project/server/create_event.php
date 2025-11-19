<?php
require_once 'config.php';

// Ensure request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Get JSON payload
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!isset($data['title']) || !isset($data['organizerId'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields: title, organizerId']);
        exit();
    }
    
    // Validate required fields
    $requiredFields = ['title', 'description', 'date', 'startTime', 'endTime', 'location', 'address', 'category', 'capacity', 'whatsappNumber', 'organizerId', 'ticketTypes'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            exit();
        }
    }
    
    // Generate unique ID if not provided
    $eventId = isset($data['id']) ? $data['id'] : uniqid('event_', true);
    
    // Insert event into database
    $stmt = $pdo->prepare("
        INSERT INTO events (
            id, title, description, event_date, start_time, end_time, 
            location, address, category, capacity, image, logo, 
            whatsapp_number, organizer_id, ticket_types, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $eventId,
        $data['title'],
        $data['description'],
        $data['date'],
        $data['startTime'],
        $data['endTime'],
        $data['location'],
        $data['address'],
        $data['category'],
        (int)$data['capacity'],
        $data['image'] ?? null,
        $data['logo'] ?? null,
        $data['whatsappNumber'],
        $data['organizerId'],
        json_encode($data['ticketTypes'])
    ]);
    
    // Return success response
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Event created successfully',
        'event' => [
            'id' => $eventId,
            'title' => $data['title'],
            'description' => $data['description'],
            'date' => $data['date'],
            'startTime' => $data['startTime'],
            'endTime' => $data['endTime'],
            'location' => $data['location'],
            'address' => $data['address'],
            'category' => $data['category'],
            'capacity' => (int)$data['capacity'],
            'image' => $data['image'] ?? null,
            'logo' => $data['logo'] ?? null,
            'whatsappNumber' => $data['whatsappNumber'],
            'organizerId' => $data['organizerId'],
            'ticketTypes' => $data['ticketTypes'],
            'ticketsSold' => 0,
            'revenue' => 0,
            'createdAt' => date('Y-m-d H:i:s')
        ]
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