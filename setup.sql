-- Crear tabla de datos mensuales (Valores reales introducidos)
CREATE TABLE IF NOT EXISTS monthly_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    month_idx INT NOT NULL, -- 0 a 11
    category VARCHAR(100) NOT NULL,
    section VARCHAR(50) NOT NULL,
    actual_value DECIMAL(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_record (employee_id, month_idx, category, section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de estados de mes (Si el mes está bloqueado/cerrado para una sección)
CREATE TABLE IF NOT EXISTS month_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month_idx INT NOT NULL,
    section VARCHAR(50) NOT NULL,
    is_filled TINYINT(1) DEFAULT 0,
    UNIQUE KEY unique_status (month_idx, section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla preparada para el futuro: Objetivos personalizados por sección/empleado
CREATE TABLE IF NOT EXISTS custom_targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) DEFAULT NULL, -- NULL significa objetivo general de la categoría
    month_idx INT NOT NULL,
    target_value DECIMAL(10, 2) NOT NULL,
    UNIQUE KEY unique_target (section, category, employee_id, month_idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
