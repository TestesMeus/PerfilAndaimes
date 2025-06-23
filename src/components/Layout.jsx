import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  AddCircle as AddCircleIcon,
  AssignmentReturn as AssignmentReturnIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import logo from '../assets/logo.png'

const drawerWidth = 240;

const menuItems = [
  { text: 'Home', icon: <HomeIcon />, path: '/' },
  { text: 'Estoque', icon: <InventoryIcon />, path: '/estoque' },
  { text: 'Pedidos', icon: <ShoppingCartIcon />, path: '/pedidos' },
  { text: 'Novo Pedido', icon: <AddCircleIcon />, path: '/novo-pedido' },
  { text: 'Devolução', icon: <AssignmentReturnIcon />, path: '/devolucao' },
  { text: 'Pesquisa', icon: <SearchIcon />, path: '/pesquisa' },
];

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, background: 'rgba(40,43,69,0.7)', borderRadius: 4, boxShadow: 6, backdropFilter: 'blur(12px)' }} className="glass">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <img src={logo} alt="Logo" style={{ width: 90, marginBottom: 8, borderRadius: 16, boxShadow: '0 2px 12px #0003' }} />
        <Typography variant="h5" fontWeight={700} color="#fff" sx={{ letterSpacing: 1, mb: 1 }}>
          Perfil Andaimes
        </Typography>
      </Box>
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => navigate(item.path)}
            selected={location.pathname === item.path}
            sx={{ borderRadius: 2, mb: 1, transition: 'background 0.2s', '&.Mui-selected': { background: 'rgba(255,255,255,0.08)' } }}
          >
            <ListItemIcon>
              <Tooltip title={item.text} arrow>
                {item.icon}
              </Tooltip>
            </ListItemIcon>
            <ListItemText primary={item.text} sx={{ color: '#fff' }} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: 'auto', mb: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" fontSize={11}>
          produced by Bruno Barral
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center' }}>
      <CssBaseline />
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 }, p: 2 }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              background: 'rgba(40,43,69,0.7)',
              borderRadius: 4,
              boxShadow: 6,
              backdropFilter: 'blur(12px)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              background: 'rgba(40,43,69,0.7)',
              borderRadius: 4,
              boxShadow: 6,
              backdropFilter: 'blur(12px)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export default Layout; 