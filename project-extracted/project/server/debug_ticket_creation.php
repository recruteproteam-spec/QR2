<?php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html lang='fr'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Debug Génération de Tickets</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        .info { color: #3b82f6; }
        .warning { color: #f59e0b; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .step { margin: 20px 0; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🔍 DIAGNOSTIC DE LA GÉNÉRATION DE TICKETS</h1>";

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    echo "<div class='step'>";
    echo "<h2>1. Structure de la table tickets</h2>";
    $stmt = $pdo->query("DESCRIBE tickets");
    $structure = $stmt->fetchAll();
    echo "<table>";
    echo "<tr><th>Champ</th><th>Type</th><th>Null</th><th>Clé</th><th>Défaut</th></tr>";
    foreach ($structure as $column) {
        echo "<tr>";
        echo "<td>{$column['Field']}</td>";
        echo "<td>{$column['Type']}</td>";
        echo "<td>{$column['Null']}</td>";
        echo "<td>{$column['Key']}</td>";
        echo "<td>{$column['Default']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>2. Données existantes</h2>";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tickets");
    $count = $stmt->fetch()['count'];
    echo "<p class='info'>Total tickets: <strong>{$count}</strong></p>";
    
    if ($count > 0) {
        echo "<h3>Derniers tickets créés:</h3>";
        $stmt = $pdo->query("SELECT id, event_name, ticket_type, price, custom_price, is_custom, generated_at FROM tickets ORDER BY generated_at DESC LIMIT 5");
        $recentTickets = $stmt->fetchAll();
        echo "<table>";
        echo "<tr><th>ID</th><th>Événement</th><th>Type</th><th>Prix</th><th>Prix Custom</th><th>Custom</th><th>Généré</th></tr>";
        foreach ($recentTickets as $ticket) {
            echo "<tr>";
            echo "<td>{$ticket['id']}</td>";
            echo "<td>{$ticket['event_name']}</td>";
            echo "<td>{$ticket['ticket_type']}</td>";
            echo "<td>{$ticket['price']} MAD</td>";
            echo "<td>" . ($ticket['custom_price'] ? $ticket['custom_price'] . ' MAD' : 'N/A') . "</td>";
            echo "<td>" . ($ticket['is_custom'] ? 'Oui' : 'Non') . "</td>";
            echo "<td>{$ticket['generated_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>3. Utilisateurs disponibles</h2>";
    $stmt = $pdo->query("SELECT id, name, email, role, is_active, ticket_limit FROM users LIMIT 10");
    $users = $stmt->fetchAll();
    echo "<table>";
    echo "<tr><th>ID</th><th>Nom</th><th>Email</th><th>Rôle</th><th>Actif</th><th>Limite</th></tr>";
    foreach ($users as $user) {
        echo "<tr>";
        echo "<td>{$user['id']}</td>";
        echo "<td>{$user['name']}</td>";
        echo "<td>{$user['email']}</td>";
        echo "<td>{$user['role']}</td>";
        echo "<td>" . ($user['is_active'] ? 'Oui' : 'Non') . "</td>";
        echo "<td>" . ($user['ticket_limit'] == -1 ? 'Illimité' : $user['ticket_limit']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>4. Événements disponibles</h2>";
    $stmt = $pdo->query("SELECT id, title, organizer_id, capacity FROM events LIMIT 10");
    $events = $stmt->fetchAll();
    echo "<table>";
    echo "<tr><th>ID</th><th>Titre</th><th>Organisateur</th><th>Capacité</th></tr>";
    foreach ($events as $event) {
        echo "<tr>";
        echo "<td>{$event['id']}</td>";
        echo "<td>{$event['title']}</td>";
        echo "<td>{$event['organizer_id']}</td>";
        echo "<td>{$event['capacity']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>5. Test d'insertion d'un ticket avec validation d'ID</h2>";
    try {
        // Generate a more robust test ID
        $timestamp = time();
        $random = bin2hex(random_bytes(4));
        $testTicketId = 'test_debug_' . $timestamp . '_' . $random;
        $testQrCode = 'TEST-DEBUG-' . $testTicketId;
        
        // Validate that the ID is not empty
        if (empty($testTicketId) || trim($testTicketId) === '') {
            throw new Exception("ID de test vide généré");
        }
        
        echo "<p class='info'>ID de test généré: <strong>{$testTicketId}</strong></p>";
        echo "<p class='info'>Longueur de l'ID: <strong>" . strlen($testTicketId) . "</strong> caractères</p>";
        
        $stmt = $pdo->prepare("
            INSERT INTO tickets (
                id, event_id, user_id, event_name, event_date, location, 
                ticket_type, price, custom_price, qr_code, is_custom, generated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $result = $stmt->execute([
            $testTicketId,
            'test_event_debug',
            'test_user_debug',
            'Test Event Debug',
            '2025-12-31',
            'Test Location Debug',
            'Test Type Debug',
            50.00,
            75.00,
            $testQrCode,
            1
        ]);
        
        if ($result) {
            echo "<p class='success'>✅ Insertion de test réussie avec ID: {$testTicketId}</p>";
            
            // Vérifier l'insertion
            $stmt = $pdo->prepare("SELECT * FROM tickets WHERE id = ?");
            $stmt->execute([$testTicketId]);
            $insertedTicket = $stmt->fetch();
            
            if ($insertedTicket) {
                echo "<p class='success'>✅ Ticket récupéré avec succès</p>";
                echo "<pre>" . print_r($insertedTicket, true) . "</pre>";
            }
            
            // Nettoyer le ticket de test
            $stmt = $pdo->prepare("DELETE FROM tickets WHERE id = ?");
            $stmt->execute([$testTicketId]);
            echo "<p class='info'>🧹 Ticket de test supprimé</p>";
        } else {
            echo "<p class='error'>❌ Échec de l'insertion de test</p>";
            $errorInfo = $stmt->errorInfo();
            echo "<p class='error'>Erreur SQL: " . $errorInfo[2] . "</p>";
            echo "<p class='error'>Code d'erreur: " . $errorInfo[1] . "</p>";
        }
    } catch (Exception $e) {
        echo "<p class='error'>❌ Erreur lors du test d'insertion: " . $e->getMessage() . "</p>";
        echo "<p class='info'>Détails: Vérifiez que l'ID généré n'est pas vide</p>";
    }
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>6. Vérification des IDs vides</h2>";
    
    // Check for empty IDs in the database
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tickets WHERE id = '' OR id IS NULL");
    $emptyIds = $stmt->fetch()['count'];
    
    if ($emptyIds > 0) {
        echo "<p class='error'>⚠️ Trouvé {$emptyIds} tickets avec des IDs vides dans la base de données</p>";
        echo "<p class='warning'>Cela peut causer des erreurs de duplication. Nettoyage recommandé.</p>";
        
        // Show the problematic records
        $stmt = $pdo->query("SELECT id, event_name, generated_at FROM tickets WHERE id = '' OR id IS NULL LIMIT 5");
        $problematicTickets = $stmt->fetchAll();
        
        if (!empty($problematicTickets)) {
            echo "<h4>Tickets problématiques:</h4>";
            echo "<table>";
            echo "<tr><th>ID</th><th>Événement</th><th>Généré</th></tr>";
            foreach ($problematicTickets as $ticket) {
                echo "<tr>";
                echo "<td>" . (empty($ticket['id']) ? '[VIDE]' : $ticket['id']) . "</td>";
                echo "<td>{$ticket['event_name']}</td>";
                echo "<td>{$ticket['generated_at']}</td>";
                echo "</tr>";
            }
            echo "</table>";
        }
    } else {
        echo "<p class='success'>✅ Aucun ticket avec ID vide trouvé</p>";
    }
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>7. Vérification des contraintes</h2>";
    
    // Vérifier les index
    $stmt = $pdo->query("SHOW INDEX FROM tickets");
    $indexes = $stmt->fetchAll();
    echo "<h3>Index de la table tickets:</h3>";
    echo "<table>";
    echo "<tr><th>Nom</th><th>Colonne</th><th>Unique</th></tr>";
    foreach ($indexes as $index) {
        echo "<tr>";
        echo "<td>{$index['Key_name']}</td>";
        echo "<td>{$index['Column_name']}</td>";
        echo "<td>" . ($index['Non_unique'] == 0 ? 'Oui' : 'Non') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>7. Statistiques par utilisateur</h2>";
    $stmt = $pdo->query("
        SELECT 
            u.name, 
            u.email,
            COUNT(t.id) as total_tickets,
            COUNT(CASE WHEN t.is_custom = 1 THEN 1 END) as custom_tickets,
            COALESCE(SUM(CASE WHEN t.custom_price IS NOT NULL THEN t.custom_price ELSE t.price END), 0) as total_spent
        FROM users u
        LEFT JOIN tickets t ON u.id = t.user_id
        GROUP BY u.id, u.name, u.email
        ORDER BY total_tickets DESC
    ");
    $userStats = $stmt->fetchAll();
    
    echo "<table>";
    echo "<tr><th>Utilisateur</th><th>Email</th><th>Total Tickets</th><th>Tickets Custom</th><th>Total Dépensé</th></tr>";
    foreach ($userStats as $stat) {
        echo "<tr>";
        echo "<td>{$stat['name']}</td>";
        echo "<td>{$stat['email']}</td>";
        echo "<td>{$stat['total_tickets']}</td>";
        echo "<td>{$stat['custom_tickets']}</td>";
        echo "<td>{$stat['total_spent']} MAD</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
    echo "<div class='step' style='border-left-color: #22c55e; background: #f0fdf4;'>";
    echo "<h2>🎯 DIAGNOSTIC TERMINÉ</h2>";
    echo "<p class='success'>Toutes les vérifications sont terminées. Si vous rencontrez encore des erreurs, vérifiez:</p>";
    echo "<ul>";
    echo "<li>Que le serveur PHP est bien démarré sur le port 8080</li>";
    echo "<li>Que la base de données MySQL est accessible</li>";
    echo "<li>Que les permissions de l'utilisateur sont correctes</li>";
    echo "<li>Qu'il n'y a pas de conflits d'ID ou de QR codes</li>";
    echo "</ul>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div class='step' style='border-left-color: #ef4444; background: #fef2f2;'>";
    echo "<h2>❌ Erreur lors du diagnostic</h2>";
    echo "<p class='error'>Erreur: " . $e->getMessage() . "</p>";
    echo "</div>";
}

echo "</div></body></html>";
?>