import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaTruck, 
  FaMapMarkerAlt, 
  FaMoneyBillWave, 
  FaClock,
  FaShippingFast,
  FaRoute,
  FaCalendarAlt,
  FaDollarSign,
  FaComments,
  FaSun,
  FaMoon,
  FaTools,
  FaToggleOn,
  FaToggleOff,
  FaClipboardList,
  FaBox,
  FaBars
} from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import ChatSidebar from '../../components/ChatComponents/ChatSidebar';
import ChatWindow from '../../components/ChatComponents/ChatWindow';
import io from 'socket.io-client';

// Import components
import Deliveries from '../../components/TransporterComponents/Deliveries';
import Vehicles from '../../components/TransporterComponents/Vehicles';
import RoutesComponent from '../../components/TransporterComponents/Routes';
import Schedule from '../../components/TransporterComponents/Schedule';
import Earnings from '../../components/TransporterComponents/Earnings';
import Settings from '../../components/Settings';
import TransporterOrders from '../../components/TransporterComponents/TransporterOrders';
import SupplierOrders from '../../components/TransporterComponents/SupplierOrders';
import Overview from '../../components/TransporterComponents/Overview'; // Import the Overview component

const TransporterDashboard = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
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

  // Fetch transporter's active status on component mount
  useEffect(() => {
    const fetchTransporterStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/transporters/status/${user._id}`);
        const data = await response.json();
        
        if (data.success) {
          setIsActive(data.isActive);
        }
      } catch (error) {
        console.error('Error fetching transporter status:', error);
      }
    };

    if (user && user._id) {
      fetchTransporterStatus();
    }
  }, [user]);

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/deliveries')) {
      setActiveTab('deliveries');
    } else if (path.includes('/vehicles')) {
      setActiveTab('vehicles');
    } else if (path.includes('/routes')) {
      setActiveTab('routes');
    } else if (path.includes('/schedule')) {
      setActiveTab('schedule');
    } else if (path.includes('/earnings')) {
      setActiveTab('earnings');
    } else if (path.includes('/w-orders')) {
      setActiveTab('w-orders');
    } else if (path.includes('/s-orders')) {
      setActiveTab('s-orders');
    } else if (path.includes('/chat')) {
      setActiveTab('chat');
    } else if (path.includes('/settings')) {
      setActiveTab('settings');
    } else {
      setActiveTab('overview');
    }
  }, [location]);

  const toggleActiveStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch('http://localhost:5000/api/transporters/toggle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transporterId: user._id,
          isActive: !isActive
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsActive(!isActive);
      } else {
        console.error('Failed to update status:', data.message);
      }
    } catch (error) {
      console.error('Error updating transporter status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const roleSpecificItems = {
    title: 'Transporter Portal',
    items: [
      { id: 'deliveries', label: 'Deliveries', icon: <FaTruck /> },
      { id: 'vehicles', label: 'Vehicles', icon: <FaShippingFast /> },
      { id: 'routes', label: 'Routes', icon: <FaRoute /> },
      { id: 'schedule', label: 'Schedule', icon: <FaCalendarAlt /> },
      { id: 'earnings', label: 'Earnings', icon: <FaDollarSign /> },
      { id: 'w-orders', label: 'W-Orders', icon: <FaClipboardList /> },
      { id: 's-orders', label: 'S-Orders', icon: <FaBox /> },
      { id: 'chat', label: 'Chat', icon: <FaComments /> },
    ]
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'chat') {
      setSelectedConversation(null);
    }
    
    // Navigate to the appropriate route
    const basePath = '/dashboard/transporter';
    let path = basePath;
    
    switch (tabId) {
      case 'deliveries':
        path = `${basePath}/deliveries`;
        break;
      case 'vehicles':
        path = `${basePath}/vehicles`;
        break;
      case 'routes':
        path = `${basePath}/routes`;
        break;
      case 'schedule':
        path = `${basePath}/schedule`;
        break;
      case 'earnings':
        path = `${basePath}/earnings`;
        break;
      case 'w-orders':
        path = `${basePath}/w-orders`;
        break;
      case 's-orders':
        path = `${basePath}/s-orders`;
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
        <Route path="/deliveries" element={<Deliveries />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/routes" element={<RoutesComponent />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/w-orders" element={<TransporterOrders />} />
        <Route path="/s-orders" element={<SupplierOrders />} />
        <Route path="/chat" element={
          <div className="min-h-[calc(100vh-12rem)] flex flex-col">
            <div className="flex-1 flex flex-col lg:flex-row bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {/* Chat Sidebar - Hidden on mobile when conversation is selected */}
              <div className={`
                w-full lg:w-72 border-r border-gray-200 dark:border-gray-700
                ${selectedConversation ? 'hidden lg:block' : 'block'}
              `}>
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-md font-semibold text-gray-800 dark:text-white">Messages</h2>
                </div>
                <div className="h-full">
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
              `}>
                {selectedConversation ? (
                  <ChatWindow
                    conversation={selectedConversation}
                    onClose={handleCloseChat}
                    socket={socket}
                    isEmbedded={true}
                  />
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
          </div>
        } />
        <Route path="/settings" element={<Settings />} />
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Transporter Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3">
              {/* Active/Inactive Toggle Button */}
              <button
                onClick={toggleActiveStatus}
                disabled={loadingStatus}
                className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                  isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
                aria-label={isActive ? "Set as inactive" : "Set as active"}
              >
                {loadingStatus ? (
                  <span>Updating...</span>
                ) : (
                  <>
                    {isActive ? (
                      <FaToggleOn className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <FaToggleOff className="h-4 w-4 mr-1 text-gray-500" />
                    )}
                    {isActive ? 'Active' : 'Inactive'}
                  </>
                )}
              </button>
              
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
              
              <span className="text-sm text-gray-700 dark:text-gray-300">Welcome, {user?.firstName}</span>
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm">
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
        
        {/* Main Content Area */}
        <div className="flex-1 ml-0 lg:ml-56 pt-0 min-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Overlay for mobile when sidebar is open */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={handleCloseSidebar}
            />
          )}
          
          <main className="min-h-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 pb-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default TransporterDashboard;