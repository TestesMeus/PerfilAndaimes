import { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Home from './pages/Home';
import Estoque from './pages/Estoque';
import Pedidos from './pages/Pedidos';
import NovoPedido from './pages/NovoPedido';
import Devolucao from './pages/Devolucao';
import Pesquisa from './pages/Pesquisa';

function App() {
  const [darkMode, setDarkMode] = useState(true);

  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  }), [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout darkMode={darkMode} setDarkMode={setDarkMode}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/novo-pedido" element={<NovoPedido />} />
            <Route path="/devolucao" element={<Devolucao />} />
            <Route path="/pesquisa" element={<Pesquisa />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
