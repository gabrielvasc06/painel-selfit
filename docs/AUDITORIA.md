# Revisão técnica — 20/10/2026

## Renomeação das migrations — 28/10/2026

Os sete arquivos agora usam nomes em português, de `001_criar_tabelas_iniciais.js` a `007_preencher_identificadores_ausentes.js`. O `knexfile.js` mantém as identidades anteriores no histórico do Knex, sem alterar os bancos existentes. A numeração mantém a criação das tabelas antes das alterações. A tabela do README descreve cada arquivo.

## Atualização — 28/10/2026: revisão para execução no servidor

- Preservadas as sete migrations já registradas nas bases. Corrigida uma variável na separação de inventários antigos: a exclusão dos itens transferidos usava um nome inexistente e interrompia a atualização quando havia TVs ou câmeras no formato legado.
- Datas MySQL do tipo `DATE` chegam à API como `YYYY-MM-DD`, preservando o dia de garantia, envio e retorno mesmo quando o processo Node usa outro fuso.
- Validação antecipada das redes e dos proxies; listas vazias compostas por espaços/vírgulas são recusadas em produção. Arquivos de ambiente selecionados explicitamente ou ilegíveis interrompem o carregamento com erro claro.
- Removidos o `.gitignore` redundante do backend, os componentes `CardDescription`/`CardFooter` sem uso e a dependência `swagger-jsdoc`, pois o contrato OpenAPI já está declarado integralmente. O Swagger usa `/api` na mesma origem, permitindo consultas na rede interna durante o desenvolvimento.
- Corrigido o ícone do frontend para usar o recurso processado pelo Vite. Removidas as referências de compartilhamento social que apontavam para um arquivo inexistente. Corpos JSON em formato de lista são recusados com 400.
- Validação nesta revisão: lint, TypeScript, build e 30 testes aprovados; migrations conferidas em cópias dos dois bancos; integração real em schema temporário com login, operações dos três módulos, inventário legado, ícone e execução em produção. O processo de integração usou `Pacific/Kiritimati` para conferir as datas em outro fuso.
- Instalação limpa com `npm ci --omit=dev` aprovada em pasta temporária, incluindo bcrypt nativo e execução HTTP sem dependências de desenvolvimento. As bases existentes e as credenciais locais não foram alteradas. O servidor da empresa ainda precisa receber sua configuração de ambiente e ser validado no destino; nenhum arquivo de SSH foi acrescentado.

## Atualização — 22/10/2026: identificação dos ativos

- Número de série e número de patrimônio adicionados aos cadastros, edições e consultas de TVs, equipamentos e câmeras. A consulta de unidades encontra a unidade pelos identificadores de seus ativos, ignorando itens excluídos.
- A opção **Não possui**, ao lado do patrimônio, desabilita o campo e envia `null` à API. A série continua disponível. Por solicitação posterior, o backend agora persiste **NÃO INFORMADO** no MySQL para identificadores ausentes; a resposta da API mantém `null` para preservar o comportamento da interface e dos clientes existentes.
- Validação compartilhada aceita texto de até 100 caracteres, preserva zeros à esquerda e normaliza maiúsculas. Atualizações parciais preservam identificadores omitidos.
- As duas migrations de identificadores foram aplicadas em **selfit_db e selfit_homolog**. As bases possuem sete migrations. A segunda preenche somente números nulos/vazios com **NÃO INFORMADO** e define esse default nas seis colunas, preservando números reais e datas de atualização. Novos backups foram feitos antes dessa substituição. Os snapshots `principal.sql` e `homologacao.sql` foram exportados novamente.
- Corrigida a ordem de execução em bancos vazios: a migration histórica `001_criar_tabelas_iniciais.js` cria a base antes dos arquivos datados. Seus nomes e registros anteriores foram preservados.
- Backups completos de 22/10 foram restaurados em schemas temporários e comparados após cada atualização: somente os identificadores nulos/vazios foram substituídos pelo texto solicitado. Números reais, demais campos e datas de atualização foram preservados. Na conferência mais recente, a homologação contém 3 TVs; as demais contagens permanecem iguais às da tabela histórica abaixo.
- Validados lint, TypeScript, build, 28 testes e integração real da API em banco temporário: cadastro e edição dos três módulos, pesquisa por identificadores, ausência de patrimônio, edição parcial e exclusão lógica. Migrations também passaram nas cópias das duas bases e em instalação vazia, com segunda execução sem alterações.
- No Chrome, o build foi validado com respostas simuladas da API: campos dos três cadastros, checkbox exclusivo do patrimônio, consulta de unidades, detalhes e preenchimento da edição. A persistência foi coberta separadamente pela integração com MySQL real.

Após atualizar o código, reinicie as APIs principal e de homologação para carregar os novos models e consultas. No frontend publicado, use o novo build; durante o desenvolvimento, atualize a página.

