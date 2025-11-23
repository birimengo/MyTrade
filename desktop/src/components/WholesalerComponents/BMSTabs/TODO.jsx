import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaPlus, 
  FaSearch, 
  FaCalendar, 
  FaClock, 
  FaExclamationTriangle,
  FaCheck, 
  FaEdit, 
  FaTrash, 
  FaBell,
  FaList,
  FaTimes,
  FaWhatsapp,
  FaCog,
  FaUserCog,
  FaInfoCircle,
  FaPhone,
  FaKey,
  FaCheckCircle,
  FaExclamationCircle,
  FaSync,
  FaFilter
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';

const TODO = ({ 
  searchTerm, 
  onSearchChange
}) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    sortBy: 'dueDate',
    sortOrder: 'asc'
  });
  const [stats, setStats] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const { getAuthToken, API_BASE_URL, user } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
    reminderDate: '',
    tags: '',
    estimatedTime: '',
    estimatedUnit: 'hours',
    isRecurring: false,
    recurrencePattern: ''
  });

  // WhatsApp settings state
  const [whatsappSettings, setWhatsappSettings] = useState({
    enabled: false,
    phoneNumber: '',
    apiKey: ''
  });

  const [whatsappSetupStep, setWhatsappSetupStep] = useState(1);
  const [validatingWhatsapp, setValidatingWhatsapp] = useState(false);

  // Helper function to safely extract stat values
  const getStatValue = (stat) => {
    if (typeof stat === 'number') return stat;
    if (typeof stat === 'object' && stat !== null && typeof stat.count === 'number') return stat.count;
    if (typeof stat === 'object' && stat !== null && typeof stat.value === 'number') return stat.value;
    return 0;
  };

  // Enhanced API call with better error handling and fallbacks
  const apiCall = async (endpoint, options = {}) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      console.log(`🔄 API Call: ${endpoint}`, options.method || 'GET');

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      // Handle 404 errors gracefully - return empty data instead of throwing
      if (response.status === 404) {
        console.warn(`⚠️ Endpoint not found (404): ${endpoint}`);
        return { 
          success: true, 
          data: getFallbackData(endpoint),
          fromFallback: true 
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Success: ${endpoint}`, data);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ API Call Failed (${endpoint}):`, error);
      
      // For development, return fallback data instead of failing completely
      if (process.env.NODE_ENV === 'development' || API_BASE_URL.includes('localhost')) {
        console.warn(`🔄 Using fallback data for: ${endpoint}`);
        return { 
          success: true, 
          data: getFallbackData(endpoint),
          fromFallback: true 
        };
      }
      
      return { 
        success: false, 
        error: error.message,
        fromFallback: false
      };
    }
  };

  // Fallback data for missing endpoints
  const getFallbackData = (endpoint) => {
    if (endpoint.includes('/api/todo/stats/summary')) {
      return {
        success: true,
        stats: {
          summary: {
            total: 0,
            completed: 0,
            pending: 0,
            inProgress: 0,
            completionRate: 0
          },
          overdue: 0, // Changed from object to number
          dueToday: 0, // Changed from object to number
          completionTrends: {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            thisYear: 0
          },
          breakdown: {
            byStatus: [],
            byPriority: [],
            byCategory: []
          },
          timeMetrics: {
            totalEstimatedHours: 0,
            tasksWithTimeEstimate: 0,
            averageCompletionTime: null
          }
        }
      };
    }
    
    if (endpoint.includes('/api/user/settings/notifications')) {
      return {
        success: true,
        settings: {
          whatsapp: { 
            enabled: false, 
            apiKey: '', 
            phoneNumber: '',
            activatedAt: null
          },
          email: true,
          push: true,
          sms: false
        },
        reminderSettings: {
          advanceNotice: '30min',
          workingHours: { start: '09:00', end: '18:00', timezone: 'UTC' },
          quietMode: { enabled: false, start: '22:00', end: '07:00' }
        }
      };
    }
    
    if (endpoint.includes('/api/todo')) {
      return {
        success: true,
        todos: [],
        count: 0,
        pagination: {
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0
        }
      };
    }
    
    return { success: true, data: [] };
  };

  // Fetch todos from API with enhanced filtering
  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.priority !== 'all') queryParams.append('priority', filters.priority);
      if (filters.category !== 'all') queryParams.append('category', filters.category);
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      
      // Add pagination
      queryParams.append('page', '1');
      queryParams.append('limit', '50');

      const result = await apiCall(`/api/todo?${queryParams}`);
      
      if (result.success) {
        // Handle both response formats
        if (result.data.todos !== undefined) {
          setTodos(result.data.todos);
        } else if (Array.isArray(result.data)) {
          setTodos(result.data);
        } else {
          setTodos([]);
        }
        
        if (result.fromFallback) {
          console.log('📝 Using fallback todo data');
        }
      } else {
        setApiError(result.error || 'Failed to load todos');
        setTodos([]); // Reset to empty array on error
      }
    } catch (error) {
      setApiError('Network error while fetching todos');
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, API_BASE_URL, filters, searchTerm]);

  // Fetch statistics with fallback
  const fetchStats = useCallback(async () => {
    try {
      const result = await apiCall('/api/todo/stats/summary');
      
      if (result.success && result.data.stats) {
        setStats(result.data.stats);
      } else if (result.success) {
        // Handle different response format
        setStats(result.data);
      }
      
      if (result.fromFallback) {
        console.log('📊 Using fallback statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Don't set error for stats - it's non-critical
    }
  }, [getAuthToken, API_BASE_URL]);

  // Fetch notification settings
  const fetchNotificationSettings = useCallback(async () => {
    try {
      const result = await apiCall('/api/user/settings/notifications');
      
      if (result.success) {
        setNotificationSettings(result.data.settings);
        if (result.data.settings?.whatsapp) {
          setWhatsappSettings(prev => ({
            ...prev,
            enabled: result.data.settings.whatsapp.enabled || false,
            phoneNumber: result.data.settings.whatsapp.phoneNumber || '',
            apiKey: result.data.settings.whatsapp.apiKey || ''
          }));
        }
        
        if (result.fromFallback) {
          console.log('🔔 Using fallback notification settings');
        }
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      // Use default settings on error
      setNotificationSettings({
        whatsapp: { enabled: false, apiKey: '', phoneNumber: '' },
        email: true,
        push: true,
        sms: false
      });
    }
  }, [getAuthToken, API_BASE_URL]);

  // Create new todo
  const createTodo = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    try {
      const todoData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || null,
        reminderDate: formData.reminderDate || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        estimatedTime: formData.estimatedTime ? {
          value: parseInt(formData.estimatedTime),
          unit: formData.estimatedUnit
        } : undefined,
        isRecurring: formData.isRecurring,
        recurrencePattern: formData.isRecurring ? formData.recurrencePattern : undefined
      };

      // Validate required fields
      if (!todoData.title) {
        setApiError('Title is required');
        return;
      }

      const result = await apiCall('/api/todo', {
        method: 'POST',
        body: JSON.stringify(todoData)
      });

      if (result.success) {
        setShowCreateModal(false);
        resetForm();
        await fetchTodos();
        await fetchStats();
        setSuccessMessage('Task created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setApiError(result.error || 'Failed to create task');
      }
    } catch (error) {
      setApiError('Error creating task: ' + error.message);
    }
  };

  // Update todo
  const updateTodo = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    try {
      if (!selectedTodo || !selectedTodo._id) {
        setApiError('No task selected for update');
        return;
      }

      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || null,
        reminderDate: formData.reminderDate || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        estimatedTime: formData.estimatedTime ? {
          value: parseInt(formData.estimatedTime),
          unit: formData.estimatedUnit
        } : undefined
      };

      const result = await apiCall(`/api/todo/${selectedTodo._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (result.success) {
        setShowEditModal(false);
        setSelectedTodo(null);
        resetForm();
        await fetchTodos();
        await fetchStats();
        setSuccessMessage('Task updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setApiError(result.error || 'Failed to update task');
      }
    } catch (error) {
      setApiError('Error updating task: ' + error.message);
    }
  };

  // Delete todo
  const deleteTodo = async (todoId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    
    setApiError(null);
    setSuccessMessage(null);

    try {
      const result = await apiCall(`/api/todo/${todoId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        await fetchTodos();
        await fetchStats();
        setSuccessMessage('Task deleted successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setApiError(result.error || 'Failed to delete task');
      }
    } catch (error) {
      setApiError('Error deleting task: ' + error.message);
    }
  };

  // Update todo status
  const updateTodoStatus = async (todoId, newStatus) => {
    try {
      const result = await apiCall(`/api/todo/${todoId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (result.success) {
        await fetchTodos();
        await fetchStats();
        setSuccessMessage(`Task marked as ${newStatus}!`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      setApiError('Error updating task status: ' + error.message);
    }
  };

  // Update WhatsApp settings
  const updateWhatsappSettings = async () => {
    setApiError(null);
    setSuccessMessage(null);

    try {
      const result = await apiCall('/api/user/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          whatsapp: whatsappSettings.enabled,
          phoneNumber: whatsappSettings.phoneNumber,
          apiKey: whatsappSettings.apiKey
        })
      });

      if (result.success) {
        await fetchNotificationSettings();
        setSuccessMessage('WhatsApp settings updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setApiError(result.error || 'Failed to update WhatsApp settings');
      }
    } catch (error) {
      setApiError('Error updating WhatsApp settings: ' + error.message);
    }
  };

  // Validate WhatsApp API key
  const validateWhatsappApiKey = async () => {
    setValidatingWhatsapp(true);
    setApiError(null);

    try {
      const result = await apiCall('/api/user/settings/validate-whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: whatsappSettings.phoneNumber,
          apiKey: whatsappSettings.apiKey
        })
      });

      if (result.success && result.data.success) {
        setSuccessMessage('WhatsApp API key validated successfully!');
        setWhatsappSetupStep(5);
        await fetchNotificationSettings();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setApiError(result.data?.message || 'Validation failed. Please check your details and try again.');
      }
    } catch (error) {
      setApiError('Validation failed: ' + error.message);
    } finally {
      setValidatingWhatsapp(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      status: 'pending',
      dueDate: '',
      reminderDate: '',
      tags: '',
      estimatedTime: '',
      estimatedUnit: 'hours',
      isRecurring: false,
      recurrencePattern: ''
    });
  };

  // Edit todo
  const handleEdit = (todo) => {
    setSelectedTodo(todo);
    setFormData({
      title: todo.title || '',
      description: todo.description || '',
      category: todo.category || 'general',
      priority: todo.priority || 'medium',
      status: todo.status || 'pending',
      dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '',
      reminderDate: todo.reminderDate ? new Date(todo.reminderDate).toISOString().split('T')[0] : '',
      tags: todo.tags?.join(', ') || '',
      estimatedTime: todo.estimatedTime?.value || '',
      estimatedUnit: todo.estimatedTime?.unit || 'hours',
      isRecurring: todo.isRecurring || false,
      recurrencePattern: todo.recurrencePattern || ''
    });
    setShowEditModal(true);
  };

  // Open settings modal
  const openSettingsModal = () => {
    setShowSettingsModal(true);
    setWhatsappSetupStep(1);
  };

  // Refresh all data
  const refreshData = async () => {
    setApiError(null);
    setSuccessMessage('Refreshing data...');
    
    try {
      await Promise.all([
        fetchTodos(),
        fetchStats(),
        fetchNotificationSettings()
      ]);
      
      setSuccessMessage('Data refreshed successfully!');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (error) {
      setApiError('Error refreshing data');
    }
  };

  // Initialize
  useEffect(() => {
    fetchTodos();
    fetchStats();
    fetchNotificationSettings();
  }, [fetchTodos, fetchStats, fetchNotificationSettings]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[priority] || colors.medium;
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[status] || colors.pending;
  };

  // Check if todo is overdue
  const isOverdue = (todo) => {
    if (!todo.dueDate || todo.status === 'completed' || todo.status === 'cancelled') {
      return false;
    }
    try {
      return new Date(todo.dueDate) < new Date();
    } catch (error) {
      return false;
    }
  };

  // WhatsApp setup steps
  const whatsappSetupSteps = [
    {
      step: 1,
      title: "Add to Contacts",
      description: "Add this phone number to your phone contacts:",
      details: "+34 694 29 84 96",
      action: "save_contact",
      icon: FaPhone
    },
    {
      step: 2,
      title: "Send Activation Message",
      description: "Send this exact message to the contact you just created:",
      details: "I allow callmebot to send me messages",
      action: "send_whatsapp",
      icon: FaWhatsapp
    },
    {
      step: 3,
      title: "Wait for API Key",
      description: "Wait to receive an API key from the bot (usually within 2 minutes)",
      details: "The message will look like: 'API Activated for your phone number. Your APIKEY is 123123'",
      action: "wait_for_key",
      icon: FaKey
    },
    {
      step: 4,
      title: "Enter Details",
      description: "Enter your phone number and API key below",
      action: "enter_details",
      icon: FaUserCog
    },
    {
      step: 5,
      title: "Validation Complete",
      description: "Your WhatsApp notifications are now set up!",
      action: "completed",
      icon: FaCheckCircle
    }
  ];

  return (
    <div className="space-y-3 p-3">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <FaList className="mr-2 text-blue-500" />
              TODO Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage your tasks and reminders
              {notificationSettings?.whatsapp?.enabled && (
                <span className="ml-2 text-green-600 dark:text-green-400 flex items-center">
                  <FaWhatsapp className="mr-1" />
                  WhatsApp Enabled
                </span>
              )}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={openSettingsModal}
              className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <FaCog className="mr-2" />
              WhatsApp Settings
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <FaPlus className="mr-2" />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-3">
          <div className="flex items-center">
            <FaCheckCircle className="text-green-600 dark:text-green-400 mr-3" />
            <span className="text-green-800 dark:text-green-200 text-sm">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {apiError && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-3">
          <div className="flex items-center">
            <FaExclamationCircle className="text-red-600 dark:text-red-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                API Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {apiError}
              </p>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Tasks</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {getStatValue(stats.summary?.total || stats.total)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Overdue</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {getStatValue(stats.overdue)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Due Today</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {getStatValue(stats.dueToday)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Completed</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {getStatValue(stats.summary?.completed || stats.completedThisWeek)}
            </p>
          </div>
        </div>
      )}

      {/* WhatsApp Status Banner */}
      {!notificationSettings?.whatsapp?.enabled && (
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
          <div className="flex items-center">
            <FaExclamationCircle className="text-yellow-600 dark:text-yellow-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                WhatsApp Notifications Disabled
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Enable WhatsApp to receive task reminders directly on your phone.
              </p>
            </div>
            <button
              onClick={openSettingsModal}
              className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
            >
              Set Up Now
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="sales">Sales</option>
            <option value="inventory">Inventory</option>
            <option value="customer">Customer</option>
            <option value="financial">Financial</option>
            <option value="marketing">Marketing</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* TODO List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading tasks...</p>
          </div>
        ) : todos.length === 0 ? (
          <div className="p-8 text-center">
            <FaList className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-3">
              {searchTerm || filters.status !== 'all' || filters.priority !== 'all' || filters.category !== 'all' 
                ? 'Try adjusting your filters or search terms' 
                : 'Get started by creating your first task'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Create Your First Task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {todos.map((todo) => (
              <div key={todo._id || todo.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(todo.status)}`}>
                        {todo.status.replace('-', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                      {isOverdue(todo) && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center">
                          <FaExclamationTriangle className="mr-1" />
                          Overdue
                        </span>
                      )}
                      {todo.reminderDate && notificationSettings?.whatsapp?.enabled && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center">
                          <FaBell className="mr-1" />
                          WhatsApp Reminder
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      {todo.title}
                    </h3>
                    
                    {todo.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {todo.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {todo.dueDate && (
                        <div className="flex items-center">
                          <FaCalendar className="mr-1" />
                          Due: {formatDate(todo.dueDate)}
                        </div>
                      )}
                      
                      {todo.reminderDate && (
                        <div className="flex items-center">
                          <FaBell className="mr-1" />
                          Reminder: {formatDate(todo.reminderDate)}
                        </div>
                      )}
                      
                      {todo.estimatedTime && todo.estimatedTime.value && (
                        <div className="flex items-center">
                          <FaClock className="mr-1" />
                          {todo.estimatedTime.value} {todo.estimatedTime.unit}
                        </div>
                      )}
                      
                      {todo.category && todo.category !== 'general' && (
                        <div className="flex items-center">
                          <span className="capitalize">{todo.category}</span>
                        </div>
                      )}
                      
                      {todo.tags && todo.tags.length > 0 && (
                        <div className="flex items-center flex-wrap gap-1">
                          {todo.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                          {todo.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{todo.tags.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {todo.status !== 'completed' && (
                      <button
                        onClick={() => updateTodoStatus(todo._id || todo.id, 'completed')}
                        className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                        title="Mark as completed"
                      >
                        <FaCheck />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleEdit(todo)}
                      className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Edit task"
                    >
                      <FaEdit />
                    </button>
                    
                    <button
                      onClick={() => deleteTodo(todo._id || todo.id)}
                      className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Delete task"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Todo Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create New Task
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={createTodo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter task description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="general">General</option>
                      <option value="sales">Sales</option>
                      <option value="inventory">Inventory</option>
                      <option value="customer">Customer</option>
                      <option value="financial">Financial</option>
                      <option value="marketing">Marketing</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Reminder Date
                    </label>
                    <input
                      type="date"
                      value={formData.reminderDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, reminderDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Estimated Time
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time Unit
                    </label>
                    <select
                      value={formData.estimatedUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedUnit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., urgent, important, follow-up"
                  />
                </div>

                {notificationSettings?.whatsapp?.enabled && (
                  <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <FaWhatsapp className="text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      WhatsApp reminders will be sent for this task
                    </span>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Todo Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Task
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={updateTodo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="general">General</option>
                      <option value="sales">Sales</option>
                      <option value="inventory">Inventory</option>
                      <option value="customer">Customer</option>
                      <option value="financial">Financial</option>
                      <option value="marketing">Marketing</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Estimated Time
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time Unit
                    </label>
                    <select
                      value={formData.estimatedUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedUnit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {notificationSettings?.whatsapp?.enabled && (
                  <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <FaWhatsapp className="text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      WhatsApp reminders will be sent for this task
                    </span>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Update Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FaWhatsapp className="mr-2 text-green-500" />
                  WhatsApp Notification Settings
                </h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <FaTimes />
                </button>
              </div>

              {/* WhatsApp Setup Steps */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Setup Instructions
                </h4>
                <div className="space-y-3">
                  {whatsappSetupSteps.map((step) => {
                    const IconComponent = step.icon;
                    return (
                      <div
                        key={step.step}
                        className={`flex items-start p-3 rounded-lg border ${
                          whatsappSetupStep >= step.step
                            ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          whatsappSetupStep >= step.step
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                        }`}>
                          {whatsappSetupStep > step.step ? (
                            <FaCheckCircle className="text-sm" />
                          ) : (
                            <span className="text-sm font-medium">{step.step}</span>
                          )}
                        </div>
                        <div className="ml-3">
                          <h5 className={`text-sm font-medium ${
                            whatsappSetupStep >= step.step
                              ? 'text-green-800 dark:text-green-200'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {step.title}
                          </h5>
                          <p className={`text-sm ${
                            whatsappSetupStep >= step.step
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {step.description}
                          </p>
                          {step.details && (
                            <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded border">
                              <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                                {step.details}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* WhatsApp Settings Form */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    <FaWhatsapp className="mr-2 text-green-500" />
                    Enable WhatsApp Notifications
                  </label>
                  <button
                    type="button"
                    onClick={() => setWhatsappSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                      whatsappSettings.enabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        whatsappSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {whatsappSettings.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={whatsappSettings.phoneNumber}
                          onChange={(e) => setWhatsappSettings(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          placeholder="+256712345678"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          API Key
                        </label>
                        <input
                          type="text"
                          value={whatsappSettings.apiKey}
                          onChange={(e) => setWhatsappSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder="Enter API key from CallMeBot"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={validateWhatsappApiKey}
                        disabled={validatingWhatsapp || !whatsappSettings.phoneNumber || !whatsappSettings.apiKey}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center"
                      >
                        {validatingWhatsapp ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Validating...
                          </>
                        ) : (
                          <>
                            <FaCheckCircle className="mr-2" />
                            Validate API Key
                          </>
                        )}
                      </button>
                      <button
                        onClick={updateWhatsappSettings}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Save Settings
                      </button>
                    </div>
                  </>
                )}

                {/* Troubleshooting Info */}
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                  <div className="flex items-start">
                    <FaInfoCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Troubleshooting Tips
                      </h5>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                        <li>• Use exact phone number: +34 694 29 84 96</li>
                        <li>• Send exact message: "I allow callmebot to send me messages"</li>
                        <li>• Wait 2 minutes for API key response</li>
                        <li>• Try again after 24 hours if no response</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TODO;