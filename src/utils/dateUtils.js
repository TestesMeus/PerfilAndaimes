export function formatarData(data) {
  if (!data) return '';
  return new Date(data).toLocaleDateString('pt-BR');
}

export function calcularStatus(pedido) {
  if (!pedido.data_retirada || !pedido.dias_uso) return 'indefinido';
  const retirada = new Date(pedido.data_retirada);
  const dias = Number(pedido.dias_uso);
  const devolucao = new Date(retirada);
  devolucao.setDate(retirada.getDate() + dias);
  const hoje = new Date();
  if (hoje <= devolucao) return 'ok';
  return 'atrasado';
}

export function diasRestantes(pedido) {
  if (!pedido.data_retirada || !pedido.dias_uso) return null;
  const retirada = new Date(pedido.data_retirada);
  const dias = Number(pedido.dias_uso);
  const devolucao = new Date(retirada);
  devolucao.setDate(retirada.getDate() + dias);
  const hoje = new Date();
  const diff = Math.ceil((devolucao - hoje) / (1000 * 60 * 60 * 24));
  return diff;
} 