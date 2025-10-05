import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaWarehouse, 
  FaShippingFast, 
  FaUsers, 
  FaDollarSign,
  FaClipboardList,
  FaIndustry,
  FaBox,
  FaComments,
  FaSun,
  FaMoon,
  FaTools,
  FaBoxes,
  FaChartLine,
  FaUserTie
} from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import ChatSidebar from '../../components/ChatComponents/ChatSidebar';
import ChatWindow from '../../components/ChatComponents/ChatWindow';
import io from 'socket.io-client';

// Import component stubs
import Materials from '../../components/SupplierComponents/Materials';
import Production from '../../components/SupplierComponents/Production';
import Shipments from '../../components/SupplierComponents/Shipments';
import Clients from '../../components/SupplierComponents/Clients';
import Orders from '../../components/SupplierComponents/Orders';
import Settings from '../../components/Settings';
import MyStock from '../../components/SupplierComponents/MyStock';
import Overview from '../../components/SupplierComponents/OverView'; // ✅ Import Overview

const SupplierDashboard = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [socket, setSocket] = useState(null);
  const [chatFilter, setChatFilter] = useState('');
  const [autoOpenChat, setAutoOpenChat] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Join user's room
    if (user) {
      newSocket.emit('join', user._id);
    }

    return () => newSocket.close();
  }, [user]);

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/materials')) {
      setActiveTab('materials');
    } else if (path.includes('/production')) {
      setActiveTab('production');
    } else if (path.includes('/mystock')) {
      setActiveTab('mystock');
    } else if (path.includes('/shipments')) {
      setActiveTab('shipments');
    } else if (path.includes('/clients')) {
      setActiveTab('clients');
    } else if (path.includes('/orders')) {
      setActiveTab('orders');
    } else if (path.includes('/chat')) {
      setActiveTab('chat');
    } else if (path.includes('/settings')) {
      setActiveTab('settings');
    } else {
      setActiveTab('overview'); // ✅ Default to overview
    }
  }, [location]);

  // Reset auto-open after first render
  useEffect(() => {
    if (autoOpenChat) {
      setAutoOpenChat(false);
    }
  }, [autoOpenChat]);

  const roleSpecificItems = {
    title: 'Supplier Portal',
    items: [
      { id: 'overview', label: 'Overview', icon: <FaChartLine /> }, // ✅ Added Overview
      { id: 'materials', label: 'Raw Materials', icon: <FaBox /> },
      { id: 'production', label: 'Production', icon: <FaIndustry /> },
      { id: 'mystock', label: 'My Stock', icon: <FaWarehouse /> },
      { id: 'shipments', label: 'Shipments', icon: <FaShippingFast /> },
      { id: 'clients', label: 'Clients', icon: <FaUsers /> },
      { id: 'orders', label: 'Orders', icon: <FaClipboardList /> },
      { id: 'chat', label: 'Chat', icon: <FaComments /> },
    ]
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'chat') {
      setSelectedConversation(null);
      setChatFilter('');
    }

    // Navigate to the appropriate route
    const basePath = '/dashboard/supplier';
    let path = basePath;

    switch (tabId) {
      case 'overview':
        path = `${basePath}`; // ✅ Overview route
        break;
      case 'materials':
        path = `${basePath}/materials`;
        break;
      case 'production':
        path = `${basePath}/production`;
        break;
      case 'mystock':
        path = `${basePath}/mystock`;
        break;
      case 'shipments':
        path = `${basePath}/shipments`;
        break;
      case 'clients':
        path = `${basePath}/clients`;
        break;
      case 'orders':
        path = `${basePath}/orders`;
        break;
      case 'chat':
        path = `${basePath}/chat`;
        break;
      case 'settings':
        path = `${basePath}/settings`;
        break;
      default:
        path = basePath;
    }

    navigate(path);
  };

  // Function to trigger chat opening with filter
  const openChatWithFilter = (roleFilter = '') => {
    setChatFilter(roleFilter);
    setAutoOpenChat(true);
    setActiveTab('chat');
    navigate('/dashboard/supplier/chat');
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = async (selectedUser) => {
    try {
      // Create or get conversation
      const response = await fetch('http://localhost:5000/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: selectedUser._id,
          userId: user._id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedConversation(data.conversation);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
  };

  // Compact Chat Layout
  const renderChat = () => (
    <div className="flex-1 flex flex-col lg:flex-row bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden h-[calc(100vh-10rem)] border border-gray-100 dark:border-gray-700">
      {/* Chat Sidebar */}
      <div className={`
        w-full lg:w-64 border-r border-gray-200 dark:border-gray-700
        ${selectedConversation ? 'hidden lg:block' : 'block'}
      `}>
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Messages</h2>
        </div>
        <div className="h-full">
          <ChatSidebar
            onSelectConversation={handleSelectConversation}
            isEmbedded={true}
            socket={socket}
            autoOpen={autoOpenChat}
            initialFilter={chatFilter}
          />
        </div>
      </div>

      {/* Chat Window */}
      <div className={`
        flex-1 ${selectedConversation ? 'block' : 'hidden lg:block'}
      `}>
        {selectedConversation ? (
          <div className="h-full">
            <ChatWindow
              conversation={selectedConversation}
              onClose={handleCloseChat}
              socket={socket}
              isEmbedded={true}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center p-4">
              <FaComments className="mx-auto text-xl text-gray-400 mb-2" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Select a conversation
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose a user from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    return (
      <Routes>
        <Route path="/" element={<Overview />} /> {/* ✅ Overview as default route */}
        <Route path="/materials" element={<Materials />} />
        <Route path="/production" element={<Production />} />
        <Route path="/mystock" element={<MyStock />} />
        <Route path="/shipments" element={<Shipments />} />
        <Route path="/clients" element={<Clients onMessageWholesaler={openChatWithFilter} />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/chat" element={renderChat()} />
        
        {/* Catch-all route */}
        <Route path="*" element={
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Page Not Found</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">The requested page doesn't exist.</p>
              <button
                onClick={() => navigate('/dashboard/supplier')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        } />
      </Routes>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Compact Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 mr-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Supplier Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <FaSun className="h-3.5 w-3.5" />
                ) : (
                  <FaMoon className="h-3.5 w-3.5" />
                )}
              </button>
              
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {user?.businessName || user?.firstName}
              </span>
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">
                {user?.businessName?.charAt(0) || user?.firstName?.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          roleSpecificItems={roleSpecificItems}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
        />
        
        <div className="flex-1 overflow-hidden ml-0 lg:ml-56">
          {/* Main Content */}
          <main className="h-full overflow-auto">
            <div className="max-w-8xl mx-auto px-2 sm:px-3 lg:px-4 py-2">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;