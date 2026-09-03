/*
# Selfit Holding — Schema do Painel de Estoque

1. Novas Tabelas
- `regioes`: regiões onde as academias operam (PE, MT, PA, SP, etc.)
- `unidades`: academias/unidades físicas vinculadas a uma região
- `tvs`: TVs cadastradas no inventário, vinculadas a uma unidade
- `historico`: log de alterações do sistema (quem, quando, o quê)

2. Segurança
- RLS habilitado em todas as tabelas.
- Acesso para anon + authenticated (app simula auth mas usa anon key no frontend).
*/

CREATE TABLE IF NOT EXISTS regioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla text NOT NULL UNIQUE,
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE regioes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_regioes" ON regioes;
CREATE POLICY "anon_read_regioes" ON regioes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_regioes" ON regioes;
CREATE POLICY "anon_write_regioes" ON regioes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_regioes" ON regioes;
CREATE POLICY "anon_update_regioes" ON regioes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  regiao_id uuid NOT NULL REFERENCES regioes(id) ON DELETE CASCADE,
  cidade text,
  endereco text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_unidades" ON unidades;
CREATE POLICY "anon_read_unidades" ON unidades FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_unidades" ON unidades;
CREATE POLICY "anon_write_unidades" ON unidades FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_unidades" ON unidades;
CREATE POLICY "anon_update_unidades" ON unidades FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_unidades" ON unidades;
CREATE POLICY "anon_delete_unidades" ON unidades FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS tvs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  modelo text,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','manutencao','reserva')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tvs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_tvs" ON tvs;
CREATE POLICY "anon_read_tvs" ON tvs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_tvs" ON tvs;
CREATE POLICY "anon_write_tvs" ON tvs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tvs" ON tvs;
CREATE POLICY "anon_update_tvs" ON tvs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tvs" ON tvs;
CREATE POLICY "anon_delete_tvs" ON tvs FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario text NOT NULL,
  acao text NOT NULL,
  tv_codigo text,
  unidade_nome text,
  regiao_sigla text,
  detalhe text,
  data_alteracao timestamptz DEFAULT now()
);

ALTER TABLE historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_historico" ON historico;
CREATE POLICY "anon_read_historico" ON historico FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_historico" ON historico;
CREATE POLICY "anon_write_historico" ON historico FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_unidades_regiao ON unidades(regiao_id);
CREATE INDEX IF NOT EXISTS idx_tvs_unidade ON tvs(unidade_id);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico(data_alteracao DESC);

-- Dados iniciais: regiões
INSERT INTO regioes (sigla, nome) VALUES
  ('PE','Pernambuco'),
  ('MT','Mato Grosso'),
  ('PA','Pará'),
  ('SP','São Paulo')
ON CONFLICT (sigla) DO NOTHING;

-- Dados iniciais: unidades
INSERT INTO unidades (nome, regiao_id, cidade) VALUES
  ('Centro',  (SELECT id FROM regioes WHERE sigla='PE'), 'Recife'),
  ('Norte',   (SELECT id FROM regioes WHERE sigla='PE'), 'Olinda'),
  ('Cuiabá',  (SELECT id FROM regioes WHERE sigla='MT'), 'Cuiabá'),
  ('Belém',   (SELECT id FROM regioes WHERE sigla='PA'), 'Belém'),
  ('Sul',     (SELECT id FROM regioes WHERE sigla='PA'), 'Ananindeua'),
  ('São Paulo',(SELECT id FROM regioes WHERE sigla='SP'), 'São Paulo')
ON CONFLICT DO NOTHING;

-- Dados iniciais: TVs
INSERT INTO tvs (codigo, unidade_id, modelo, status) VALUES
  ('TV #001',(SELECT id FROM unidades WHERE nome='Centro' AND cidade='Recife'),'Samsung 55"','ativa'),
  ('TV #017',(SELECT id FROM unidades WHERE nome='Norte' AND cidade='Olinda'),'LG 50"','ativa'),
  ('TV #042',(SELECT id FROM unidades WHERE nome='Centro' AND cidade='Recife'),'Samsung 55"','manutencao'),
  ('TV #073',(SELECT id FROM unidades WHERE nome='Cuiabá' AND cidade='Cuiabá'),'TCL 43"','ativa'),
  ('TV #088',(SELECT id FROM unidades WHERE nome='Belém' AND cidade='Belém'),'Philips 50"','reserva'),
  ('TV #091',(SELECT id FROM unidades WHERE nome='Sul' AND cidade='Ananindeua'),'Samsung 55"','ativa'),
  ('TV #102',(SELECT id FROM unidades WHERE nome='Cuiabá' AND cidade='Cuiabá'),'LG 50"','manutencao'),
  ('TV #110',(SELECT id FROM unidades WHERE nome='São Paulo' AND cidade='São Paulo'),'Samsung 65"','ativa')
ON CONFLICT (codigo) DO NOTHING;

-- Dados iniciais: histórico
INSERT INTO historico (usuario, acao, tv_codigo, unidade_nome, regiao_sigla, detalhe) VALUES
  ('admin','TV enviada para manutenção','TV #042','Centro','PE','TV #042 alterada de ativa para manutenção'),
  ('admin','TV instalada','TV #017','Norte','PE','TV #017 instalada na unidade Norte'),
  ('admin','TV atualizada','TV #073','Cuiabá','MT','TV #073 atualizada para versão 2.1'),
  ('admin','Nova TV cadastrada','TV #091','Sul','PA','TV #091 cadastrada para unidade Sul'),
  ('admin','TV cadastrada','TV #110','São Paulo','SP','TV #110 adicionada ao inventário')
ON CONFLICT DO NOTHING;
