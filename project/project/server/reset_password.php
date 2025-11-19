<?php
require_once 'config.php';

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Get JSON payload
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!isset($data['email'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing email']);
        exit();
    }
    
    $email = trim(strtolower($data['email']));
    
    // Find user by email
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Generate new random password
    $newPassword = bin2hex(random_bytes(6)); // 12 character password
    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password in database
    $updateStmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $updateStmt->execute([$passwordHash, $user['id']]);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Password reset successfully',
        'newPassword' => $newPassword
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