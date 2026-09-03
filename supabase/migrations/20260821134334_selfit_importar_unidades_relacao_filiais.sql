/*
# Importação das unidades da relação de filiais Selfit

1. Objetivo
- Alimentar o painel com os nomes das unidades e a UF identificada na planilha enviada.
- Manter os dados existentes e inserir somente unidades ainda não cadastradas.

2. Dados incluídos
- Regiões: PE, PB, BA, PI, AL, RN, SE, MA, AM, CE, PA, MT, MG, SP e RJ.
- Unidades: nomes exibidos na relação de filiais, vinculados à sua UF.
- Cidade e endereço não são importados nesta etapa, conforme solicitado.

3. Segurança
- Nenhuma tabela ou coluna existente é removida ou alterada.
- As políticas RLS existentes permanecem ativas.

4. Observações
- A importação é idempotente por nome + região: nomes já existentes na mesma UF não são duplicados.
*/

INSERT INTO regioes (sigla, nome) VALUES
  ('PB','Paraíba'), ('BA','Bahia'), ('PI','Piauí'), ('AL','Alagoas'),
  ('RN','Rio Grande do Norte'), ('SE','Sergipe'), ('MA','Maranhão'), ('AM','Amazonas'),
  ('CE','Ceará'), ('MG','Minas Gerais'), ('RJ','Rio de Janeiro')
ON CONFLICT (sigla) DO NOTHING;

