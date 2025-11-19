<?php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html lang='fr'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Nettoyage des tickets avec IDs vides</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        .info { color: #3b82f6; }
        .warning { color: #f59e0b; }
        .step { margin: 20px 0; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🧹 Nettoyage des tickets avec IDs vides</h1>";

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    echo "<div class='step'>";
    echo "<h2>1. Recherche des tickets problématiques</h2>";
    
    // Find tickets with empty or null IDs
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tickets WHERE id = '' OR id IS NULL OR TRIM(id) = ''");
    $emptyIdCount = $stmt->fetch()['count'];
    
    echo "<p class='info'>Tickets avec IDs vides trouvés: <strong>{$emptyIdCount}</strong></p>";
    
    if ($emptyIdCount > 0) {
        // Show the problematic tickets
        $stmt = $pdo->query("SELECT id, event_name, user_id, generated_at FROM tickets WHERE id = '' OR id IS NULL OR TRIM(id) = '' LIMIT 10");
        $problematicTickets = $stmt->fetchAll();
        
        echo "<h3>Tickets problématiques (max 10):</h3>";
        echo "<table>";
        echo "<tr><th>ID</th><th>Événement</th><th>Utilisateur</th><th>Généré</th></tr>";
        foreach ($problematicTickets as $ticket) {
            echo "<tr>";
            echo "<td>" . (empty($ticket['id']) ? '[VIDE]' : htmlspecialchars($ticket['id'])) . "</td>";
            echo "<td>" . htmlspecialchars($ticket['event_name']) . "</td>";
            echo "<td>" . htmlspecialchars($ticket['user_id']) . "</td>";
            echo "<td>{$ticket['generated_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    echo "</div>";
    
    if ($emptyIdCount > 0) {
        echo "<div class='step'>";
        echo "<h2>2. Nettoyage des tickets problématiques</h2>";
        
        // Delete tickets with empty IDs
        $stmt = $pdo->prepare("DELETE FROM tickets WHERE id = '' OR id IS NULL OR TRIM(id) = ''");
        $result = $stmt->execute();
        $deletedCount = $stmt->rowCount();
        
        if ($result) {
            echo "<p class='success'>✅ {$deletedCount} tickets avec IDs vides supprimés avec succès</p>";
        } else {
            echo "<p class='error'>❌ Erreur lors de la suppression des tickets</p>";
        }
        echo "</div>";
    }
    
    echo "<div class='step'>";
    echo "<h2>3. Vérification des doublons d'IDs</h2>";
    
    // Check for duplicate IDs
    $stmt = $pdo->query("
        SELECT id, COUNT(*) as count 
        FROM tickets 
        WHERE id != '' AND id IS NOT NULL 
        GROUP BY id 
        HAVING COUNT(*) > 1
    ");
    $duplicates = $stmt->fetchAll();
    
    if (!empty($duplicates)) {
        echo "<p class='warning'>⚠️ " . count($duplicates) . " IDs dupliqués trouvés:</p>";
        echo "<table>";
        echo "<tr><th>ID</th><th>Nombre d'occurrences</th></tr>";
        foreach ($duplicates as $duplicate) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($duplicate['id']) . "</td>";
            echo "<td>{$duplicate['count']}</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        echo "<p class='info'>💡 Pour résoudre les doublons, vous devrez les traiter manuellement.</p>";
    } else {
        echo "<p class='success'>✅ Aucun doublon d'ID trouvé</p>";
    }
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>4. Statistiques finales</h2>";
    
    // Final statistics
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM tickets");
    $totalTickets = $stmt->fetch()['total'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as valid FROM tickets WHERE id != '' AND id IS NOT NULL AND TRIM(id) != ''");
    $validTickets = $stmt->fetch()['valid'];
    
    echo "<p class='info'>Total des tickets: <strong>{$totalTickets}</strong></p>";
    echo "<p class='success'>Tickets avec IDs valides: <strong>{$validTickets}</strong></p>";
    
    if ($totalTickets == $validTickets) {
        echo "<p class='success'>✅ Tous les tickets ont des IDs valides</p>";
    }
    echo "</div>";
    
    echo "<div class='step' style='border-left-color: #22c55e; background: #f0fdf4;'>";
    echo "<h2>🎉 Nettoyage terminé</h2>";
    echo "<p class='success'>Le nettoyage de la base de données est terminé.</p>";
    echo "<p class='info'>Vous pouvez maintenant retourner à l'application et essayer de générer de nouveaux tickets.</p>";
    echo "<p><a href='https://qrticketpro.com' target='_blank'>🔗 Retourner à l'application</a></p>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div class='step' style='border-left-color: #ef4444; background: #fef2f2;'>";
    echo "<h2>❌ Erreur lors du nettoyage</h2>";
    echo "<p class='error'>Erreur: " . $e->getMessage() . "</p>";
    echo "</div>";
}

echo "</div></body></html>";
?>