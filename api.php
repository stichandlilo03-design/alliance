<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Data directory setup
$dataDir = __DIR__ . '/data';
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$usersFile = $dataDir . '/users.json';
$moneyflowFile = $dataDir . '/moneyflow.json';
$checkdepositsFile = $dataDir . '/checkdeposits.json';

// Initialize files if they don't exist
if (!file_exists($usersFile)) {
    file_put_contents($usersFile, json_encode([], JSON_PRETTY_PRINT));
}
if (!file_exists($moneyflowFile)) {
    file_put_contents($moneyflowFile, json_encode([], JSON_PRETTY_PRINT));
}
if (!file_exists($checkdepositsFile)) {
    file_put_contents($checkdepositsFile, json_encode([], JSON_PRETTY_PRINT));
}

// Helper Functions
function readJSON($file) {
    if (!file_exists($file)) return [];
    $content = file_get_contents($file);
    return json_decode($content, true) ?: [];
}

function writeJSON($file, $data) {
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

function sendResponse($success, $data = null, $error = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ]);
    exit();
}

// Get endpoint from query parameter or path
$endpoint = '';
$pathParts = [];

if (isset($_GET['endpoint'])) {
    // Using query parameter (preferred method)
    $path = $_GET['endpoint'];
    $pathParts = explode('/', $path);
    $endpoint = $pathParts[0];
} else {
    // Fallback to path-based routing
    $requestUri = $_SERVER['REQUEST_URI'];
    $scriptName = dirname($_SERVER['SCRIPT_NAME']);
    $path = str_replace($scriptName, '', $requestUri);
    $path = parse_url($path, PHP_URL_PATH);
    $path = trim($path, '/');
    
    // Remove 'api.php' and 'api' from path
    $path = preg_replace('#^api\.php/?#', '', $path);
    $path = preg_replace('#^api/?#', '', $path);
    
    $pathParts = explode('/', $path);
    $endpoint = $pathParts[0];
}

$method = $_SERVER['REQUEST_METHOD'];

// Get request body
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

// Admin credentials (you can change these)
$adminUsername = 'admin';
$adminPassword = 'admin123'; // Change this in production!

