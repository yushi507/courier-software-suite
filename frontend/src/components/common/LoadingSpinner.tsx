import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 40 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress size={size} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;