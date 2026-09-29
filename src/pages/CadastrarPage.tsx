import { useInventory } from '@/providers/InventoryProvider';
import { EquipmentRegistrationForm } from '@/components/inventory/EquipmentRegistrationForm';

export function CadastrarPage() {
  const { unidades } = useInventory();

  return <EquipmentRegistrationForm title="Cadastrar TV" category="TV" units={unidades.map(({ nome, uf }) => ({ nome, uf }))} />;
}
