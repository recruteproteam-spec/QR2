<?php
require_once 'config.php';

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    // Get query parameters
    $userId = $_GET['userId'] ?? null;
    $year = $_GET['year'] ?? date('Y');
    $month = $_GET['month'] ?? date('n');
    
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing userId parameter']);
        exit();
    }
    
    error_log("🔍 Comptage tickets mensuels - User: $userId, Year: $year, Month: $month");
    
    // Count tickets for the specified month
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM tickets 
        WHERE user_id = ? 
        AND YEAR(generated_at) = ? 
        AND MONTH(generated_at) = ?
    ");
    
    $stmt->execute([$userId, (int)$year, (int)$month]);
    $result = $stmt->fetch();
    
    error_log("📊 Résultat comptage: " . $result['count'] . " tickets trouvés");
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'count' => (int)$result['count'],
        'year' => (int)$year,
        'month' => (int)$month,
        'userId' => $userId,
        'debug' => [
            'sql_executed' => true,
            'tickets_found' => (int)$result['count']
        ]
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