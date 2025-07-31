const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pickupLocation: {
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true }
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    instructions: String
  },
  deliveryLocation: {
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true }
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    instructions: String
  },
  packageDetails: {
    description: { type: String, required: true },
    weight: { type: Number, required: true }, // in kg
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    value: Number,
    fragile: { type: Boolean, default: false },
    category: {
      type: String,
      enum: ['documents', 'electronics', 'food', 'clothing', 'medical', 'other'],
      default: 'other'
    }
  },
  status: {
    type: String,
    enum: [
      'pending',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'cancelled',
      'failed'
    ],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['standard', 'express', 'urgent'],
    default: 'standard'
  },
  pricing: {
    baseFare: { type: Number, required: true },
    distanceFare: { type: Number, required: true },
    priorityFare: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }
  },
  estimatedTime: {
    pickup: Date,
    delivery: Date
  },
  actualTime: {
    pickup: Date,
    delivery: Date
  },
  tracking: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number
    },
    notes: String
  }],
  rating: {
    customerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    courierRating: {
      type: Number,
      min: 1,
      max: 5
    },
    customerFeedback: String,
    courierFeedback: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'digital_wallet'],
    default: 'cash'
  },
  images: [{
    type: String, // URLs to uploaded images
    timestamp: { type: Date, default: Date.now },
    description: String
  }],
  notes: String
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `CR${timestamp.slice(-6)}${random}`;
  }
  next();
});

// Calculate distance between two coordinates (Haversine formula)
orderSchema.methods.calculateDistance = function() {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (this.deliveryLocation.coordinates.lat - this.pickupLocation.coordinates.lat) * Math.PI / 180;
  const dLon = (this.deliveryLocation.coordinates.lng - this.pickupLocation.coordinates.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.pickupLocation.coordinates.lat * Math.PI / 180) * 
    Math.cos(this.deliveryLocation.coordinates.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Add tracking update
orderSchema.methods.addTrackingUpdate = function(status, location, notes) {
  this.tracking.push({
    status,
    location,
    notes,
    timestamp: new Date()
  });
  this.status = status;
};

module.exports = mongoose.model('Order', orderSchema);