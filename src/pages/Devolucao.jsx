import { useEffect, useState } from 'react';
import { Typography, Box, Grid, Card, CardContent, CardActionArea, Dialog, DialogTitle, DialogContent, DialogActions, Button, Checkbox, FormControlLabel, TextField, Alert } from '@mui/material';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';

function formatarData(data) {
  if (!data) return '';
  return new Date(data).toLocaleDateString('pt-BR');
}

function Devolucao() {
  // Devolução por pedido
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [idsDevolver, setIdsDevolver] = useState([]);
  const [salvandoDevolucao, setSalvandoDevolucao] = useState(false);
  const [msg, setMsg] = useState('');

  // Devolução por unidade
  const [idUnidade, setIdUnidade] = useState('');
  const [infoUnidade, setInfoUnidade] = useState(null);
  const [msgUnidade, setMsgUnidade] = useState('');
  const [salvandoUnidade, setSalvandoUnidade] = useState(false);

  // Buscar pedidos em aberto (com peças emprestadas)
  useEffect(() => {
    setLoadingPedidos(true);
    const pedidosRef = collection(db, 'pedidos');
    const unsub = onSnapshot(pedidosRef, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidos(lista.filter(p => p.itens && p.itens.some(item => item.ids_pecas && item.ids_pecas.length > 0)));
      setLoadingPedidos(false);
    });
    return () => unsub();
  }, [msg, msgUnidade]);

  // Selecionar/desselecionar IDs para devolução
  const handleCheckId = (id) => {
    setIdsDevolver(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };

  // Confirmar devolução por pedido
  const handleDevolverPedido = async () => {
    if (!pedidoSelecionado || idsDevolver.length === 0) return;
    setSalvandoDevolucao(true);
    try {
      // Atualiza status das peças
      for (const id of idsDevolver) {
        await updateDoc(doc(db, 'pecas', id), { status: 'disponivel' });
      }
      // Move os IDs devolvidos de ids_pecas para ids_devolvidos
      const novosItens = pedidoSelecionado.itens.map(item => {
        const devolvidos = item.ids_devolvidos || [];
        const idsParaDevolver = item.ids_pecas ? item.ids_pecas.filter(id => idsDevolver.includes(id)) : [];
        return {
          ...item,
          ids_pecas: item.ids_pecas ? item.ids_pecas.filter(id => !idsDevolver.includes(id)) : [],
          ids_devolvidos: [...devolvidos, ...idsParaDevolver],
        };
      });
      await updateDoc(doc(db, 'pedidos', pedidoSelecionado.id), { itens: novosItens });
      setMsg('Devolução realizada com sucesso!');
      setPedidoSelecionado(null);
      setIdsDevolver([]);
    } catch (err) {
      setMsg('Erro ao devolver: ' + err.message);
    }
    setSalvandoDevolucao(false);
  };

  // Buscar pedido mais recente para o ID informado
  const handleBuscarUnidade = async () => {
    setMsgUnidade('');
    setInfoUnidade(null);
    if (!idUnidade) return;
    // Procura todos os pedidos que contenham esse ID
    const pedidosRef = collection(db, 'pedidos');
    const snapshot = await getDocs(pedidosRef);
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Filtra pedidos que contenham o ID
    const pedidosComId = lista.filter(p => p.itens && p.itens.some(item => item.ids_pecas && item.ids_pecas.includes(idUnidade)));
    if (pedidosComId.length === 0) {
      setMsgUnidade('ID não está emprestado em nenhum pedido.');
      return;
    }
    // Pega o mais recente (maior data de retirada)
    pedidosComId.sort((a, b) => new Date(b.data_retirada) - new Date(a.data_retirada));
    const pedido = pedidosComId[0];
    const item = pedido.itens.find(item => item.ids_pecas && item.ids_pecas.includes(idUnidade));
    setInfoUnidade({ pedido, item });
  };

  // Confirmar devolução por unidade
  const handleDevolverUnidade = async () => {
    if (!infoUnidade) return;
    setSalvandoUnidade(true);
    try {
      // Atualiza status da peça
      await updateDoc(doc(db, 'pecas', idUnidade), { status: 'disponivel' });
      // Move o ID de ids_pecas para ids_devolvidos
      const novosItens = infoUnidade.pedido.itens.map(item =>
        item === infoUnidade.item
          ? {
              ...item,
              ids_pecas: item.ids_pecas.filter(id => id !== idUnidade),
              ids_devolvidos: [...(item.ids_devolvidos || []), idUnidade],
            }
          : item
      );
      await updateDoc(doc(db, 'pedidos', infoUnidade.pedido.id), { itens: novosItens });
      setMsgUnidade('Devolução realizada com sucesso!');
      setInfoUnidade(null);
      setIdUnidade('');
    } catch (err) {
      setMsgUnidade('Erro ao devolver: ' + err.message);
    }
    setSalvandoUnidade(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Devolução de Andaimes
      </Typography>
      {/* DEVOLUÇÃO POR PEDIDO */}
      <Box mb={5}>
        <Typography variant="h6" gutterBottom>Devolução por Pedido</Typography>
        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
        {loadingPedidos ? (
          <Typography>Carregando pedidos...</Typography>
        ) : (
          <Grid container spacing={2} justifyContent="center">
            {pedidos.map(pedido => (
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' }, display: 'flex', justifyContent: 'center' }} key={pedido.id}>
                <Card className="glass-neon" sx={{ borderRadius: 4, p: 2, minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 8, transition: 'box-shadow 0.3s, background 0.3s', background: 'rgba(40,43,69,0.6)', color: '#fff', '&:hover': { boxShadow: 16, background: 'rgba(40,43,69,0.8)' } }}>
                  <CardActionArea onClick={() => { setPedidoSelecionado(pedido); setIdsDevolver([]); }} sx={{ borderRadius: 4 }}>
                    <CardContent sx={{ width: '100%', textAlign: 'center' }}>
                      <Typography variant="h6">{pedido.obra}</Typography>
                      <Typography variant="body2">Encarregado: {pedido.encarregado}</Typography>
                      <Typography variant="body2">Contrato: {pedido.contrato}</Typography>
                      <Typography variant="body2">Data Retirada: {formatarData(pedido.data_retirada)}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
      {/* Modal de devolução por pedido */}
      <Dialog open={!!pedidoSelecionado} onClose={() => setPedidoSelecionado(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Devolução do Pedido</DialogTitle>
        <DialogContent>
          {pedidoSelecionado && pedidoSelecionado.itens.map((item, idx) => (
            <Box key={idx} mb={2} p={2} border={1} borderColor="#eee" borderRadius={2}>
              <Typography><b>Modelo:</b> {item.modelo}</Typography>
              <Typography><b>Quantidade:</b> {item.quantidade}</Typography>
              <Typography><b>IDs:</b></Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                {item.ids_pecas && item.ids_pecas.map(id => (
                  <FormControlLabel
                    key={id}
                    control={<Checkbox checked={idsDevolver.includes(id)} onChange={() => handleCheckId(id)} />}
                    label={id}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPedidoSelecionado(null)} color="inherit">Cancelar</Button>
          <Button onClick={handleDevolverPedido} color="primary" variant="contained" disabled={salvandoDevolucao || idsDevolver.length === 0}>
            {salvandoDevolucao ? 'Salvando...' : 'Confirmar Devolução'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* DEVOLUÇÃO POR UNIDADE */}
      <Box mt={6}>
        <Typography variant="h6" gutterBottom>Devolução por Unidade (ID)</Typography>
        {msgUnidade && <Alert severity={msgUnidade.includes('sucesso') ? 'success' : 'warning'} sx={{ mb: 2 }}>{msgUnidade}</Alert>}
        <Box display="flex" alignItems="center" gap={2}>
          <TextField
            label="ID da Peça"
            value={idUnidade}
            onChange={e => setIdUnidade(e.target.value.replace(/[^0-9]/g, ''))}
            size="small"
            sx={{ width: 180 }}
            disabled={salvandoUnidade}
          />
          <Button variant="outlined" onClick={handleBuscarUnidade} disabled={!idUnidade || salvandoUnidade}>
            Buscar
          </Button>
        </Box>
        {infoUnidade && (
          <Box mt={2} p={2} border={1} borderColor="#eee" borderRadius={2}>
            <Typography><b>Pedido:</b> {infoUnidade.pedido.id}</Typography>
            <Typography><b>Obra:</b> {infoUnidade.pedido.obra}</Typography>
            <Typography><b>Encarregado:</b> {infoUnidade.pedido.encarregado}</Typography>
            <Typography><b>Modelo:</b> {infoUnidade.item.modelo}</Typography>
            <Typography><b>Data Retirada:</b> {formatarData(infoUnidade.pedido.data_retirada)}</Typography>
            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleDevolverUnidade} disabled={salvandoUnidade}>
              {salvandoUnidade ? 'Salvando...' : 'Confirmar Devolução'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default Devolucao; 