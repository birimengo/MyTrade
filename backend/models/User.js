// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Core required fields
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
  
  // Business information
  businessName: {
    type: String,
    required: function() {
      return this.role !== 'transporter';
    },
    trim: true,
    default: ''
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    default: 'Uganda',
    trim: true
  },
  taxId: {
    type: String,
    default: '',
    trim: true
  },
  productCategory: {
    type: String,
    required: function() {
      return ['retailer', 'wholesaler', 'supplier'].includes(this.role);
    },
    trim: true,
    default: ''
  },
  
  // Transporter specific fields
  plateNumber: {
    type: String,
    required: function() {
      return this.role === 'transporter';
    },
    trim: true,
    default: ''
  },
  companyType: {
    type: String,
    enum: ['individual', 'company', 'partnership', 'cooperative'],
    required: function() {
      return this.role === 'transporter';
    },
    default: 'individual'
  },
  companyName: {
    type: String,
    required: function() {
      return this.role === 'transporter' && this.companyType !== 'individual';
    },
    trim: true,
    default: ''
  },
  vehicleType: {
    type: String,
    enum: ['truck', 'motorcycle', 'van'],
    required: function() {
      return this.role === 'transporter';
    },
    default: ''
  },
  
  // New optional fields from frontend form
  emergencyContact: {
    type: String,
    trim: true,
    default: ''
  },
  website: {
    type: String,
    trim: true,
    default: ''
  },
  businessDescription: {
    type: String,
    trim: true,
    default: ''
  },
  yearsInBusiness: {
    type: String,
    trim: true,
    default: ''
  },
  deliveryRadius: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Social media fields (stored as separate fields for simplicity)
  facebook: {
    type: String,
    trim: true,
    default: ''
  },
  twitter: {
    type: String,
    trim: true,
    default: ''
  },
  linkedin: {
    type: String,
    trim: true,
    default: ''
  },
  instagram: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Operating hours (simplified storage)
  openingTime: {
    type: String,
    default: '08:00',
    trim: true
  },
  closingTime: {
    type: String,
    default: '18:00',
    trim: true
  },
  workingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  
  // Service areas for transporters
  serviceAreas: [{
    type: String,
    trim: true
  }],
  
  // Payment methods
  paymentMethods: [{
    type: String,
    enum: ['cash', 'mobile_money', 'bank_transfer', 'credit_card', 'debit_card']
  }],
  
  // Status and verification fields
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  
  // Profile images and documents
  profileImage: {
    type: String, // URL or file path
    default: ''
  },
  businessLogo: {
    type: String, // URL or file path
    default: ''
  },
  idDocument: {
    type: String, // URL or file path
    default: ''
  },
  
  // Additional metadata
  certifications: [{
    type: String,
    trim: true
  }],
  
  // Terms and marketing
  termsAccepted: {
    type: Boolean,
    default: false
  },
  marketingEmails: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  // Strict mode will ignore fields not defined in schema
  strict: true
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

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to check if user is transporter
userSchema.methods.isTransporter = function() {
  return this.role === 'transporter';
};

// Method to check if user is business (retailer, wholesaler, supplier)
userSchema.methods.isBusiness = function() {
  return ['retailer', 'wholesaler', 'supplier'].includes(this.role);
};

// Transform output to include virtuals and remove sensitive data
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);