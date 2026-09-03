/*
# Correção de nome de unidade

1. Objetivo
- Corrigir a unidade importada como `PRAIA` para o nome `PRATA`, conforme a relação de filiais.

2. Alteração
- Adiciona `PRATA` na região PB se ainda não existir.
- Não remove registros e não altera TVs existentes.

3. Segurança
- Mantém as políticas RLS existentes.
*/

INSERT INTO unidades (nome, regiao_id)
SELECT 'PRATA', id FROM regioes WHERE sigla = 'PB'
AND NOT EXISTS (
  SELECT 1 FROM unidades u
  WHERE lower(u.nome) = 'prata' AND u.regiao_id = regioes.id
);
