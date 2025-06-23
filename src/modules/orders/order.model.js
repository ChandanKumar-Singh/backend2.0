import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  items: [orderItemSchema],
  total: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'completed', 'cancelled'],
    default: 'pending',
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'cash'],
    default: 'credit_card',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentDetails: {
    transactionId: String,
    paymentDate: Date,
    amount: Number,
    currency: {
      type: String,
      default: 'USD',
    },
  },
  notes: String,
  trackingNumber: String,
  estimatedDelivery: Date,
  actualDelivery: Date,
  cancellationReason: String,
  refundAmount: Number,
  refundDate: Date,
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ trackingNumber: 1 });

// Virtual for order number
orderSchema.virtual('orderNumber').get(function() {
  return `ORD-${this._id.toString().slice(-8).toUpperCase()}`;
});

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Pre-save middleware to calculate total
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.total = this.items.reduce((total, item) => {
      item.total = item.price * item.quantity;
      return total + item.total;
    }, 0);
  }
  next();
});

// Static method to find by user
orderSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).populate('userId', 'username email');
};

// Static method to find by status
orderSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('userId', 'username email');
};

// Instance method to calculate subtotal
orderSchema.methods.calculateSubtotal = function() {
  return this.items.reduce((subtotal, item) => subtotal + (item.price * item.quantity), 0);
};

// Instance method to update status
orderSchema.methods.updateStatus = async function(newStatus, reason = null) {
  const previousStatus = this.status;
  this.status = newStatus;
  
  if (newStatus === 'cancelled' && reason) {
    this.cancellationReason = reason;
  }
  
  if (newStatus === 'completed' && !this.actualDelivery) {
    this.actualDelivery = new Date();
  }
  
  await this.save();
  
  return { previousStatus, newStatus };
};

export default mongoose.model('Order', orderSchema);
