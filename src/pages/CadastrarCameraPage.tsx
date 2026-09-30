// Arquivo: src/pages/CadastrarCameraPage.tsx
// Serve para: tela que reaproveita o formulario de cadastro do modulo atual.

import { useInventory } from '@/providers/InventoryProvider';
import { EquipmentRegistrationForm } from '@/components/inventory/EquipmentRegistrationForm';

export function CadastrarCameraPage() {
  const { unidades } = useInventory();

  return <EquipmentRegistrationForm title="Cadastrar Câmera" category="CAMERAS" units={unidades.map(({ nome, uf }) => ({ nome, uf }))} />;
}
