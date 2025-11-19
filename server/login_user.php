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
    
    if (!isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing email or password']);
        exit();
    }
    
    $email = trim(strtolower($data['email']));
    $plainPassword = $data['password'];
    
    // Find user by email
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Check if user is active
    if (!$user['is_active']) {
        http_response_code(403);
        echo json_encode(['error' => 'Account is disabled']);
        exit();
    }
    
    // Verify password
    if (!password_verify($plainPassword, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid password']);
        exit();
    }
    
    // Update last login
    $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $updateStmt->execute([$user['id']]);
    
    // Return user data (without password hash)
    unset($user['password_hash']);
    $user['lastLogin'] = date('Y-m-d H:i:s');
    $user['monthly_ticket_limit'] = $user['monthly_ticket_limit'] ?? 50;
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'user' => $user
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