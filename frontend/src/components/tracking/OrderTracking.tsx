import React from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';

const OrderTracking: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Track Your Order
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Order Number: {orderNumber}
        </Typography>
        <Typography variant="body1">
          Real-time tracking information for your order will be displayed here.
        </Typography>
      </Box>
    </Container>
  );
};

export default OrderTracking;