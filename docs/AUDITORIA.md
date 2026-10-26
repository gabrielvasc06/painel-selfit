# Revisão técnica — 20/10/2026

## Atualização — 22/10/2026: identificação dos ativos

- Número de série e número de patrimônio adicionados aos cadastros, edições e consultas de TVs, equipamentos e câmeras. A consulta de unidades encontra a unidade pelos identificadores de seus ativos, ignorando itens excluídos.
- A opção **Não possui**, ao lado do patrimônio, desabilita o campo e envia `null` à API. A série continua disponível. Por solicitação posterior, o backend agora persiste **NÃO INFORMADO** no MySQL para identificadores ausentes; a resposta da API mantém `null` para preservar o comportamento da interface e dos clientes existentes.
- Validação compartilhada aceita texto de até 100 caracteres, preserva zeros à esquerda e normaliza maiúsculas. Atualizações parciais preservam identificadores omitidos.
- As duas migrations de identificadores foram aplicadas em **selfit_db e selfit_homolog**. As bases possuem sete migrations. A segunda preenche somente números nulos/vazios com **NÃO INFORMADO** e define esse default nas seis colunas, preservando números reais e datas de atualização. Novos backups foram feitos antes dessa substituição. Os snapshots `principal.sql` e `homologacao.sql` foram exportados novamente.
- Corrigida a ordem de execução em bancos vazios: a migration histórica `migrate.js` cria a base antes dos arquivos datados. Seus nomes e registros anteriores foram preservados.
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

## Valida??o da entrega

Lint sem avisos, TypeScript, build, 25 testes e integra??o real dos tr?s m?dulos passaram. Os testes de migrations validaram c?pias dos dois ambientes sem mudan?as nos registros. A gera??o do pacote tamb?m foi executada. A reinstala??o isolada das depend?ncias de produ??o n?o foi conclu?da nesta m?quina: faltou um pacote no cache offline e a tentativa seguinte encontrou uma falha interna do npm. A instala??o limpa no servidor ainda precisa ser validada.
