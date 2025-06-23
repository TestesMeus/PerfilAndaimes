import { useEffect, useState } from 'react';
import { Typography, TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Box } from '@mui/material';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

function Estoque() {
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [searchModelo, setSearchModelo] = useState('');

  useEffect(() => {
    setLoading(true);
    const pecasRef = collection(db, 'pecas');
    const unsub = onSnapshot(pecasRef, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPecas(lista);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filtros
  const pecasFiltradas = pecas.filter(peca => {
    const idMatch = searchId ? peca.id.toString().includes(searchId) : true;
    const modeloMatch = searchModelo ? peca.modelo.toLowerCase().includes(searchModelo.toLowerCase()) : true;
    return idMatch && modeloMatch;
  });

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Controle de Estoque
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Pesquisar por ID"
          variant="outlined"
          size="small"
          value={searchId}
          onChange={e => setSearchId(e.target.value.replace(/[^0-9]/g, ''))}
        />
        <TextField
          label="Pesquisar por Modelo"
          variant="outlined"
          size="small"
          value={searchModelo}
          onChange={e => setSearchModelo(e.target.value)}
        />
      </Box>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} className="glass" sx={{ maxHeight: 600, borderRadius: 4, background: 'rgba(40,43,69,0.7)', boxShadow: 8, p: 2 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pecasFiltradas.map(peca => (
                <TableRow key={peca.id}>
                  <TableCell>{peca.id}</TableCell>
                  <TableCell>{peca.modelo}</TableCell>
                  <TableCell>{peca.status}</TableCell>
                </TableRow>
              ))}
              {pecasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Nenhuma peça encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

export default Estoque; 