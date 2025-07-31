import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';

const CustomerDashboard: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Routes>
        <Route 
          path="/" 
          element={
            <Box>
              <Typography variant="h4" gutterBottom>
                Customer Dashboard
              </Typography>
              <Typography variant="body1">
                Welcome to your customer dashboard! Here you can create new orders, track existing ones, and manage your account.
              </Typography>
            </Box>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <Box>
              <Typography variant="h4" gutterBottom>
                My Orders
              </Typography>
              <Typography variant="body1">
                View and manage your orders here.
              </Typography>
            </Box>
          } 
        />
        <Route 
          path="/create-order" 
          element={
            <Box>
              <Typography variant="h4" gutterBottom>
                Create New Order
              </Typography>
              <Typography variant="body1">
                Create a new delivery order here.
              </Typography>
            </Box>
          } 
        />
      </Routes>
    </Container>
  );
};

export default CustomerDashboard;