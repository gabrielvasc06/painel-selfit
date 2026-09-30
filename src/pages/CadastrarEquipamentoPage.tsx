// Arquivo: src/pages/CadastrarEquipamentoPage.tsx
// Serve para: tela que reaproveita o formulario de cadastro do modulo atual.

import { useInventory } from '@/providers/InventoryProvider';
import { EquipmentRegistrationForm } from '@/components/inventory/EquipmentRegistrationForm';
import { categoriaLabels, tiCategorias } from '@/services/inventory/inventoryTypes';

export function CadastrarEquipamentoPage() {
  const { unidades } = useInventory();
  const categories = tiCategorias.map((category) => ({
    value: category.toLocaleUpperCase('pt-BR'),
    label: categoriaLabels[category].toLocaleUpperCase('pt-BR'),
  }));

  return <EquipmentRegistrationForm title="Cadastrar Equipamento" categories={categories} units={unidades.map(({ nome, uf }) => ({ nome, uf }))} />;
}
