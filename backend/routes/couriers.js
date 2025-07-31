const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const { authenticateToken, requireCourier, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all couriers (for admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = { role: 'courier' };
    
    // Filter by availability
    if (req.query.available !== undefined) {
      filter.isAvailable = req.query.available === 'true';
    }
    
    // Filter by active status
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === 'true';
    }

    const couriers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      couriers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Couriers fetch error:', error);
    res.status(500).json({ message: 'Server error fetching couriers' });
  }
});

// Get available couriers near a location
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in kilometers

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInKm = parseFloat(radius);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusInKm)) {
      return res.status(400).json({ message: 'Invalid coordinates or radius' });
    }

    // Find available couriers
    const couriers = await User.find({
      role: 'courier',
      isAvailable: true,
      isActive: true,
      'currentLocation.lat': { $exists: true },
      'currentLocation.lng': { $exists: true }
    }).select('-password');

    // Calculate distance and filter by radius
    const nearbyCouriers = couriers.filter(courier => {
      const courierLat = courier.currentLocation.lat;
      const courierLng = courier.currentLocation.lng;
      
      // Haversine formula to calculate distance
      const R = 6371; // Earth's radius in kilometers
      const dLat = (courierLat - latitude) * Math.PI / 180;
      const dLon = (courierLng - longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(latitude * Math.PI / 180) * Math.cos(courierLat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      courier.distance = parseFloat(distance.toFixed(2));
      return distance <= radiusInKm;
    });

    // Sort by distance
    nearbyCouriers.sort((a, b) => a.distance - b.distance);

    res.json({
      couriers: nearbyCouriers,
      count: nearbyCouriers.length
    });
  } catch (error) {
    console.error('Nearby couriers fetch error:', error);
    res.status(500).json({ message: 'Server error fetching nearby couriers' });
  }
});

// Get courier profile by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const courier = await User.findById(req.params.id)
      .select('-password')
      .where('role').equals('courier');

    if (!courier) {
      return res.status(404).json({ message: 'Courier not found' });
    }

    // Get courier statistics
    const totalOrders = await Order.countDocuments({ courier: courier._id });
    const completedOrders = await Order.countDocuments({ 
      courier: courier._id, 
      status: 'delivered' 
    });
    const cancelledOrders = await Order.countDocuments({ 
      courier: courier._id, 
      status: 'cancelled' 
    });

    const stats = {
      totalOrders,
      completedOrders,
      cancelledOrders,
      completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0
    };

    res.json({
      courier,
      stats
    });
  } catch (error) {
    console.error('Courier profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching courier profile' });
  }
});

// Get courier's order history
router.get('/:id/orders', authenticateToken, async (req, res) => {
  try {
    const courierId = req.params.id;
    
    // Check if requesting own orders or admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== courierId) {
      return res.status(403).json({ message: 'Not authorized to view these orders' });
    }

    const courier = await User.findById(courierId).where('role').equals('courier');
    if (!courier) {
      return res.status(404).json({ message: 'Courier not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = { courier: courierId };
    
    // Status filtering
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Date range filtering
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Courier orders fetch error:', error);
    res.status(500).json({ message: 'Server error fetching courier orders' });
  }
});

// Get courier dashboard stats
router.get('/:id/dashboard', authenticateToken, requireCourier, async (req, res) => {
  try {
    const courierId = req.user._id;
    
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Get this week's date range
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get this month's date range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Today's stats
    const todayOrders = await Order.countDocuments({
      courier: courierId,
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const todayCompleted = await Order.countDocuments({
      courier: courierId,
      status: 'delivered',
      'actualTime.delivery': { $gte: startOfDay, $lt: endOfDay }
    });

    // Week's stats
    const weekOrders = await Order.countDocuments({
      courier: courierId,
      createdAt: { $gte: startOfWeek, $lt: endOfWeek }
    });
    
    const weekCompleted = await Order.countDocuments({
      courier: courierId,
      status: 'delivered',
      'actualTime.delivery': { $gte: startOfWeek, $lt: endOfWeek }
    });

    // Month's stats
    const monthOrders = await Order.countDocuments({
      courier: courierId,
      createdAt: { $gte: startOfMonth, $lt: endOfMonth }
    });
    
    const monthCompleted = await Order.countDocuments({
      courier: courierId,
      status: 'delivered',
      'actualTime.delivery': { $gte: startOfMonth, $lt: endOfMonth }
    });

    // Calculate earnings (simplified - in real app, you'd have a proper payment system)
    const monthEarnings = await Order.aggregate([
      {
        $match: {
          courier: courierId,
          status: 'delivered',
          'actualTime.delivery': { $gte: startOfMonth, $lt: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    // Current active orders
    const activeOrders = await Order.find({
      courier: courierId,
      status: { $in: ['assigned', 'picked_up', 'in_transit'] }
    }).populate('customer', 'name phone');

    // Recent completed orders
    const recentOrders = await Order.find({
      courier: courierId,
      status: 'delivered'
    })
    .populate('customer', 'name phone')
    .sort({ 'actualTime.delivery': -1 })
    .limit(5);

    const stats = {
      today: {
        orders: todayOrders,
        completed: todayCompleted
      },
      week: {
        orders: weekOrders,
        completed: weekCompleted
      },
      month: {
        orders: monthOrders,
        completed: monthCompleted,
        earnings: monthEarnings.length > 0 ? monthEarnings[0].totalEarnings : 0
      },
      activeOrders,
      recentOrders,
      rating: req.user.rating
    };

    res.json(stats);
  } catch (error) {
    console.error('Courier dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// Update courier vehicle information
router.patch('/:id/vehicle', authenticateToken, [
  body('vehicle').isIn(['bike', 'motorcycle', 'car', 'van']).withMessage('Invalid vehicle type'),
  body('licenseNumber').optional().isString().withMessage('License number must be a string')
], async (req, res) => {
  try {
    const courierId = req.params.id;
    
    // Check if updating own profile or admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== courierId) {
      return res.status(403).json({ message: 'Not authorized to update this courier' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { vehicle, licenseNumber } = req.body;
    const updates = { vehicle };
    
    if (licenseNumber) {
      updates.licenseNumber = licenseNumber;
    }

    const courier = await User.findByIdAndUpdate(
      courierId,
      updates,
      { new: true, runValidators: true }
    ).select('-password').where('role').equals('courier');

    if (!courier) {
      return res.status(404).json({ message: 'Courier not found' });
    }

    res.json({
      message: 'Vehicle information updated successfully',
      courier
    });
  } catch (error) {
    console.error('Courier vehicle update error:', error);
    res.status(500).json({ message: 'Server error updating vehicle information' });
  }
});

// Admin: Activate/Deactivate courier
router.patch('/:id/status', authenticateToken, requireAdmin, [
  body('isActive').isBoolean().withMessage('Active status must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isActive } = req.body;
    
    const courier = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password').where('role').equals('courier');

    if (!courier) {
      return res.status(404).json({ message: 'Courier not found' });
    }

    res.json({
      message: `Courier ${isActive ? 'activated' : 'deactivated'} successfully`,
      courier
    });
  } catch (error) {
    console.error('Courier status update error:', error);
    res.status(500).json({ message: 'Server error updating courier status' });
  }
});

module.exports = router;