<?php
require_once 'config.php';

// Add detailed logging for debugging
error_log("🎫 create_ticket.php called with method: " . $_SERVER['REQUEST_METHOD']);

// Ensure request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_log("❌ Invalid method: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Create connection using centralized config
    $pdo = createDatabaseConnection();
    error_log("✅ Database connection established successfully");
    
    // Get JSON payload
    $json = file_get_contents('php://input');
    error_log("📥 Raw JSON input: " . $json);
    
    if (empty($json)) {
        error_log("❌ Empty JSON payload received");
        http_response_code(400);
        echo json_encode(['error' => 'Empty request body']);
        exit();
    }
    
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("❌ JSON decode error: " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
        exit();
    }
    
    error_log("📋 Decoded data: " . print_r($data, true));
    
    if (!isset($data['eventId']) || !isset($data['userId'])) {
        error_log("❌ Missing required fields: eventId or userId");
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields: eventId, userId']);
        exit();
    }
    
    // Validate required fields
    $requiredFields = ['eventId', 'userId', 'eventName', 'eventDate', 'location', 'ticketType', 'price'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            error_log("❌ Missing or empty required field: " . $field);
            http_response_code(400);
            echo json_encode(['error' => "Missing or empty required field: $field"]);
            exit();
        }
    }
    
    // Validate data types
    if (!is_numeric($data['price'])) {
        error_log("❌ Invalid price format: " . $data['price']);
        http_response_code(400);
        echo json_encode(['error' => 'Price must be a valid number']);
        exit();
    }
    
    if (isset($data['customPrice']) && !is_numeric($data['customPrice'])) {
        error_log("❌ Invalid custom price format: " . $data['customPrice']);
        http_response_code(400);
        echo json_encode(['error' => 'Custom price must be a valid number']);
        exit();
    }
    
    error_log("✅ All required fields present, proceeding with ticket creation");
    
    // ROBUST ID GENERATION - Use the ID from frontend if provided, otherwise generate one
    $ticketId = null;
    
    if (isset($data['id']) && !empty(trim($data['id']))) {
        // Use the ID provided by the frontend
        $ticketId = trim($data['id']);
        error_log("🆔 Using frontend-provided ID: " . $ticketId);
    } else {
        // Generate a new ID if none provided
        $timestamp = microtime(true) * 1000; // Microseconds for uniqueness
        $random = bin2hex(random_bytes(8)); // 16 hex characters
        $userHash = substr(md5($data['userId']), 0, 6); // 6 chars from user ID hash
        $eventHash = substr(md5($data['eventId']), 0, 4); // 4 chars from event ID hash
        
        $ticketId = "tk_{$timestamp}_{$userHash}_{$eventHash}_{$random}";
        error_log("🆔 Generated new ID: " . $ticketId);
    }
    
    // CRITICAL: Validate that ID is never empty
    if (empty($ticketId) || trim($ticketId) === '' || strlen($ticketId) < 10) {
        error_log("🚨 CRITICAL: Empty or invalid ticket ID detected: '" . $ticketId . "'");
        http_response_code(500);
        echo json_encode([
            'error' => 'ERREUR CRITIQUE: ID de ticket vide généré',
            'debug' => 'Empty ticket ID generated',
            'provided_id' => $data['id'] ?? 'none',
            'generated_id' => $ticketId
        ]);
        exit();
    }
    
    // Check if ticket ID already exists with better error handling
    try {
        $checkStmt = $pdo->prepare("SELECT id FROM tickets WHERE id = ?");
        $checkStmt->execute([$ticketId]);
        if ($checkStmt->fetch()) {
            error_log("⚠️ Ticket ID already exists: " . $ticketId);
            http_response_code(409);
            echo json_encode([
                'error' => 'Ticket ID already exists',
                'retry' => true,
                'existing_id' => $ticketId
            ]);
            exit();
        }
    } catch (PDOException $e) {
        error_log("❌ Error checking existing ticket ID: " . $e->getMessage());
        // Continue with insertion attempt
    }
    
    // Generate unique QR code
    $qrCode = isset($data['qrCode']) && !empty($data['qrCode']) 
        ? $data['qrCode'] 
        : "QR_" . $ticketId . "_" . bin2hex(random_bytes(3));
    
    // Validate QR code uniqueness
    $maxQrRetries = 5;
    for ($qrAttempt = 0; $qrAttempt < $maxQrRetries; $qrAttempt++) {
        $checkQrStmt = $pdo->prepare("SELECT id FROM tickets WHERE qr_code = ?");
        $checkQrStmt->execute([$qrCode]);
        
        if (!$checkQrStmt->fetch()) {
            break; // QR code is unique
        }
        
        // Generate new QR code
        $qrCode = "QR_" . $ticketId . "_" . bin2hex(random_bytes(3)) . "_" . $qrAttempt;
        error_log("🔄 QR code collision, retrying with: " . $qrCode);
    }
    
    // Log the ticket creation attempt
    error_log("🎫 Creating ticket with ID: $ticketId (length: " . strlen($ticketId) . ")");
    
    // Prepare all parameters
    $executeParams = [
        $ticketId, // GUARANTEED non-empty
        trim($data['eventId']),
        trim($data['userId']),
        trim($data['eventName']),
        $data['eventDate'],
        trim($data['location']),
        trim($data['ticketType']),
        (float)$data['price'],
        isset($data['customPrice']) ? (float)$data['customPrice'] : null,
        $qrCode,
        isset($data['isCustom']) ? (bool)$data['isCustom'] : false,
        $data['image'] ?? null,
        $data['startTime'] ?? null,
        $data['endTime'] ?? null
    ];
    
    // FINAL CHECK before execution
    if (empty($executeParams[0]) || trim($executeParams[0]) === '') {
        error_log("🚨 CRITICAL: Attempting to insert with empty ID");
        throw new Exception("ERREUR CRITIQUE: Tentative d'insertion avec ID vide");
    }
    
    error_log("📝 Execute parameters: " . print_r($executeParams, true));
    
    // Insert ticket into database with explicit validation
    $stmt = $pdo->prepare("
        INSERT INTO tickets (
            id, event_id, user_id, event_name, event_date, location, 
            ticket_type, price, custom_price, qr_code, is_custom, 
            image, start_time, end_time, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $result = $stmt->execute($executeParams);
    
    if (!$result) {
        $errorInfo = $stmt->errorInfo();
        error_log("❌ Database insert failed: " . print_r($errorInfo, true));
        throw new Exception("Failed to insert ticket: " . $errorInfo[2]);
    }
    
    // Verify the insertion
    $verifyStmt = $pdo->prepare("SELECT id, qr_code, generated_at FROM tickets WHERE id = ?");
    $verifyStmt->execute([$ticketId]);
    $insertedTicket = $verifyStmt->fetch();
    
    if (!$insertedTicket) {
        error_log("❌ Ticket insertion verification failed for ID: " . $ticketId);
        // Try to find the ticket with a more flexible search
        $flexibleVerifyStmt = $pdo->prepare("SELECT id, qr_code, generated_at FROM tickets WHERE id LIKE ? OR qr_code = ? ORDER BY generated_at DESC LIMIT 1");
        $flexibleVerifyStmt->execute(["%{$ticketId}%", $qrCode]);
        $flexibleTicket = $flexibleVerifyStmt->fetch();
        
        if (!$flexibleTicket) {
            // Check if there are any tickets in the database at all
            $countStmt = $pdo->query("SELECT COUNT(*) as count FROM tickets");
            $totalTickets = $countStmt->fetch()['count'];
            
            error_log("❌ CRITICAL: Ticket insertion verification failed completely");
            error_log("📊 Total tickets in database: " . $totalTickets);
            error_log("🔍 Searched for ID: " . $ticketId);
            error_log("🔍 Searched for QR: " . $qrCode);
            
            throw new Exception("Ticket insertion verification failed - ticket not found in database after insertion");
        } else {
            error_log("⚠️ Ticket found with flexible search: " . $flexibleTicket['id']);
            $insertedTicket = $flexibleTicket;
        }
    }
    
    error_log("✅ Ticket created and verified successfully with ID: $ticketId");
    
    // Return success response with all ticket data
    $responseData = [
        'success' => true,
        'message' => 'Ticket created and stored successfully in database',
        'ticket' => [
            'id' => $ticketId,
            'eventId' => $data['eventId'],
            'userId' => $data['userId'],
            'eventName' => $data['eventName'],
            'eventDate' => $data['eventDate'],
            'location' => $data['location'],
            'ticketType' => $data['ticketType'],
            'price' => (float)$data['price'],
            'customPrice' => isset($data['customPrice']) ? (float)$data['customPrice'] : null,
            'qrCode' => $qrCode,
            'isCustom' => isset($data['isCustom']) ? (bool)$data['isCustom'] : false,
            'image' => $data['image'] ?? null,
            'startTime' => $data['startTime'] ?? null,
            'endTime' => $data['endTime'] ?? null,
            'isUsed' => false,
            'generatedAt' => $insertedTicket['generated_at']
        ],
        'database_info' => [
            'stored' => true,
            'verified' => true,
            'id_length' => strlen($ticketId),
            'qr_code' => $qrCode
        ]
    ];
    
    error_log("✅ Sending success response: " . json_encode($responseData));
    http_response_code(201);
    echo json_encode($responseData);
    
} catch (PDOException $e) {
    error_log("❌ Database error: " . $e->getMessage());
    error_log("❌ SQL State: " . $e->getCode());
    error_log("❌ Full PDO Error Info: " . print_r($e->errorInfo ?? [], true));
    
    // Check if it's a duplicate entry error
    if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
        if (strpos($e->getMessage(), "Duplicate entry '' for key") !== false) {
            error_log("🚨 CRITICAL: Empty ID duplicate entry detected!");
            http_response_code(500);
            echo json_encode([
                'error' => 'Erreur critique: ID de ticket vide généré. Veuillez nettoyer la base de données en visitant https://qrticketpro.com/server/clean_empty_tickets.php',
                'action_required' => 'Visitez https://qrticketpro.com/server/clean_empty_tickets.php pour nettoyer la base de données',
                'debug' => 'Empty ID duplicate entry'
            ]);
        } else {
            // Regular duplicate, retry might help
            http_response_code(409);
            echo json_encode([
                'error' => 'Conflit d\'ID de ticket. Veuillez réessayer.',
                'retry' => true,
                'debug_info' => [
                    'error_message' => $e->getMessage(),
                    'sql_state' => $e->getCode(),
                    'ticket_id' => $ticketId ?? 'unknown'
                ]
            ]);
        }
    } else if (strpos($e->getMessage(), 'Data too long') !== false) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Données trop longues pour un champ de la base de données',
            'debug_info' => [
                'error_message' => $e->getMessage(),
                'ticket_id' => $ticketId ?? 'unknown'
            ]
        ]);
    } else if (strpos($e->getMessage(), 'foreign key constraint') !== false) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Contrainte de clé étrangère violée - vérifiez que l\'utilisateur et l\'événement existent',
            'debug_info' => [
                'error_message' => $e->getMessage(),
                'user_id' => $executeParams[2] ?? 'unknown',
                'event_id' => $executeParams[1] ?? 'unknown'
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'error' => 'Erreur de base de données: ' . $e->getMessage(),
            'sql_state' => $e->getCode(),
            'debug_info' => [
                'ticket_id' => $ticketId ?? 'unknown',
                'qr_code' => $qrCode ?? 'unknown'
            ]
        ]);
    }
} catch (Exception $e) {
    error_log("❌ General error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}
?>