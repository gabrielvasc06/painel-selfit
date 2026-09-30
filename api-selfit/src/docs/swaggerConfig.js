// Arquivo: api-selfit/src/docs/swaggerConfig.js
// Serve para: arquivo de codigo do sistema; participa da implementacao do painel Selfit.

const swaggerJsdoc = require('swagger-jsdoc');

const successEnvelope = {
    type: 'object',
    properties: {
        sucesso: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Operacao realizada com sucesso.' },
        mensagem: { type: 'string', example: 'Operacao realizada com sucesso.' },
    },
};

const errorEnvelope = {
    type: 'object',
    properties: {
        sucesso: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Erro de validacao.' },
        mensagem: { type: 'string', example: 'Erro de validacao.' },
    },
};

const unitSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer', example: 388 },
        nome: { type: 'string', example: 'SHOPPING CAMARA' },
        tipo_unidade: { type: 'string', enum: ['PROPRIA'], example: 'PROPRIA' },
        cnpj: { type: 'string', example: '22.902.694/0079-55' },
        cep: { type: 'string', example: '54759475' },
        uf: { type: 'string', example: 'PE' },
        bairro: { type: 'string', example: 'CAMARA' },
        rua: { type: 'string', example: 'RUA MANOEL HONORIO DA COSTA' },
        numero: { type: 'string', example: '555' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
};

const unitInputSchema = {
    type: 'object',
    required: ['nome', 'cnpj', 'cep', 'uf', 'bairro', 'rua', 'numero'],
    properties: {
        nome: { type: 'string', example: 'SHOPPING CAMARA' },
        tipo_unidade: { type: 'string', enum: ['PROPRIA'], default: 'PROPRIA' },
        cnpj: { type: 'string', example: '22.902.694/0079-55' },
        cep: { type: 'string', example: '54759475' },
        uf: { type: 'string', minLength: 2, maxLength: 2, example: 'PE' },
        bairro: { type: 'string', example: 'CAMARA' },
        rua: { type: 'string', example: 'RUA MANOEL HONORIO DA COSTA' },
        numero: { type: 'string', example: '555' },
    },
};

const itemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', description: 'Identificador com prefixo do modulo.', example: 'EQUIPAMENTO:1' },
        raw_id: { type: 'integer', example: 1 },
        tipo_modulo: { type: 'string', enum: ['TV', 'CAMERA', 'EQUIPAMENTO'], example: 'EQUIPAMENTO' },
        unidade_id: { type: 'integer', example: 388 },
        unidade_nome: { type: 'string', example: 'SHOPPING CAMARA' },
        unidade_cnpj: { type: 'string', example: '22.902.694/0079-55' },
        unidade_cep: { type: 'string', example: '54759475' },
        uf: { type: 'string', example: 'PE' },
        nome_identificacao: { type: 'string', example: 'C. BANCARIOS - FW01' },
        categoria: { type: 'string', example: 'FIREWALL' },
        marca: { type: 'string', example: 'FORTINET' },
        status: { type: 'string', example: 'ATIVO' },
        data_garantia: { type: 'string', format: 'date', example: '2028-12-31' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
};

