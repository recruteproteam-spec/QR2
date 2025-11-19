<?php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html lang='fr'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Debug Changement de Mot de Passe</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
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
        <h1>🔍 DEBUG CHANGEMENT DE MOT DE PASSE</h1>";

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    echo "<div class='step'>";
    echo "<h2>1. Vérification de la table users</h2>";
    
    // Check users table structure
    $stmt = $pdo->query("DESCRIBE users");
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
    echo "<h2>2. Utilisateurs existants</h2>";
    
    $stmt = $pdo->query("SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 10");
    $users = $stmt->fetchAll();
    
    echo "<table>";
    echo "<tr><th>ID</th><th>Nom</th><th>Email</th><th>Rôle</th><th>Actif</th><th>Créé</th></tr>";
    foreach ($users as $user) {
        echo "<tr>";
        echo "<td>{$user['id']}</td>";
        echo "<td>{$user['name']}</td>";
        echo "<td>{$user['email']}</td>";
        echo "<td>{$user['role']}</td>";
        echo "<td>" . ($user['is_active'] ? 'Oui' : 'Non') . "</td>";
        echo "<td>{$user['created_at']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>3. Test de changement de mot de passe</h2>";
    
    // Find a test user (not admin)
    $stmt = $pdo->prepare("SELECT id, email, name FROM users WHERE role = 'user' AND is_active = 1 LIMIT 1");
    $stmt->execute();
    $testUser = $stmt->fetch();
    
    if ($testUser) {
        echo "<p class='info'>Utilisateur de test trouvé: {$testUser['name']} ({$testUser['email']})</p>";
        echo "<p class='info'>ID: {$testUser['id']}</p>";
        
        // Test password hash generation
        $testPassword = 'newpassword123';
        $testHash = password_hash($testPassword, PASSWORD_DEFAULT);
        
        if ($testHash) {
            echo "<p class='success'>✅ Génération de hash réussie</p>";
            echo "<p class='info'>Hash généré: " . substr($testHash, 0, 20) . "...</p>";
            
            // Test password verification
            if (password_verify($testPassword, $testHash)) {
                echo "<p class='success'>✅ Vérification de hash réussie</p>";
            } else {
                echo "<p class='error'>❌ Échec de la vérification de hash</p>";
            }
        } else {
            echo "<p class='error'>❌ Échec de la génération de hash</p>";
        }
    } else {
        echo "<p class='warning'>⚠️ Aucun utilisateur de test trouvé</p>";
    }
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>4. Test de requête UPDATE</h2>";
    
    try {
        // Test UPDATE query without actually changing anything
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM users WHERE id = 'test_id_that_does_not_exist'");
        $stmt->execute();
        $result = $stmt->fetch();
        
        echo "<p class='success'>✅ Requête SELECT de test réussie</p>";
        
        // Test UPDATE syntax
        $stmt = $pdo->prepare("UPDATE users SET updated_at = NOW() WHERE id = 'test_id_that_does_not_exist'");
        $result = $stmt->execute();
        
        if ($result) {
            echo "<p class='success'>✅ Syntaxe UPDATE valide (0 lignes affectées: " . $stmt->rowCount() . ")</p>";
        } else {
            echo "<p class='error'>❌ Erreur de syntaxe UPDATE</p>";
        }
        
    } catch (Exception $e) {
        echo "<p class='error'>❌ Erreur lors du test UPDATE: " . $e->getMessage() . "</p>";
    }
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>5. Vérification des colonnes requises</h2>";
    
    // Check if required columns exist
    $requiredColumns = ['id', 'password_hash', 'email', 'name', 'is_active'];
    $existingColumns = array_column($structure, 'Field');
    
    foreach ($requiredColumns as $column) {
        if (in_array($column, $existingColumns)) {
            echo "<p class='success'>✅ Colonne '$column' existe</p>";
        } else {
            echo "<p class='error'>❌ Colonne '$column' manquante</p>";
        }
    }
    
    // Check if updated_at column exists
    if (in_array('updated_at', $existingColumns)) {
        echo "<p class='success'>✅ Colonne 'updated_at' existe</p>";
    } else {
        echo "<p class='warning'>⚠️ Colonne 'updated_at' manquante - sera ignorée</p>";
    }
    echo "</div>";
    
    echo "<div class='step'>";
    echo "<h2>6. Configuration PHP</h2>";
    
    echo "<ul>";
    echo "<li><strong>Version PHP:</strong> " . phpversion() . "</li>";
    echo "<li><strong>Extension PDO:</strong> " . (extension_loaded('pdo') ? 'Activée' : 'Désactivée') . "</li>";
    echo "<li><strong>Extension PDO MySQL:</strong> " . (extension_loaded('pdo_mysql') ? 'Activée' : 'Désactivée') . "</li>";
    echo "<li><strong>Password functions:</strong> " . (function_exists('password_hash') ? 'Disponibles' : 'Non disponibles') . "</li>";
    echo "</ul>";
    echo "</div>";
    
    echo "<div class='step' style='border-left-color: #22c55e; background: #f0fdf4;'>";
    echo "<h2>🎯 DIAGNOSTIC TERMINÉ</h2>";
    echo "<p class='success'>Le diagnostic est terminé. Vérifiez les points ci-dessus pour identifier le problème.</p>";
    echo "<p class='info'>Si tout semble correct, l'erreur peut venir de:</p>";
    echo "<ul>";
    echo "<li>Données JSON malformées envoyées par le frontend</li>";
    echo "<li>Problème de permissions sur la base de données</li>";
    echo "<li>Conflit avec d'autres scripts PHP</li>";
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