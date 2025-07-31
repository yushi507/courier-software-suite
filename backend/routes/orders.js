const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticateToken, requireCustomer, requireCourier, requireCourierOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Calculate pricing based on distance and priority
const calculatePricing = (distance, priority) => {
  const baseFare = 5.00; // Base fare in dollars
  const perKmRate = 1.50; // Rate per kilometer
  const distanceFare = distance * perKmRate;
  
  let priorityFare = 0;
  switch (priority) {
    case 'express':
      priorityFare = baseFare * 0.5; // 50% extra
      break;
    case 'urgent':
      priorityFare = baseFare * 1.0; // 100% extra
      break;
    default:
      priorityFare = 0;
  }
  
  const totalAmount = baseFare + distanceFare + priorityFare;
  
  return {
    baseFare: parseFloat(baseFare.toFixed(2)),
    distanceFare: parseFloat(distanceFare.toFixed(2)),
    priorityFare: parseFloat(priorityFare.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2))
  };
};

// Create new order
router.post('/', authenticateToken, requireCustomer, [
  body('pickupLocation.address.street').notEmpty().withMessage('Pickup street address required'),
  body('pickupLocation.address.city').notEmpty().withMessage('Pickup city required'),
  body('pickupLocation.address.state').notEmpty().withMessage('Pickup state required'),
  body('pickupLocation.address.zipCode').notEmpty().withMessage('Pickup zip code required'),
  body('pickupLocation.coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid pickup latitude required'),
  body('pickupLocation.coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid pickup longitude required'),
  body('pickupLocation.contactName').notEmpty().withMessage('Pickup contact name required'),
  body('pickupLocation.contactPhone').isMobilePhone().withMessage('Valid pickup contact phone required'),
  
  body('deliveryLocation.address.street').notEmpty().withMessage('Delivery street address required'),
  body('deliveryLocation.address.city').notEmpty().withMessage('Delivery city required'),
  body('deliveryLocation.address.state').notEmpty().withMessage('Delivery state required'),
  body('deliveryLocation.address.zipCode').notEmpty().withMessage('Delivery zip code required'),
  body('deliveryLocation.coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid delivery latitude required'),
  body('deliveryLocation.coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid delivery longitude required'),
  body('deliveryLocation.contactName').notEmpty().withMessage('Delivery contact name required'),
  body('deliveryLocation.contactPhone').isMobilePhone().withMessage('Valid delivery contact phone required'),
  
  body('packageDetails.description').notEmpty().withMessage('Package description required'),
  body('packageDetails.weight').isFloat({ min: 0.1 }).withMessage('Package weight must be greater than 0'),
  body('priority').optional().isIn(['standard', 'express', 'urgent']).withMessage('Invalid priority level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const orderData = {
      customer: req.user._id,
      ...req.body
    };

    const order = new Order(orderData);
    
    // Calculate distance and pricing
    const distance = order.calculateDistance();
    const pricing = calculatePricing(distance, order.priority);
    order.pricing = pricing;

    // Set estimated pickup and delivery times
    const now = new Date();
    const estimatedPickupTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
    const estimatedDeliveryTime = new Date(estimatedPickupTime.getTime() + (distance / 30) * 60 * 60000); // Assuming 30 km/h average speed

    order.estimatedTime = {
      pickup: estimatedPickupTime,
      delivery: estimatedDeliveryTime
    };

    // Add initial tracking entry
    order.addTrackingUpdate('pending', null, 'Order created and waiting for courier assignment');

    await order.save();
    await order.populate('customer', 'name email phone');

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Server error creating order' });
  }
});

// Get all orders (with filtering and pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    // Role-based filtering
    if (req.user.role === 'customer') {
      filter.customer = req.user._id;
    } else if (req.user.role === 'courier') {
      filter.courier = req.user._id;
    }
    
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
      .populate('customer', 'name email phone')
      .populate('courier', 'name email phone vehicle')
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
    console.error('Orders fetch error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// Get available orders for couriers
router.get('/available', authenticateToken, requireCourier, async (req, res) => {
  try {
    const orders = await Order.find({ 
      status: 'pending',
      courier: null
    })
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json({ orders });
  } catch (error) {
    console.error('Available orders fetch error:', error);
    res.status(500).json({ message: 'Server error fetching available orders' });
  }
});

// Get single order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('courier', 'name email phone vehicle');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const isAuthorized = 
      req.user.role === 'admin' ||
      order.customer._id.toString() === req.user._id.toString() ||
      (order.courier && order.courier._id.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({ message: 'Server error fetching order' });
  }
});

