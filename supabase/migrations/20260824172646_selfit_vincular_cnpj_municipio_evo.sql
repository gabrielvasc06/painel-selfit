/*
# Vínculo de CNPJ, código EVO e município às unidades

1. Novas colunas em `unidades`
- `cnpj`: CNPJ da empresa/filial conforme a planilha.
- `codigo_evo`: código EVO da filial.
- `uf`: estado da unidade.
- `amostra`: origem do dado importado para conferência.

2. Dados atualizados
- A primeira amostra foi cruzada pela sequência Filial/Código EVO/CNPJ da relação enviada.
- Município e UF foram preenchidos conforme a tabela de filiais da mesma planilha.
- As unidades existentes são preservadas; nenhum registro é removido.

3. Segurança
- RLS e políticas atuais de `unidades` permanecem ativas.
- Índices de busca são adicionados para CNPJ, código EVO e UF.
*/

ALTER TABLE unidades ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS codigo_evo text;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS uf text;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS amostra text;

UPDATE unidades u
SET uf = r.sigla,
    amostra = COALESCE(u.amostra, 'Relação oficial de filiais Selfit')
FROM regioes r
WHERE r.id = u.regiao_id;

WITH amostra(nome, cnpj, codigo_evo, cidade, uf) AS (
  VALUES
    ('HOLDING - MATRIZ','22.902.694/0001-95',NULL,'Recife','PE'),
    ('MAG SHOPPING','22.902.694/0002-76','106','João Pessoa','PB'),
    ('EPITÁCIO PESSOA','22.902.694/0003-57','108','João Pessoa','PB'),
    ('PARAÍLA','22.902.694/0004-38','269','Salvador','BA'),
    ('CAMINHO DAS ÁRVORES','22.902.694/0005-19','262','Salvador','BA'),
    ('CARUARU','22.902.694/0006-08','109','Caruaru','PE'),
    ('CASA AMARELA','22.902.694/0007-80','261','Recife','PE'),
    ('PONTA VERDE','22.902.694/0008-61','111','Maceió','AL'),
    ('SÃO RAFAEL','22.902.694/0009-42','110','Salvador','BA'),
    ('HOMERO CASTELO BRANCO','22.902.694/0010-86','263','Teresina','PI'),
    ('PITUBA II','22.902.694/0011-67','118','Salvador','BA'),
    ('RIVERSIDE','22.902.694/0012-48','113','Teresina','PI'),
    ('PIEDADE','22.902.694/0013-29','116','Jaboatão dos Guararapes','PE'),
    ('RIO VERMELHO','22.902.694/0014-00','114','Salvador','BA'),
    ('FEIRA DE SANTANA','22.902.694/0015-90','120','Feira de Santana','BA'),
    ('LAGOA NOVA','22.902.694/0016-71','115','Natal','RN'),
    ('PONTA NEGRA','22.902.694/0017-52','122','Natal','RN'),
    ('JARDINS','22.902.694/0018-33','123','Aracaju','SE'),
    ('ROSA E SILVA','22.902.694/0019-14','126','Recife','PE'),
    ('COSTA AZUL','22.902.694/0020-58','117','Salvador','BA'),
    ('CAMPINA GRANDE','22.902.694/0021-39','130','Campina Grande','PB'),
    ('BOULEVARD TROPICAL','22.902.694/0022-10','124','São Luís','MA'),
    ('MANGABEIRAS','22.902.694/0023-09','119','Maceió','AL'),
    ('MADALENA','22.902.694/0024-81','131','Recife','PE'),
    ('VIEIRALES','22.902.694/0025-62','121','Manaus','AM'),
    ('TIROL','22.902.694/0026-43','277','Natal','RN'),
    ('PRESIDENTE KENNEDY','22.902.694/0027-24','142','Teresina','PI'),
    ('LAURO DE FREITAS','22.902.694/0028-05','228','Lauro de Freitas','BA'),
    ('BARRA HALL','22.902.694/0029-96','125','Salvador','BA'),
    ('DOM LUIS','22.902.694/0030-20','128','Fortaleza','CE'),
    ('BARRA','22.902.694/0031-00','104','Salvador','BA'),
    ('GOLDEN SHOPPING','22.902.694/0032-91','133','São Luís','MA'),
    ('SCOPA PLATINUM','22.902.694/0033-72','129','Fortaleza','CE'),
    ('IT CENTER','22.902.694/0034-53','132','Belém','PA'),
    ('AUGUSTO FRANCO','22.902.694/0035-34','272','Aracaju','SE'),
    ('PARQUE SHOPPING BELÉM','22.902.694/0036-15','134','Belém','PA'),
    ('BEZERRA DE MENEZES','22.902.694/0037-04','143','Fortaleza','CE'),
    ('SÃO GONÇALO DO AMARANTE','22.902.694/0038-87','264','São Gonçalo do Amarante','RN'),
    ('RESERVA WASHINGTON SOARES','22.902.694/0039-68','141','Fortaleza','CE'),
    ('MENDONÇA FURTADO','22.902.694/0040-00','159','Santarém','PA'),
    ('SHOPPING PÁTIO MARABÁ','22.902.694/0041-82','135','Marabá','PA'),
    ('CENTER MINAS','22.902.694/0042-63','OK','Belo Horizonte','MG'),
    ('CARAPICUÍBA','22.902.694/0043-44','149','Carapicuíba','SP'),
    ('CIDADE JARDIM','22.902.694/0044-25','138','Belo Horizonte','MG'),
    ('SHOPPING RIO CLARO','22.902.694/0045-06','137','Rio Claro','SP'),
    ('MARÍLIA SHOPPING','22.902.694/0046-87','158','Marília','SP'),
    ('COLINAS','22.902.694/0047-78','140','São José dos Campos','SP'),
    ('SANTA ROSÁLIA','22.902.694/0048-59','144','Sorocaba','SP'),
    ('GLICÉRIO','22.902.694/0049-30','156','São José do Rio Preto','SP'),
    ('BARÃO DE ITAMBI','22.902.694/0050-73','206','Rio de Janeiro','RJ'),
    ('DANIEL DE LA TOUCHE','22.902.694/0051-54','202','São Luís','MA'),
    ('VÁRZEA','22.902.694/0052-35','300','Recife','PE'),
    ('CARREFOUR JUNDIAÍ','22.902.694/0053-16','162','Jundiaí','SP'),
    ('CAMPOLIM','22.902.694/0054-97','146','Sorocaba','SP'),
    ('ICARAÍ','22.902.694/0055-88','224','Niterói','RJ'),
    ('OSWALDO CRUZ','22.902.694/0056-69','160','São José dos Campos','SP'),
    ('INDEPENDÊNCIA','22.902.694/0057-40','OK','Ribeirão Preto','SP'),
    ('LIMÃO','22.902.694/0058-21','OK','São Paulo','SP'),
    ('AQUARIUS','22.902.694/0059-01','OK','São José dos Campos','SP'),
    ('PRESIDENTE VARGAS','22.902.694/0060-45','148','Ribeirão Preto','SP'),
    ('TANCREDO NEVES','22.902.694/0061-26','163','Petrolina','PE'),
    ('SUPER FÁCIL','22.902.694/0062-07','308','João Pessoa','PB'),
    ('OLARIA','22.902.694/0063-98','200','Rio de Janeiro','RJ'),
    ('ESCRITÓRIO SP','22.902.694/0064-79','OK','São Paulo','SP'),
    ('CONDE DO BONFIM','22.902.694/0065-50','201','Rio de Janeiro','RJ'),
    ('LAR CENTER','22.902.694/0066-31','199','São Paulo','SP'),
    ('SHOPPING PARANGABA','22.902.694/0067-12','204','Fortaleza','CE'),
    ('BOULEVARD SHOPPING','22.902.694/0068-03','164','Vitória da Conquista','BA'),
    ('SANTA CLARA','22.902.694/0069-83','229','São Paulo','SP'),
    ('ARAPANÃS','22.902.694/0070-17','207','São Paulo','SP'),
    ('MANAUS PLAZA SHOPPING','22.902.694/0071-98','205','Manaus','AM'),
    ('FREEWAY','22.902.694/0072-89','OK','Rio de Janeiro','RJ'),
    ('COHAMA','22.902.694/0073-60','337','São Luís','MA'),
    ('JEAN FREIRE','22.902.694/0074-40','245','Recife','PE'),
    ('PARQUE SHOPPING MACEIÓ','22.902.694/0075-21','203','Maceió','AL'),
    ('ESTAÇÃO CUIABÁ','22.902.694/0076-02','227','Cuiabá','MT'),
    ('MANGABEIRA','22.902.694/0077-93','103','João Pessoa','PB'),
    ('PRATA','22.902.694/0078-74','OK','Campina Grande','PB'),
    ('SHOPPING CAMARÁ','22.902.694/0079-55','276','Camaragibe','PE'),
    ('JARDIM DAS AMÉRICAS','22.902.694/0080-36','226','Cuiabá','MT'),
    ('ALDEOTA','22.902.694/0081-17','252','Fortaleza','CE'),
    ('AFOGADOS','22.902.694/0082-08','257','Recife','PE'),
    ('JAIME BENEVOLO','22.902.694/0083-89','289','Fortaleza','CE'),
    ('CASA CAIADA','22.902.694/0084-60','270','Olinda','PE'),
    ('FRANCA','22.902.694/0085-41','283','Franca','SP'),
    ('CASA FORTE','22.902.694/0086-22','292','Recife','PE'),
    ('BERNARDO VIEIRA DE MELO','22.902.694/0087-03','278','Jaboatão dos Guararapes','PE'),
    ('VIA SUL','22.902.694/0088-94','254','Fortaleza','CE'),
    ('ARRUDA','22.902.694/0089-75','293','Recife','PE'),
    ('DIREZEL','22.902.694/0090-18','279','Teresina','PI'),
    ('BARÃO DE GURGUEIA','22.902.694/0091-99','297','Teresina','PI'),
    ('ZEQUINHA FREIRE','22.902.694/0092-70','329','Teresina','PI'),
    ('DB PONTA NEGRA MANAUS','22.902.694/0093-51','294','Manaus','AM'),
    ('MATATU','22.902.694/0094-32','238','Salvador','BA'),
    ('MAIOBÃO','22.902.694/0095-13','295','Paço do Lumiar','MA'),
    ('STIEP','22.902.694/0096-94','253','Salvador','BA'),
    ('JORDÃO','22.902.694/0097-75','298','Recife','PE'),
    ('NORTHWAY','22.902.694/0098-56','239','Paulista','PE'),
    ('NOVA DESCOBERTA','22.902.694/0099-37','302','Recife','PE'),
    ('BOA VIAGEM','22.902.694/0100-18','101','Recife','PE')
)
UPDATE unidades u
SET cnpj = a.cnpj,
    codigo_evo = a.codigo_evo,
    cidade = a.cidade,
    uf = a.uf,
    amostra = 'Relação oficial de filiais Selfit'
FROM amostra a
WHERE lower(u.nome) = lower(a.nome);

CREATE INDEX IF NOT EXISTS idx_unidades_cnpj ON unidades(cnpj);
CREATE INDEX IF NOT EXISTS idx_unidades_codigo_evo ON unidades(codigo_evo);
CREATE INDEX IF NOT EXISTS idx_unidades_uf ON unidades(uf);
