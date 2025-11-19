<?php
require_once 'config.php';

// Disable HTML error output to ensure JSON responses
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

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
    
    if (!isset($data['name']) || !isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields: name, email, password']);
        exit();
    }
    
    $name = trim($data['name']);
    $email = trim(strtolower($data['email']));
    $plainPassword = $data['password'];
    $role = isset($data['role']) ? $data['role'] : 'user';
    $monthlyTicketLimit = isset($data['monthlyTicketLimit']) ? (int)$data['monthlyTicketLimit'] : 50;
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        exit();
    }
    
    // Check if user already exists
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $checkStmt->execute([$email]);
    if ($checkStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'User with this email already exists']);
        exit();
    }
    
    // Generate password if not provided
    if (empty($plainPassword)) {
        $plainPassword = bin2hex(random_bytes(6)); // 12 character password
    }
    
    // Hash password
    $passwordHash = password_hash($plainPassword, PASSWORD_DEFAULT);
    
    // Generate unique ID
    $userId = 'user_' . uniqid() . '_' . bin2hex(random_bytes(4));
    
    // Insert user into database
    $stmt = $pdo->prepare("
        INSERT INTO users (id, name, email, password_hash, role, is_active, monthly_ticket_limit, created_at) 
        VALUES (?, ?, ?, ?, ?, 1, ?, NOW())
    ");
    
    $result = $stmt->execute([$userId, $name, $email, $passwordHash, $role, $monthlyTicketLimit]);
    
    if (!$result) {
        $errorInfo = $stmt->errorInfo();
        error_log("Insert failed: " . print_r($errorInfo, true));
        throw new Exception("Failed to insert user: " . $errorInfo[2]);
    }
    
    // Return success response with user data
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'User created successfully',
        'user' => [
            'id' => $userId,
            'name' => $name,
            'email' => $email,
            'role' => $role,
            'monthlyTicketLimit' => $monthlyTicketLimit,
            'isActive' => true,
            'createdAt' => date('Y-m-d H:i:s')
        ],
        'password' => $plainPassword // Return plain password for admin to share
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