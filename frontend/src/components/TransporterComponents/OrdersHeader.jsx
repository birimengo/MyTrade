// components/TransporterComponents/OrdersHeader.jsx
import React from 'react';
import { 
  FaSearch,
  FaSync,
  FaTruck,
  FaCheckCircle,
  FaRoad,
  FaHome,
  FaUndo,
  FaStore,
  FaExclamationTriangle
} from 'react-icons/fa';

const OrdersHeader = ({ 
  filters, 
  setFilters, 
  statistics, 
  availableReturnOrders, 
  refreshOrders 
}) => {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Supplier Orders (S-Orders)</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Manage orders assigned to you from suppliers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={refreshOrders}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center"
          >
            <FaSync className="mr-1 text-xs" />
            Refresh
          </button>
          
          {/* Order Type Filter */}
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="all">All Types</option>
            <option value="delivery">Delivery Orders</option>
            <option value="return">Return Orders</option>
          </select>
          
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search by order number..."
              className="pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-40 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">All Status</option>
            <option value="assigned_to_transporter">Assigned</option>
            <option value="accepted_by_transporter">Accepted</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="return_requested">Return Requested</option>
            <option value="return_accepted">Return Accepted</option>
            <option value="return_in_transit">Return in Transit</option>
            <option value="returned_to_supplier">Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Enhanced Statistics - Expanded for both order types */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
        {[
          { status: 'assigned_to_transporter', label: 'Assigned', icon: <FaTruck className="text-indigo-500 text-sm" /> },
          { status: 'accepted_by_transporter', label: 'Accepted', icon: <FaCheckCircle className="text-blue-500 text-sm" /> },
          { status: 'in_transit', label: 'In Transit', icon: <FaRoad className="text-orange-500 text-sm" /> },
          { status: 'delivered', label: 'Delivered', icon: <FaHome className="text-green-500 text-sm" /> },
          { status: 'return_requested', label: 'Return Req', icon: <FaUndo className="text-amber-500 text-sm" /> },
          { status: 'available_returns', label: 'Available Returns', icon: <FaStore className="text-purple-500 text-sm" />, custom: availableReturnOrders.length }
        ].map(({ status, label, icon, custom }) => (
          <div key={status} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800 transition-all hover:shadow-sm">
            <div className="flex items-center">
              {icon}
              <div className="ml-2">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {label}
                </p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {custom !== undefined ? custom : statistics[status] || 0}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Available Return Orders Section */}
      {availableReturnOrders.length > 0 && filters.type === 'all' && (
        <div className="mt-4 p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-amber-500 mr-2 text-sm" />
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
              Available Return Orders ({availableReturnOrders.length})
            </h3>
            <p className="text-xs text-amber-600 dark:text-amber-400 ml-2">
              These return orders are available for you to accept
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersHeader;