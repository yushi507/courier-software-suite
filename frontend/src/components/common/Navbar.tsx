import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import {
  AccountCircle,
  LocalShipping,
  Dashboard,
  Assignment,
  ExitToApp,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { user, logout, updateAvailability } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/login');
  };

  const handleAvailabilityToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await updateAvailability(event.target.checked);
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const getNavigationItems = () => {
    if (user?.role === 'customer') {
      return [
        { label: 'Dashboard', path: '/customer', icon: <Dashboard /> },
        { label: 'My Orders', path: '/customer/orders', icon: <Assignment /> },
        { label: 'New Order', path: '/customer/create-order', icon: <LocalShipping /> },
      ];
    } else if (user?.role === 'courier') {
      return [
        { label: 'Dashboard', path: '/courier', icon: <Dashboard /> },
        { label: 'Available Orders', path: '/courier/orders', icon: <Assignment /> },
        { label: 'My Deliveries', path: '/courier/deliveries', icon: <LocalShipping /> },
      ];
    }
    return [];
  };

  const navigationItems = getNavigationItems();

  return (
    <AppBar position="sticky" elevation={1}>
      <Toolbar>
        {/* Logo/Brand */}
        <Typography
          variant="h6"
          component="div"
          sx={{ 
            flexGrow: 0, 
            mr: 4, 
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/')}
        >
          CourierApp
        </Typography>

        {/* Navigation Items */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* User Info and Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Courier Availability Toggle */}
          {user?.role === 'courier' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={user.isAvailable || false}
                    onChange={handleAvailabilityToggle}
                    color="secondary"
                    size="small"
                  />
                }
                label={
                  <Chip
                    label={user.isAvailable ? 'Available' : 'Offline'}
                    size="small"
                    color={user.isAvailable ? 'success' : 'default'}
                    variant="outlined"
                  />
                }
                sx={{ color: 'white', mr: 1 }}
              />
            </Box>
          )}

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name}
            </Typography>
            <Chip
              label={user?.role?.toUpperCase()}
              size="small"
              color="secondary"
              variant="outlined"
            />
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              {user?.profileImage ? (
                <Avatar src={user.profileImage} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Box>
        </Box>

        {/* User Menu Dropdown */}
        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
            <Person sx={{ mr: 1 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ExitToApp sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;