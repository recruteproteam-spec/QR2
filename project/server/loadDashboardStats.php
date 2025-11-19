<?php
require_once 'config.php';

$userId = $_GET['userId'] ?? '';

if (!$userId) {
    sendErrorResponse('userId manquant');
}

try {
    $pdo = createDatabaseConnection();

    // Total des tickets de l'utilisateur
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tickets WHERE user_id = ?");
    $stmt->execute([$userId]);
    $totalTickets = $stmt->fetchColumn();

    // Total des tickets personnalisés (is_custom = 1)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tickets WHERE user_id = ? AND is_custom = 1");
    $stmt->execute([$userId]);
    $customTickets = $stmt->fetchColumn();

    // Total dépensé = custom_price (si non NULL) sinon price
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(CASE WHEN custom_price IS NOT NULL THEN custom_price ELSE price END), 0) FROM tickets WHERE user_id = ?");
    $stmt->execute([$userId]);
    $totalSpent = $stmt->fetchColumn();

    sendJsonResponse([
        'totalTickets' => (int)$totalTickets,
        'customTickets' => (int)$customTickets,
        'totalSpent' => (float)$totalSpent
    ]);
} catch (Exception $e) {
    sendErrorResponse('Erreur lors de l\'extraction des données');
}