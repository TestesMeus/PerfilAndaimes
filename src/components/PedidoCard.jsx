import { Card, CardContent, CardActionArea, Typography, Box, Chip, Tooltip } from '@mui/material';
import { calcularStatus, diasRestantes, formatarData } from '../utils/dateUtils';

function PedidoCard({ pedido, onClick }) {
  const status = calcularStatus(pedido);
  const dias = diasRestantes(pedido);
  return (
    <Tooltip title={status === 'ok' ? 'Dentro do prazo' : 'Atrasado'} arrow>
      <Card
        className="glass-neon"
        sx={{
          borderLeft: 6,
          borderColor: status === 'ok' ? 'success.main' : 'error.main',
          background: 'rgba(40,43,69,0.6)',
          color: 'text.primary',
          boxShadow: 8,
          borderRadius: 4,
          p: 2,
          transition: 'box-shadow 0.3s, border 0.3s, background 0.3s',
          '&:hover': {
            boxShadow: 16,
            background: 'rgba(40,43,69,0.8)',
          },
        }}
      >
        <CardActionArea onClick={onClick} sx={{ borderRadius: 4 }}>
          <CardContent>
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
    </Tooltip>
  );
}

export default PedidoCard; 