import { useState, useEffect } from 'react';
import { Typography, TextField, Button, Box, MenuItem, IconButton, Paper, Grid, Snackbar, Alert } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, doc, writeBatch, updateDoc } from 'firebase/firestore';

function normalizarModelo(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatDateInput(date) {
  // yyyy-mm-dd
  return date.toISOString().slice(0, 10);
}

function NovoPedido() {
  const [encarregado, setEncarregado] = useState('');
  const [contrato, setContrato] = useState('');
  const [obra, setObra] = useState('');
  const [diasUso, setDiasUso] = useState('');
  const [dataRetirada, setDataRetirada] = useState(formatDateInput(new Date()));
  const [itens, setItens] = useState([
    { modelo: '', quantidade: 1, idsDigitados: '', idsValidados: [], erroIds: '' }
  ]);
  const [modelos, setModelos] = useState([]); // [{label, value}]
  const [pecasPorModelo, setPecasPorModelo] = useState({});
  const [pecasDisponiveis, setPecasDisponiveis] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchModelos = async () => {
      const pecasRef = collection(db, 'pecas');
      const snapshot = await getDocs(pecasRef);
      const modelosMap = new Map();
      const pecasMap = {};
      const disponiveisMap = {};
      snapshot.docs.forEach(docu => {
        const data = docu.data();
        if (!data.modelo) return; // Ignora peças sem modelo
        const modeloNorm = normalizarModelo(data.modelo);
        if (!modelosMap.has(modeloNorm)) modelosMap.set(modeloNorm, data.modelo);
        if (!pecasMap[modeloNorm]) pecasMap[modeloNorm] = [];
        pecasMap[modeloNorm].push({ id: docu.id.toString(), ...data });
        if (data.status === 'disponivel') {
          if (!disponiveisMap[modeloNorm]) disponiveisMap[modeloNorm] = {};
          disponiveisMap[modeloNorm][docu.id.toString()] = true;
        }
      });
      setModelos(Array.from(modelosMap.entries()).map(([value, label]) => ({ label, value })));
      setPecasPorModelo(pecasMap);
      setPecasDisponiveis(disponiveisMap);
    };
    fetchModelos();
  }, []);

  const handleModeloChange = (idx, modeloNorm) => {
    const novosItens = [...itens];
    novosItens[idx].modelo = modeloNorm || '';
    novosItens[idx].idsDigitados = '';
    novosItens[idx].idsValidados = [];
    novosItens[idx].erroIds = '';
    setItens(novosItens);
  };

  const handleQuantidadeChange = (idx, quantidade) => {
    const novosItens = [...itens];
    novosItens[idx].quantidade = quantidade;
    setItens(novosItens);
  };

  const handleIdsDigitadosChange = (idx, valor) => {
    const novosItens = [...itens];
    novosItens[idx].idsDigitados = valor;
    const modeloNorm = novosItens[idx].modelo;
    const quantidade = novosItens[idx].quantidade;
    const ids = valor.split(/[,\s]+/).filter(Boolean).map(id => id.toString());
    let erro = '';
    let idsValidos = [];
    if (ids.length > 0) {
      if (ids.length !== Number(quantidade)) {
        erro = `Quantidade de IDs (${ids.length}) diferente da quantidade informada (${quantidade})`;
      } else {
        const pecasDoModelo = pecasPorModelo[modeloNorm] || [];
        const idsDoModelo = new Set(pecasDoModelo.map(p => p.id.toString()));
        const disponiveis = pecasDisponiveis[modeloNorm] || {};
        for (const id of ids) {
          if (!idsDoModelo.has(id)) {
            erro = `ID ${id} não pertence ao modelo selecionado.`;
            break;
          }
          if (!disponiveis[id]) {
            erro = `ID ${id} não está disponível.`;
            break;
          }
        }
        if (!erro) idsValidos = ids;
      }
    }
    novosItens[idx].idsValidados = idsValidos;
    novosItens[idx].erroIds = erro;
    setItens(novosItens);
  };

  const handleAddItem = () => {
    setItens([...itens, { modelo: '', quantidade: 1, idsDigitados: '', idsValidados: [], erroIds: '' }]);
  };

  const handleAddItemAt = (idx) => {
    const novosItens = [...itens];
    novosItens.splice(idx + 1, 0, { modelo: '', quantidade: 1, idsDigitados: '', idsValidados: [], erroIds: '' });
    setItens(novosItens);
  };

  const handleRemoveItem = (idx) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      for (const item of itens) {
        if (!item.modelo || !item.quantidade || item.idsValidados.length !== Number(item.quantidade) || item.erroIds) {
          throw new Error('Preencha corretamente todos os campos e IDs dos itens do pedido.');
        }
      }
      // NOVA LÓGICA: Remover IDs de pedidos anteriores
      const pedidosRef = collection(db, 'pedidos');
      const pedidosSnap = await getDocs(pedidosRef);
      const pedidos = pedidosSnap.docs.map(docu => ({ id: docu.id, ...docu.data() }));
      const batch = writeBatch(db);
      const todosIds = itens.flatMap(item => item.idsValidados);
      for (const id of todosIds) {
        for (const pedido of pedidos) {
          if (!pedido.itens) continue;
          let alterou = false;
          const novosItens = pedido.itens.map(item => {
            if (item.ids_pecas && item.ids_pecas.includes(id)) {
              alterou = true;
              return { ...item, ids_pecas: item.ids_pecas.filter(i => i !== id) };
            }
            return item;
          });
          if (alterou) {
            batch.update(doc(db, 'pedidos', pedido.id), { itens: novosItens });
          }
        }
      }
      // Salva o novo pedido
      const pedido = {
        data_pedido: new Date().toISOString(),
        data_retirada: dataRetirada,
        encarregado,
        contrato,
        obra,
        dias_uso: diasUso,
        itens: itens.map(item => ({
          modelo: modelos.find(m => m.value === item.modelo)?.label || item.modelo,
          quantidade: item.quantidade,
          ids_pecas: item.idsValidados
        }))
      };
      await addDoc(collection(db, 'pedidos'), pedido);
      // Atualiza status das peças para "emprestado"
      itens.forEach(item => {
        item.idsValidados.forEach(id => {
          const pecaRef = doc(db, 'pecas', id);
          batch.update(pecaRef, { status: 'emprestado' });
        });
      });
      await batch.commit();
      setSnackbar({ open: true, message: 'Pedido salvo com sucesso!', severity: 'success' });
      setEncarregado('');
      setContrato('');
      setObra('');
      setDiasUso('');
      setDataRetirada(formatDateInput(new Date()));
      setItens([{ modelo: '', quantidade: 1, idsDigitados: '', idsValidados: [], erroIds: '' }]);
    } catch (err) {
      setSnackbar({ open: true, message: 'Erro ao salvar pedido: ' + err.message, severity: 'error' });
    }
    setSalvando(false);
  };

  return (
    <Box component={Paper} className="glass" sx={{ p: { xs: 2, sm: 4 }, width: '100%', maxWidth: 700, mx: 'auto', my: 4, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 4, background: 'rgba(40,43,69,0.7)', boxShadow: 12 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 700, letterSpacing: 1 }}>
        Novo Pedido
      </Typography>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Nome do Encarregado" value={encarregado} onChange={e => setEncarregado(e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Contrato" value={contrato} onChange={e => setContrato(e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Obra" value={obra} onChange={e => setObra(e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Dias de Uso" type="number" value={diasUso} onChange={e => setDiasUso(e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Data de Retirada"
              type="date"
              value={dataRetirada}
              onChange={e => setDataRetirada(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
        </Grid>
        <Box mt={4} width="100%">
          <Typography variant="h6">Itens do Pedido</Typography>
          {itens.map((item, idx) => (
            <Paper key={idx} sx={{ p: 2, my: 2, width: '100%' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="Modelo"
                    value={item.modelo}
                    onChange={e => handleModeloChange(idx, e.target.value)}
                    fullWidth
                    required
                  >
                    <MenuItem value="">Selecione</MenuItem>
                    {modelos.map((modelo, i) => (
                      <MenuItem key={i} value={modelo.value}>{modelo.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Quantidade"
                    type="number"
                    value={item.quantidade}
                    onChange={e => handleQuantidadeChange(idx, Number(e.target.value))}
                    fullWidth
                    required
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    label="IDs das Peças (separados por vírgula ou espaço)"
                    value={item.idsDigitados}
                    onChange={e => handleIdsDigitadosChange(idx, e.target.value)}
                    fullWidth
                    required
                    error={!!item.erroIds}
                    helperText={item.erroIds || (item.idsValidados.length > 0 ? `IDs válidos: ${item.idsValidados.join(', ')}` : '')}
                    disabled={!item.modelo || !item.quantidade}
                  />
                </Grid>
                <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton color="error" onClick={() => handleRemoveItem(idx)} disabled={itens.length === 1}>
                    <DeleteIcon />
                  </IconButton>
                  <IconButton color="primary" onClick={() => handleAddItemAt(idx)}>
                    <AddIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>
          ))}
          <Button startIcon={<AddIcon />} onClick={handleAddItem} variant="contained" sx={{ mt: 2 }}>
            Adicionar Item
          </Button>
        </Box>
        <Box mt={4} width="100%" display="flex" justifyContent="center">
          <Button type="submit" variant="contained" color="primary" disabled={salvando} size="large">
            {salvando ? 'Salvando...' : 'Salvar Pedido'}
          </Button>
        </Box>
      </form>
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default NovoPedido; 