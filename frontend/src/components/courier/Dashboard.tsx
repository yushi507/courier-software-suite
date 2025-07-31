import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';

const CourierDashboard: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Routes>
        <Route 
          path="/" 
          element={
            <Box>
              <Typography variant="h4" gutterBottom>
                Courier Dashboard
              </Typography>
              <Typography variant="body1">
                Welcome to your courier dashboard! Here you can find available orders, manage your deliveries, and track your earnings.
              </Typography>
            </Box>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <Box>
              <Typography variant="h4" gutterBottom>
                Available Orders
              </Typography>
              <Typography variant="body1">
                Find and accept new delivery orders here.
              </Typography>
            </Box>
          } 
        />
        <Route 
          path="/deliveries" 
          element={
            <Box>
              <Typography variant="h4" gutterBottom>
                My Deliveries
              </Typography>
              <Typography variant="body1">
                Manage your active and completed deliveries here.
              </Typography>
            </Box>
          } 
        />
      </Routes>
    </Container>
  );
};

export default CourierDashboard;