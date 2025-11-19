<?php
require_once 'config.php';

// Disable HTML error output to ensure JSON responses
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Ensure request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    sendJsonResponse(['error' => 'Method not allowed'], 405);
    exit();
}

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Get JSON payload
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg());
        sendJsonResponse(['error' => 'Invalid JSON format'], 400);
        exit();
    }
    
    if (!isset($data['userId']) || !isset($data['currentPassword']) || !isset($data['newPassword'])) {
        sendJsonResponse(['error' => 'Missing required fields: userId, currentPassword, newPassword'], 400);
        exit();
    }
    
    $userId = trim($data['userId']);
    $currentPassword = $data['currentPassword'];
    $newPassword = $data['newPassword'];
    
    // Validate inputs
    if (empty($userId)) {
        sendJsonResponse(['error' => 'User ID cannot be empty'], 400);
        exit();
    }
    
    if (empty($currentPassword)) {
        sendJsonResponse(['error' => 'Current password cannot be empty'], 400);
        exit();
    }
    
    // Validate new password strength
    if (strlen($newPassword) < 6) {
        sendJsonResponse(['error' => 'Le nouveau mot de passe doit contenir au moins 6 caractères'], 400);
        exit();
    }
    
    // Get user's current password hash
    $stmt = $pdo->prepare("SELECT id, password_hash, email, name FROM users WHERE id = ? AND is_active = 1");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        error_log("User not found or inactive: $userId");
        sendJsonResponse(['error' => 'Utilisateur non trouvé ou inactif'], 404);
        exit();
    }
    
    // Verify current password
    if (!password_verify($currentPassword, $user['password_hash'])) {
        error_log("Invalid current password for user: $userId");
        sendJsonResponse(['error' => 'Mot de passe actuel incorrect'], 401);
        exit();
    }
    
    // Hash new password
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    if (!$newPasswordHash) {
        error_log("Failed to hash new password for user: $userId");
        sendJsonResponse(['error' => 'Erreur lors du hachage du mot de passe'], 500);
        exit();
    }
    
    // Check if updated_at column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'updated_at'");
    $hasUpdatedAt = $stmt->rowCount() > 0;
    
    // Update password in database (with or without updated_at column)
    if ($hasUpdatedAt) {
        $updateStmt = $pdo->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
    } else {
        $updateStmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    }
    
    $result = $updateStmt->execute([$newPasswordHash, $userId]);
    
    if (!$result) {
        $errorInfo = $updateStmt->errorInfo();
        error_log("Failed to update password for user $userId: " . print_r($errorInfo, true));
        sendJsonResponse(['error' => 'Erreur lors de la mise à jour du mot de passe'], 500);
        exit();
    }
    
    // Verify the update
    if ($updateStmt->rowCount() === 0) {
        error_log("No rows affected when updating password for user: $userId");
        sendJsonResponse(['error' => 'Aucune modification effectuée - utilisateur non trouvé'], 404);
        exit();
    }
    
    error_log("✅ Password changed successfully for user: $userId ({$user['email']})");
    
    sendJsonResponse([
        'success' => true,
        'message' => 'Mot de passe modifié avec succès',
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name']
        ],
        'timestamp' => date('Y-m-d H:i:s'),
        'updated_at_column' => $hasUpdatedAt ? 'present' : 'missing'
    ], 200);
    
} catch (PDOException $e) {
    error_log("Database error in change_password.php: " . $e->getMessage());
    sendJsonResponse(['error' => 'Erreur de base de données'], 500);
} catch (Exception $e) {
    error_log("General error in change_password.php: " . $e->getMessage());
    sendJsonResponse(['error' => 'Erreur serveur interne'], 500);
}
?>