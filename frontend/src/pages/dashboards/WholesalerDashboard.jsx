import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import {
  FaIndustry,
  FaTruck,
  FaBoxes,
  FaChartBar,
  FaShoppingCart,
  FaUsers,
  FaClipboardList,
  FaShippingFast,
  FaComments,
  FaSun,
  FaMoon,
  FaWarehouse,
  FaHome
} from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import ChatSidebar from '../../components/ChatComponents/ChatSidebar';
import ChatWindow from '../../components/ChatComponents/ChatWindow';
import Retailers from '../../components/WholesalerComponents/Retailers';
import Products from '../../components/WholesalerComponents/Products';
import Orders from '../../components/WholesalerComponents/Orders';
import MyStock from '../../components/WholesalerComponents/MyStock';
import OutOrders from '../../components/WholesalerComponents/OutOrders';
import Settings from '../../components/Settings';
import Suppliers from '../../components/WholesalerComponents/Suppliers';
import Overview from '../../components/WholesalerComponents/OverView'; // ✅ Import Overview
import io from 'socket.io-client';

const WholesalerDashboard = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [socket, setSocket] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    if (user) {
      newSocket.emit('join', user._id);
    }
    return () => newSocket.close();
  }, [user]);

  // track active tab by route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/products')) setActiveTab('products');
    else if (path.includes('/orders')) setActiveTab('orders');
    else if (path.includes('/retailers')) setActiveTab('retailers');
    else if (path.includes('/MyStock')) setActiveTab('MyStock');
    else if (path.includes('/outorders')) setActiveTab('outorders');
    else if (path.includes('/suppliers')) setActiveTab('suppliers');
    else if (path.includes('/chat')) setActiveTab('chat');
    else if (path.includes('/settings')) setActiveTab('settings');
    else setActiveTab('overview'); // ✅ Default to overview
  }, [location]);

  const roleSpecificItems = {
    title: 'Wholesaler Portal',
    items: [
      { id: 'overview', label: 'Overview', icon: <FaChartBar /> }, // ✅ Added Overview
      { id: 'products', label: 'Products', icon: <FaBoxes /> },
      { id: 'orders', label: 'In Orders', icon: <FaShoppingCart /> },
      { id: 'retailers', label: 'Retailers', icon: <FaUsers /> },
      { id: 'MyStock', label: 'My Stock', icon: <FaClipboardList /> },
      { id: 'outorders', label: 'Out Orders', icon: <FaShippingFast /> },
      { id: 'suppliers', label: 'Suppliers', icon: <FaWarehouse /> },
      { id: 'chat', label: 'Chat', icon: <FaComments /> },
    ]
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'chat') setSelectedConversation(null);

    const basePath = '/dashboard/wholesaler';
    let path = basePath;

    switch (tabId) {
      case 'overview': path = `${basePath}`; break; // ✅ Overview route
      case 'products': path = `${basePath}/products`; break;
      case 'orders': path = `${basePath}/orders`; break;
      case 'retailers': path = `${basePath}/retailers`; break;
      case 'MyStock': path = `${basePath}/MyStock`; break;
      case 'outorders': path = `${basePath}/outorders`; break;
      case 'suppliers': path = `${basePath}/suppliers`; break;
      case 'chat': path = `${basePath}/chat`; break;
      case 'settings': path = `${basePath}/settings`; break;
      default: path = basePath;
    }
    navigate(path);
  };

  const handleCloseSidebar = () => setIsSidebarOpen(false);

  const handleSelectConversation = async (selectedUser) => {
    try {
      const response = await fetch('http://localhost:5000/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: selectedUser._id,
          userId: user._id
        }),
      });
      const data = await response.json();
      if (data.success) setSelectedConversation(data.conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleCloseChat = () => setSelectedConversation(null);
  const handleContactRetailer = (retailer) => console.log('Contacting retailer:', retailer);
  const handleViewRetailerOrders = (retailer) => console.log('Viewing orders for:', retailer);

  const renderContent = () => (
    <Routes>
      <Route path="/" element={<Overview />} /> {/* ✅ Overview as default route */}
      <Route path="/products" element={<Products />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/retailers" element={
        <Retailers
          user={user}
          onContactRetailer={handleContactRetailer}
          onViewRetailerOrders={handleViewRetailerOrders}
        />
      } />
      <Route path="/MyStock" element={<MyStock navigate={navigate} />} />
      <Route path="/outorders" element={<OutOrders />} />
      <Route path="/suppliers" element={<Suppliers />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/chat" element={
        <div className="flex-1 flex flex-col lg:flex-row bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden h-[calc(100vh-12rem)] mt-2">
          <div className={`
            w-full lg:w-72 border-r border-gray-200 dark:border-gray-700
            ${selectedConversation ? 'hidden lg:block' : 'block'}
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
          <div className={`flex-1 ${selectedConversation ? 'block' : 'hidden lg:block'}`}>
            {selectedConversation ? (
              <div className="h-full pt-12">
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
      } />
    </Routes>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 mr-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Wholesaler Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleDarkMode}
                className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <FaSun className="h-4 w-4" /> : <FaMoon className="h-4 w-4" />}
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Welcome, {user?.businessName || user?.firstName}
              </span>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
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
          <main className="h-full overflow-auto">
            <div className="max-w-8xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default WholesalerDashboard;