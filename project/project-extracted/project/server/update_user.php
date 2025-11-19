<?php
require_once 'config.php';

try {
    // Create connection using centralized config
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
    $updates = [];
    $params = [];
    
    // Build dynamic update query based on provided fields
    if (isset($data['isActive'])) {
        $updates[] = "is_active = ?";
        $params[] = $data['isActive'] ? 1 : 0;
    }
    
    if (isset($data['monthlyTicketLimit'])) {
        $updates[] = "monthly_ticket_limit = ?";
        $params[] = (int)$data['monthlyTicketLimit'];
    }
    
    if (isset($data['name'])) {
        $updates[] = "name = ?";
        $params[] = trim($data['name']);
    }
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['error' => 'No fields to update']);
        exit();
    }
    
    $params[] = $userId; // Add userId for WHERE clause
    
    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'User updated successfully'
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