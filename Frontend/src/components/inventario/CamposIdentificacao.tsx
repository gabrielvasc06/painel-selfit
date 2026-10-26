import { useId } from 'react';

export type IdentificadoresEquipamento = {
  numero_serie: string | null;
  numero_patrimonio: string | null;
};

type Props = {
  values: IdentificadoresEquipamento;
  onChange: (field: keyof IdentificadoresEquipamento, value: string | null) => void;
};

// O mesmo par de campos e usado no cadastro e nas edicoes dos tres modulos.
// A API usa null para ausencia e para o checkbox; o backend persiste o texto
// "NAO INFORMADO" no MySQL, mantendo essa conversao fora da interface.
export function CamposIdentificacao({ values, onChange }: Props) {
  const id = useId();
  return <>{([
    ['numero_serie', 'Número de série'],
    ['numero_patrimonio', 'Número de patrimônio'],
  ] as const).map(([field, label]) => (
    <div key={field} className="space-y-2 text-sm text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={`${id}-${field}`} className="font-semibold">{label}</label>
        {field === 'numero_patrimonio' && <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
          <input type="checkbox" checked={values[field] === null} aria-label={`Não possui ${label.toLocaleLowerCase('pt-BR')}`}
            onChange={(event) => onChange(field, event.target.checked ? null : '')} />
          Não possui
        </label>}
      </div>
      <input id={`${id}-${field}`} name={field} type="text" maxLength={100}
        value={values[field] ?? ''} disabled={field === 'numero_patrimonio' && values[field] === null}
        placeholder={field === 'numero_patrimonio' && values[field] === null ? 'Não possui' : 'Informe o número'}
        onChange={(event) => onChange(field, event.target.value.toLocaleUpperCase('pt-BR'))}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 uppercase text-slate-900 focus:border-selfit-500 focus:outline-none focus:ring-2 focus:ring-selfit-500/20 disabled:cursor-not-allowed disabled:opacity-60" />
    </div>
  ))}</>;
}
