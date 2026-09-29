-- Atualizacao do inventario Selfit para MySQL Workbench.
-- Objetivo:
-- 1) Separar TVs e cameras da tabela equipamentos.
-- 2) Remover modelo e mac_address do cadastro de equipamentos.
-- 3) Permitir manutencoes vinculadas a equipamento, TV ou camera.
-- Rode este script no banco do sistema Selfit depois de fazer backup.

SET SQL_SAFE_UPDATES = 0;

CREATE TABLE IF NOT EXISTS tvs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unidade_id INT UNSIGNED NOT NULL,
  nome_identificacao VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'TV',
  marca VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
  data_garantia DATE NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tvs_nome_ativo (deleted_at, nome_identificacao),
  INDEX idx_tvs_garantia (deleted_at, data_garantia),
  CONSTRAINT tvs_unidade_id_foreign FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS cameras (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unidade_id INT UNSIGNED NOT NULL,
  nome_identificacao VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'CAMERAS',
  marca VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
  data_garantia DATE NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cameras_nome_ativo (deleted_at, nome_identificacao),
  INDEX idx_cameras_garantia (deleted_at, data_garantia),
  CONSTRAINT cameras_unidade_id_foreign FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT
);

DROP PROCEDURE IF EXISTS selfit_add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE selfit_add_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL selfit_add_column_if_missing('manutencoes', 'item_tipo', 'VARCHAR(20) NOT NULL DEFAULT ''EQUIPAMENTO''');
CALL selfit_add_column_if_missing('manutencoes', 'item_id', 'BIGINT UNSIGNED NULL');
CALL selfit_add_column_if_missing('unidades', 'tipo_unidade', 'VARCHAR(20) NOT NULL DEFAULT ''PROPRIA'' AFTER `nome`');

UPDATE unidades
SET tipo_unidade = 'PROPRIA'
WHERE tipo_unidade IS NULL OR TRIM(tipo_unidade) = '';

