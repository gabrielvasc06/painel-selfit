// Regras de selecao do inventario. Nao depende de React ou HTTP.
import type { Equipamento, ModuloTipo } from './inventoryTypes';

export function getSafeEquipmentCategories(categories: string[] = []) {
  const allowed = new Set(['TV', 'CAMERAS', 'TOTEM', 'CATRACA', 'LEITOR_FACIAL', 'ACCESS_POINT', 'IMPRESSORA', 'SWITCH', 'FIREWALL', 'ROTEADOR', 'NOBREAK', 'totem', 'catraca', 'leitor_facial', 'access_point', 'impressora', 'switch', 'firewall', 'roteador', 'nobreak']);
  return categories.filter((category) => allowed.has(category));
}

export function filterEquipamentosByModulo(equipamentos: Equipamento[], modulo: ModuloTipo) {
  if (modulo === 'tvs') return equipamentos.filter((item) => item.tipo_modulo === 'TV' || item.categoria === 'TV');
  if (modulo === 'cameras') return equipamentos.filter((item) => item.tipo_modulo === 'CAMERA' || item.categoria === 'CAMERAS');
  return equipamentos.filter((item) => (item.tipo_modulo === 'EQUIPAMENTO' || (!item.tipo_modulo && item.categoria !== 'TV' && item.categoria !== 'CAMERAS')) && getSafeEquipmentCategories([item.categoria]).length > 0);
}