const itemInputSchema = {
    type: 'object',
    required: ['unidade_nome', 'unidade_uf', 'nome_identificacao', 'categoria', 'marca', 'data_garantia'],
    properties: {
        unidade_nome: { type: 'string', example: 'SHOPPING CAMARA' },
        unidade_uf: { type: 'string', example: 'PE' },
        nome_identificacao: {
            type: 'string',
            description: 'Padrao recomendado: NOME DA UNIDADE - SIGLA + numero sequencial. Exemplos: DB PONTA NEGRA - TV01, C. BANCARIOS - TT01, C. BANCARIOS - CATRACA01, C. BANCARIOS - L. FACIAL01, C. BANCARIOS - AP01, C. BANCARIOS - IMP01, C. BANCARIOS - SW01, C. BANCARIOS - FW01, C. BANCARIOS - ROT01, C. BANCARIOS - NOBREAK01, C. BANCARIOS - CAM01.',
            example: 'C. BANCARIOS - FW01',
        },
        categoria: {
            type: 'string',
            description: 'TV grava em tvs; CAMERAS grava em cameras; demais categorias permitidas gravam em equipamentos. Sugestao de siglas no nome: TV=TV, TOTEM=TT, CATRACA=CATRACA, LEITOR_FACIAL=L. FACIAL, ACCESS_POINT=AP, IMPRESSORA=IMP, SWITCH=SW, FIREWALL=FW, ROTEADOR=ROT, NOBREAK=NOBREAK, CAMERAS=CAM.',
            enum: ['TV', 'CAMERAS', 'TOTEM', 'CATRACA', 'LEITOR_FACIAL', 'ACCESS_POINT', 'IMPRESSORA', 'SWITCH', 'FIREWALL', 'ROTEADOR', 'NOBREAK'],
            example: 'FIREWALL',
        },
        marca: { type: 'string', example: 'FORTINET' },
        status: { type: 'string', default: 'ATIVO', example: 'ATIVO' },
        data_garantia: { type: 'string', format: 'date', example: '2028-12-31' },
    },
};

const maintenanceSchema = {
    allOf: [
        itemSchema,
        {
            type: 'object',
            properties: {
                manutencao_id: { type: 'integer', example: 1 },
                equipamento_id: { type: 'string', description: 'Mesmo identificador com prefixo usado pelo front.', example: 'EQUIPAMENTO:1' },
                status_equipamento: { type: 'string', example: 'ATIVO' },
                descricao_manutencao: { type: 'string', example: 'PROBLEMA DE PLACA' },
                data_envio: { type: 'string', format: 'date', example: '2026-09-29' },
                data_retorno: { type: 'string', format: 'date', nullable: true, example: '2026-10-10' },
                custo: { type: 'number', nullable: true, example: 520.00 },
                status_manutencao: { type: 'string', enum: ['ABERTA', 'CONCLUIDA', 'CANCELADA'], example: 'ABERTA' },
            },
        },
    ],
};

const maintenanceInputSchema = {
    type: 'object',
    required: ['equipamento_id', 'descricao', 'data_envio'],
    properties: {
        equipamento_id: {
            type: 'string',
            description: 'Use TV:1, CAMERA:1 ou EQUIPAMENTO:1.',
            example: 'EQUIPAMENTO:1',
        },
        descricao: { type: 'string', example: 'PROBLEMA DE PLACA' },
        data_envio: { type: 'string', format: 'date', example: '2026-09-29' },
        data_retorno: { type: 'string', format: 'date', nullable: true, example: null },
        custo: { type: 'number', nullable: true, example: 520.00 },
        status_manutencao: { type: 'string', enum: ['ABERTA', 'CONCLUIDA', 'CANCELADA'], default: 'ABERTA' },
    },
};

const listEnvelope = (schemaRef) => ({
    type: 'object',
    properties: {
        sucesso: { type: 'boolean', example: true },
        total: { type: 'integer', example: 1 },
        dados: {
            type: 'array',
            items: schemaRef,
        },
    },
});

