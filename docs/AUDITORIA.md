# Revisão técnica — 20/10/2026

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
