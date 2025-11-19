<?php
require_once 'config.php';

// Get JSON payload
$json = file_get_contents('php://input');
$data = json_decode($json, true);

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Generate the correct password hash for 'admin123!'
    $adminPassword = 'admin123!';
    $adminPasswordHash = password_hash($adminPassword, PASSWORD_DEFAULT);
    
    // Check if admin user already exists
    $checkAdminStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND role = 'admin'");
    $checkAdminStmt->execute(['admin@eventticket.com']);
    
    if (!$checkAdminStmt->fetch()) {
        // Create admin user
        $insertAdminStmt = $pdo->prepare("
            INSERT INTO users (id, name, email, password_hash, role, is_active, ticket_limit, created_at) 
            VALUES (?, ?, ?, ?, 'admin', TRUE, -1, NOW())
        ");
        
        $insertAdminStmt->execute([
            'admin_default',
            'Administrateur',
            'admin@eventticket.com',
            $adminPasswordHash
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Utilisateur admin créé avec succès',
            'admin_email' => 'admin@eventticket.com',
            'admin_password' => $adminPassword,
            'debug_hash' => $adminPasswordHash
        ]);
    } else {
        // Update existing admin password with fresh hash
        $updateAdminStmt = $pdo->prepare("
            UPDATE users 
            SET password_hash = ?, name = 'Administrateur', is_active = TRUE, ticket_limit = -1 
            WHERE email = ? AND role = 'admin'
        ");
        
        $updateAdminStmt->execute([$adminPasswordHash, 'admin@eventticket.com']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Utilisateur admin mis à jour avec succès',
            'admin_email' => 'admin@eventticket.com',
            'admin_password' => $adminPassword,
            'debug_hash' => $adminPasswordHash
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur de base de données: ' . $e->getMessage(),
        'details' => $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}
?>