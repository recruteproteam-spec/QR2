<?php
// Configuration centralisée pour l'API PHP

// Détection automatique de l'environnement
function isProduction() {
    return isset($_SERVER['HTTP_HOST']) && 
           (strpos($_SERVER['HTTP_HOST'], 'qrticketpro.com') !== false ||
            strpos($_SERVER['HTTP_HOST'], 'netlify.app') !== false ||
            strpos($_SERVER['HTTP_HOST'], 'vercel.app') !== false);
}

// Configuration CORS
function setCorsHeaders() {
    // Permettre les requêtes depuis le frontend
    $allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://qrticketpro.com',
        'https://qrticketpro.netlify.app'
    ];
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header('Access-Control-Allow-Origin: *');
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
}

// Configuration de la base de données avec vos données de connexion
function getDatabaseConfig() {
    return [
        'host' => 'localhost',
        'user' => 'u845174030_qrticketadmin',
        'password' => 'Amine@@@1991',
        'database' => 'u845174030_qrticketpro',
        'charset' => 'utf8mb4'
    ];
}

// Fonction pour créer une connexion PDO
function createDatabaseConnection() {
    $config = getDatabaseConfig();
    
    try {
        $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new PDO($dsn, $config['user'], $config['password']);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->setAttribute(PDO::MYSQL_ATTR_INIT_COMMAND, "SET NAMES utf8mb4");
        
        // Set SQL mode for MariaDB/MySQL compatibility
        $pdo->exec("SET sql_mode = ''");
        $pdo->exec("SET time_zone = '+00:00'");
        
        // Log successful connection
        error_log("✅ Database connection successful to {$config['database']}");
        
        return $pdo;
    } catch (PDOException $e) {
        error_log("❌ Database connection error: " . $e->getMessage());
        error_log("🔧 Connection details: Host={$config['host']}, Database={$config['database']}, User={$config['user']}");
        throw new Exception("Erreur de connexion à la base de données: " . $e->getMessage());
    }
}

// Fonction pour gérer les réponses JSON
function sendJsonResponse($data, $statusCode = 200) {
    // Ensure clean output - no HTML errors
    if (ob_get_level()) {
        ob_clean();
    }
    
    http_response_code($statusCode);
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, must-revalidate');
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Fonction pour gérer les erreurs
function sendErrorResponse($message, $statusCode = 500) {
    error_log("❌ API Error: $message (Status: $statusCode)");
    
    // Ensure we're sending JSON, not HTML
    header('Content-Type: application/json');
    http_response_code($statusCode);
    
    sendJsonResponse(['error' => $message], $statusCode);
}

// Initialisation des headers CORS pour tous les fichiers
setCorsHeaders();

// Gérer les requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Log de démarrage
error_log("🚀 API PHP démarrée - Base de données: u845174030_qrticketpro");
?>