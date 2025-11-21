import React, { useState, useRef, useCallback } from 'react';
import { FaStore, FaIndustry, FaShippingFast, FaBoxes, FaGlobeAfrica, FaChevronRight, FaInfoCircle, FaSignInAlt, FaTimes } from 'react-icons/fa';

const RoleSelection = ({ onRoleSelect, onSwitchToLogin, onSwitchToSignup }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [showRoleDetails, setShowRoleDetails] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(1);

  const roles = [
    {
      id: 'retailer',
      label: 'Retailer',
      description: 'Manage storefront, inventory, and orders',
      icon: <FaStore className="text-xl" />,
      color: '#3B82F6',
      lightColor: '#EFF6FF',
      gradient: ['#3B82F6', '#1D4ED8'],
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
      icon: <FaBoxes className="text-xl" />,
      color: '#10B981',
      lightColor: '#ECFDF5',
      gradient: ['#10B981', '#047857'],
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
      icon: <FaIndustry className="text-xl" />,
      color: '#F59E0B',
      lightColor: '#FFFBEB',
      gradient: ['#F59E0B', '#D97706'],
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
      icon: <FaShippingFast className="text-xl" />,
      color: '#8B5CF6',
      lightColor: '#F5F3FF',
      gradient: ['#8B5CF6', '#7C3AED'],
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

  const handleRoleSelect = useCallback((roleId) => {
    setSelectedRole(roleId);
    setShowRoleDetails(null);
  }, []);

  const handleRoleInfo = useCallback((role) => {
    setShowRoleDetails(role);
    setModalVisible(true);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedRole) return;
    onSwitchToSignup(selectedRole);
  }, [selectedRole, onSwitchToSignup]);

  const handleSignIn = useCallback(() => {
    onSwitchToLogin();
  }, [onSwitchToLogin]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setShowRoleDetails(null), 300);
  }, []);

  const RoleCard = React.memo(({ role, isSelected, onSelect, onInfo }) => {
    const handleInfoPress = (e) => {
      e.stopPropagation();
      onInfo(role);
    };

    return (
      <div
        onClick={() => onSelect(role.id)}
        className={`
          relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ease-in-out h-full
          ${isSelected 
            ? `ring-2 ring-opacity-50 scale-[1.02] shadow-lg border-[${role.color}] bg-[${role.lightColor}]` 
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }
        `}
        style={{
          borderColor: isSelected ? role.color : undefined,
          backgroundColor: isSelected ? role.lightColor : undefined,
          boxShadow: isSelected ? `0 8px 25px -5px ${role.color}40` : undefined
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div 
            className={`rounded-lg p-2 transition-colors ${
              isSelected ? 'bg-white shadow-sm' : 'bg-gray-100'
            }`}
            style={{
              backgroundColor: isSelected ? 'white' : undefined
            }}
          >
            <div 
              className={isSelected ? `text-[${role.color}]` : 'text-gray-500'}
              style={{ color: isSelected ? role.color : undefined }}
            >
              {role.icon}
            </div>
          </div>
          
          <button
            onClick={handleInfoPress}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Show role details"
          >
            <FaInfoCircle className="text-sm" />
          </button>
        </div>
        
        <div className="space-y-2">
          <h3 
            className={`font-semibold text-lg mb-1 ${
              isSelected ? `text-[${role.color}]` : 'text-gray-900'
            }`}
            style={{ color: isSelected ? role.color : undefined }}
          >
            {role.label}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">{role.description}</p>
        </div>
        
        {isSelected && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span 
              className="text-xs font-medium px-2 py-1 rounded-full text-white shadow-sm"
              style={{ backgroundColor: role.color }}
            >
              Selected
            </span>
          </div>
        )}
      </div>
    );
  });

  const RoleDetailsModal = () => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity duration-300 ${
      modalVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden transform transition-transform duration-300 ${
        modalVisible ? 'scale-100' : 'scale-95'
      }`}>
        {showRoleDetails && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div 
                  className="rounded-xl p-3"
                  style={{ backgroundColor: showRoleDetails.lightColor }}
                >
                  <div style={{ color: showRoleDetails.color }}>
                    {showRoleDetails.icon}
                  </div>
                </div>
                <h4 className="font-bold text-gray-900 text-lg">
                  {showRoleDetails.details.title}
                </h4>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Key Features:</h5>
                <ul className="space-y-2">
                  {showRoleDetails.details.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <span 
                        className="text-green-500 mr-3 mt-1 shrink-0"
                        style={{ color: showRoleDetails.color }}
                      >
                        •
                      </span>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Benefits:</h5>
                <ul className="space-y-2">
                  {showRoleDetails.details.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-3 mt-1 shrink-0">•</span>
                      <span className="text-sm text-gray-600">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <button 
                className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:shadow-lg"
                style={{ 
                  background: `linear-gradient(to right, ${showRoleDetails.gradient[0]}, ${showRoleDetails.gradient[1]})`
                }}
                onClick={closeModal}
              >
                Got It
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-r from-[#F9A52B] to-[#ED1C24] flex items-center justify-center shadow-lg">
              <FaGlobeAfrica className="text-white text-lg" />
            </div>
            <h1 className="ml-3 text-2xl sm:text-3xl font-bold text-gray-900">TRADE UGANDA</h1>
          </div>
          <p className="text-base text-gray-600 px-4 max-w-2xl mx-auto leading-relaxed">
            Uganda's premier B2B e-commerce platform connecting businesses across the supply chain
          </p>
        </div>
        
        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Panel - Information */}
          <div className="lg:w-2/5 bg-linear-to-br from-[#000000] to-[#1D3C5F] text-white rounded-2xl shadow-xl p-6 lg:p-8">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-4">Join Uganda's Business Network</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Select your role to access tailored features designed for your business needs
              </p>
              
              <div className="space-y-6 mt-8">
                {[
                  { step: 1, title: 'Select Your Role', desc: 'Identify how you will use the platform' },
                  { step: 2, title: 'Create Account', desc: 'Set up your business profile with relevant details' },
                  { step: 3, title: 'Access Dashboard', desc: 'Start managing your business operations' }
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md shrink-0 ${
                      item.step === 1 ? 'bg-[#F9A52B]' : 'bg-gray-600'
                    }`}>
                      <span className="text-white font-bold text-sm">{item.step}</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold text-base mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
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
                  className="text-[#F9A52B] hover:text-[#FFC107] font-medium underline cursor-pointer transition-colors"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
          
          {/* Right Panel - Role Selection */}
          <div className="lg:w-3/5 bg-white rounded-2xl shadow-xl p-6 lg:p-8">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Select Your Role</h2>
              <p className="text-gray-600">Choose your function in the supply chain to get started</p>
            </div>
            
            {/* Role Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  isSelected={selectedRole === role.id}
                  onSelect={handleRoleSelect}
                  onInfo={handleRoleInfo}
                />
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t border-gray-200">
              <button
                onClick={handleSignIn}
                className="flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 bg-linear-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white shadow-lg hover:shadow-xl w-full sm:w-auto"
              >
                <FaSignInAlt className="mr-2" />
                Sign In
              </button>
              
              <button
                onClick={handleContinue}
                disabled={!selectedRole}
                className={`flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 w-full sm:w-auto ${
                  selectedRole 
                    ? 'bg-linear-to-r from-[#F9A52B] to-[#ED1C24] hover:from-[#FFB347] hover:to-[#F44336] text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue to Registration
                <FaChevronRight className="ml-2" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} TRADE UGANDA. Uganda's Premier B2B Platform. All rights reserved.
          </p>
        </div>
      </div>

      <RoleDetailsModal />
    </div>
  );
};

export default RoleSelection;