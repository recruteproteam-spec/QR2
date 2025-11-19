<?php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html lang='fr'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Correction de la taille du champ ID des tickets</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: #22c55e; font-weight: bold; }
        .error { color: #ef4444; font-weight: bold; }
        .warning { color: #f59e0b; font-weight: bold; }
        .info { color: #3b82f6; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .step { margin: 20px 0; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🔧 Correction de la taille du champ ID des tickets</h1>";

try {
    echo "<div class='step'>";
    echo "<h2>🔗 Connexion à la base de données</h2>";

    $pdo = createDatabaseConnection();

    $stmt = $pdo->query("SELECT DATABASE() as current_db");
    $dbInfo = $stmt->fetch();

    echo "<p class='success'>✅ Connexion réussie à la base de données: " . $dbInfo['current_db'] . "</p>";
    echo "</div>";

    echo "<div class='step'>";
    echo "<h2>📊 État actuel de la table tickets</h2>";

    // Check current column definition
    $stmt = $pdo->query("SHOW COLUMNS FROM tickets WHERE Field = 'id'");
    $currentColumn = $stmt->fetch();

    if ($currentColumn) {
        echo "<p class='info'><strong>Type actuel du champ 'id':</strong> " . $currentColumn['Type'] . "</p>";

        if (strpos($currentColumn['Type'], 'varchar(50)') !== false) {
            echo "<p class='warning'>⚠️ Le champ 'id' est actuellement VARCHAR(50), ce qui peut tronquer les IDs longs!</p>";
        } else if (strpos($currentColumn['Type'], 'varchar(100)') !== false) {
            echo "<p class='success'>✅ Le champ 'id' est déjà VARCHAR(100), pas de modification nécessaire.</p>";
        }
    }

    // Count tickets
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM tickets");
    $ticketCount = $stmt->fetch()['total'];
    echo "<p class='info'><strong>Nombre total de tickets:</strong> $ticketCount</p>";

    // Find tickets with IDs that might be truncated (less than expected length for custom tickets)
    $stmt = $pdo->query("SELECT id, event_name, LENGTH(id) as id_length, is_custom FROM tickets WHERE (is_custom = 1 AND LENGTH(id) < 40) OR (is_custom = 0 AND LENGTH(id) < 35) ORDER BY generated_at DESC LIMIT 10");
    $suspiciousTickets = $stmt->fetchAll();

    if (count($suspiciousTickets) > 0) {
        echo "<p class='warning'>⚠️ " . count($suspiciousTickets) . " tickets avec IDs possiblement tronqués trouvés:</p>";
        echo "<table>";
        echo "<tr><th>ID</th><th>Événement</th><th>Longueur ID</th><th>Type</th></tr>";
        foreach ($suspiciousTickets as $ticket) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($ticket['id']) . "</td>";
            echo "<td>" . htmlspecialchars($ticket['event_name']) . "</td>";
            echo "<td>" . $ticket['id_length'] . "</td>";
            echo "<td>" . ($ticket['is_custom'] ? 'Custom' : 'Standard') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p class='success'>✅ Aucun ticket avec ID suspect trouvé.</p>";
    }

    echo "</div>";

    echo "<div class='step'>";
    echo "<h2>🔧 Modification de la structure de la table</h2>";

    // Step 1: Create a temporary column for the new ID format
    try {
        echo "<p class='info'>Étape 1: Création d'une colonne temporaire...</p>";

        // Check if temp column already exists
        $stmt = $pdo->query("SHOW COLUMNS FROM tickets WHERE Field = 'id_temp'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE tickets ADD COLUMN id_temp VARCHAR(100) NULL");
            echo "<p class='success'>✅ Colonne temporaire créée</p>";
        } else {
            echo "<p class='info'>ℹ️ Colonne temporaire existe déjà</p>";
        }

        // Step 2: Check if we need to generate new IDs for existing tickets
        echo "<p class='info'>Étape 2: Vérification des tickets existants...</p>";
        $stmt = $pdo->query("SELECT id, event_id, user_id, is_custom, generated_at FROM tickets WHERE id_temp IS NULL OR id_temp = ''");
        $existingTickets = $stmt->fetchAll();

        if (count($existingTickets) > 0) {
            echo "<p class='warning'>⚠️ " . count($existingTickets) . " tickets nécessitent une conversion d'ID</p>";

            // Generate new IDs for existing tickets
            foreach ($existingTickets as $ticket) {
                $timestamp = strtotime($ticket['generated_at']) * 1000;
                $random = bin2hex(random_bytes(6));
                $userHash = substr(md5($ticket['user_id']), 0, 6);
                $eventHash = substr(md5($ticket['event_id']), 0, 4);
                $prefix = $ticket['is_custom'] ? 'custom' : 'std';

                $newId = "{$prefix}_{$timestamp}_{$userHash}_{$eventHash}_{$random}";

                // Update the temp column
                $updateStmt = $pdo->prepare("UPDATE tickets SET id_temp = ? WHERE id = ?");
                $updateStmt->execute([$newId, $ticket['id']]);
            }
            echo "<p class='success'>✅ Nouveaux IDs générés pour les tickets existants</p>";
        } else {
            echo "<p class='success'>✅ Tous les tickets ont déjà des IDs temporaires</p>";
        }

        // Step 3: Drop the old primary key
        echo "<p class='info'>Étape 3: Suppression de l'ancienne clé primaire...</p>";
        try {
            $pdo->exec("ALTER TABLE tickets DROP PRIMARY KEY");
            echo "<p class='success'>✅ Ancienne clé primaire supprimée</p>";
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), "Can't DROP") !== false) {
                echo "<p class='info'>ℹ️ La clé primaire a déjà été supprimée</p>";
            } else {
                throw $e;
            }
        }

        // Step 4: Drop the old id column
        echo "<p class='info'>Étape 4: Suppression de l'ancienne colonne id...</p>";
        try {
            $pdo->exec("ALTER TABLE tickets DROP COLUMN id");
            echo "<p class='success'>✅ Ancienne colonne id supprimée</p>";
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), "check that it exists") !== false) {
                echo "<p class='info'>ℹ️ La colonne id a déjà été supprimée</p>";
            } else {
                throw $e;
            }
        }

        // Step 5: Rename temp column to id
        echo "<p class='info'>Étape 5: Renommage de la colonne temporaire...</p>";
        $pdo->exec("ALTER TABLE tickets CHANGE COLUMN id_temp id VARCHAR(100) NOT NULL");
        echo "<p class='success'>✅ Colonne renommée avec succès</p>";

        // Step 6: Add new primary key
        echo "<p class='info'>Étape 6: Ajout de la nouvelle clé primaire...</p>";
        $pdo->exec("ALTER TABLE tickets ADD PRIMARY KEY (id)");
        echo "<p class='success'>✅ Nouvelle clé primaire créée</p>";

        echo "<p class='success' style='font-size: 1.2em; margin-top: 20px;'>🎉 Migration complète avec succès!</p>";

    } catch (PDOException $e) {
        echo "<p class='error'>❌ Erreur lors de la modification: " . htmlspecialchars($e->getMessage()) . "</p>";
        echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    }
    echo "</div>";

    echo "<div class='step'>";
    echo "<h2>✅ Vérification post-modification</h2>";

    // Verify the change
    $stmt = $pdo->query("SHOW COLUMNS FROM tickets WHERE Field = 'id'");
    $newColumn = $stmt->fetch();

    if ($newColumn) {
        echo "<p class='info'><strong>Type actuel du champ 'id':</strong> " . $newColumn['Type'] . "</p>";

        if (strpos($newColumn['Type'], 'varchar(100)') !== false) {
            echo "<p class='success'>✅ Modification confirmée! Le champ 'id' est maintenant VARCHAR(100)</p>";
            echo "<p class='info'>Les nouveaux tickets créés pourront maintenant stocker des IDs complets jusqu'à 100 caractères.</p>";
        }
    }
    echo "</div>";

    echo "<div class='step' style='border-left-color: #22c55e; background: #f0fdf4;'>";
    echo "<h2>🎉 Correction terminée!</h2>";
    echo "<p class='success'>La structure de la table a été mise à jour avec succès.</p>";
    echo "<h4>📋 Prochaines étapes:</h4>";
    echo "<ol>";
    echo "<li>Les nouveaux tickets créés auront des IDs complets</li>";
    echo "<li>Les anciens tickets avec IDs tronqués restent dans la base de données</li>";
    echo "<li>Si des IDs en double ont été détectés, ils doivent être nettoyés manuellement</li>";
    echo "<li>Retournez à votre application: <a href='https://qrticketpro.com' target='_blank'>https://qrticketpro.com</a></li>";
    echo "</ol>";
    echo "</div>";

} catch (PDOException $e) {
    echo "<div class='step' style='border-left-color: #ef4444; background: #fef2f2;'>";
    echo "<h2>❌ Erreur de base de données</h2>";
    echo "<p class='error'>Erreur: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</div>";
} catch (Exception $e) {
    echo "<div class='step' style='border-left-color: #ef4444; background: #fef2f2;'>";
    echo "<h2>❌ Erreur générale</h2>";
    echo "<p class='error'>Erreur: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "</div>";
}

echo "</div></body></html>";
?>
