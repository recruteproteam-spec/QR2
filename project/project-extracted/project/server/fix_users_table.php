<?php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html lang='fr'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Correction de la table users</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        .info { color: #3b82f6; }
        .warning { color: #f59e0b; }
        .step { margin: 20px 0; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🔧 Correction de la table users</h1>";

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    echo "<div class='step'>";
    echo "<h2>1. Vérification de la structure actuelle</h2>";
    
    $stmt = $pdo->query("DESCRIBE users");
    $currentStructure = $stmt->fetchAll();
    $existingColumns = array_column($currentStructure, 'Field');
    
    echo "<p class='info'>Colonnes existantes: " . implode(', ', $existingColumns) . "</p>";
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>2. Ajout des colonnes manquantes</h2>";
    
    // Add updated_at column if it doesn't exist
    if (!in_array('updated_at', $existingColumns)) {
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            echo "<p class='success'>✅ Colonne 'updated_at' ajoutée</p>";
        } catch (Exception $e) {
            echo "<p class='warning'>⚠️ Impossible d'ajouter 'updated_at': " . $e->getMessage() . "</p>";
        }
    } else {
        echo "<p class='success'>✅ Colonne 'updated_at' existe déjà</p>";
    }
    
    // Add monthly_ticket_limit column if it doesn't exist
    if (!in_array('monthly_ticket_limit', $existingColumns)) {
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN monthly_ticket_limit INT DEFAULT 50");
            echo "<p class='success'>✅ Colonne 'monthly_ticket_limit' ajoutée</p>";
        } catch (Exception $e) {
            echo "<p class='warning'>⚠️ Impossible d'ajouter 'monthly_ticket_limit': " . $e->getMessage() . "</p>";
        }
    } else {
        echo "<p class='success'>✅ Colonne 'monthly_ticket_limit' existe déjà</p>";
    }
    
    // Rename ticket_limit to monthly_ticket_limit if needed
    if (in_array('ticket_limit', $existingColumns) && !in_array('monthly_ticket_limit', $existingColumns)) {
        try {
            $pdo->exec("ALTER TABLE users CHANGE ticket_limit monthly_ticket_limit INT DEFAULT 50");
            echo "<p class='success'>✅ Colonne 'ticket_limit' renommée en 'monthly_ticket_limit'</p>";
        } catch (Exception $e) {
            echo "<p class='warning'>⚠️ Impossible de renommer 'ticket_limit': " . $e->getMessage() . "</p>";
        }
    }
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>3. Mise à jour des données existantes</h2>";
    
    // Update admin user to have unlimited tickets
    $stmt = $pdo->prepare("UPDATE users SET monthly_ticket_limit = -1 WHERE role = 'admin'");
    $result = $stmt->execute();
    $adminUpdated = $stmt->rowCount();
    
    echo "<p class='success'>✅ {$adminUpdated} administrateur(s) mis à jour avec limite illimitée</p>";
    
    // Update users without monthly_ticket_limit
    $stmt = $pdo->prepare("UPDATE users SET monthly_ticket_limit = 50 WHERE monthly_ticket_limit IS NULL");
    $result = $stmt->execute();
    $usersUpdated = $stmt->rowCount();
    
    echo "<p class='success'>✅ {$usersUpdated} utilisateur(s) mis à jour avec limite par défaut (50)</p>";
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>4. Vérification finale</h2>";
    
    $stmt = $pdo->query("SELECT id, name, email, role, monthly_ticket_limit, is_active FROM users");
    $users = $stmt->fetchAll();
    
    echo "<table>";
    echo "<tr><th>ID</th><th>Nom</th><th>Email</th><th>Rôle</th><th>Limite</th><th>Actif</th></tr>";
    foreach ($users as $user) {
        echo "<tr>";
        echo "<td>{$user['id']}</td>";
        echo "<td>{$user['name']}</td>";
        echo "<td>{$user['email']}</td>";
        echo "<td>{$user['role']}</td>";
        echo "<td>" . ($user['monthly_ticket_limit'] == -1 ? 'Illimité' : $user['monthly_ticket_limit']) . "</td>";
        echo "<td>" . ($user['is_active'] ? 'Oui' : 'Non') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
    echo "<div class='step' style='border-left-color: #22c55e; background: #f0fdf4;'>";
    echo "<h2>🎉 Correction terminée</h2>";
    echo "<p class='success'>La table users a été corrigée. Vous pouvez maintenant essayer de changer le mot de passe.</p>";
    echo "<p class='info'>Retournez à l'application et testez la fonctionnalité de changement de mot de passe.</p>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div class='step' style='border-left-color: #ef4444; background: #fef2f2;'>";
    echo "<h2>❌ Erreur lors de la correction</h2>";
    echo "<p class='error'>Erreur: " . $e->getMessage() . "</p>";
    echo "</div>";
}

echo "</div></body></html>";
?>