WITH unidades_importadas(nome, sigla) AS (
  VALUES
    ('HOLDING - MATRIZ','PE'), ('MAG SHOPPING','PB'), ('EPITÁCIO PESSOA','PB'), ('PARAÍLA','BA'),
    ('CAMINHO DAS ÁRVORES','BA'), ('CARUARU','PE'), ('CASA AMARELA','PE'), ('PONTA VERDE','AL'),
    ('SÃO RAFAEL','BA'), ('HOMERO CASTELO BRANCO','PI'), ('PITUBA II','BA'), ('RIVERSIDE','PI'),
    ('PIEDADE','PE'), ('RIO VERMELHO','BA'), ('FEIRA DE SANTANA','BA'), ('LAGOA NOVA','RN'),
    ('PONTA NEGRA','RN'), ('JARDINS','SE'), ('ROSA E SILVA','PE'), ('COSTA AZUL','BA'),
    ('CAMPINA GRANDE','PB'), ('BOULEVARD TROPICAL','MA'), ('MANGABEIRAS','AL'), ('MADALENA','PE'),
    ('VIEIRALES','AM'), ('TIROL','RN'), ('PRESIDENTE KENNEDY','PI'), ('LAURO DE FREITAS','BA'),
    ('BARRA HALL','BA'), ('DOM LUIS','CE'), ('BARRA','BA'), ('GOLDEN SHOPPING','MA'),
    ('SCOPA PLATINUM','CE'), ('IT CENTER','PA'), ('AUGUSTO FRANCO','SE'), ('PARQUE SHOPPING BELÉM','PA'),
    ('BEZERRA DE MENEZES','CE'), ('SÃO GONÇALO DO AMARANTE','RN'),
    ('RESERVA WASHINGTON SOARES','CE'), ('MENDONÇA FURTADO','PA'), ('SHOPPING PÁTIO MARABÁ','PA'),
    ('CENTER MINAS','MG'), ('CARAPICUÍBA','SP'), ('CIDADE JARDIM','MG'), ('SHOPPING RIO CLARO','SP'),
    ('MARÍLIA SHOPPING','SP'), ('COLINAS','SP'), ('SANTA ROSÁLIA','SP'), ('GLICÉRIO','SP'),
    ('BARÃO DE ITAMBI','RJ'), ('DANIEL DE LA TOUCHE','MA'), ('VÁRZEA','PE'),
    ('CARREFOUR JUNDIAÍ','SP'), ('CAMPOLIM','SP'), ('ICARAÍ','RJ'), ('OSWALDO CRUZ','SP'),
    ('INDEPENDÊNCIA','SP'), ('LIMÃO','SP'), ('AQUARIUS','SP'), ('PRESIDENTE VARGAS','SP'),
    ('TANCREDO NEVES','PE'), ('SUPER FÁCIL','PB'), ('OLARIA','RJ'), ('ESCRITÓRIO SP','SP'),
    ('CONDE DO BONFIM','RJ'), ('LAR CENTER','SP'), ('SHOPPING PARANGABA','CE'), ('BOULEVARD SHOPPING','BA'),
    ('SANTA CLARA','SP'), ('ARAPANÃS','SP'), ('MANAUS PLAZA SHOPPING','AM'), ('FREEWAY','RJ'),
    ('COHAMA','MA'), ('JEAN FREIRE','PE'), ('PARQUE SHOPPING MACEIÓ','AL'), ('ESTAÇÃO CUIABÁ','MT'),
    ('MANGABEIRA','PB'), ('PRAIA','PB'), ('SHOPPING CAMARÁ','PE'), ('JARDIM DAS AMÉRICAS','MT'),
    ('ALDEOTA','CE'), ('AFOGADOS','PE'), ('JAIME BENEVOLO','CE'), ('CASA CAIADA','PE'),
    ('FRANCA','SP'), ('CASA FORTE','PE'), ('BERNARDO VIEIRA DE MELO','PE'), ('VIA SUL','CE'),
    ('ARRUDA','PE'), ('DIREZEL','PI'), ('BARÃO DE GURGUEIA','PI'), ('ZEQUINHA FREIRE','PI'),
    ('DB PONTA NEGRA MANAUS','AM'), ('MATATU','BA'), ('MAIOBÃO','MA'), ('STIEP','BA'),
    ('JORDÃO','PE'), ('NORTHWAY','PE'), ('NOVA DESCOBERTA','PE'), ('BOA VIAGEM','PE'),
    ('WE BURN - MATRIZ','PE'), ('ABEL CABRAL','RN'), ('OLHO D''ÁGUA','MA'), ('SÃO LUÍS SHOPPING','MA'),
    ('BESSA','PB'), ('TRIKRICAL','MA'), ('NOVA PARNAMIRIM','RN'), ('BOA VIAGEM II','PE'),
    ('GODOFREDO MACIEL','CE'), ('TURU','MA'), ('JANGA','PE'), ('COHAMA','MA'), ('BENFICA','PE'),
    ('TENONÉ','PA'), ('PAISSANDU','PE'), ('ANTÔNIO BASÍLIO','RN'), ('BAYEUX','PB'),
    ('OLHO D''ÁGUA II','MA'), ('INDIANÓPOLIS','PE'), ('ANJO DA GUARDA','MA'), ('ENCRUZILHADA','PE'),
    ('ANIL','MA'), ('BAIRRO DE FÁTIMA','MA'), ('SÃO BRÁS','PA'), ('JÓQUEI','PI'), ('TAMARINEIRA','PE'),
    ('CAMPO GRANDE','PE'), ('PIEDADE II','PE'), ('MOR GOUVEIA','RN'), ('GALPÃO - NOVO','PE'),
    ('PAULISTA CENTRO','PE'), ('CAXANGÁ','PE'), ('PATÃO NORTE','MA'), ('FOQUILHA','MA'),
    ('ARRIZAL','MA'), ('JOÃO PAULO','MA'), ('MAIOBÃO II','MA'), ('CPA III','MT'),
    ('MORADA DO OURO','MT'), ('CAMPO GRANDE II','PE'), ('CAMARAGIBE','PE'), ('ASSIS','PA'),
    ('COHATRAC','MA'), ('TIMON','MA'), ('AV. DOS TRABALHADORES','MT'), ('ANTÔNIO CASSIMIRO','PE'),
    ('CANDEIAS','PE'), ('ATRÁS DA BANCA','PE'), ('MARANBAIA','PA'), ('CASA CAIADA II','PE'),
    ('TIMON - CENTRO','MA'), ('MANGUEIRÃO','MA'), ('PARNAMBAÍ I','PI'), ('PARNAMBAÍ II','PI'),
    ('CAXANGÁ II','PE'), ('BARRAMAR','MA'), ('TAPANÃ','PA'), ('ARENA DAS DUNAS','RN'),
    ('SARAMANTA','MA'), ('SÃO LUÍS CENTRO','MA'), ('NOVA PARNAMIRIM II','RN'), ('DOMINGOS FERREIRA II','PE'),
    ('RENASCENÇA','MA'), ('RIBAMAR','MA'), ('LOURIVAL PARENTE','PI'), ('NEVALDO ROCHA','RN'),
    ('MARIA QUITÉRIA','BA'), ('CASA AMARELA II','PE'), ('DIRCEU II','PI'), ('FREI SERAFIM','PI'),
    ('ANIL II','MA'), ('PARQUE VITÓRIA','MA'), ('LAGOA NOVA II','RN'), ('AV. RECIFE','PE'),
    ('CIDADE OPERÁRIA','MA'), ('MOEMA TINOCO','RN'), ('ALDEIA','PE'), ('AUGUSTO MONTENEGRO','PA'),
    ('DOMINGOS FERREIRA','PE'), ('TORRE','PE'), ('JURACY MAGALHÃES','BA'), ('CRUZ CABUGÁ','PE'),
    ('CARREFOUR DOMINGOS FERREIRA','PE'), ('BAIRRO DE FÁTIMA II','MA'), ('LIFE CENTER','MA'),
    ('ÁGUAS LINDAS','PA'), ('CASTELO BRANCO','PB'), ('BANCÁRIOS','PB'), ('FAROL','AL'),
    ('PIEDADE III','PE'), ('GUANABARA','PA'), ('MARQUES DE PARANAGUA','PI'), ('RUBENS DE MENDONÇA','MT'),
    ('INTERMARES','PB'), ('MALVINAS','PB'), ('CARREFOUR BANCÁRIOS','PB'), ('MONTE LÍBANO','MT'),
    ('WALL FERRAZ','PI'), ('ROTA DO SOL','RN'), ('JOÃO XXIII','PI'), ('BAIRRO BRASIL','BA'),
    ('CRISTO REI','MT'), ('ALECRIM','RN'), ('COOPHAB','RN'), ('POTENGI','RN'), ('CENTRO SUL','PI'),
    ('JARDIM AMÉRICA','MA')
)
INSERT INTO unidades (nome, regiao_id)
SELECT DISTINCT ui.nome, r.id
FROM unidades_importadas ui
JOIN regioes r ON r.sigla = ui.sigla
WHERE NOT EXISTS (
  SELECT 1 FROM unidades u
  WHERE lower(u.nome) = lower(ui.nome) AND u.regiao_id = r.id
);