// Assign order to courier
router.patch('/:id/assign', authenticateToken, requireCourier, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order is not available for assignment' });
    }

    if (order.courier) {
      return res.status(400).json({ message: 'Order already assigned to another courier' });
    }

    // Check if courier is available
    if (!req.user.isAvailable) {
      return res.status(400).json({ message: 'You must be available to accept orders' });
    }

    order.courier = req.user._id;
    order.status = 'assigned';
    order.addTrackingUpdate('assigned', req.user.currentLocation, `Order assigned to courier ${req.user.name}`);

    await order.save();
    await order.populate('customer', 'name email phone');
    await order.populate('courier', 'name email phone vehicle');

    res.json({
      message: 'Order assigned successfully',
      order
    });
  } catch (error) {
    console.error('Order assignment error:', error);
    res.status(500).json({ message: 'Server error assigning order' });
  }
});

// Update order status
router.patch('/:id/status', authenticateToken, [
  body('status').isIn(['picked_up', 'in_transit', 'delivered', 'cancelled', 'failed']).withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, notes, location } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const isAuthorized = 
      req.user.role === 'admin' ||
      (order.courier && order.courier.toString() === req.user._id.toString()) ||
      (status === 'cancelled' && order.customer.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Validate status transitions
    const validTransitions = {
      'assigned': ['picked_up', 'cancelled'],
      'picked_up': ['in_transit', 'cancelled'],
      'in_transit': ['delivered', 'failed'],
      'pending': ['cancelled']
    };

    if (validTransitions[order.status] && !validTransitions[order.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot change status from ${order.status} to ${status}` 
      });
    }

    // Update actual times
    if (status === 'picked_up') {
      order.actualTime.pickup = new Date();
    } else if (status === 'delivered') {
      order.actualTime.delivery = new Date();
    }

    order.addTrackingUpdate(status, location, notes);
    await order.save();

    await order.populate('customer', 'name email phone');
    await order.populate('courier', 'name email phone vehicle');

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

// Rate order (for both customer and courier)
router.patch('/:id/rate', authenticateToken, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isString().withMessage('Feedback must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { rating, feedback } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Can only rate completed orders' });
    }

    // Check authorization and determine rating type
    let isCustomer = false;
    let isCourier = false;

    if (order.customer.toString() === req.user._id.toString()) {
      isCustomer = true;
    } else if (order.courier && order.courier.toString() === req.user._id.toString()) {
      isCourier = true;
    } else {
      return res.status(403).json({ message: 'Not authorized to rate this order' });
    }

    if (isCustomer) {
      if (order.rating.customerRating) {
        return res.status(400).json({ message: 'You have already rated this order' });
      }
      order.rating.customerRating = rating;
      order.rating.customerFeedback = feedback;
      
      // Update courier's overall rating
      if (order.courier) {
        const courier = await User.findById(order.courier);
        const newCount = courier.rating.count + 1;
        const newAverage = ((courier.rating.average * courier.rating.count) + rating) / newCount;
        courier.rating.average = parseFloat(newAverage.toFixed(2));
        courier.rating.count = newCount;
        await courier.save();
      }
    }

    if (isCourier) {
      if (order.rating.courierRating) {
        return res.status(400).json({ message: 'You have already rated this order' });
      }
      order.rating.courierRating = rating;
      order.rating.courierFeedback = feedback;
      
      // Update customer's overall rating
      const customer = await User.findById(order.customer);
      const newCount = customer.rating.count + 1;
      const newAverage = ((customer.rating.average * customer.rating.count) + rating) / newCount;
      customer.rating.average = parseFloat(newAverage.toFixed(2));
      customer.rating.count = newCount;
      await customer.save();
    }

    await order.save();

    res.json({
      message: 'Rating submitted successfully',
      rating: order.rating
    });
  } catch (error) {
    console.error('Order rating error:', error);
    res.status(500).json({ message: 'Server error submitting rating' });
  }
});

// Cancel order
router.patch('/:id/cancel', authenticateToken, [
  body('reason').optional().isString().withMessage('Cancellation reason must be a string')
], async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const isAuthorized = 
      req.user.role === 'admin' ||
      order.customer.toString() === req.user._id.toString() ||
      (order.courier && order.courier.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    if (!['pending', 'assigned'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    order.addTrackingUpdate('cancelled', null, reason || 'Order cancelled');
    await order.save();

    await order.populate('customer', 'name email phone');
    await order.populate('courier', 'name email phone vehicle');

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Order cancellation error:', error);
    res.status(500).json({ message: 'Server error cancelling order' });
  }
});

module.exports = router;