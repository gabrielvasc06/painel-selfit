/*
# Atualizar constraint de status: Reserva -> Outros

1. Alterações
- Remove a constraint CHECK antiga que permitia 'ativa','manutencao','reserva'.
- Adiciona nova constraint permitindo 'ativa','manutencao','outros'.
- Atualiza TVs existentes com status 'reserva' para 'outros'.

2. Segurança
- Nenhuma tabela ou coluna é removida.
- RLS e políticas permanecem ativas.
*/

ALTER TABLE tvs DROP CONSTRAINT IF EXISTS tvs_status_check;
UPDATE tvs SET status = 'outros' WHERE status = 'reserva';
ALTER TABLE tvs ADD CONSTRAINT tvs_status_check CHECK (status IN ('ativa','manutencao','outros'));
