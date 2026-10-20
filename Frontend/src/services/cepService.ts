type EnderecoCep = { erro?: boolean; uf?: string; logradouro?: string; bairro?: string };

// Integração externa fica em services; a página recebe somente os dados do endereço.
export async function consultarCep(cep: string): Promise<EnderecoCep> {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Não foi possível consultar o CEP.');
  return response.json();
}
