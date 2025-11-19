<?php
require_once 'config.php';

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Get all users (excluding password hash)
    $stmt = $pdo->prepare("
        SELECT id, name, email, role, is_active, monthly_ticket_limit, created_at, last_login 
        FROM users 
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'users' => $users
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