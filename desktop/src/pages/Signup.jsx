import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function Signup({ onSwitchToLogin, onSignupSuccess, selectedRole }) {
  const [formData, setFormData] = useState({
    // REQUIRED fields for all roles
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    
    // CONDITIONALLY REQUIRED fields
    businessName: '', // Required for retailer, wholesaler, supplier
    productCategory: '', // Required for retailer, wholesaler, supplier
    plateNumber: '', // Required for transporter
    vehicleType: '', // Required for transporter
    companyType: 'individual', // Required for transporter
    
    // OPTIONAL fields
    country: 'Uganda',
    taxId: '',
    companyName: '', // Required if companyType !== 'individual'
    businessRegistration: '',
    termsAccepted: false
  });

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Use the useAuth hook properly
  const { register } = useAuth();

  // Options for select fields
  const productCategories = [
    'Agriculture & Farming',
    'Electronics & Appliances',
    'Fashion & Clothing',
    'Food & Beverages',
    'Construction Materials',
    'Automotive Parts',
    'Health & Beauty',
    'Home & Garden',
    'Office Supplies',
    'Textiles & Fabrics',
    'Raw Materials',
    'Other'
  ];

  const vehicleTypes = ['truck', 'motorcycle', 'van'];
  const companyTypes = ['individual', 'company', 'partnership', 'cooperative'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match");
      return;
    }

    if (!formData.termsAccepted) {
      alert("Please accept the terms and conditions");
      return;
    }

    // Role-specific validation
    const isBusinessRole = selectedRole && selectedRole !== 'transporter';
    const isTransporter = selectedRole === 'transporter';

    if (isBusinessRole && (!formData.businessName || !formData.productCategory)) {
      alert("Business name and product category are required");
      return;
    }

    if (isTransporter && (!formData.plateNumber || !formData.vehicleType)) {
      alert("Plate number and vehicle type are required for transporters");
      return;
    }

    if (isTransporter && formData.companyType !== 'individual' && !formData.companyName) {
      alert("Company name is required when company type is not individual");
      return;
    }

    setLoading(true);
    
    try {
      // Prepare data for backend
      const submitData = {
        role: selectedRole,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        address: formData.address.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        taxId: formData.taxId.trim(),
        businessRegistration: formData.businessRegistration.trim(),
        termsAccepted: formData.termsAccepted
      };

      // Add role-specific fields
      if (isBusinessRole) {
        submitData.businessName = formData.businessName.trim();
        submitData.productCategory = formData.productCategory;
      }

      if (isTransporter) {
        submitData.plateNumber = formData.plateNumber.trim();
        submitData.companyType = formData.companyType;
        submitData.vehicleType = formData.vehicleType;
        if (formData.companyName) {
          submitData.companyName = formData.companyName.trim();
        }
      }

      console.log('Submitting registration data:', submitData);

      const result = await register(submitData);
      
      if (result.success) {
        onSignupSuccess();
      } else {
        // Show backend validation errors
        if (result.errors && result.errors.length > 0) {
          const errorMessages = result.errors.map(error => error.message || error.msg).join('\n');
          alert(`Registration failed:\n${errorMessages}`);
        } else {
          alert(result.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (isStepValid()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const isBusinessRole = selectedRole && selectedRole !== 'transporter';
  const isTransporter = selectedRole === 'transporter';

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName && formData.email && 
               formData.phone && formData.password && formData.confirmPassword;
      case 2:
        if (isBusinessRole) {
          return formData.businessName && formData.productCategory;
        }
        if (isTransporter) {
          return formData.plateNumber && formData.vehicleType;
        }
        return true;
      case 3:
        return formData.address && formData.city && formData.termsAccepted;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-lg p-8 border border-slate-700">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400 capitalize">Role: {selectedRole}</p>
          
          {/* Progress Steps */}
          <div className="flex justify-center mb-4 mt-4">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= step 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-transparent border-slate-600 text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-8 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-slate-600'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength="6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Role-specific Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">
                {isTransporter ? 'Transport Information' : 'Business Information'}
              </h3>

              {isBusinessRole && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Business Name *</label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Product Category *</label>
                    <select
                      name="productCategory"
                      value={formData.productCategory}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Category</option>
                      {productCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {isTransporter && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Plate Number *</label>
                      <input
                        type="text"
                        name="plateNumber"
                        value={formData.plateNumber}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        placeholder="e.g., UAB 123A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Type *</label>
                      <select
                        name="vehicleType"
                        value={formData.vehicleType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Type</option>
                        {vehicleTypes.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Company Type *</label>
                    <select
                      name="companyType"
                      value={formData.companyType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {companyTypes.map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.companyType !== 'individual' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Company Name *</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tax ID</label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Registration</label>
                  <input
                    type="text"
                    name="businessRegistration"
                    value={formData.businessRegistration}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location & Terms */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">Location & Terms</h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., Kampala"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Country *</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-600">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    className="mr-2 mt-1"
                    required
                  />
                  <span className="text-white text-sm">
                    I accept the Terms and Conditions and Privacy Policy *
                  </span>
                </label>
              </div>
            </div>
          )}
          
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 1 
                  ? 'bg-slate-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-slate-600 text-white hover:bg-slate-700'
              }`}
            >
              Previous
            </button>
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!isStepValid()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  !isStepValid()
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
              </button>
            ) : (
              <button 
                type="submit" 
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                disabled={loading || !isStepValid()}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>
        </form>

        <div className="text-center mt-6">
          <button 
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default Signup;