DROP PROCEDURE IF EXISTS selfit_drop_fk_for_column;
DELIMITER $$
CREATE PROCEDURE selfit_drop_fk_for_column(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64)
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE fk_name VARCHAR(128);
  DECLARE fk_cursor CURSOR FOR
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
      AND REFERENCED_TABLE_NAME IS NOT NULL;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN fk_cursor;
  read_loop: LOOP
    FETCH fk_cursor INTO fk_name;
    IF done THEN
      LEAVE read_loop;
    END IF;
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` DROP FOREIGN KEY `', fk_name, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE fk_cursor;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS selfit_modify_column_if_exists;
DELIMITER $$
CREATE PROCEDURE selfit_modify_column_if_exists(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` MODIFY `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL selfit_drop_fk_for_column('manutencoes', 'equipamento_id');
CALL selfit_modify_column_if_exists('manutencoes', 'equipamento_id', 'BIGINT UNSIGNED NULL');

DROP PROCEDURE IF EXISTS selfit_apply_manutencao_map;
DELIMITER $$
CREATE PROCEDURE selfit_apply_manutencao_map(
  IN p_map_table VARCHAR(64),
  IN p_item_tipo VARCHAR(20)
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'manutencoes'
      AND COLUMN_NAME = 'equipamento_id'
  ) THEN
    SET @sql = CONCAT(
      'UPDATE manutencoes m ',
      'JOIN `', p_map_table, '` map ON map.old_id = m.equipamento_id ',
      'SET m.item_tipo = ?, m.item_id = map.new_id, m.equipamento_id = NULL ',
      'WHERE map.old_id IS NOT NULL'
    );
    PREPARE stmt FROM @sql;
    SET @tipo = p_item_tipo;
    EXECUTE stmt USING @tipo;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

DROP TEMPORARY TABLE IF EXISTS selfit_migrate_tvs;
CREATE TEMPORARY TABLE selfit_migrate_tvs (
  old_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  new_id BIGINT UNSIGNED NOT NULL
);

INSERT INTO tvs (unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at)
SELECT unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at
FROM equipamentos e
WHERE e.categoria = 'TV'
  AND NOT EXISTS (
    SELECT 1
    FROM tvs t
    WHERE t.unidade_id = e.unidade_id
      AND t.nome_identificacao = e.nome_identificacao
      AND t.categoria = e.categoria
  );

INSERT INTO selfit_migrate_tvs (old_id, new_id)
SELECT e.id AS old_id, t.id AS new_id
FROM equipamentos e
JOIN tvs t
  ON t.unidade_id = e.unidade_id
 AND t.nome_identificacao = e.nome_identificacao
 AND t.categoria = e.categoria
 AND t.marca = e.marca
 AND t.data_garantia = e.data_garantia
WHERE e.categoria = 'TV';

CALL selfit_apply_manutencao_map('selfit_migrate_tvs', 'TV');

DELETE FROM equipamentos WHERE categoria = 'TV';

DROP TEMPORARY TABLE IF EXISTS selfit_migrate_cameras;
CREATE TEMPORARY TABLE selfit_migrate_cameras (
  old_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  new_id BIGINT UNSIGNED NOT NULL
);

INSERT INTO cameras (unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at)
SELECT unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at
FROM equipamentos e
WHERE e.categoria = 'CAMERAS'
  AND NOT EXISTS (
    SELECT 1
    FROM cameras c
    WHERE c.unidade_id = e.unidade_id
      AND c.nome_identificacao = e.nome_identificacao
      AND c.categoria = e.categoria
  );

INSERT INTO selfit_migrate_cameras (old_id, new_id)
SELECT e.id AS old_id, c.id AS new_id
FROM equipamentos e
JOIN cameras c
  ON c.unidade_id = e.unidade_id
 AND c.nome_identificacao = e.nome_identificacao
 AND c.categoria = e.categoria
 AND c.marca = e.marca
 AND c.data_garantia = e.data_garantia
WHERE e.categoria = 'CAMERAS';

CALL selfit_apply_manutencao_map('selfit_migrate_cameras', 'CAMERA');

DELETE FROM equipamentos WHERE categoria = 'CAMERAS';

DROP PROCEDURE IF EXISTS selfit_drop_indexes_for_column;
DELIMITER $$
CREATE PROCEDURE selfit_drop_indexes_for_column(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64)
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE index_name_value VARCHAR(128);
  DECLARE index_cursor CURSOR FOR
    SELECT DISTINCT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
      AND INDEX_NAME <> 'PRIMARY';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN index_cursor;
  read_loop: LOOP
    FETCH index_cursor INTO index_name_value;
    IF done THEN
      LEAVE read_loop;
    END IF;
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` DROP INDEX `', index_name_value, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE index_cursor;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS selfit_drop_checks_for_text;
DELIMITER $$
CREATE PROCEDURE selfit_drop_checks_for_text(
  IN p_table VARCHAR(64),
  IN p_text VARCHAR(64)
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE check_name_value VARCHAR(128);
  DECLARE check_cursor CURSOR FOR
    SELECT tc.CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS tc
    JOIN information_schema.CHECK_CONSTRAINTS cc
      ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
     AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE()
      AND tc.TABLE_NAME = p_table
      AND tc.CONSTRAINT_TYPE = 'CHECK'
      AND LOWER(cc.CHECK_CLAUSE) LIKE CONCAT('%', LOWER(p_text), '%');
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN check_cursor;
  read_loop: LOOP
    FETCH check_cursor INTO check_name_value;
    IF done THEN
      LEAVE read_loop;
    END IF;
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` DROP CHECK `', check_name_value, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE check_cursor;
END$$
DELIMITER ;

CALL selfit_drop_indexes_for_column('equipamentos', 'modelo');
CALL selfit_drop_indexes_for_column('equipamentos', 'mac_address');
CALL selfit_drop_indexes_for_column('equipamentos', 'numero_serie');
CALL selfit_drop_indexes_for_column('equipamentos', 'placa_patrimonio');
CALL selfit_drop_indexes_for_column('equipamentos', 'localizacao');
CALL selfit_drop_indexes_for_column('equipamentos', 'endereco_ip');
CALL selfit_drop_checks_for_text('equipamentos', 'modelo');
CALL selfit_drop_checks_for_text('equipamentos', 'mac_address');
CALL selfit_drop_checks_for_text('equipamentos', 'numero_serie');
CALL selfit_drop_checks_for_text('equipamentos', 'placa_patrimonio');
CALL selfit_drop_checks_for_text('equipamentos', 'localizacao');
CALL selfit_drop_checks_for_text('equipamentos', 'endereco_ip');

DROP PROCEDURE IF EXISTS selfit_drop_column_if_exists;
DELIMITER $$
CREATE PROCEDURE selfit_drop_column_if_exists(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64)
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` DROP COLUMN `', p_column, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS selfit_set_manutencao_item_from_column;
DELIMITER $$
CREATE PROCEDURE selfit_set_manutencao_item_from_column(
  IN p_column VARCHAR(64),
  IN p_item_tipo VARCHAR(20)
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'manutencoes'
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT(
      'UPDATE manutencoes ',
      'SET item_tipo = ?, item_id = `', p_column, '` ',
      'WHERE `', p_column, '` IS NOT NULL'
    );
    PREPARE stmt FROM @sql;
    SET @tipo = p_item_tipo;
    EXECUTE stmt USING @tipo;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL selfit_drop_column_if_exists('equipamentos', 'modelo');
CALL selfit_drop_column_if_exists('equipamentos', 'mac_address');
CALL selfit_drop_column_if_exists('equipamentos', 'numero_serie');
CALL selfit_drop_column_if_exists('equipamentos', 'placa_patrimonio');
CALL selfit_drop_column_if_exists('equipamentos', 'localizacao');
CALL selfit_drop_column_if_exists('equipamentos', 'endereco_ip');

CALL selfit_set_manutencao_item_from_column('equipamento_id', 'EQUIPAMENTO');
CALL selfit_set_manutencao_item_from_column('tv_id', 'TV');
CALL selfit_set_manutencao_item_from_column('camera_id', 'CAMERA');

CALL selfit_drop_indexes_for_column('manutencoes', 'equipamento_id');
CALL selfit_drop_indexes_for_column('manutencoes', 'tv_id');
CALL selfit_drop_indexes_for_column('manutencoes', 'camera_id');
CALL selfit_drop_fk_for_column('manutencoes', 'equipamento_id');
CALL selfit_drop_fk_for_column('manutencoes', 'tv_id');
CALL selfit_drop_fk_for_column('manutencoes', 'camera_id');
CALL selfit_drop_column_if_exists('manutencoes', 'equipamento_id');
CALL selfit_drop_column_if_exists('manutencoes', 'tv_id');
CALL selfit_drop_column_if_exists('manutencoes', 'camera_id');

DROP PROCEDURE IF EXISTS selfit_add_column_if_missing;
DROP PROCEDURE IF EXISTS selfit_drop_fk_for_column;
DROP PROCEDURE IF EXISTS selfit_drop_indexes_for_column;
DROP PROCEDURE IF EXISTS selfit_drop_checks_for_text;
DROP PROCEDURE IF EXISTS selfit_drop_column_if_exists;
DROP PROCEDURE IF EXISTS selfit_modify_column_if_exists;
DROP PROCEDURE IF EXISTS selfit_set_manutencao_item_from_column;
DROP PROCEDURE IF EXISTS selfit_apply_manutencao_map;

SELECT
  (SELECT COUNT(*) FROM equipamentos WHERE deleted_at IS NULL) AS equipamentos_ativos,
  (SELECT COUNT(*) FROM tvs WHERE deleted_at IS NULL) AS tvs_ativas,
  (SELECT COUNT(*) FROM cameras WHERE deleted_at IS NULL) AS cameras_ativas,
  (SELECT COUNT(*) FROM manutencoes) AS manutencoes_total;
