/*
# Renumerar TVs por unidade e ajustar constraint

1. Alterações
- Remove a constraint UNIQUE da coluna `codigo` (era global).
- Adiciona constraint UNIQUE composta (unidade_id, codigo) — cada unidade tem sua própria sequência.
- Renumera todas as TVs existentes para o formato 01, 02, 03... por unidade.

2. Segurança
- Nenhuma tabela ou coluna é removida.
- RLS e políticas permanecem ativas.
*/

ALTER TABLE tvs DROP CONSTRAINT IF EXISTS tvs_codigo_key;
ALTER TABLE tvs ADD CONSTRAINT tvs_unidade_codigo_key UNIQUE (unidade_id, codigo);

DO $$
DECLARE
  rec RECORD;
  seq int;
BEGIN
  FOR rec IN SELECT DISTINCT unidade_id FROM tvs ORDER BY unidade_id LOOP
    seq := 1;
    FOR rec IN SELECT id FROM tvs WHERE unidade_id = rec.unidade_id ORDER BY created_at LOOP
      UPDATE tvs SET codigo = lpad(seq::text, 2, '0') WHERE id = rec.id;
      seq := seq + 1;
    END LOOP;
  END LOOP;
END $$;