// Routes
switch ($endpoint) {
    
    // USER LOGIN
    case 'login':
        if ($method == 'POST') {
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            
            $users = readJSON($usersFile);
            $found = false;
            
            foreach ($users as $user) {
                if (($user['username'] == $username || $user['email'] == $username) && 
                    $user['password'] == $password) {
                    $found = true;
                    // Don't send password back
                    unset($user['password']);
                    sendResponse(true, ['user' => $user]);
                }
            }
            
            if (!$found) {
                sendResponse(false, null, 'Invalid username or password');
            }
        }
        break;
    
    // USER REGISTRATION
    case 'register':
        if ($method == 'POST') {
            $users = readJSON($usersFile);
            
            // Check if username or email already exists
            foreach ($users as $user) {
                if ($user['username'] == $data['username']) {
                    sendResponse(false, null, 'Username already exists');
                }
                if ($user['email'] == $data['email']) {
                    sendResponse(false, null, 'Email already exists');
                }
            }
            
            // Add new user
            $newUser = [
                'id' => uniqid(),
                'username' => $data['username'],
                'password' => $data['password'],
                'email' => $data['email'],
                'fullname' => $data['fullname'] ?? '',
                'firstName' => $data['firstName'] ?? '',
                'lastName' => $data['lastName'] ?? '',
                'phone' => $data['phone'] ?? '',
                'dob' => $data['dob'] ?? '',
                'address' => $data['address'] ?? '',
                'city' => $data['city'] ?? '',
                'state' => $data['state'] ?? '',
                'zip' => $data['zip'] ?? '',
                'country' => $data['country'] ?? '',
                'ssn' => $data['ssn'] ?? '',
                'accountType' => $data['accountType'] ?? '',
                'accountNumber' => $data['accountNumber'] ?? '',
                'routingNumber' => $data['routingNumber'] ?? '',
                'balance' => floatval($data['balance'] ?? 0),
                'checkingBalance' => floatval($data['checkingBalance'] ?? 0),
                'savingsBalance' => floatval($data['savingsBalance'] ?? 0),
                'transactions' => [],
                'marketing' => $data['marketing'] ?? false,
                'status' => $data['status'] ?? 'active',
                'taxCode' => $data['taxCode'] ?? '',
                'createdAt' => date('Y-m-d H:i:s')
            ];
            
            $users[] = $newUser;
            writeJSON($usersFile, $users);
            
            unset($newUser['password']);
            sendResponse(true, ['user' => $newUser]);
        }
        break;
    
    // GET USER
    case 'user':
        if ($method == 'GET' && isset($pathParts[1])) {
            $username = $pathParts[1];
            $users = readJSON($usersFile);
            
            foreach ($users as $user) {
                if ($user['username'] == $username) {
                    unset($user['password']);
                    sendResponse(true, ['user' => $user]);
                }
            }
            
            sendResponse(false, null, 'User not found');
        }
        
        // UPDATE USER
        if ($method == 'PUT' && isset($pathParts[1])) {
            $username = $pathParts[1];
            $users = readJSON($usersFile);
            
            foreach ($users as $key => $user) {
                if ($user['username'] == $username) {
                    // Update user data
                    $users[$key] = array_merge($user, $data);
                    writeJSON($usersFile, $users);
                    
                    unset($users[$key]['password']);
                    sendResponse(true, ['user' => $users[$key]]);
                }
            }
            
            sendResponse(false, null, 'User not found');
        }
        
        // DELETE USER
        if ($method == 'DELETE' && isset($pathParts[1])) {
            $username = $pathParts[1];
            $users = readJSON($usersFile);
            
            foreach ($users as $key => $user) {
                if ($user['username'] == $username) {
                    unset($users[$key]);
                    $users = array_values($users); // Re-index array
                    writeJSON($usersFile, $users);
                    sendResponse(true, ['message' => 'User deleted']);
                }
            }
            
            sendResponse(false, null, 'User not found');
        }
        break;
    
    // GET ALL USERS (for admin)
    case 'users':
        if ($method == 'GET') {
            $users = readJSON($usersFile);
            
            // Remove passwords
            foreach ($users as $key => $user) {
                unset($users[$key]['password']);
            }
            
            sendResponse(true, ['users' => $users]);
        }
        break;
    
    // ADMIN LOGIN
    case 'admin':
        if ($method == 'POST' && $pathParts[1] == 'login') {
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            
            if ($username == $adminUsername && $password == $adminPassword) {
                sendResponse(true, ['admin' => ['username' => $adminUsername]]);
            } else {
                sendResponse(false, null, 'Invalid admin credentials');
            }
        }
        break;
    
    // TRANSACTION MANAGEMENT
    case 'transaction':
        if ($method == 'POST' && isset($pathParts[1])) {
            $username = $pathParts[1];
            $users = readJSON($usersFile);
            
            foreach ($users as $key => $user) {
                if ($user['username'] == $username) {
                    if (!isset($users[$key]['transactions'])) {
                        $users[$key]['transactions'] = [];
                    }
                    
                    $transaction = $data;
                    $transaction['id'] = uniqid();
                    $transaction['date'] = date('Y-m-d H:i:s');
                    
                    $users[$key]['transactions'][] = $transaction;
                    writeJSON($usersFile, $users);
                    
                    sendResponse(true, ['transaction' => $transaction]);
                }
            }
            
            sendResponse(false, null, 'User not found');
        }
        break;
    
    case 'transactions':
        if ($method == 'GET' && isset($pathParts[1])) {
            $username = $pathParts[1];
            $users = readJSON($usersFile);
            
            foreach ($users as $user) {
                if ($user['username'] == $username) {
                    $transactions = $user['transactions'] ?? [];
                    sendResponse(true, ['transactions' => $transactions]);
                }
            }
            
            sendResponse(false, null, 'User not found');
        }
        break;
    
    // BALANCE UPDATE
    case 'balance':
        if ($method == 'PUT' && isset($pathParts[1])) {
            $username = $pathParts[1];
            $users = readJSON($usersFile);
            
            foreach ($users as $key => $user) {
                if ($user['username'] == $username) {
                    $users[$key]['balance'] = floatval($data['balance']);
                    
                    if (isset($data['checkingBalance'])) {
                        $users[$key]['checkingBalance'] = floatval($data['checkingBalance']);
                    }
                    if (isset($data['savingsBalance'])) {
                        $users[$key]['savingsBalance'] = floatval($data['savingsBalance']);
                    }
                    
                    writeJSON($usersFile, $users);
                    sendResponse(true, ['balance' => $users[$key]['balance']]);
                }
            }
            
            sendResponse(false, null, 'User not found');
        }
        break;
    
    // MONEYFLOW MANAGEMENT (Admin)
    case 'moneyflow':
        if ($method == 'POST') {
            $flows = readJSON($moneyflowFile);
            
            $newFlow = $data;
            $newFlow['id'] = uniqid();
            $newFlow['createdAt'] = date('Y-m-d H:i:s');
            
            $flows[] = $newFlow;
            writeJSON($moneyflowFile, $flows);
            
            sendResponse(true, ['flow' => $newFlow]);
        }
        
        if ($method == 'GET') {
            $flows = readJSON($moneyflowFile);
            sendResponse(true, ['flows' => $flows]);
        }
        
        if ($method == 'PUT' && isset($pathParts[1])) {
            $id = $pathParts[1];
            $flows = readJSON($moneyflowFile);
            
            foreach ($flows as $key => $flow) {
                if ($flow['id'] == $id) {
                    $flows[$key]['status'] = $data['status'];
                    writeJSON($moneyflowFile, $flows);
                    sendResponse(true, ['flow' => $flows[$key]]);
                }
            }
            
            sendResponse(false, null, 'Flow not found');
        }
        
        if ($method == 'DELETE' && isset($pathParts[1])) {
            $id = $pathParts[1];
            $flows = readJSON($moneyflowFile);
            
            foreach ($flows as $key => $flow) {
                if ($flow['id'] == $id) {
                    unset($flows[$key]);
                    $flows = array_values($flows);
                    writeJSON($moneyflowFile, $flows);
                    sendResponse(true, ['message' => 'Flow deleted']);
                }
            }
            
            sendResponse(false, null, 'Flow not found');
        }
        break;
    
    // CHECK DEPOSIT MANAGEMENT (Admin)
    case 'checkdeposit':
        if ($method == 'POST') {
            $checks = readJSON($checkdepositsFile);
            
            $newCheck = $data;
            $newCheck['id'] = uniqid();
            $newCheck['createdAt'] = date('Y-m-d H:i:s');
            
            $checks[] = $newCheck;
            writeJSON($checkdepositsFile, $checks);
            
            sendResponse(true, ['check' => $newCheck]);
        }
        
        if ($method == 'GET') {
            $checks = readJSON($checkdepositsFile);
            sendResponse(true, ['checks' => $checks]);
        }
        
        if ($method == 'PUT' && isset($pathParts[1])) {
            $id = $pathParts[1];
            $checks = readJSON($checkdepositsFile);
            
            foreach ($checks as $key => $check) {
                if ($check['id'] == $id) {
                    $checks[$key]['status'] = $data['status'];
                    writeJSON($checkdepositsFile, $checks);
                    sendResponse(true, ['check' => $checks[$key]]);
                }
            }
            
            sendResponse(false, null, 'Check not found');
        }
        
        if ($method == 'DELETE' && isset($pathParts[1])) {
            $id = $pathParts[1];
            $checks = readJSON($checkdepositsFile);
            
            foreach ($checks as $key => $check) {
                if ($check['id'] == $id) {
                    unset($checks[$key]);
                    $checks = array_values($checks);
                    writeJSON($checkdepositsFile, $checks);
                    sendResponse(true, ['message' => 'Check deleted']);
                }
            }
            
            sendResponse(false, null, 'Check not found');
        }
        break;
    
    default:
        sendResponse(false, null, 'Endpoint not found');
        break;
}
?>