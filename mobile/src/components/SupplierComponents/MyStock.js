// src/components/SupplierComponents/MyStock.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  MaterialIcons, 
  Feather,
  MaterialCommunityIcons
} from '@expo/vector-icons';

// Import all tab components
import StockTab from './Stock';
import AnalyticsTab from './Analystics';
import SalesTab from './Sales';
import SalesHistoryTab from './SalesHistory';
import ReceiptsTab from './Receipts';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const MyStock = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');
  const [error, setError] = useState(null);

  const { user, token, API_BASE_URL, logout } = useAuth();
  const { isDarkMode } = useDarkMode();

  // API call function
  const apiCall = async (endpoint, options = {}) => {
    try {
      const authToken = token;
      
      if (!authToken) {
        Alert.alert(
          'Authentication Required',
          'Please log in again to continue.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/api${endpoint}`;
      
      const config = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(url, config);

      if (response.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  };

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // You can still fetch data for the tabs when they're implemented
      await Promise.all([
        // Add your API calls here when needed
      ]);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Compact Tab Navigation
  const TabNavigation = () => (
    <View style={[styles.tabsContainer, isDarkMode && styles.darkTabsContainer]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'stock' && styles.activeTab,
          activeTab === 'stock' && isDarkMode && styles.darkActiveTab
        ]}
        onPress={() => setActiveTab('stock')}
      >
        <MaterialCommunityIcons 
          name="package-variant" 
          size={16} 
          color={activeTab === 'stock' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'stock' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
        ]}>
          Stock
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'analytics' && styles.activeTab,
          activeTab === 'analytics' && isDarkMode && styles.darkActiveTab
        ]}
        onPress={() => setActiveTab('analytics')}
      >
        <MaterialCommunityIcons 
          name="chart-bar" 
          size={16} 
          color={activeTab === 'analytics' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'analytics' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
        ]}>
          Analytics
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'create-sale' && styles.activeTab,
          activeTab === 'create-sale' && isDarkMode && styles.darkActiveTab
        ]}
        onPress={() => setActiveTab('create-sale')}
      >
        <MaterialCommunityIcons 
          name="receipt" 
          size={16} 
          color={activeTab === 'create-sale' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'create-sale' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
        ]}>
          Sales
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'sales-history' && styles.activeTab,
          activeTab === 'sales-history' && isDarkMode && styles.darkActiveTab
        ]}
        onPress={() => setActiveTab('sales-history')}
      >
        <MaterialCommunityIcons 
          name="history" 
          size={16} 
          color={activeTab === 'sales-history' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'sales-history' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
        ]}>
          History
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'receipts' && styles.activeTab,
          activeTab === 'receipts' && isDarkMode && styles.darkActiveTab
        ]}
        onPress={() => setActiveTab('receipts')}
      >
        <MaterialCommunityIcons 
          name="file-document" 
          size={16} 
          color={activeTab === 'receipts' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'receipts' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
        ]}>
          Receipts
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render tab content - UPDATED to use all components
  const renderTabContent = () => {
    switch (activeTab) {
      case 'stock':
        return <StockTab apiCall={apiCall} />;
      case 'analytics':
        return <AnalyticsTab apiCall={apiCall} />;
      case 'create-sale':
        return <SalesTab apiCall={apiCall} />;
      case 'sales-history':
        return <SalesHistoryTab apiCall={apiCall} />;
      case 'receipts':
        return <ReceiptsTab apiCall={apiCall} />;
      default:
        return <StockTab apiCall={apiCall} />;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <MaterialIcons 
            name="inventory" 
            size={20} 
            color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
          />
          <Text style={[styles.title, isDarkMode && styles.darkText]}>My Stock & Sales</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons 
          name="inventory" 
          size={20} 
          color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
        />
        <Text style={[styles.title, isDarkMode && styles.darkText]}>My Stock & Sales</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          ) : (
            <Feather name="refresh-cw" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorCard, isDarkMode && styles.darkErrorCard]}>
          <View style={styles.errorContent}>
            <Feather name="alert-triangle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity onPress={() => setError(null)}>
            <Feather name="x" size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>
    </View>
  );
};

// Keep the same styles as before...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginLeft: 10,
    flex: 1,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  refreshButton: {
    padding: 4,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    padding: 12,
    margin: 16,
    marginTop: 0,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  darkErrorCard: {
    backgroundColor: '#451A1A',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  darkTabsContainer: {
    borderBottomColor: '#374151',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  activeTab: {
    borderBottomColor: '#2563EB',
  },
  darkActiveTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2563EB',
  },
  inactiveTabText: {
    color: '#6B7280',
  },
  darkTabText: {
    color: '#9CA3AF',
  },
  tabContent: {
    flex: 1,
  },
});

export default MyStock;