const protectedRoute = [{ bearerAuth: [] }];

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Selfit',
            version: '1.0.0',
            description: 'Contrato da API do painel Selfit para unidades, TVs, equipamentos, cameras, garantias e manutencoes.\n\nPadrao recomendado para identificacao dos ativos: NOME DA UNIDADE - SIGLA + numero sequencial.\n\nExemplos por modulo:\n- TV: DB PONTA NEGRA - TV01\n- Totem: C. BANCARIOS - TT01\n- Catraca: C. BANCARIOS - CATRACA01\n- Leitor facial: C. BANCARIOS - L. FACIAL01\n- Access point: C. BANCARIOS - AP01\n- Impressora: C. BANCARIOS - IMP01\n- Switch: C. BANCARIOS - SW01\n- Firewall: C. BANCARIOS - FW01\n- Roteador: C. BANCARIOS - ROT01\n- Nobreak: C. BANCARIOS - NOBREAK01\n- Camera: C. BANCARIOS - CAM01',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Ambiente de desenvolvimento',
            },
        ],
        tags: [
            { name: 'Autenticacao' },
            { name: 'Usuarios' },
            { name: 'Unidades' },
            { name: 'Inventario' },
            { name: 'Garantias' },
            { name: 'Manutencoes' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                AuthRequest: {
                    type: 'object',
                    required: ['usuario', 'senha'],
                    properties: {
                        usuario: { type: 'string', example: 'VANDERSON.GABRIEL' },
                        senha: { type: 'string', example: 'admin' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        sucesso: { type: 'boolean', example: true },
                        mensagem: { type: 'string', example: 'Autenticacao realizada com sucesso!' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                    },
                },
                UserInput: {
                    type: 'object',
                    required: ['usuario', 'senha'],
                    properties: {
                        usuario: { type: 'string', example: 'YVSON.JOSE' },
                        senha: { type: 'string', example: 'senha-ficticia' },
                    },
                },
                Unit: unitSchema,
                UnitInput: unitInputSchema,
                UnitBulkInput: {
                    type: 'object',
                    required: ['unidades'],
                    properties: {
                        unidades: {
                            type: 'array',
                            maxItems: 500,
                            items: unitInputSchema,
                        },
                    },
                },
                InventoryItem: itemSchema,
                InventoryItemInput: itemInputSchema,
                InventoryItemUpdate: {
                    type: 'object',
                    properties: {
                        unidade_nome: { type: 'string', example: 'SHOPPING CAMARA' },
                        nome_identificacao: { type: 'string', example: 'C. BANCARIOS - FW02' },
                        categoria: { type: 'string', example: 'FIREWALL' },
                        marca: { type: 'string', example: 'FORTINET' },
                        status: { type: 'string', example: 'ATIVO' },
                        data_garantia: { type: 'string', format: 'date', example: '2028-12-31' },
                    },
                },
                Maintenance: maintenanceSchema,
                MaintenanceInput: maintenanceInputSchema,
                SuccessEnvelope: successEnvelope,
                ErrorEnvelope: errorEnvelope,
            },
        },
        paths: {
            '/auth': {
                post: {
                    tags: ['Autenticacao'],
                    summary: 'Autentica usuario e retorna JWT',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthRequest' } } },
                    },
                    responses: {
                        200: { description: 'Autenticacao realizada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
                        400: { description: 'Dados invalidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
                        401: { description: 'Usuario ou senha invalidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
                        500: { description: 'Erro interno.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
                    },
                },
            },
            '/register': {
                post: {
                    tags: ['Usuarios'],
                    security: protectedRoute,
                    summary: 'Cadastra usuario',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/UserInput' } } },
                    },
                    responses: {
                        201: { description: 'Usuario cadastrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
                        400: { description: 'Validacao ou duplicidade.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
                        401: { description: 'Token ausente ou invalido.' },
                    },
                },
            },
            '/unidades': {
                get: {
                    tags: ['Unidades'],
                    security: protectedRoute,
                    summary: 'Lista unidades proprias',
                    parameters: [
                        { in: 'query', name: 'busca', schema: { type: 'string' }, description: 'Busca por nome, CNPJ, CEP, bairro, rua ou numero.' },
                        { in: 'query', name: 'prefixo', schema: { type: 'string' }, description: 'Busca unidades cujo nome comeca com o valor informado.' },
                        { in: 'query', name: 'uf', schema: { type: 'string', maxLength: 2 }, description: 'Filtra por UF.' },
                    ],
                    responses: {
                        200: { description: 'Unidades retornadas.', content: { 'application/json': { schema: listEnvelope({ $ref: '#/components/schemas/Unit' }) } } },
                        401: { description: 'Token ausente ou invalido.' },
                    },
                },
            },
            '/register/unidades': {
                post: {
                    tags: ['Unidades'],
                    security: protectedRoute,
                    summary: 'Cadastra unidade propria',
                    description: 'Franquias e unidades fora do escopo operacional sao recusadas.',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/UnitInput' } } },
                    },
                    responses: {
                        201: { description: 'Unidade cadastrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
                        400: { description: 'Validacao ou duplicidade.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
                        401: { description: 'Token ausente ou invalido.' },
                    },
                },
            },
            '/register/unidades/bulk': {
                post: {
                    tags: ['Unidades'],
                    security: protectedRoute,
                    summary: 'Importa unidades em lote',
                    description: 'Importacao transacional; se uma linha falhar, o lote nao e gravado.',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/UnitBulkInput' } } },
                    },
                    responses: {
                        201: { description: 'Lote importado.' },
                        400: { description: 'Lote invalido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
                        409: { description: 'CNPJ ja cadastrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
                    },
                },
            },
            '/unidades/{id}': {
                put: {
                    tags: ['Unidades'],
                    security: protectedRoute,
                    summary: 'Atualiza unidade',
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/UnitInput' } } },
                    },
                    responses: {
                        200: { description: 'Unidade atualizada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
                        404: { description: 'Unidade nao encontrada.' },
                    },
                },
                delete: {
                    tags: ['Unidades'],
                    security: protectedRoute,
                    summary: 'Remove unidade sem itens vinculados',
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Unidade removida.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
                        409: { description: 'Unidade possui itens vinculados.' },
                    },
                },
            },
            '/register/equipamentos': {
                post: {
                    tags: ['Inventario'],
                    security: protectedRoute,
                    summary: 'Cadastra TV, camera ou equipamento',
                    description: 'A categoria define a tabela: TV -> tvs, CAMERAS -> cameras, demais categorias permitidas -> equipamentos. Use o padrao NOME DA UNIDADE - SIGLA + numero sequencial para facilitar consultas e manutencoes.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/InventoryItemInput' },
                                examples: {
                                    tv: {
                                        summary: 'TV',
                                        description: 'Cadastro de TV no modulo TVs.',
                                        value: {
                                            unidade_nome: 'DB PONTA NEGRA',
                                            unidade_uf: 'RN',
                                            nome_identificacao: 'DB PONTA NEGRA - TV01',
                                            categoria: 'TV',
                                            marca: 'SAMSUNG',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    totem: {
                                        summary: 'Totem',
                                        description: 'Cadastro de totem no modulo Equipamentos.',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - TT01',
                                            categoria: 'TOTEM',
                                            marca: 'GERTEC',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    catraca: {
                                        summary: 'Catraca',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - CATRACA01',
                                            categoria: 'CATRACA',
                                            marca: 'HENRY',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    leitorFacial: {
                                        summary: 'Leitor facial',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - L. FACIAL01',
                                            categoria: 'LEITOR_FACIAL',
                                            marca: 'CONTROL ID',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    accessPoint: {
                                        summary: 'Access point',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - AP01',
                                            categoria: 'ACCESS_POINT',
                                            marca: 'UBIQUITI',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    impressora: {
                                        summary: 'Impressora',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - IMP01',
                                            categoria: 'IMPRESSORA',
                                            marca: 'BROTHER',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    switch: {
                                        summary: 'Switch',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - SW01',
                                            categoria: 'SWITCH',
                                            marca: 'TP-LINK',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    firewall: {
                                        summary: 'Firewall',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - FW01',
                                            categoria: 'FIREWALL',
                                            marca: 'FORTINET',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    roteador: {
                                        summary: 'Roteador',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - ROT01',
                                            categoria: 'ROTEADOR',
                                            marca: 'MIKROTIK',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    nobreak: {
                                        summary: 'Nobreak',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - NOBREAK01',
                                            categoria: 'NOBREAK',
                                            marca: 'SMS',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                    camera: {
                                        summary: 'Camera',
                                        description: 'Cadastro de camera no modulo Cameras.',
                                        value: {
                                            unidade_nome: 'C. BANCARIOS',
                                            unidade_uf: 'PB',
                                            nome_identificacao: 'C. BANCARIOS - CAM01',
                                            categoria: 'CAMERAS',
                                            marca: 'INTELBRAS',
                                            status: 'ATIVO',
                                            data_garantia: '2028-12-31',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Item cadastrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
                        400: { description: 'Validacao, unidade inexistente ou duplicidade.' },
                    },
                },
            },
            '/equipamentos/consultar': {
                get: {
                    tags: ['Inventario'],
                    security: protectedRoute,
                    summary: 'Consulta inventario ativo',
                    parameters: [
                        { in: 'query', name: 'tipo', schema: { type: 'string', enum: ['TV', 'CAMERA', 'EQUIPAMENTO'] } },
                        { in: 'query', name: 'busca', schema: { type: 'string' }, description: 'Busca por item, categoria, marca, unidade, CEP ou CNPJ.' },
                    ],
                    responses: {
                        200: { description: 'Itens retornados.', content: { 'application/json': { schema: listEnvelope({ $ref: '#/components/schemas/InventoryItem' }) } } },
                    },
                },
            },
            '/equipamentos/garantia': {
                get: {
                    tags: ['Garantias'],
                    security: protectedRoute,
                    summary: 'Consulta garantias por modulo e unidade',
                    parameters: [
                        { in: 'query', name: 'tipo', schema: { type: 'string', enum: ['TV', 'CAMERA', 'EQUIPAMENTO'] } },
                        { in: 'query', name: 'busca', schema: { type: 'string' }, description: 'Busca por nome da unidade, CEP ou CNPJ.' },
                    ],
                    responses: {
                        200: { description: 'Garantias retornadas.', content: { 'application/json': { schema: listEnvelope({ $ref: '#/components/schemas/InventoryItem' }) } } },
                    },
                },
            },
            '/equipamentos/{id}': {
                put: {
                    tags: ['Inventario'],
                    security: protectedRoute,
                    summary: 'Atualiza item de inventario',
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', example: 'TV:1' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryItemUpdate' } } },
                    },
                    responses: {
                        200: { description: 'Item atualizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
                        404: { description: 'Item nao encontrado ou inativo.' },
                    },
                },
                delete: {
                    tags: ['Inventario'],
                    security: protectedRoute,
                    summary: 'Exclui item por soft delete',
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', example: 'EQUIPAMENTO:1' } }],
                    responses: {
                        200: { description: 'Item marcado como excluido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
                        404: { description: 'Item nao encontrado ou ja excluido.' },
                    },
                },
            },
            '/equipamentos/manutencao': {
                get: {
                    tags: ['Manutencoes'],
                    security: protectedRoute,
                    summary: 'Consulta manutencoes por modulo e unidade',
                    description: 'Retorna manutencoes ABERTA, CONCLUIDA e CANCELADA dos itens ativos.',
                    parameters: [
                        { in: 'query', name: 'tipo', schema: { type: 'string', enum: ['TV', 'CAMERA', 'EQUIPAMENTO'] } },
                        { in: 'query', name: 'busca', schema: { type: 'string' }, description: 'Busca por nome da unidade, CEP ou CNPJ.' },
                    ],
                    responses: {
                        200: { description: 'Manutencoes retornadas.', content: { 'application/json': { schema: listEnvelope({ $ref: '#/components/schemas/Maintenance' }) } } },
                    },
                },
            },
            '/manutencoes': {
                post: {
                    tags: ['Manutencoes'],
                    security: protectedRoute,
                    summary: 'Registra manutencao',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MaintenanceInput' } } },
                    },
                    responses: {
                        201: { description: 'Manutencao registrada.' },
                        404: { description: 'Item nao encontrado ou removido.' },
                    },
                },
            },
            '/manutencoes/{id}': {
                put: {
                    tags: ['Manutencoes'],
                    security: protectedRoute,
                    summary: 'Atualiza manutencao',
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/MaintenanceInput' } } },
                    },
                    responses: {
                        200: { description: 'Manutencao atualizada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
                        404: { description: 'Manutencao ou item nao encontrado.' },
                    },
                },
                delete: {
                    tags: ['Manutencoes'],
                    security: protectedRoute,
                    summary: 'Remove manutencao definitivamente',
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Manutencao removida.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
                        404: { description: 'Manutencao nao encontrada.' },
                    },
                },
            },
        },
    },
    apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
