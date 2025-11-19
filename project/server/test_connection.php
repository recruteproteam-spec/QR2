<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    // Test database connection
    $pdo = createDatabaseConnection();
    
    // Test basic query
    $stmt = $pdo->query("SELECT 1 as test");
    $result = $stmt->fetch();
    
    sendJsonResponse([
        'success' => true,
        'message' => 'Server and database connection OK',
        'timestamp' => date('Y-m-d H:i:s'),
        'database' => 'u845174030_qrticketpro'
    ]);
    
} catch (Exception $e) {
    sendErrorResponse('Database connection failed: ' . $e->getMessage(), 500);
}
?>