<?php
require_once 'config.php'; // Connexion à la base de données

header('Content-Type: application/json');

try {
    // Générer un ticket_id unique
    $ticketId = 'TK-' . strtoupper(bin2hex(random_bytes(4)));

    // Récupération des données envoyées
    $event_id     = $_POST['event_id'];
    $user_id      = $_POST['user_id'];
    $event_name   = $_POST['event_name'];
    $event_date   = $_POST['event_date'];
    $location     = $_POST['location'];
    $ticket_type  = $_POST['ticket_type'];
    $price        = $_POST['price'];
    $custom_price = $_POST['custom_price'];
    $qr_code      = $_POST['qr_code'];
    $is_custom    = $_POST['is_custom'];
    $image        = $_POST['image'];
    $start_time   = $_POST['start_time'];
    $end_time     = $_POST['end_time'];

    // Préparer l'insertion
    $stmt = $pdo->prepare("INSERT INTO tickets (
        event_id, user_id, event_name, event_date, location, 
        ticket_type, price, custom_price, qr_code, is_custom, 
        image, start_time, end_time, ticket_id, generated_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
    )");

    // Exécuter la requête
    $stmt->execute([
        $event_id, $user_id, $event_name, $event_date, $location,
        $ticket_type, $price, $custom_price, $qr_code, $is_custom,
        $image, $start_time, $end_time, $ticketId
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Ticket enregistré avec succès',
        'ticket_id' => $ticketId
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur : ' . $e->getMessage()
    ]);
}
