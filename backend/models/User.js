const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['retailer', 'wholesaler', 'supplier', 'transporter', 'admin']
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  businessName: {
    type: String,
    required: function() {
      return this.role !== 'transporter';
    }
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'Uganda'
  },
  taxId: {
    type: String,
    default: ''
  },
  productCategory: {
    type: String,
    required: function() {
      return ['retailer', 'wholesaler', 'supplier'].includes(this.role);
    }
  },
  // Transporter specific fields
  plateNumber: {
    type: String,
    required: function() {
      return this.role === 'transporter';
    }
  },
  companyType: {
    type: String,
    enum: ['individual', 'company'],
    required: function() {
      return this.role === 'transporter';
    }
  },
  companyName: {
    type: String,
    required: function() {
      return this.role === 'transporter' && this.companyType === 'company';
    }
  },
  vehicleType: {
    type: String,
    enum: ['truck', 'motorcycle', 'van'],
    required: function() {
      return this.role === 'transporter';
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // New fields for online status tracking
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);