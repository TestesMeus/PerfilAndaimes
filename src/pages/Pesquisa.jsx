import { useEffect, useState } from 'react';
import { Typography, Box, Grid, Card, CardContent, CardActionArea, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

function formatarData(data) {
  if (!data) return '';
  return new Date(data).toLocaleDateString('pt-BR');
}

function Pesquisa() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    idPeca: '',
    obra: '',
    data: '',
    encarregado: '',
    contrato: '',
  });
  const [resultados, setResultados] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

  useEffect(() => {
    setLoading(true);
    const pedidosRef = collection(db, 'pedidos');
    const unsub = onSnapshot(pedidosRef, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidos(lista);
      setResultados(lista);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleFiltroChange = (campo, valor) => {
    setFiltros(f => ({ ...f, [campo]: valor }));
  };

  const handleBuscar = () => {
    let filtrados = pedidos;
    if (filtros.idPeca) {
      filtrados = filtrados.filter(p => p.itens && p.itens.some(item => item.ids_pecas && item.ids_pecas.includes(filtros.idPeca)));
    }
    if (filtros.obra) {
      filtrados = filtrados.filter(p => p.obra && p.obra.toLowerCase().includes(filtros.obra.toLowerCase()));
    }
    if (filtros.data) {
      filtrados = filtrados.filter(p => p.data_retirada && p.data_retirada.startsWith(filtros.data));
    }
    if (filtros.encarregado) {
      filtrados = filtrados.filter(p => p.encarregado && p.encarregado.toLowerCase().includes(filtros.encarregado.toLowerCase()));
    }
    if (filtros.contrato) {
      filtrados = filtrados.filter(p => p.contrato && p.contrato.toLowerCase().includes(filtros.contrato.toLowerCase()));
    }
    setResultados(filtrados);
  };

  const handleLimpar = () => {
    setFiltros({ idPeca: '', obra: '', data: '', encarregado: '', contrato: '' });
    setResultados(pedidos);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pesquisa
      </Typography>
      <Box mb={3} display="flex" flexWrap="wrap" gap={2}>
        <TextField
          label="ID da Peça"
          value={filtros.idPeca}
          onChange={e => handleFiltroChange('idPeca', e.target.value.replace(/[^0-9]/g, ''))}
          size="small"
        />
        <TextField
          label="Nome da Obra"
          value={filtros.obra}
          onChange={e => handleFiltroChange('obra', e.target.value)}
          size="small"
        />
        <TextField
          label="Data de Retirada"
          type="date"
          value={filtros.data}
          onChange={e => handleFiltroChange('data', e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Encarregado"
          value={filtros.encarregado}
          onChange={e => handleFiltroChange('encarregado', e.target.value)}
          size="small"
        />
        <TextField
          label="Contrato"
          value={filtros.contrato}
          onChange={e => handleFiltroChange('contrato', e.target.value)}
          size="small"
        />
        <Button variant="contained" onClick={handleBuscar} sx={{ height: 40 }}>Buscar</Button>
        <Button variant="outlined" onClick={handleLimpar} sx={{ height: 40 }}>Limpar</Button>
      </Box>
      {loading ? (
        <Typography>Carregando...</Typography>
      ) : (
        <Grid container spacing={3} justifyContent="center">
          {resultados.map((pedido) => {
            // Verifica se o pedido está ativo ou entregue
            const ativo = pedido.itens && pedido.itens.some(item => item.ids_pecas && item.ids_pecas.length > 0);
            return (
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' }, display: 'flex', justifyContent: 'center' }} key={pedido.id}>
                <Card className="glass-neon" sx={{ borderRadius: 4, p: 2, minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 8, transition: 'box-shadow 0.3s, background 0.3s', background: 'rgba(40,43,69,0.6)', color: '#fff', '&:hover': { boxShadow: 16, background: 'rgba(40,43,69,0.8)' } }}>
                  <CardActionArea onClick={() => setPedidoSelecionado(pedido)} sx={{ borderRadius: 4 }}>
                    <CardContent sx={{ width: '100%', textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        {pedido.obra || 'Obra não informada'}
                      </Typography>
                      <Chip
                        label={ativo ? 'Ativo' : 'Entregue'}
                        color={ativo ? 'warning' : 'success'}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2">
                        Encarregado: <b>{pedido.encarregado}</b>
                      </Typography>
                      <Typography variant="body2">
                        Contrato: <b>{pedido.contrato}</b>
                      </Typography>
                      <Typography variant="body2">
                        Data Retirada: <b>{formatarData(pedido.data_retirada)}</b>
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
          {resultados.length === 0 && (
            <Grid sx={{ gridColumn: 'span 12' }}>
              <Typography>Nenhum pedido encontrado.</Typography>
            </Grid>
          )}
        </Grid>
      )}
      {/* Modal de detalhes do pedido */}
      <Dialog open={!!pedidoSelecionado} onClose={() => setPedidoSelecionado(null)} maxWidth="md" fullWidth>
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
                  <Box key={idx} mb={2} p={2} border={1} borderColor="#eee" borderRadius={2}>
                    <Typography><b>Modelo:</b> {item.modelo}</Typography>
                    <Typography><b>Quantidade:</b> {item.quantidade}</Typography>
                    <Typography><b>IDs das Peças:</b> {item.ids_pecas && item.ids_pecas.join(', ')}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPedidoSelecionado(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Pesquisa; 