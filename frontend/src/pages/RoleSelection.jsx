import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStore, FaIndustry, FaShippingFast, FaBoxes, FaGlobeAfrica, FaChevronRight, FaInfoCircle, FaSignInAlt } from 'react-icons/fa';

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [showRoleDetails, setShowRoleDetails] = useState(null);
  const navigate = useNavigate();

  const roles = [
    {
      id: 'retailer',
      label: 'Retailer',
      description: 'Manage storefront, inventory, and orders',
      icon: <FaStore className="text-2xl" />,
      color: 'from-blue-500 to-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      details: {
        title: "Retailer Account",
        features: [
          "Sell products directly to consumers",
          "Manage inventory and orders",
          "Access to wholesale pricing",
          "Customer management tools",
          "Sales analytics and reports"
        ],
        benefits: [
          "Wide product selection from wholesalers",
          "Competitive pricing",
          "Easy order management",
          "Business growth opportunities"
        ]
      }
    },
    {
      id: 'wholesaler',
      label: 'Wholesaler',
      description: 'Supply products in bulk to retailers',
      icon: <FaBoxes className="text-2xl" />,
      color: 'from-green-500 to-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      details: {
        title: "Wholesaler Account",
        features: [
          "Sell products in bulk to retailers",
          "Manage product catalog",
          "Order fulfillment tools",
          "Retailer network access",
          "Business analytics dashboard"
        ],
        benefits: [
          "Access to verified retailers",
          "Bulk order management",
          "Market expansion opportunities",
          "Streamlined logistics support"
        ]
      }
    },
    {
      id: 'supplier',
      label: 'Supplier',
      description: 'Provide raw materials and manufacturing',
      icon: <FaIndustry className="text-2xl" />,
      color: 'from-amber-500 to-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
      details: {
        title: "Supplier Account",
        features: [
          "Supply raw materials to manufacturers",
          "Manage production orders",
          "Quality control tracking",
          "Supply chain management",
          "Business partnership opportunities"
        ],
        benefits: [
          "Direct access to manufacturers",
          "Large volume orders",
          "Long-term contracts",
          "Supply chain integration"
        ]
      }
    },
    {
      id: 'transporter',
      label: 'Transporter',
      description: 'Handle logistics and delivery services',
      icon: <FaShippingFast className="text-2xl" />,
      color: 'from-indigo-500 to-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-700',
      details: {
        title: "Transporter Account",
        features: [
          "Delivery service management",
          "Route optimization tools",
          "Fleet management",
          "Real-time tracking",
          "Payment processing"
        ],
        benefits: [
          "Access to business clients",
          "Regular delivery contracts",
          "Efficient route planning",
          "Secure payment system"
        ]
      }
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setShowRoleDetails(null);
  };

  const handleRoleInfo = (roleId, e) => {
    e.stopPropagation();
    setShowRoleDetails(showRoleDetails === roleId ? null : roleId);
  };

  const handleContinue = () => {
    if (!selectedRole) return;
    navigate('/signup', { state: { preSelectedRole: selectedRole } });
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#F9A52B] to-[#ED1C24] flex items-center justify-center shadow-md">
              <FaGlobeAfrica className="text-white text-xl" />
            </div>
            <h1 className="ml-3 text-3xl sm:text-4xl font-bold text-gray-900">TRADE UGANDA</h1>
          </div>
          <p className="text-lg text-gray-600 px-2">
            Uganda's premier B2B e-commerce platform connecting businesses across the supply chain
          </p>
        </div>
        
        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Information */}
          <div className="lg:w-2/5 bg-gradient-to-br from-[#000000] to-[#1D3C5F] text-white rounded-xl shadow-lg p-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4">Join Uganda's Business Network</h2>
              <p className="text-gray-300 mb-6">
                Select your role to access tailored features designed for your business needs
              </p>
              
              <div className="space-y-6 mt-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-start">
                    <div className={`w-10 h-10 rounded-full ${step === 1 ? 'bg-[#F9A52B]' : 'bg-gray-600'} flex items-center justify-center shadow-md flex-shrink-0`}>
                      <span className="text-white font-bold text-sm">{step}</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold text-lg">
                        {step === 1 && 'Select Your Role'}
                        {step === 2 && 'Create Account'}
                        {step === 3 && 'Access Dashboard'}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {step === 1 && 'Identify how you will use the platform'}
                        {step === 2 && 'Set up your business profile with relevant details'}
                        {step === 3 && 'Start managing your business operations'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-6 mt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Already have an account?{' '}
                <button 
                  onClick={handleSignIn}
                  className="text-[#F9A52B] hover:text-[#FFC107] font-medium underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
          
          {/* Right Panel - Role Selection */}
          <div className="lg:w-3/5 bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Role</h2>
              <p className="text-gray-600">Choose your function in the supply chain to get started</p>
            </div>
            
            {/* Role Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {roles.map((role) => {
                const isSelected = selectedRole === role.id;
                const showDetails = showRoleDetails === role.id;
                
                return (
                  <div key={role.id} className="relative">
                    <div
                      onClick={() => handleRoleSelect(role.id)}
                      className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ease-in-out h-full
                        ${isSelected ? 'ring-2 ring-opacity-50 scale-[1.02] shadow-md ' + role.borderColor : 'border-gray-200'}
                        ${isSelected ? role.bgColor : 'bg-white'}
                        hover:border-gray-300 hover:bg-gray-50`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`rounded-lg p-3 ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                          <div className={isSelected ? role.textColor : 'text-gray-500'}>
                            {role.icon}
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => handleRoleInfo(role.id, e)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label="Show role details"
                        >
                          <FaInfoCircle />
                        </button>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className={`font-semibold text-lg mb-1 ${isSelected ? role.textColor : 'text-gray-900'}`}>
                          {role.label}
                        </h3>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                      
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-white shadow-xs border border-gray-200">
                            Selected
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Role Details Popup */}
                    {showDetails && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                        <h4 className="font-bold text-gray-900 mb-2">{role.details.title}</h4>
                        
                        <div className="mb-3">
                          <h5 className="text-sm font-semibold text-gray-700 mb-1">Key Features:</h5>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {role.details.features.map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-1">Benefits:</h5>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {role.details.benefits.map((benefit, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-200">
              <button 
                onClick={handleBack}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium flex items-center rounded-lg hover:bg-gray-100 transition-colors mb-3 sm:mb-0"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSignIn}
                  className="px-6 py-3 rounded-lg font-medium flex items-center transition-all bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white shadow-md"
                >
                  <FaSignInAlt className="mr-2" />
                  Sign In
                </button>
                
                <button
                  onClick={handleContinue}
                  disabled={!selectedRole}
                  className={`px-6 py-3 rounded-lg font-medium flex items-center transition-all
                    ${selectedRole 
                      ? 'bg-gradient-to-r from-[#F9A52B] to-[#ED1C24] hover:from-[#FFB347] hover:to-[#F44336] text-white shadow-md' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  Continue to Registration
                  <FaChevronRight className="ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} TRADE UGANDA. Uganda's Premier B2B Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;