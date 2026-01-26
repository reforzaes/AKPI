<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Configuración de la base de datos
$host = 'localhost'; // Normalmente localhost en Hostinger
$db   = 'u396112349_objetivos2026';
$user = 'u396112349_objetivos2026';
$pass = 'Leroy047!!';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
    exit;
}

// Obtener la acción (GET o POST)
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET') {
    if ($action === 'loadData') {
        // Cargar datos reales
        $stmtData = $pdo->query("SELECT employee_id, month_idx, category, section, actual_value FROM monthly_data");
        $monthly_data = $stmtData->fetchAll();

        // Cargar estados de mes
        $stmtStatus = $pdo->query("SELECT month_idx, section, is_filled FROM month_status");
        $month_status = $stmtStatus->fetchAll();

        echo json_encode([
            'monthly_data' => $monthly_data,
            'month_status' => $month_status
        ]);
    }
} 

elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';
    $payload = isset($input['payload']) ? $input['payload'] : [];

    if ($action === 'saveData') {
        $pdo->beginTransaction();
        try {
            $sql = "INSERT INTO monthly_data (employee_id, month_idx, category, section, actual_value) 
                    VALUES (:empId, :mIdx, :cat, :sec, :val) 
                    ON DUPLICATE KEY UPDATE actual_value = :val2";
            $stmt = $pdo->prepare($sql);
            
            foreach ($payload as $row) {
                $stmt->execute([
                    'empId' => $row['employeeId'],
                    'mIdx'  => $row['month'],
                    'cat'   => $row['category'],
                    'sec'   => $row['section'],
                    'val'   => $row['value'],
                    'val2'  => $row['value']
                ]);
            }
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['error' => $e->getMessage()]);
        }
    } 
    
    elseif ($action === 'saveStatus') {
        $pdo->beginTransaction();
        try {
            $sql = "INSERT INTO month_status (month_idx, section, is_filled) 
                    VALUES (:mIdx, :sec, :isF) 
                    ON DUPLICATE KEY UPDATE is_filled = :isF2";
            $stmt = $pdo->prepare($sql);
            
            foreach ($payload as $row) {
                $stmt->execute([
                    'mIdx'  => $row['month_idx'],
                    'sec'   => $row['section'],
                    'isF'   => $row['is_filled'],
                    'isF2'  => $row['is_filled']
                ]);
            }
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
?>
