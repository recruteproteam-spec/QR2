<?php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html lang='fr'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Ajout de la colonne updated_at</title>
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
        <h1>🔧 Ajout de la colonne updated_at</h1>";

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    
    echo "<div class='step'>";
    echo "<h2>1. Vérification de la structure actuelle</h2>";
    
    // Check if updated_at column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'updated_at'");
    $hasUpdatedAt = $stmt->rowCount() > 0;
    
    if ($hasUpdatedAt) {
        echo "<p class='success'>✅ La colonne 'updated_at' existe déjà</p>";
    } else {
        echo "<p class='warning'>⚠️ La colonne 'updated_at' n'existe pas</p>";
    }
    echo "</div>";
    
    if (!$hasUpdatedAt) {
        echo "<div class='step'>";
        echo "<h2>2. Ajout de la colonne updated_at</h2>";
        
        try {
            // Add updated_at column
            $pdo->exec("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            echo "<p class='success'>✅ Colonne 'updated_at' ajoutée avec succès</p>";
            
            // Verify the addition
            $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'updated_at'");
            if ($stmt->rowCount() > 0) {
                echo "<p class='success'>✅ Vérification : colonne 'updated_at' présente</p>";
            } else {
                echo "<p class='error'>❌ Erreur : colonne 'updated_at' non trouvée après ajout</p>";
            }
            
        } catch (PDOException $e) {
            echo "<p class='error'>❌ Erreur lors de l'ajout de la colonne : " . $e->getMessage() . "</p>";
            
            // Check if it's a permission error
            if (strpos($e->getMessage(), 'ALTER command denied') !== false) {
                echo "<p class='warning'>⚠️ Permissions insuffisantes pour modifier la table</p>";
                echo "<p class='info'>💡 Solution : Contactez votre hébergeur pour ajouter la colonne ou utilisez phpMyAdmin</p>";
            }
        }
        echo "</div>";
    }
    
    echo "<div class='step'>";
    echo "<h2>3. Structure finale de la table</h2>";
    
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll();
    
    echo "<table style='width: 100%; border-collapse: collapse;'>";
    echo "<tr style='background: #f2f2f2;'><th style='border: 1px solid #ddd; padding: 8px;'>Colonne</th><th style='border: 1px solid #ddd; padding: 8px;'>Type</th><th style='border: 1px solid #ddd; padding: 8px;'>Null</th><th style='border: 1px solid #ddd; padding: 8px;'>Défaut</th></tr>";
    foreach ($columns as $column) {
        echo "<tr>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>{$column['Field']}</td>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>{$column['Type']}</td>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>{$column['Null']}</td>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>{$column['Default']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
    echo "<div class='step' style='border-left-color: #22c55e; background: #f0fdf4;'>";
    echo "<h2>🎉 Processus terminé</h2>";
    echo "<p class='success'>La structure de la table users a été vérifiée et mise à jour si nécessaire.</p>";
    echo "<p class='info'>Vous pouvez maintenant tester le changement de mot de passe dans l'application.</p>";
    echo "<p><a href='https://qrticketpro.com' target='_blank'>🔗 Retourner à l'application</a></p>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div class='step' style='border-left-color: #ef4444; background: #fef2f2;'>";
    echo "<h2>❌ Erreur</h2>";
    echo "<p class='error'>Erreur: " . $e->getMessage() . "</p>";
    echo "</div>";
}

echo "</div></body></html>";
?>