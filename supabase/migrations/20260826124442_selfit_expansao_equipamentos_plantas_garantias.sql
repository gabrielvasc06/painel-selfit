/*
# Selfit — Expansão do schema: equipamentos, plantas, garantias, manutenções

1. Novas colunas em `unidades`
- `logradouro`: nome da rua/avenida
- `numero`: número do endereço

2. Novas Tabelas
- `equipamentos`: equipamentos de pista, acesso, rack e mídia vinculados a uma unidade
- `manutencoes`: histórico de manutenções por equipamento
- `plantas`: arquivo da planta baixa por unidade
- `equipamento_posicoes`: hotspots de equipamentos sobre a planta baixa

3. Storage
- Bucket `plantas-unidades` para upload de PDF/imagem

4. Limpeza de dados
- Remove unidades de teste iniciais (Norte, Centro, Sul, Cuiabá, Belém, São Paulo)
- Remove WE BURN MATRIZ, NORTHWAY, GALPÃO NOVO
- Renomeia JEAN FREIRE -> JEAN EMILE
- Limpa histórico antigo de seed
- Garante VÁRZEA existe

5. Segurança
- RLS habilitado em todas as novas tabelas (anon + authenticated CRUD)
*/

-- === Colunas em unidades ===
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS logradouro text;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS numero text;

-- === Equipamentos ===
CREATE TABLE IF NOT EXISTS equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  categoria text NOT NULL CHECK (categoria IN (
    'catraca','leitor_facial','camera','access_point','impressora',
    'tv_box','rack','switch','patch_panel','firewall','roteador','nobreak'
  )),
  nome text NOT NULL,
  asset_tag text,
  marca text,
  modelo text,
  numero_serie text,
  data_garantia date,
  posicao text,
  posicao_rack_u integer,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','manutencao','inativo','outros')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE equipamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_equipamentos" ON equipamentos;
CREATE POLICY "anon_read_equipamentos" ON equipamentos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_equipamentos" ON equipamentos;
CREATE POLICY "anon_write_equipamentos" ON equipamentos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_equipamentos" ON equipamentos;
CREATE POLICY "anon_update_equipamentos" ON equipamentos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_equipamentos" ON equipamentos;
CREATE POLICY "anon_delete_equipamentos" ON equipamentos FOR DELETE TO anon, authenticated USING (true);

-- === Manutenções ===
CREATE TABLE IF NOT EXISTS manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('troca','reparo','chamado_tecnico','preventiva','outros')),
  descricao text,
  responsavel text,
  data_manutencao date NOT NULL DEFAULT CURRENT_DATE,
  custo numeric(10,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE manutencoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_manutencoes" ON manutencoes;
CREATE POLICY "anon_read_manutencoes" ON manutencoes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_manutencoes" ON manutencoes;
CREATE POLICY "anon_write_manutencoes" ON manutencoes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_manutencoes" ON manutencoes;
CREATE POLICY "anon_delete_manutencoes" ON manutencoes FOR DELETE TO anon, authenticated USING (true);

-- === Plantas baixas ===
CREATE TABLE IF NOT EXISTS plantas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  arquivo_url text NOT NULL,
  arquivo_tipo text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE plantas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_plantas" ON plantas;
CREATE POLICY "anon_read_plantas" ON plantas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_plantas" ON plantas;
CREATE POLICY "anon_write_plantas" ON plantas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_plantas" ON plantas;
CREATE POLICY "anon_delete_plantas" ON plantas FOR DELETE TO anon, authenticated USING (true);

-- === Posições de equipamentos na planta ===
CREATE TABLE IF NOT EXISTS equipamento_posicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  planta_id uuid NOT NULL REFERENCES plantas(id) ON DELETE CASCADE,
  coord_x numeric(5,2) NOT NULL CHECK (coord_x >= 0 AND coord_y <= 100),
  coord_y numeric(5,2) NOT NULL CHECK (coord_y >= 0 AND coord_y <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(equipamento_id, planta_id)
);

ALTER TABLE equipamento_posicoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_posicoes" ON equipamento_posicoes;
CREATE POLICY "anon_read_posicoes" ON equipamento_posicoes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_posicoes" ON equipamento_posicoes;
CREATE POLICY "anon_write_posicoes" ON equipamento_posicoes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_posicoes" ON equipamento_posicoes;
CREATE POLICY "anon_update_posicoes" ON equipamento_posicoes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_posicoes" ON equipamento_posicoes;
CREATE POLICY "anon_delete_posicoes" ON equipamento_posicoes FOR DELETE TO anon, authenticated USING (true);

-- === Índices ===
CREATE INDEX IF NOT EXISTS idx_equipamentos_unidade ON equipamentos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_categoria ON equipamentos(categoria);
CREATE INDEX IF NOT EXISTS idx_equipamentos_garantia ON equipamentos(data_garantia);
CREATE INDEX IF NOT EXISTS idx_manutencoes_equipamento ON manutencoes(equipamento_id);
CREATE INDEX IF NOT EXISTS idx_plantas_unidade ON plantas(unidade_id);

-- === Storage bucket ===
INSERT INTO storage.buckets (id, name, public) VALUES ('plantas-unidades','plantas-unidades', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_read_plantas_bucket" ON storage.objects;
CREATE POLICY "anon_read_plantas_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'plantas-unidades');

DROP POLICY IF EXISTS "anon_write_plantas_bucket" ON storage.objects;
CREATE POLICY "anon_write_plantas_bucket" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'plantas-unidades');

DROP POLICY IF EXISTS "anon_delete_plantas_bucket" ON storage.objects;
CREATE POLICY "anon_delete_plantas_bucket" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'plantas-unidades');

-- === Remover unidades e TVs de teste iniciais ===
DELETE FROM tvs WHERE codigo IN ('TV #001','TV #017','TV #042','TV #073','TV #088','TV #091','TV #102','TV #110');
DELETE FROM unidades WHERE nome IN ('Norte','Centro','Sul','Cuiabá','Belém','São Paulo');
DELETE FROM historico WHERE tv_codigo IN ('TV #001','TV #017','TV #042','TV #073','TV #088','TV #091','TV #102','TV #110');
DELETE FROM historico WHERE usuario = 'admin' AND acao IN ('TV enviada para manutenção','TV instalada','TV atualizada','Nova TV cadastrada','TV cadastrada');

-- === Remover WE BURN MATRIZ, NORTHWAY, GALPÃO NOVO ===
DELETE FROM tvs WHERE unidade_id IN (SELECT id FROM unidades WHERE nome IN ('WE BURN - MATRIZ','NORTHWAY','GALPÃO - NOVO'));
DELETE FROM unidades WHERE nome IN ('WE BURN - MATRIZ','NORTHWAY','GALPÃO - NOVO');

-- === Renomear JEAN FREIRE -> JEAN EMILE ===
UPDATE unidades SET nome = 'JEAN EMILE' WHERE nome = 'JEAN FREIRE';

-- === Garantir VÁRZEA existe ===
INSERT INTO unidades (nome, regiao_id, cidade, uf)
SELECT 'VÁRZEA', id, 'Recife', 'PE' FROM regioes WHERE sigla = 'PE'
AND NOT EXISTS (SELECT 1 FROM unidades u WHERE lower(u.nome) = 'várzea');
