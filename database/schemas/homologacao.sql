-- Painel Selfit: snapshot estrutural, sem dados ou credenciais.

-- Origem: selfit_homolog.

-- Referencia para revisao. Instale/atualize com npm run api:migrate.

-- Nao importar sobre uma base existente. Historico Knex deliberadamente omitido.

SET NAMES utf8mb4;

CREATE TABLE `unidades` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_unidade` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PROPRIA',
  `cnpj` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cep` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uf` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bairro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rua` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unidades_cnpj_unique` (`cnpj`),
  CONSTRAINT `unidades_chk_1` CHECK (((`nome` = upper(`nome`)) and (`nome` = trim(`nome`)) and (length(trim(`nome`)) > 0))),
  CONSTRAINT `unidades_chk_2` CHECK (((`cnpj` = upper(`cnpj`)) and (`cnpj` = trim(`cnpj`)) and (length(trim(`cnpj`)) > 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `usuarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha_provisoria` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuarios_usuario_unique` (`usuario`),
  CONSTRAINT `usuarios_chk_1` CHECK (((`usuario` = upper(`usuario`)) and (`usuario` = trim(`usuario`)) and (length(trim(`usuario`)) > 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `equipamentos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `unidade_id` int unsigned NOT NULL,
  `nome_identificacao` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ATIVO',
  `data_garantia` date NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `numero_serie` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'NÃO INFORMADO',
  `numero_patrimonio` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'NÃO INFORMADO',
  PRIMARY KEY (`id`),
  KEY `equipamentos_unidade_id_foreign` (`unidade_id`),
  KEY `idx_equip_nome_ativo` (`deleted_at`,`nome_identificacao`),
  KEY `idx_equip_cat_ativo` (`deleted_at`,`categoria`),
  KEY `idx_equip_garantia_cat` (`deleted_at`,`categoria`,`data_garantia`),
  CONSTRAINT `equipamentos_unidade_id_foreign` FOREIGN KEY (`unidade_id`) REFERENCES `unidades` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `equipamentos_chk_1` CHECK (((`nome_identificacao` = upper(`nome_identificacao`)) and (`nome_identificacao` = trim(`nome_identificacao`)) and (length(trim(`nome_identificacao`)) > 0))),
  CONSTRAINT `equipamentos_chk_2` CHECK (((`categoria` = upper(`categoria`)) and (`categoria` = trim(`categoria`)) and (length(trim(`categoria`)) > 0))),
  CONSTRAINT `equipamentos_chk_3` CHECK (((`marca` = upper(`marca`)) and (`marca` = trim(`marca`)) and (length(trim(`marca`)) > 0))),
  CONSTRAINT `equipamentos_chk_4` CHECK (((`status` = upper(`status`)) and (`status` = trim(`status`)) and (length(trim(`status`)) > 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tvs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `unidade_id` int unsigned NOT NULL,
  `nome_identificacao` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TV',
  `marca` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ATIVO',
  `data_garantia` date NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `numero_serie` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'NÃO INFORMADO',
  `numero_patrimonio` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'NÃO INFORMADO',
  PRIMARY KEY (`id`),
  KEY `tvs_unidade_id_foreign` (`unidade_id`),
  KEY `idx_tvs_nome_ativo` (`deleted_at`,`nome_identificacao`),
  KEY `idx_tvs_garantia` (`deleted_at`,`data_garantia`),
  CONSTRAINT `tvs_unidade_id_foreign` FOREIGN KEY (`unidade_id`) REFERENCES `unidades` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cameras` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `unidade_id` int unsigned NOT NULL,
  `nome_identificacao` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CAMERAS',
  `marca` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ATIVO',
  `data_garantia` date NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `numero_serie` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'NÃO INFORMADO',
  `numero_patrimonio` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'NÃO INFORMADO',
  PRIMARY KEY (`id`),
  KEY `cameras_unidade_id_foreign` (`unidade_id`),
  KEY `idx_cameras_nome_ativo` (`deleted_at`,`nome_identificacao`),
  KEY `idx_cameras_garantia` (`deleted_at`,`data_garantia`),
  CONSTRAINT `cameras_unidade_id_foreign` FOREIGN KEY (`unidade_id`) REFERENCES `unidades` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `manutencoes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `item_tipo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EQUIPAMENTO',
  `item_id` bigint unsigned NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_envio` date NOT NULL,
  `data_retorno` date DEFAULT NULL,
  `custo` decimal(10,2) DEFAULT NULL,
  `status_manutencao` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ABERTA',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_manutencoes_status` (`status_manutencao`,`item_tipo`,`item_id`),
  CONSTRAINT `manutencoes_chk_1` CHECK (((`descricao` = upper(`descricao`)) and (`descricao` = trim(`descricao`)) and (length(trim(`descricao`)) > 0))),
  CONSTRAINT `manutencoes_chk_2` CHECK (((`status_manutencao` = upper(`status_manutencao`)) and (`status_manutencao` = trim(`status_manutencao`)) and (length(trim(`status_manutencao`)) > 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
