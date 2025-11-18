// src/components/SupplierComponents/OverView.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FaBox,
  FaIndustry,
  FaShippingFast,
  FaUsers,
  FaDollarSign,
  FaChartLine,
  FaEye,
  FaExclamationTriangle,
  FaSync
} from 'react-icons/fa';
import ViewOrderDetails from './ViewOrderDetails';

const Overview = ({ isElectron, isOnline, isDarkMode, onSync, syncStatus }) => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    inProduction: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    activeClients: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      // Fetch stats and recent orders
      const [statsResponse, ordersResponse] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL || 'https://mytrade-cx5z.onrender.com'}/api/supplier/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${process.env.REACT_APP_API_URL || 'https://mytrade-cx5z.onrender.com'}/api/supplier/orders/recent`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setRecentOrders(ordersData.orders || []);
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleCloseOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  if (showOrderDetails && selectedOrder) {
    return (
      <ViewOrderDetails 
        order={selectedOrder}
        onClose={handleCloseOrderDetails}
        isDarkMode={isDarkMode}
      />
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Supplier Dashboard
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Welcome back, {user?.firstName}! Here's your business overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<FaBox className="w-6 h-6" />}
            color="blue"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="In Production"
            value={stats.inProduction}
            icon={<FaIndustry className="w-6 h-6" />}
            color="purple"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={<FaShippingFast className="w-6 h-6" />}
            color="orange"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Total Revenue"
            value={`UGX ${stats.totalRevenue?.toLocaleString()}`}
            icon={<FaDollarSign className="w-6 h-6" />}
            color="green"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            icon={<FaExclamationTriangle className="w-6 h-6" />}
            color="red"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Active Clients"
            value={stats.activeClients}
            icon={<FaUsers className="w-6 h-6" />}
            color="indigo"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Recent Orders Section */}
        <div className={`rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Orders
            </h2>
            <button
              onClick={fetchOverviewData}
              disabled={syncStatus === 'syncing'}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              } ${syncStatus === 'syncing' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FaSync className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <FaShippingFast className={`mx-auto text-4xl mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                No recent orders found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  onViewOrder={handleViewOrder}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, isDarkMode }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', dark: 'bg-blue-900/20 text-blue-400' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', dark: 'bg-purple-900/20 text-purple-400' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', dark: 'bg-orange-900/20 text-orange-400' },
    green: { bg: 'bg-green-100', text: 'text-green-600', dark: 'bg-green-900/20 text-green-400' },
    red: { bg: 'bg-red-100', text: 'text-red-600', dark: 'bg-red-900/20 text-red-400' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', dark: 'bg-indigo-900/20 text-indigo-400' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`rounded-lg p-6 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
            {title}
          </p>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-full ${isDarkMode ? colors.dark : colors.bg}`}>
          <div className={isDarkMode ? colors.text : colors.text}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, onViewOrder, isDarkMode }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in_production': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'ready_for_delivery': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'shipped': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex-1">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {order.orderNumber}
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {order.client?.businessName || 'Unknown Client'}
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>
        <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {order.products?.length || 0} items • UGX {order.totalAmount?.toLocaleString()}
        </p>
      </div>
      <button
        onClick={() => onViewOrder(order)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
          isDarkMode 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
        }`}
      >
        <FaEye className="w-4 h-4" />
        <span className="text-sm font-medium">View</span>
      </button>
    </div>
  );
};

export default Overview;