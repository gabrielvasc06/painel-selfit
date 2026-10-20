// Entradas de pagina do inventario reutilizam a mesma lista e formulario.
import { useInventario } from '@/hooks/useInventario';
import { FormularioEquipamento } from '@/components/inventario/FormularioEquipamento';
import { categoriaLabels, tiCategorias } from '@/utils/inventoryTypes';
import { ListaEquipamentos } from '@/components/inventario/ListaEquipamentos';

export function CadastrarPage() {
  const { unidades } = useInventario();

  return <FormularioEquipamento title="Cadastrar TV" category="TV" units={unidades.map(({ nome, uf }) => ({ nome, uf }))} />;
}

export function CadastrarCameraPage() {
  const { unidades } = useInventario();

  return <FormularioEquipamento title="Cadastrar Câmera" category="CAMERAS" units={unidades.map(({ nome, uf }) => ({ nome, uf }))} />;
}

export function CadastrarEquipamentoPage() {
  const { unidades } = useInventario();
  const categories = tiCategorias.map((category) => ({
    value: category.toLocaleUpperCase('pt-BR'),
    label: categoriaLabels[category].toLocaleUpperCase('pt-BR'),
  }));

  return <FormularioEquipamento title="Cadastrar Equipamento" categories={categories} units={unidades.map(({ nome, uf }) => ({ nome, uf }))} />;
}

export function CamerasPage() {
  return <ListaEquipamentos />;
}

export function EquipamentosPage() {
  return <ListaEquipamentos />;
}
