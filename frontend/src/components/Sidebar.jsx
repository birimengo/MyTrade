// Sidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDarkMode } from "../context/DarkModeContext";
import { useAuth } from "../context/AuthContext";
import {
  FaHome,
  FaCog,
  FaMoon,
  FaSun,
  FaSignOutAlt,
  FaTimes,
} from "react-icons/fa";

const Sidebar = ({ activeTab, setActiveTab, roleSpecificItems, isOpen, onClose }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine the base path based on user role
  const getBasePath = () => {
    switch (user?.role) {
      case 'retailer':
        return '/dashboard/retailer';
      case 'wholesaler':
        return '/dashboard/wholesaler';
      case 'supplier':
        return '/dashboard/supplier';
      case 'transporter':
        return '/dashboard/transporter';
      case 'admin':
        return '/dashboard/admin';
      default:
        return '/dashboard';
    }
  };

  const basePath = getBasePath();

  const commonItems = [
    { id: "overview", label: "Overview", icon: <FaHome />, path: basePath },
    { id: "settings", label: "Settings", icon: <FaCog />, path: `${basePath}/settings` },
  ];

  // Map role-specific items to paths - handle special cases
  const roleItemsWithPaths = roleSpecificItems.items.map(item => {
    let path = `${basePath}/${item.id.toLowerCase()}`;
    
    // Handle special cases where the path might need adjustment
    if (item.id === 'Wholesaler') {
      path = `${basePath}/wholesalers`; // Change to plural
    }
    
    return { 
      ...item, 
      path: path
    };
  });

  const handleLogout = () => {
    logout();
  };

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const handleNavigation = (path, tabId) => {
    setActiveTab(tabId);
    navigate(path);
    if (typeof onClose === "function") {
      onClose();
    }
  };

  // Check if a path is active - improved logic
  const isActivePath = (path) => {
    if (path === basePath) {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    
    // For exact matches or path starts with
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
<div
  className={`
    fixed left-0 top-16 z-50   /* Start below header (if header is 64px tall = top-16) */
    w-56 bg-white dark:bg-gray-800 shadow-lg
    h-[calc(100vh-4rem)]       /* Full height minus header (4rem = 64px) */
    p-4                        /* Padding inside the sidebar */
    transform transition-transform duration-300 ease-in-out
    ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
    flex flex-col
  `}
>


    
      {/* Close button for mobile */}
      <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          {roleSpecificItems.title}
        </h2>
        {typeof onClose === "function" && (
          <button
            onClick={handleClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Desktop title */}
      <div className="hidden lg:block p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          {roleSpecificItems.title}
        </h2>
      </div>

      {/* Scrollable navigation area */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-2">
          {commonItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path, item.id)}
              className={`w-full flex items-center px-3 py-2 rounded-lg ${
                isActivePath(item.path)
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              } transition-colors duration-200`}
            >
              <span className="mr-3 text-sm">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          {/* Role-specific items */}
          {roleItemsWithPaths.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path, item.id)}
              className={`w-full flex items-center px-3 py-2 rounded-lg ${
                isActivePath(item.path)
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              } transition-colors duration-200`}
            >
              <span className="mr-3 text-sm">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom section with theme toggle and logout */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 mt-auto">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 mb-2 transition-colors duration-200"
        >
          <span className="mr-3 text-sm">{isDarkMode ? <FaSun /> : <FaMoon />}</span>
          <span className="text-sm">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors duration-200"
        >
          <span className="mr-3 text-sm">
            <FaSignOutAlt />
          </span>
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;