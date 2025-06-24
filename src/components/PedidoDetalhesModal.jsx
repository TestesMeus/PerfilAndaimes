import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography } from '@mui/material';
import { formatarData } from '../utils/dateUtils';
import { useState } from 'react';

function PedidoDetalhesModal({ pedido, open, onClose, children, onConfirm, confirmText }) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    setConfirming(true);
    if (onConfirm) onConfirm();
    setTimeout(() => setConfirming(false), 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ className: 'glass', sx: { borderRadius: 4, background: 'rgba(40,43,69,0.7)', boxShadow: 12, p: 2 } }}>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, fontSize: 24, letterSpacing: 1 }}>Detalhes do Pedido</DialogTitle>
      <DialogContent sx={{ p: { xs: 1, sm: 3 } }}>
        {pedido && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle1"><b>Obra:</b> {pedido.obra}</Typography>
            <Typography variant="subtitle1"><b>Encarregado:</b> {pedido.encarregado}</Typography>
            <Typography variant="subtitle1"><b>Contrato:</b> {pedido.contrato}</Typography>
            <Typography variant="subtitle1"><b>Data de Retirada:</b> {formatarData(pedido.data_retirada)}</Typography>
            <Typography variant="subtitle1"><b>Dias de Uso:</b> {pedido.dias_uso}</Typography>
            <Typography variant="subtitle1"><b>Data do Pedido:</b> {formatarData(pedido.data_pedido)}</Typography>
            <Box mt={2}>
              <Typography variant="h6">Itens do Pedido</Typography>
              {pedido.itens && pedido.itens.map((item, idx) => (
                <Box key={idx} mb={2} p={2} border={1} borderColor="#eee" borderRadius={2}>
                  <Typography><b>Modelo:</b> {item.modelo}</Typography>
                  <Typography><b>Quantidade:</b> {item.quantidade}</Typography>
                  <Typography><b>IDs das Peças:</b> {item.ids_pecas && item.ids_pecas.join(', ')}</Typography>
                  {item.ids_devolvidos && item.ids_devolvidos.length > 0 && (
                    <Typography color="success.main"><b>IDs devolvidos:</b> {item.ids_devolvidos.join(', ')}</Typography>
                  )}
                </Box>
              ))}
            </Box>
            {children}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        {onConfirm && (
          <Button onClick={handleConfirm} color="error" variant="contained" disabled={confirming}>
            {confirming ? 'Confirmando...' : confirmText || 'Confirmar'}
          </Button>
        )}
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default PedidoDetalhesModal; 