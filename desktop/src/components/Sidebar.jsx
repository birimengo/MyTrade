// src/components/Sidebar.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import {
  FaHome,
  FaCog,
  FaMoon,
  FaSun,
  FaSignOutAlt,
  FaTimes,
  FaShoppingCart,
  FaBoxOpen,
  FaUsers,
  FaFileInvoice,
  FaComments,
  FaDollarSign,
  FaChartLine,
  FaBoxes,
  FaIndustry,
  FaShippingFast,
  FaWarehouse,
  FaClipboardList,
  FaTruck,
  FaUser,
  FaBuilding,
  FaMoneyBillWave,
  FaBox,
  FaClipboardCheck,
  FaRoute,
  FaCalendarAlt,
  FaChartBar, // Added for BMS
  FaBusinessTime // Added for BMS
} from "react-icons/fa";

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, isElectron, isDarkMode }) => {
  const { toggleDarkMode } = useDarkMode();
  const { logout, user } = useAuth();

  // Enhanced logout handler with proper error handling
  const handleLogout = async () => {
    console.log('🔄 Sidebar: Logout initiated');
    try {
      const result = await logout();
      if (result.success) {
        console.log('✅ Sidebar: Logout successful');
        // The logout function will handle the page reload
      } else {
        console.error('❌ Sidebar: Logout failed:', result.message);
        // Fallback: clear storage and reload
        localStorage.clear();
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Sidebar: Logout error:', error);
      // Emergency fallback
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const handleNavigation = (tabId) => {
    console.log('🎯 Sidebar: Navigation to tab:', tabId);
    setActiveTab(tabId);
    if (typeof onClose === "function") {
      onClose();
    }
  };

  // Dark mode utility functions
  const getBgClass = () => isDarkMode ? 'bg-gray-800' : 'bg-white';
  const getCardBgClass = () => isDarkMode ? 'bg-gray-700' : 'bg-white';
  const getCardBorderClass = () => isDarkMode ? 'border-gray-600' : 'border-gray-200';
  const getTextClass = () => isDarkMode ? 'text-white' : 'text-gray-900';
  const getTextSecondaryClass = () => isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const getHoverClass = () => isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

  // Common items for all roles
  const commonItems = [
    { id: "overview", label: "Overview", icon: <FaHome className="text-lg" /> },
    { id: "settings", label: "Settings", icon: <FaCog className="text-lg" /> },
  ];

  // Role-specific items - UPDATED with BMS for wholesaler
  const getRoleSpecificItems = () => {
    switch (user?.role) {
      case 'retailer':
        return [
          { id: "orders", label: "Orders", icon: <FaShoppingCart className="text-lg" /> },
          { id: "inventory", label: "My Stock", icon: <FaBoxOpen className="text-lg" /> },
          { id: "wholesalers", label: "Wholesalers", icon: <FaUsers className="text-lg" /> },
          { id: "daily-sales", label: "Daily Sales", icon: <FaDollarSign className="text-lg" /> },
          { id: "receipts", label: "Receipts", icon: <FaFileInvoice className="text-lg" /> },
          { id: "chat", label: "Chat", icon: <FaComments className="text-lg" /> },
        ];
      case 'wholesaler':
        return [
          { id: "products", label: "Products", icon: <FaBoxes className="text-lg" /> },
          { id: "orders", label: "In Orders", icon: <FaShoppingCart className="text-lg" /> },
          { id: "retailers", label: "Retailers", icon: <FaUsers className="text-lg" /> },
          { id: "mystock", label: "My Stock", icon: <FaClipboardList className="text-lg" /> },
          { id: "outorders", label: "Out Orders", icon: <FaShippingFast className="text-lg" /> },
          { id: "suppliers", label: "Suppliers", icon: <FaWarehouse className="text-lg" /> },
          { id: "bms", label: "BMS", icon: <FaChartBar className="text-lg" />, badge: "NEW" }, // Added BMS
          { id: "chat", label: "Chat", icon: <FaComments className="text-lg" /> },
        ];
      case 'supplier':
        return [
          { id: "materials", label: "Raw Materials", icon: <FaIndustry className="text-lg" /> },
          { id: "production", label: "Production", icon: <FaIndustry className="text-lg" /> },
          { id: "mystock", label: "My Stock", icon: <FaWarehouse className="text-lg" /> },
          { id: "shipments", label: "Shipments", icon: <FaShippingFast className="text-lg" /> },
          { id: "clients", label: "Clients", icon: <FaUsers className="text-lg" /> },
          { id: "orders", label: "Orders", icon: <FaShoppingCart className="text-lg" /> },
          { id: "chat", label: "Chat", icon: <FaComments className="text-lg" /> },
        ];
      case 'transporter':
        return [
          { id: "deliveries", label: "Deliveries", icon: <FaShippingFast className="text-lg" /> },
          { id: "vehicles", label: "Vehicles", icon: <FaTruck className="text-lg" /> },
          { id: "routes", label: "Routes", icon: <FaRoute className="text-lg" /> },
          { id: "schedule", label: "Schedule", icon: <FaCalendarAlt className="text-lg" /> },
          { id: "earnings", label: "Earnings", icon: <FaMoneyBillWave className="text-lg" /> },
          { id: "w-orders", label: "W-Orders", icon: <FaClipboardCheck className="text-lg" /> },
          { id: "s-orders", label: "S-Orders", icon: <FaBox className="text-lg" /> },
          { id: "chat", label: "Chat", icon: <FaComments className="text-lg" /> },
        ];
      default:
        return [];
    }
  };

  const roleSpecificItems = getRoleSpecificItems();
  const allItems = [...commonItems, ...roleSpecificItems];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`
          fixed lg:sticky z-40
          ${isElectron ? 'top-12' : 'top-0'} left-0
          w-64 ${getBgClass()} shadow-lg
          ${isElectron ? 'h-[calc(100vh-60px)]' : 'h-[calc(100vh-20px)]'}
          p-4
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col
          border-r ${getCardBorderClass()}
          rounded-br-lg
        `}
      >
        {/* Close button for mobile - top right */}
        {typeof onClose === "function" && (
          <button
            onClick={handleClose}
            className={`lg:hidden absolute top-4 right-4 p-2 rounded-lg ${getHoverClass()} transition-colors duration-200 ${
              isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaTimes className="text-lg" />
          </button>
        )}

        {/* User info section */}
        <div className={`p-4 border-b ${getCardBorderClass()} mb-4 shrink-0`}>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'
            } text-white text-sm font-medium shadow-md`}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${getTextClass()} truncate`}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className={`text-xs ${getTextSecondaryClass()} capitalize truncate`}>
                {user?.role}
              </p>
              {user?.businessName && (
                <div className="flex items-center mt-1">
                  <FaBuilding className={`text-xs mr-1 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} truncate`}>
                    {user.businessName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable area */}
        <nav className="flex-1 overflow-y-auto">
          <div className="space-y-1">
            {allItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)} // FIXED: Added closing parenthesis
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                  activeTab === item.id
                    ? `${
                        isDarkMode 
                          ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' 
                          : 'bg-blue-100 text-blue-600 border border-blue-200'
                      } shadow-sm`
                    : `${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`
                }`}
              >
                <span className={`mr-3 flex-shrink-0 transition-colors duration-200 ${
                  activeTab === item.id
                    ? isDarkMode ? 'text-blue-300' : 'text-blue-600'
                    : isDarkMode ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium truncate">{item.label}</span>
                
                {/* Badge for new features */}
                {item.badge && (
                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                    isDarkMode 
                      ? 'bg-green-500 text-white' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {item.badge}
                  </span>
                )}
                
                {activeTab === item.id && (
                  <div className={`ml-auto w-2 h-2 rounded-full ${
                    isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                  }`}></div>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom controls - Fixed at bottom with extra margin */}
        <div className={`border-t ${getCardBorderClass()} pt-4 space-y-2 shrink-0 mt-4 mb-4`}>
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
              isDarkMode
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                : 'bg-gray-800/10 text-gray-700 border border-gray-300/50'
            }`}
          >
            <span className={`mr-3 flex-shrink-0 ${
              isDarkMode ? 'text-yellow-400' : 'text-gray-600'
            }`}>
              {isDarkMode ? <FaSun className="text-lg" /> : <FaMoon className="text-lg" />}
            </span>
            <span className="text-sm font-medium truncate">
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </span>
            <div className={`ml-auto w-2 h-2 rounded-full ${
              isDarkMode ? 'bg-yellow-400' : 'bg-gray-600'
            }`}></div>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
              isDarkMode
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            }`}
          >
            <span className={`mr-3 flex-shrink-0 ${
              isDarkMode ? 'text-red-400' : 'text-red-500'
            }`}>
              <FaSignOutAlt className="text-lg" />
            </span>
            <span className="text-sm font-medium truncate">Logout</span>
            <div className={`ml-auto w-2 h-2 rounded-full ${
              isDarkMode ? 'bg-red-400' : 'bg-red-500'
            }`}></div>
          </button>

          {/* User Status Indicator */}
          <div className={`px-4 py-2 rounded-lg text-xs ${
            isDarkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-600'
          }`}>
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isDarkMode ? 'bg-green-400' : 'bg-green-500'
                }`}></div>
                <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;