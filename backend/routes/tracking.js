const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { authenticateToken, requireCourier } = require('../middleware/auth');
const { io } = require('../server');

const router = express.Router();

// Get order tracking information
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ orderNumber })
      .populate('customer', 'name phone')
      .populate('courier', 'name phone vehicle rating');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Return tracking information (public endpoint for customers to track)
    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.status,
      pickupLocation: order.pickupLocation,
      deliveryLocation: order.deliveryLocation,
      estimatedTime: order.estimatedTime,
      actualTime: order.actualTime,
      tracking: order.tracking,
      courier: order.courier ? {
        name: order.courier.name,
        phone: order.courier.phone,
        vehicle: order.courier.vehicle,
        rating: order.courier.rating,
        currentLocation: order.courier.currentLocation
      } : null,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone
      }
    };

    res.json({ tracking: trackingInfo });
  } catch (error) {
    console.error('Tracking fetch error:', error);
    res.status(500).json({ message: 'Server error fetching tracking information' });
  }
});

// Update courier location and broadcast to tracking clients
router.patch('/:orderNumber/location', authenticateToken, requireCourier, [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderNumber } = req.params;
    const { lat, lng } = req.body;
    
    const order = await Order.findOne({ orderNumber });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the courier is assigned to this order
    if (!order.courier || order.courier.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Update courier's current location in user profile
    req.user.currentLocation = {
      lat,
      lng,
      lastUpdated: new Date()
    };
    await req.user.save();

    // Add location update to order tracking
    const locationUpdate = {
      status: order.status,
      timestamp: new Date(),
      location: { lat, lng },
      notes: 'Location updated'
    };
    
    order.tracking.push(locationUpdate);
    await order.save();

    // Broadcast location update to clients tracking this order
    if (io) {
      io.to(`order-${order._id}`).emit('location-updated', {
        orderNumber,
        location: { lat, lng },
        timestamp: locationUpdate.timestamp,
        courier: {
          name: req.user.name,
          vehicle: req.user.vehicle
        }
      });
    }

    res.json({
      message: 'Location updated successfully',
      location: { lat, lng },
      timestamp: locationUpdate.timestamp
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ message: 'Server error updating location' });
  }
});

// Add custom tracking update
router.post('/:orderNumber/update', authenticateToken, requireCourier, [
  body('notes').notEmpty().withMessage('Notes are required for custom updates'),
  body('location.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('location.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderNumber } = req.params;
    const { notes, location } = req.body;
    
    const order = await Order.findOne({ orderNumber });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the courier is assigned to this order
    if (!order.courier || order.courier.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Add custom tracking update
    const trackingUpdate = {
      status: order.status,
      timestamp: new Date(),
      location: location || req.user.currentLocation,
      notes
    };
    
    order.tracking.push(trackingUpdate);
    await order.save();

    // Broadcast update to clients tracking this order
    if (io) {
      io.to(`order-${order._id}`).emit('tracking-updated', {
        orderNumber,
        update: trackingUpdate,
        courier: {
          name: req.user.name,
          vehicle: req.user.vehicle
        }
      });
    }

    res.json({
      message: 'Tracking update added successfully',
      update: trackingUpdate
    });
  } catch (error) {
    console.error('Tracking update error:', error);
    res.status(500).json({ message: 'Server error adding tracking update' });
  }
});

// Get delivery proof/images
router.get('/:orderNumber/proof', authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ orderNumber });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const isAuthorized = 
      req.user.role === 'admin' ||
      order.customer.toString() === req.user._id.toString() ||
      (order.courier && order.courier.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view delivery proof' });
    }

    res.json({
      orderNumber,
      images: order.images,
      status: order.status
    });
  } catch (error) {
    console.error('Delivery proof fetch error:', error);
    res.status(500).json({ message: 'Server error fetching delivery proof' });
  }
});

// Upload delivery proof (simplified - in production, use proper file upload service)
router.post('/:orderNumber/proof', authenticateToken, requireCourier, [
  body('imageUrl').isURL().withMessage('Valid image URL required'),
  body('description').optional().isString().withMessage('Description must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderNumber } = req.params;
    const { imageUrl, description } = req.body;
    
    const order = await Order.findOne({ orderNumber });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the courier is assigned to this order
    if (!order.courier || order.courier.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to upload proof for this order' });
    }

    // Add image to order
    const imageProof = {
      type: imageUrl,
      timestamp: new Date(),
      description: description || 'Delivery proof'
    };
    
    order.images.push(imageProof);
    
    // Add tracking update
    order.addTrackingUpdate(
      order.status, 
      req.user.currentLocation, 
      `Delivery proof uploaded: ${description || 'Image'}`
    );
    
    await order.save();

    // Broadcast update to clients tracking this order
    if (io) {
      io.to(`order-${order._id}`).emit('proof-uploaded', {
        orderNumber,
        image: imageProof,
        courier: {
          name: req.user.name,
          vehicle: req.user.vehicle
        }
      });
    }

    res.json({
      message: 'Delivery proof uploaded successfully',
      image: imageProof
    });
  } catch (error) {
    console.error('Delivery proof upload error:', error);
    res.status(500).json({ message: 'Server error uploading delivery proof' });
  }
});

// Get estimated delivery time
router.get('/:orderNumber/eta', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ orderNumber })
      .populate('courier', 'currentLocation vehicle');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.courier || !order.courier.currentLocation) {
      return res.json({
        orderNumber,
        eta: order.estimatedTime.delivery,
        status: order.status,
        message: 'Courier location not available'
      });
    }

    // Calculate ETA based on current courier location and delivery address
    const courierLat = order.courier.currentLocation.lat;
    const courierLng = order.courier.currentLocation.lng;
    const deliveryLat = order.deliveryLocation.coordinates.lat;
    const deliveryLng = order.deliveryLocation.coordinates.lng;

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = (deliveryLat - courierLat) * Math.PI / 180;
    const dLon = (deliveryLng - courierLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(courierLat * Math.PI / 180) * Math.cos(deliveryLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Estimate speed based on vehicle type
    const speedMap = {
      'bike': 15,      // km/h
      'motorcycle': 25,
      'car': 30,
      'van': 25
    };

    const estimatedSpeed = speedMap[order.courier.vehicle] || 25;
    const estimatedTimeHours = distance / estimatedSpeed;
    const estimatedTimeMinutes = Math.ceil(estimatedTimeHours * 60);
    
    const now = new Date();
    const eta = new Date(now.getTime() + estimatedTimeMinutes * 60000);

    res.json({
      orderNumber,
      eta,
      estimatedMinutes: estimatedTimeMinutes,
      distance: parseFloat(distance.toFixed(2)),
      status: order.status,
      courierLocation: {
        lat: courierLat,
        lng: courierLng,
        lastUpdated: order.courier.currentLocation.lastUpdated
      }
    });
  } catch (error) {
    console.error('ETA calculation error:', error);
    res.status(500).json({ message: 'Server error calculating ETA' });
  }
});

module.exports = router;