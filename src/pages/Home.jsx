import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, CircularProgress, Box } from '@mui/material';
import {
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  AssignmentReturn as AssignmentReturnIcon,
} from '@mui/icons-material';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

function calcularAtrasadas(pedidos) {
  const hoje = new Date();
  let count = 0;
  pedidos.forEach(pedido => {
    if (!pedido.data_retirada || !pedido.dias_uso) return;
    const retirada = new Date(pedido.data_retirada);
    const dias = Number(pedido.dias_uso);
    const devolucao = new Date(retirada);
    devolucao.setDate(retirada.getDate() + dias);
    if (hoje > devolucao) {
      // Conta quantas peças ainda não devolvidas estão atrasadas
      pedido.itens?.forEach(item => {
        count += (item.ids_pecas?.length || 0);
      });
    }
  });
  return count;
}

function Home() {
  const [loading, setLoading] = useState(true);
  const [totalEstoque, setTotalEstoque] = useState(0);
  const [pedidosAtivos, setPedidosAtivos] = useState(0);
  const [devolucoesPendentes, setDevolucoesPendentes] = useState(0);
  const [modelosInfo, setModelosInfo] = useState([]); // [{modelo, disponiveis, total}]
  const [totalEmprestadas, setTotalEmprestadas] = useState(0);
  const [totalModelos, setTotalModelos] = useState(0);

  useEffect(() => {
    setLoading(true);
    const pecasRef = collection(db, 'pecas');
    const unsubPecas = onSnapshot(pecasRef, (pecasSnap) => {
      const pecas = pecasSnap.docs.map(doc => doc.data());
      const modelosMap = new Map();
      let disponiveis = 0;
      let emprestadas = 0;
      pecas.forEach(peca => {
        const modelo = peca.modelo || 'Sem modelo';
        if (!modelosMap.has(modelo)) modelosMap.set(modelo, { modelo, disponiveis: 0, total: 0 });
        modelosMap.get(modelo).total++;
        if (peca.status === 'disponivel') {
          modelosMap.get(modelo).disponiveis++;
          disponiveis++;
        } else {
          emprestadas++;
        }
      });
      setModelosInfo(Array.from(modelosMap.values()));
      setTotalEstoque(disponiveis);
      setTotalEmprestadas(emprestadas);
      setTotalModelos(modelosMap.size);
    });
    const pedidosRef = collection(db, 'pedidos');
    const unsubPedidos = onSnapshot(pedidosRef, (pedidosSnap) => {
      const pedidos = pedidosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const ativos = pedidos.filter(p => p.itens && p.itens.some(item => item.ids_pecas && item.ids_pecas.length > 0)).length;
      setPedidosAtivos(ativos);
      setDevolucoesPendentes(calcularAtrasadas(pedidos));
      setLoading(false);
    });
    return () => {
      unsubPecas();
      unsubPedidos();
    };
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3} columns={{ xs: 12, sm: 12, md: 12 }}>
        {loading ? (
          <Grid sx={{ gridColumn: 'span 12' }}>
            <CircularProgress />
          </Grid>
        ) : (
          <>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <Card className="glass-neon" sx={{ borderRadius: 4, p: 2, minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 8, color: '#fff' }}>
                <CardContent sx={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <InventoryIcon color="primary" style={{ marginRight: 8 }} />
                    <Typography variant="h6">Total em Estoque</Typography>
                  </div>
                  <Typography variant="h4">{totalEstoque}</Typography>
                  <Typography color="textSecondary">Andaimes disponíveis</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <Card className="glass-neon" sx={{ borderRadius: 4, p: 2, minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 8, color: '#fff' }}>
                <CardContent sx={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <ShoppingCartIcon color="primary" style={{ marginRight: 8 }} />
                    <Typography variant="h6">Pedidos Ativos</Typography>
                  </div>
                  <Typography variant="h4">{pedidosAtivos}</Typography>
                  <Typography color="textSecondary">Pedidos em andamento</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 12', md: 'span 4' } }}>
              <Card className="glass-neon" sx={{ borderRadius: 4, p: 2, minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 8, color: '#fff' }}>
                <CardContent sx={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <AssignmentReturnIcon color="primary" style={{ marginRight: 8 }} />
                    <Typography variant="h6">Devoluções Pendentes</Typography>
                  </div>
                  <Typography variant="h4">{devolucoesPendentes}</Typography>
                  <Typography color="textSecondary">Aguardando devolução</Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* Cards extras */}
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <Card className="glass-neon" sx={{ borderRadius: 4, p: 2, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 6, color: '#fff' }}>
                <CardContent sx={{ width: '100%', textAlign: 'center' }}>
                  <Typography variant="h6">Total de Peças Emprestadas</Typography>
                  <Typography variant="h4">{totalEmprestadas}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <Card className="glass-neon" sx={{ borderRadius: 4, p: 2, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 6, color: '#fff' }}>
                <CardContent sx={{ width: '100%', textAlign: 'center' }}>
                  <Typography variant="h6">Total de Modelos</Typography>
                  <Typography variant="h4">{totalModelos}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>
      {/* Grid de modelos */}
      {!loading && modelosInfo.length > 0 && (
        <Box mt={4}>
          <Typography variant="h6" sx={{ mb: 2, color: '#fff', fontWeight: 600, letterSpacing: 1 }}>Disponibilidade por Modelo</Typography>
          <Grid container spacing={2} columns={{ xs: 12, sm: 12, md: 12 }}>
            {modelosInfo.map((m) => (
              <Grid key={m.modelo} sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' } }}>
                <Card className="glass-neon" sx={{ borderRadius: 4, p: 2, minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 4, color: '#fff' }}>
                  <CardContent sx={{ width: '100%', textAlign: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={600}>{m.modelo}</Typography>
                    <Typography variant="body2" color="#dfff">Disponíveis: <b>{m.disponiveis}</b> / {m.total}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}

export default Home; 