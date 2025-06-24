import { useEffect, useState } from 'react';
import { Typography, Box, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import PedidoDetalhesModal from '../components/PedidoDetalhesModal';

function formatarData(data) {
  if (!data) return '';
  return new Date(data).toLocaleDateString('pt-BR');
}

export default function Historico() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

  useEffect(() => {
    setLoading(true);
    const pedidosRef = collection(db, 'pedidos');
    const unsub = onSnapshot(pedidosRef, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtro: pedidos que têm pelo menos um ID em ids_devolvidos
      const concluidos = lista.filter(pedido =>
        pedido.itens && pedido.itens.some(item => item.ids_devolvidos && item.ids_devolvidos.length > 0)
      );
      setPedidos(concluidos);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Histórico de Pedidos Concluídos</Typography>
      {loading ? (
        <CircularProgress />
      ) : pedidos.length === 0 ? (
        <Typography>Nenhum pedido concluído encontrado.</Typography>
      ) : (
        <Grid container spacing={2}>
          {pedidos.map(pedido => (
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }} key={pedido.id}>
              <Card sx={{ borderRadius: 4, p: 2, minHeight: 140, background: 'rgba(40,43,69,0.6)', color: '#fff', cursor: 'pointer' }}
                onClick={() => setPedidoSelecionado(pedido)}>
                <CardContent>
                  <Typography variant="h6">{pedido.obra}</Typography>
                  <Typography variant="body2">Encarregado: {pedido.encarregado}</Typography>
                  <Typography variant="body2">Contrato: {pedido.contrato}</Typography>
                  <Typography variant="body2">Data Retirada: {formatarData(pedido.data_retirada)}</Typography>
                  <Typography variant="body2">Data do Pedido: {formatarData(pedido.data_pedido)}</Typography>
                  <Typography variant="body2">Dias de Uso: {pedido.dias_uso}</Typography>
                  <Typography variant="body2">Itens: {pedido.itens.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <PedidoDetalhesModal
        pedido={pedidoSelecionado && {
          ...pedidoSelecionado,
          itens: pedidoSelecionado?.itens?.map(item => ({
            ...item,
            ids_pecas: [], // Esconde os emprestados
            // Mostra apenas os devolvidos
          }))
        }}
        open={!!pedidoSelecionado}
        onClose={() => setPedidoSelecionado(null)}
      />
    </Box>
  );
} 