## Organização final

O frontend está em `Frontend/`, organizado em `assets`, `components`, `contexts`, `hooks`, `pages`, `services` e `utils`, com `App.tsx` e `main.tsx` na raiz de `src`.

O backend está em `Backend/`, com MVC: `routes` encaminham requisições, `controllers` tratam HTTP e `models` reúnem regras e persistência. `config` concentra ambiente, banco, segurança e montagem da API. O frontend React representa a View. Migrations e seeds ficam em `Backend/database/`.

Os caminhos de imports, scripts, testes e comentários foram atualizados. Pastas vazias, scripts temporários, exemplos redundantes de ambiente, Docker e a pasta de exemplos de deploy foram removidos. Restaram apenas `Backend/.env` e `Backend/.env.homolog`, privados e comentados.

## Correções

- SQL repetido de consultas de inventário, garantias e manutenções foi centralizado nos repositórios dos models.
- Datas impossíveis são rejeitadas antes do SQL.
- A edição preserva a unidade atual quando existem nomes iguais; transferências ambíguas são recusadas.
- Falhas no carregamento do inventário aparecem na tela, com opção de tentar novamente. Respostas antigas não sobrescrevem a recarga mais recente.
- O seed usa as mesmas opções de conexão da API, respeita TLS/variáveis externas e aplica o lote em transação.
- Logs de falha evitam imprimir objetos SQL com dados privados.
- A consulta de CEP foi isolada em `Frontend/src/services/cepService.ts`.
- Anotações Swagger duplicadas foram removidas. O contrato OpenAPI está em `Backend/src/config/swagger.js`.
- A tela de histórico sem endpoint ou persistência foi removida; o histórico de manutenções existente foi mantido.

## Banco preservado

Foram encontrados somente `selfit_db`, `selfit_homolog` e os quatro schemas internos do MySQL. Nenhum schema existente foi excluído.

A base principal tinha duas migrations registradas e a homologação quatro. As migrations pendentes foram testadas em cópias antes da aplicação. A migration nova impede `item_id` nulo e adiciona o índice de manutenções ausente no principal. Referências nulas interrompem sua execução sem excluir registros.

As duas bases agora registram cinco migrations. Backups completos anteriores à atualização foram restaurados em schemas temporários e comparados com as bases atualizadas: os registros das seis tabelas de negócio foram preservados.

| Ambiente | Unidades | Usuários | Equipamentos | TVs | Câmeras | Manutenções |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Principal | 170 | 1 | 0 | 0 | 0 | 0 |
| Homologação | 170 | 1 | 1 | 2 | 1 | 2 |

Os números usam `COUNT(*)`; `TABLE_ROWS` do InnoDB é uma estimativa. Backups ficam em `backups/`, fora do Git. Os snapshots em `database/schemas/` contêm somente a estrutura.

Em 22/10, os seis dumps locais com datas foram substituídos por duas cópias atuais: `backups/backup-principal.sql` e `backups/backup-homologacao.sql`. Ambas foram restauradas em bases temporárias e comparadas antes de remover os arquivos anteriores. O script passou a manter uma cópia por banco e preserva o último arquivo concluído quando há falha. O arquivo de acesso foi movido para `Backend/.admin-test-access.txt`.

## Diferenças e limitações mantidas

- Principal usa `utf8mb4_0900_ai_ci`; homologação usa `utf8mb4_unicode_ci`. Collation e detalhes históricos de timestamps foram preservados para evitar conversões desnecessárias nesta reorganização.
- A relação polimórfica `item_tipo` + `item_id` é validada pelo model; não há uma FK única que referencie as três tabelas de ativos.
- Ativos usam exclusão lógica; manutenções continuam com exclusão física, conforme o comportamento anterior.
- Não há auditoria persistente de todas as alterações, tela de gestão de contas ou recuperação de senha. O provisionamento usa CLI/API administrativa.
- O JWT permanece no localStorage. A limitação de login usa memória de um processo; múltiplas instâncias exigem revisão desse mecanismo.
- A criação de ativos ainda identifica a unidade por nome e UF; ambiguidades são recusadas.
- Rede, DNS, certificado, serviço do sistema, permissões MySQL e política de backup ainda dependem da empresa. Não foi feito deploy no servidor de destino.

Os testes cobrem regras dos models, proteção dos endpoints, organização MVC e separação de chamadas externas no frontend. Consulte o README para localizar cada responsabilidade.

## Validação histórica da entrega de 20/10

Na revisão de 20/10, lint, TypeScript, build, 25 testes e integração dos três módulos passaram. A reinstalação isolada das dependências ficou pendente naquela data por falhas de cache/npm; essa verificação local foi concluída na revisão de 28/10 acima. A instalação no servidor de destino ainda depende do ambiente da empresa.
