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

  const handleIdChange = (itemIdx, idIdx, value) => {
    const novosItens = [...itens];
    let val = value.replace(/[^0-9]/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    if (!novosItens[itemIdx].idsValidados) novosItens[itemIdx].idsValidados = [];
    novosItens[itemIdx].idsValidados[idIdx] = val;
    // Validação
    const modeloNorm = novosItens[itemIdx].modelo;
    const pecasDoModelo = pecasPorModelo[modeloNorm] || [];
    const idsDoModelo = new Set(pecasDoModelo.map(p => p.id.toString()));
    if (!novosItens[itemIdx].erroIds) novosItens[itemIdx].erroIds = [];
    novosItens[itemIdx].erroIds[idIdx] = '';
    if (val && !idsDoModelo.has(val)) {
      novosItens[itemIdx].erroIds[idIdx] = 'ID não pertence ao modelo';
    }
    // Checagem de duplicidade
    const ids = novosItens[itemIdx].idsValidados.filter(Boolean);
    const duplicados = ids.filter((id, i, arr) => arr.indexOf(id) !== i);
    ids.forEach((id, i) => {
      if (duplicados.includes(id)) {
        novosItens[itemIdx].erroIds[i] = 'ID duplicado';
      }
    });
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
        if (
          !item.modelo ||
          !item.quantidade ||
          item.idsValidados.length !== Number(item.quantidade) ||
          (Array.isArray(item.erroIds) && item.erroIds.some(Boolean))
        ) {
          throw new Error('Preencha corretamente todos os campos e IDs dos itens do pedido.');
        }
      }
      // NOVA LÓGICA: Para cada ID, só o pedido mais recente (data_retirada, depois data_pedido) fica com o ID ativo
      const pedidosRef = collection(db, 'pedidos');
      const pedidosSnap = await getDocs(pedidosRef);
      const pedidos = pedidosSnap.docs.map(docu => ({ id: docu.id, ...docu.data() }));
      const batch = writeBatch(db);
      const todosIds = itens.flatMap(item => item.idsValidados);
      const dataRetiradaAtual = new Date(dataRetirada);
      const dataPedidoAtual = new Date();
      let idsQueDevemNascerDevolvidos = new Set();
      for (const id of todosIds) {
        // Buscar todos os pedidos que possuem esse ID em ids_pecas
        const pedidosComId = pedidos.filter(p =>
          p.itens && p.itens.some(item => (item.ids_pecas || []).map(i => i.toString().trim()).includes(id.toString().trim()))
        );
        // Adicionar o novo pedido na lista de comparação
        const todosPedidos = [
          ...pedidosComId,
          {
            id: 'novo',
            data_retirada: dataRetirada,
            data_pedido: dataPedidoAtual.toISOString(),
            itens: itens.map(item => ({
              ...item,
              ids_pecas: item.idsValidados.map(i => i.toString().trim()),
              ids_devolvidos: [],
            })),
            isNovo: true
          }
        ];
        // Encontrar o pedido mais recente (maior data_retirada, depois maior data_pedido)
        const pedidosOrdenados = todosPedidos.slice().sort((a, b) => {
          const drA = new Date(a.data_retirada);
          const drB = new Date(b.data_retirada);
          if (drA > drB) return -1;
          if (drA < drB) return 1;
          // Se datas iguais, comparar data_pedido
          const dpA = new Date(a.data_pedido);
          const dpB = new Date(b.data_pedido);
          if (dpA > dpB) return -1;
          if (dpA < dpB) return 1;
          return 0;
        });
        // O pedido mais recente
        const pedidoMaisRecente = pedidosOrdenados[0];
        // Todos os outros pedidos (menos o mais recente) devem ter o ID devolvido
        for (let i = 0; i < pedidosOrdenados.length; i++) {
          const pedido = pedidosOrdenados[i];
          if (i === 0) continue; // Só o mais recente fica com o ID ativo
          if (pedido.isNovo) {
            // O novo pedido deve nascer com o ID devolvido
            idsQueDevemNascerDevolvidos.add(id.toString().trim());
          } else {
            // Atualizar o pedido antigo: mover o ID para devolvidos
            const novosItens = pedido.itens.map(item => {
              const idsPecas = (item.ids_pecas || []).map(i => i.toString().trim());
              const devolvidos = (item.ids_devolvidos || []).map(i => i.toString().trim());
              if (idsPecas.includes(id.toString().trim())) {
                return {
                  ...item,
                  ids_pecas: idsPecas.filter(i => i !== id.toString().trim()),
                  ids_devolvidos: [...devolvidos, id.toString().trim()],
                };
              }
              return item;
            });
            batch.update(doc(db, 'pedidos', pedido.id), { itens: novosItens });
          }
        }
      }
      // Executar devoluções automáticas
      if (!batch._mutations || batch._mutations.length === 0) {
      } else {
        await batch.commit();
      }
      // Agora, salva o novo pedido
      const pedido = {
        data_pedido: dataPedidoAtual.toISOString(),
        data_retirada: dataRetirada,
        encarregado,
        contrato,
        obra,
        dias_uso: diasUso,
        itens: itens.map(item => {
          // Se algum ID deve nascer devolvido, já coloca em ids_devolvidos
          const idsValidados = item.idsValidados.map(i => i.toString().trim());
          const idsDevolvidos = idsValidados.filter(i => idsQueDevemNascerDevolvidos.has(i));
          const idsAtivos = idsValidados.filter(i => !idsQueDevemNascerDevolvidos.has(i));
          return {
            modelo: modelos.find(m => m.value === item.modelo)?.label || item.modelo,
            quantidade: item.quantidade,
            ids_pecas: idsAtivos,
            ids_devolvidos: idsDevolvidos,
          };
        })
      };
      await addDoc(collection(db, 'pedidos'), pedido);
      // Atualiza status das peças para "emprestado"
      const batchStatus = writeBatch(db);
      itens.forEach(item => {
        item.idsValidados.forEach(id => {
          const pecaRef = doc(db, 'pecas', id);
          batchStatus.update(pecaRef, { status: 'emprestado' });
        });
      });
      await batchStatus.commit();
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
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField label="Nome do Encarregado" value={encarregado} onChange={e => setEncarregado(e.target.value)} fullWidth required />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField label="Contrato" value={contrato} onChange={e => setContrato(e.target.value)} fullWidth required />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField label="Obra" value={obra} onChange={e => setObra(e.target.value)} fullWidth required />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField label="Dias de Uso" type="number" value={diasUso} onChange={e => setDiasUso(e.target.value)} fullWidth required />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
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
                <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 3' } }}>
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
                <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 2' } }}>
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
                <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 5' } }}>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {Array.from({ length: item.quantidade }).map((_, idIdx) => (
                      <TextField
                        key={idIdx}
                        label={`ID #${idIdx + 1}`}
                        value={item.idsValidados[idIdx] || ''}
                        onChange={e => handleIdChange(idx, idIdx, e.target.value)}
                        inputProps={{ maxLength: 4, inputMode: 'numeric', pattern: '[0-9]*' }}
                        error={!!item.erroIds && !!item.erroIds[idIdx]}
                        helperText={item.erroIds && item.erroIds[idIdx]}
                        onInput={e => {
                          if (e.target.value.length === 4) {
                            const next = document.getElementById(`id-input-${idx}-${idIdx + 1}`);
                            if (next) next.focus();
                          }
                        }}
                        id={`id-input-${idx}-${idIdx}`}
                        sx={{ width: 90 }}
                        disabled={!item.modelo || !item.quantidade}
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 2' }, display: 'flex', alignItems: 'center', gap: 1 }}>
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