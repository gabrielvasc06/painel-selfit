# Segurança e operação

Toda requisição passa pela lista de redes autorizadas. Em produção, a inicialização exige banco, senha, origem pública, JWT_SECRET e listas de acesso. O exemplo restringe acesso a loopback; configure os CIDRs reais da TI/VPN no servidor.

O login usa bcrypt e emite JWT HS256 com duração de oito horas. Os endpoints de dados exigem JWT válido, usuário autorizado e conta ainda existente. Excluir uma conta revoga seu acesso mesmo que o token ainda não tenha expirado. Criar usuários exige adicionalmente `USER_ADMIN_USERS`; contas operacionais autorizadas mantêm acesso ao inventário.

Rotas com e sem `/api` preservam as mesmas proteções. Health/readiness não exigem JWT, mas continuam sujeitos à restrição de rede. Swagger não é servido em produção. Somente `dist/` é publicado; arquivos ocultos e fontes do backend não são expostos.

A API limita tentativas de login e tamanho de JSON, usa Helmet/CSP, valida origens CORS e não retorna detalhes SQL/stack ao cliente. O banco pode usar TLS com validação de certificado. Valores SQL usam parâmetros; nomes de tabelas são escolhidos por uma lista interna fixa.

`TRUST_PROXY` deve listar apenas os proxies administrados pela empresa. O proxy substitui o IP encaminhado pelo IP real do cliente. Restrição de rede e CORS não substituem autenticação. Configuração HTTPS, firewall e reinício do serviço estão no [guia de execu??o](EXECUCAO.md).

Credenciais de desenvolvimento, `.admin-test-access.txt`, `.env` e backups são privados, ignorados pelo Git e excluídos do pacote de distribuição. Use credenciais próprias para a primeira versão oficial. O provisionamento recusa sobrescrever uma senha existente.

As limitações conhecidas e os resultados da revisão estão em [AUDITORIA.md](AUDITORIA.md). Execute `npm run check` e os testes de integração antes de distribuir uma nova versão. Os testes que criam schemas devem usar uma credencial de validação, separada da conta de operação.
