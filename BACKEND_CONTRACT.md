# Contrato HTTP atual

Base recomendada: `/api`. As rotas sem esse prefixo continuam disponiveis para compatibilidade e usam os mesmos controles de acesso.

| Metodo | Caminho | Acesso |
| --- | --- | --- |
| GET | `/health` | Rede autorizada; verifica processo |
| GET | `/ready` | Rede autorizada; verifica banco |
| POST | `/auth` | Rede autorizada; credenciais; limite de tentativas |
| GET | `/session` | JWT valido e usuario ativo/autorizado |
| POST | `/register` | JWT e usuario em `USER_ADMIN_USERS` |
| GET | `/unidades` | JWT e usuario ativo/autorizado |
| POST | `/register/unidades` | JWT e usuario ativo/autorizado |
| POST | `/register/unidades/bulk` | JWT; lote de 1 a 500 unidades |
| PUT / DELETE | `/unidades/:id` | JWT e usuario ativo/autorizado |
| POST | `/register/equipamentos` | JWT; TV, camera ou equipamento conforme categoria |
| GET | `/equipamentos/consultar` | JWT; filtros `tipo` e `busca` |
| GET | `/equipamentos/garantia` | JWT; filtros `tipo` e `busca` |
| GET | `/equipamentos/manutencao` | JWT; filtros `tipo` e `busca` |
| PUT / DELETE | `/equipamentos/:id` | JWT; identificador prefixado |
| POST | `/manutencoes` | JWT e usuario ativo/autorizado |
| PUT / DELETE | `/manutencoes/:id` | JWT e usuario ativo/autorizado |

Autenticacao: `Authorization: Bearer <token>`. O login recebe `{ "usuario": "ADMIN", "senha": "..." }` e devolve `token`, assinado com HS256, valido por 8 horas. A API verifica existencia da conta em cada requisicao protegida; remover a conta revoga o acesso. O frontend verifica `/session` antes de abrir telas privadas.

Envelope: `{ sucesso, dados?, mensagem?, message?, total?, id? }`. Listas usam `dados`; algumas rotas historicas usam `message` e outras `mensagem`. O frontend aceita ambos.

Tipos de inventario: `TV`, `CAMERA`, `EQUIPAMENTO`. Categorias de cameras usam `CAMERAS`. IDs HTTP: `TV:1`, `CAMERA:1`, `EQUIPAMENTO:1`; use URL encoding quando necessario.

Consultas de busca usam parametros SQL; tabelas e colunas dinamicas vem de listas fixas no backend. Identificadores invalidos, alteracao de categoria para outro modulo e campos fora do contrato sao recusados.

Swagger existe somente em desenvolvimento em `/api/api-docs` (alias `/api-docs`). A interface nao implementa endpoints de historico de auditoria: a tela historica so mostra o estado atualmente fornecido pelo provider. Nao existe trilha persistente completa de alteracoes nesta versao.
