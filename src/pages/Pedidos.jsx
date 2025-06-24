import { useEffect, useState } from 'react';
import { Typography, Grid, Card, CardContent, CardActionArea, Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip, useTheme, TextField, IconButton } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { db } from '../config/firebase'; // Importação do Firebase
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

function calcularStatus(pedido) {
  if (!pedido.data_retirada || !pedido.dias_uso) return 'indefinido';
  const retirada = new Date(pedido.data_retirada);
  const dias = Number(pedido.dias_uso);
  const devolucao = new Date(retirada);
  devolucao.setDate(retirada.getDate() + dias);
  const hoje = new Date();
  if (hoje <= devolucao) return 'ok';
  return 'atrasado';
}

function diasRestantes(pedido) {
  if (!pedido.data_retirada || !pedido.dias_uso) return null;
  const retirada = new Date(pedido.data_retirada);
  const dias = Number(pedido.dias_uso);
  const devolucao = new Date(retirada);
  devolucao.setDate(retirada.getDate() + dias);
  const hoje = new Date();
  const diff = Math.ceil((devolucao - hoje) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatarData(data) {
  if (!data) return '';
  return new Date(data).toLocaleDateString('pt-BR');
}

function Pedidos() {
  const theme = useTheme();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [adicionandoDias, setAdicionandoDias] = useState(false);
  const [diasExtras, setDiasExtras] = useState('');
  const [salvandoDias, setSalvandoDias] = useState(false);

  useEffect(() => {
    setLoading(true);
    const pedidosRef = collection(db, 'pedidos');
    const unsub = onSnapshot(pedidosRef, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtrar apenas pedidos com algum ID em ids_pecas
      const ativos = lista.filter(p => p.itens && p.itens.some(item => item.ids_pecas && item.ids_pecas.length > 0));
      setPedidos(ativos);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Atualiza pedido localmente após alteração
  const atualizarPedidoLocal = (id, novosDados) => {
    setPedidos(pedidos => pedidos.map(p => p.id === id ? { ...p, ...novosDados } : p));
    setPedidoSelecionado(p => p ? { ...p, ...novosDados } : p);
  };

  const handleAdicionarDias = async () => {
    if (!diasExtras || isNaN(Number(diasExtras)) || Number(diasExtras) <= 0) return;
    setSalvandoDias(true);
    try {
      const novoTotal = Number(pedidoSelecionado.dias_uso) + Number(diasExtras);
      const pedidoRef = doc(db, 'pedidos', pedidoSelecionado.id);
      await updateDoc(pedidoRef, { dias_uso: novoTotal });
      atualizarPedidoLocal(pedidoSelecionado.id, { dias_uso: novoTotal });
      setDiasExtras('');
      setAdicionandoDias(false);
    } catch (err) {
      alert('Erro ao adicionar dias: ' + err.message);
    }
    setSalvandoDias(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pedidos
      </Typography>
      {loading ? (
        <Typography>Carregando...</Typography>
      ) : (
        <Grid container spacing={3} justifyContent="center">
          {pedidos.map((pedido) => {
            const status = calcularStatus(pedido);
            const dias = diasRestantes(pedido);
            return (
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' }, display: 'flex', justifyContent: 'center' }} key={pedido.id}>
                <Card
                  className="glass-neon"
                  sx={{
                    borderLeft: 6,
                    borderColor: status === 'ok' ? theme.palette.success.main : theme.palette.error.main,
                    background: 'rgba(40,43,69,0.6)',
                    color: '#fff',
                    boxShadow: 8,
                    borderRadius: 4,
                    p: 2,
                    minHeight: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'box-shadow 0.3s, border 0.3s, background 0.3s',
                    '&:hover': {
                      boxShadow: 16,
                      background: 'rgba(40,43,69,0.8)',
                    },
                  }}
                >
                  <CardActionArea onClick={() => setPedidoSelecionado(pedido)} sx={{ borderRadius: 4 }}>
                    <CardContent sx={{ width: '100%', textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        {pedido.obra || 'Obra não informada'}
                      </Typography>
                      <Typography variant="body2">
                        Encarregado: <b>{pedido.encarregado}</b>
                      </Typography>
                      <Typography variant="body2">
                        Contrato: <b>{pedido.contrato}</b>
                      </Typography>
                      <Typography variant="body2">
                        Data Retirada: <b>{formatarData(pedido.data_retirada)}</b>
                      </Typography>
                      <Typography variant="body2">
                        {dias !== null && dias >= 0
                          ? `Faltam: `
                          : `Atrasado: `}
                        <b>
                          {dias !== null
                            ? dias >= 0
                              ? `${dias} dia${dias === 1 ? '' : 's'}`
                              : `${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`
                            : '--'}
                        </b>
                      </Typography>
                      <Box mt={1}>
                        <Chip
                          label={status === 'ok' ? 'Dentro do prazo' : 'Atrasado'}
                          color={status === 'ok' ? 'success' : 'error'}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Modal de detalhes do pedido */}
      <Dialog open={!!pedidoSelecionado} onClose={() => { setPedidoSelecionado(null); setAdicionandoDias(false); setDiasExtras(''); }} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Pedido</DialogTitle>
        <DialogContent>
          {pedidoSelecionado && (
            <Box>
              <Typography variant="subtitle1"><b>Obra:</b> {pedidoSelecionado.obra}</Typography>
              <Typography variant="subtitle1"><b>Encarregado:</b> {pedidoSelecionado.encarregado}</Typography>
              <Typography variant="subtitle1"><b>Contrato:</b> {pedidoSelecionado.contrato}</Typography>
              <Typography variant="subtitle1"><b>Data de Retirada:</b> {formatarData(pedidoSelecionado.data_retirada)}</Typography>
              <Typography variant="subtitle1"><b>Dias de Uso:</b> {pedidoSelecionado.dias_uso}</Typography>
              <Typography variant="subtitle1"><b>Data do Pedido:</b> {formatarData(pedidoSelecionado.data_pedido)}</Typography>
              <Box mt={2}>
                <Typography variant="h6">Itens do Pedido</Typography>
                {pedidoSelecionado.itens && pedidoSelecionado.itens.map((item, idx) => (
                  <Box key={idx} mb={2} p={2} border={1} borderColor={theme.palette.divider} borderRadius={2} bgcolor={theme.palette.background.default}>
                    <Typography><b>Modelo:</b> {item.modelo}</Typography>
                    <Typography><b>Quantidade:</b> {item.quantidade}</Typography>
                    <Typography><b>IDs emprestados:</b> {item.ids_pecas && item.ids_pecas.length > 0 ? item.ids_pecas.join(', ') : 'Nenhum'}</Typography>
                    <Typography color="success.main"><b>IDs devolvidos:</b> {item.ids_devolvidos && item.ids_devolvidos.length > 0 ? item.ids_devolvidos.join(', ') : 'Nenhum'}</Typography>
                  </Box>
                ))}
              </Box>
              <Box mt={2} display="flex" alignItems="center" gap={2}>
                {!adicionandoDias ? (
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAdicionandoDias(true)}>
                    Adicionar mais dias
                  </Button>
                ) : (
                  <>
                    <TextField
                      label="Dias extras"
                      type="number"
                      value={diasExtras}
                      onChange={e => setDiasExtras(e.target.value.replace(/[^0-9]/g, ''))}
                      size="small"
                      sx={{ width: 120 }}
                      disabled={salvandoDias}
                    />
                    <Button variant="contained" color="primary" onClick={handleAdicionarDias} disabled={salvandoDias || !diasExtras}>
                      {salvandoDias ? 'Salvando...' : 'Confirmar'}
                    </Button>
                    <Button variant="text" color="inherit" onClick={() => { setAdicionandoDias(false); setDiasExtras(''); }} disabled={salvandoDias}>
                      Cancelar
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPedidoSelecionado(null); setAdicionandoDias(false); setDiasExtras(''); }}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Pedidos; 