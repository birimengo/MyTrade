import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaStore, 
  FaShoppingCart, 
  FaChartLine, 
  FaBoxOpen,
  FaUsers,
  FaListAlt,
  FaFileInvoice,
  FaComments,
  FaSun,
  FaMoon,
  FaDollarSign,
  FaBars
} from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import Overview from '../../components/RetailerComponents/Overview';
import Orders from '../../components/RetailerComponents/Orders';
import Inventory from '../../components/RetailerComponents/MyStock';
import DailySales from '../../components/RetailerComponents/DailySales';
import Receipts from '../../components/RetailerComponents/Receipts';
import Wholesaler from '../../components/RetailerComponents/Wholesaler';
import WholesalerProducts from '../../components/RetailerComponents/WholesalerProducts';
import ChatSidebar from '../../components/ChatComponents/ChatSidebar';
import Settings from '../../components/Settings';
import ChatWindow from '../../components/ChatComponents/ChatWindow';
import io from 'socket.io-client';

const RetailerDashboard = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [socket, setSocket] = useState(null);
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
    if (path.includes('/wholesalers')) {
      setActiveTab('Wholesaler');
    } else if (path.includes('/orders')) {
      setActiveTab('orders');
    } else if (path.includes('/MyStock')) {
      setActiveTab('MyStock');
    } else if (path.includes('/daily-sales')) {
      setActiveTab('daily-sales');
    } else if (path.includes('/receipts')) {
      setActiveTab('receipts');
    } else if (path.includes('/chat')) {
      setActiveTab('chat');
    } else if (path.includes('/settings')) {
      setActiveTab('settings');
    } else {
      setActiveTab('overview');
    }
  }, [location]);

  const roleSpecificItems = {
    title: 'Retailer Portal',
    items: [
      { id: 'orders', label: 'Orders', icon: <FaShoppingCart /> },
      { id: 'MyStock', label: 'My Stock', icon: <FaBoxOpen /> },
      { id: 'Wholesaler', label: 'Wholesaler', icon: <FaUsers /> },
      { id: 'daily-sales', label: 'Daily Sales', icon: <FaDollarSign /> },
      { id: 'receipts', label: 'Receipts', icon: <FaFileInvoice /> },
      { id: 'chat', label: 'Chat', icon: <FaComments /> },
    ]
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'chat') {
      setSelectedConversation(null);
    }
    
    // Navigate to the appropriate route
    const basePath = '/dashboard/retailer';
    let path = basePath;
    
    switch (tabId) {
      case 'orders':
        path = `${basePath}/orders`;
        break;
      case 'MyStock':
        path = `${basePath}/MyStock`;
        break;
      case 'Wholesaler':
        path = `${basePath}/wholesalers`;
        break;
      case 'daily-sales':
        path = `${basePath}/daily-sales`;
        break;
      case 'receipts':
        path = `${basePath}/receipts`;
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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

  const renderContent = () => {
    return (
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/MyStock" element={<Inventory />} />
        <Route path="/daily-sales" element={<DailySales />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/wholesalers" element={<Wholesaler />} />
        <Route path="/wholesalers/:wholesalerId/products" element={<WholesalerProducts />} />
        <Route path="/settings" element={<Settings />} />
        <Route 
          path="/chat" 
          element={
            <div className="flex-1 flex flex-col lg:flex-row bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden h-[500px]">
              {/* Chat Sidebar - Hidden on mobile when conversation is selected */}
              <div className={`
                w-full lg:w-72 border-r border-gray-200 dark:border-gray-700
                ${selectedConversation ? 'hidden lg:block' : 'block'}
                h-full
              `}>
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-md font-semibold text-gray-800 dark:text-white">Messages</h2>
                </div>
                <div className="h-full pt-1">
                  <ChatSidebar
                    onSelectConversation={handleSelectConversation}
                    isEmbedded={true}
                    socket={socket}
                  />
                </div>
              </div>

              {/* Chat Window */}  
              <div className={`
                flex-1 ${selectedConversation ? 'block' : 'hidden lg:block'}
                h-full
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
                      <FaComments className="mx-auto text-3xl text-gray-400 mb-2" />
                      <h3 className="text-md font-medium text-gray-900 dark:text-white mb-1">
                        Select a conversation
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Choose a user from the sidebar to start chatting
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          } 
        />
      </Routes>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 mr-3 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Toggle menu"
              >
                <FaBars className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Retailer Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3">
              {/* Dark Mode Toggle Button */}
              <button
                onClick={toggleDarkMode}
                className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <FaSun className="h-4 w-4" />
                ) : (
                  <FaMoon className="h-4 w-4" />
                )}
              </button>
              
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
                Welcome, {user?.firstName}
              </span>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.firstName?.charAt(0)}
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
        
        {/* Main content area - Key fix: Add ml-0 lg:ml-56 to account for sidebar width */}
        <div className="flex-1 overflow-auto ml-0 lg:ml-56 transition-all duration-300">
          {/* Overlay for mobile when sidebar is open */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={handleCloseSidebar}
            />
          )}
          
          {/* Main Content */}
          <main className="h-full w-full">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default RetailerDashboard;