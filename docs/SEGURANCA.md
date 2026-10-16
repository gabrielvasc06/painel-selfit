# Revisao de seguranca e validacao

## Barreiras implementadas

1. O host publica somente o painel pelo proxy HTTPS; a aplicacao e o MySQL ficam em rede privada.
2. Toda requisicao, incluindo a pagina de login, passa pela lista de redes autorizadas. Sem configuracao de rede em producao, o startup falha. O exemplo restringe a loopback.
3. O login verifica usuario autorizado e senha bcrypt. Repetidas tentativas recebem 429. Nao ha senha fixa nas migrations ou no seed.
4. Rotas de dados verificam Bearer JWT, assinatura HS256, expiracao, claims, lista de usuarios e existencia atual da conta no banco. Uma conta excluida perde acesso mesmo com token ainda dentro da validade.
5. Criacao de usuarios exige adicionalmente USER_ADMIN_USERS. As rotas `/register/unidades` e `/register/equipamentos` continuam disponiveis aos usuarios operacionais autenticados; a restricao administrativa e aplicada somente ao cadastro de contas.
6. O frontend valida `/api/session` antes de abrir telas privadas e encerra a sessao quando a API devolve 401.

As rotas com e sem `/api` usam o mesmo router e as mesmas protecoes. Health/readiness sao acessiveis sem JWT apenas dentro das redes liberadas. Swagger fica desativado em producao. Arquivos ocultos, fontes da API, .env e arquivos de desenvolvimento nao sao servidos pelo HTTP.

CORS de producao aceita apenas FRONT; origens de Vite sao liberadas somente em desenvolvimento. Headers Helmet incluem CSP, protecao contra framing e nosniff. JSON tem limite de 2 MB; erros inesperados nao devolvem detalhes SQL ou stack ao cliente. As queries usam parametros e as tabelas/colunas dinamicas sao escolhidas pelo backend a partir de listas fixas.

O banco suporta TLS com verificacao de certificado, pool limitado e conexao com timeout. No Compose com MySQL incluido, 3306 nao e publicado e os dados ficam em volume persistente. Dependencias Swagger foram movidas para desenvolvimento.

## Contas locais

Por solicitacao do responsavel, ADMIN foi criado no banco principal e no de homologacao e a conta anterior foi removida. Chaves JWT locais foram renovadas. A senha temporaria esta somente no arquivo local ignorado `.admin-test-access.txt` e no ambiente local necessario para o teste autenticado de homologacao. Credenciais reais nao entram no pacote ou na imagem. As contas foram validadas por login real e consultas protegidas nos dois ambientes.

## Verificacoes

- Testes executam as regras reais de inventario, sem duplicar implementacoes dentro do teste.
- Testes HTTP percorrem todos os metodos de dados sem token nos dois prefixos, token invalido/expirado, assinatura/algoritmo diferente, usuario nao autorizado, cadastro administrativo, CORS, bloqueio de rede, IP encaminhado forjado, limitacao do login, arquivos ocultos e readiness com falha.
- Integracao MySQL cria schema temporario exclusivo, executa migrations em banco vazio e novamente, confirma ausencia de credenciais automaticas, cria administrador e exercita consultas, cadastros, atualizacoes, manutencoes e exclusoes nos tres modulos. Confirma ainda frontend e login em NODE_ENV=production e remove apenas o schema criado pelo teste.
- Lint, TypeScript e build de producao sao parte de `npm run check`; 5 testes do frontend e 11 testes de seguranca passaram.
- O pacote foi instalado com `npm ci --omit=dev` e testado no Chrome headless contra os bancos principal e homologacao: login ADMIN, painel, consulta de unidades, recarga de sessao e token invalido, sem erros JavaScript.
- As duas composicoes Docker passaram em `docker compose config --quiet` com valores de validacao sem segredos reais. A verificacao do pacote encontrou zero arquivos de ambiente real e zero ocorrencias das credenciais locais.

## Limites conhecidos

Nenhum software pode ser declarado invulneravel ou 100% validado em um servidor ainda nao instalado. IP/rede nao identifica individualmente uma maquina: a empresa deve completar a regra com VPN/firewall/certificados quando precisar desse nivel de controle. A API nao implementa MFA, SSO corporativo, trilha persistente completa de auditoria nem permissoes diferentes por modulo; os usuarios operacionais autorizados compartilham CRUD de inventario. O cadastro de contas e separado por administrador.

O JWT permanece no localStorage conforme o fluxo existente. CSP reduz exposicao, mas um XSS na mesma origem ainda pode acessar esse armazenamento. Migrar para cookie HttpOnly envolve um novo fluxo de sessao/CSRF e nao foi incluido silenciosamente nesta limpeza.

O audit das dependencias de producao da API e do frontend ficou sem vulnerabilidades conhecidas na consulta realizada. No ambiente de build do frontend permanecem 7 alertas (5 altos e 2 moderados) na cadeia do Tailwind 3 (braces/chokidar/micromatch/fast-glob/postcss-nested/postcss-selector-parser). Esses pacotes nao compoem o runtime publicado. A correcao sugerida pelo npm migra para Tailwind 4, com mudancas de CSS e requisitos de navegador; foi mantido o tema existente para evitar uma migracao visual sem validacao especifica. Execute builds somente com fontes confiaveis e trate essa migracao como pendencia de desenvolvimento. Referencia: [advisory braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) e [guia de migracao Tailwind](https://tailwindcss.com/docs/upgrade-guide).

Docker Compose pode ser validado sem daemon, mas build/run da imagem exigem Docker ativo no host. A verificacao final de HTTPS, DNS, firewall, redes da TI/VPN, backup e restauracao depende do servidor escolhido. Os arquivos de exemplo iniciam restritivos para nao liberar acesso publico por suposicao.
