// components/WholesalerComponents/Suppliers.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { Feather } from '@expo/vector-icons';

const Suppliers = ({ isDarkMode, onViewSupplierProducts }) => {
  const navigation = useNavigation();
  const { user, getAuthToken, API_BASE_URL } = useAuth();
  const { socket, isConnected, connectionStatus, reconnect } = useSocket();
  const { isDarkMode: contextDarkMode } = useDarkMode();
  
  const darkMode = isDarkMode !== undefined ? isDarkMode : contextDarkMode;
  
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('onlineUsers', (userIds) => {
        setOnlineUsers(new Set(userIds));
      });

      socket.on('userStatusChanged', (data) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          if (data.isOnline) {
            updated.add(data.userId);
          } else {
            updated.delete(data.userId);
          }
          return updated;
        });
      });

      return () => {
        socket.off('onlineUsers');
        socket.off('userStatusChanged');
      };
    }
  }, [socket]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [searchTerm, suppliers]);

  const fetchSuppliers = async () => {
    try {
      setError(null);
      const token = await getAuthToken();
      
      if (!token) {
        setError('Please log in to view suppliers');
        setLoading(false);
        return;
      }

      const suppliersResponse = await fetch(
        `${API_BASE_URL}/api/users/suppliers?category=${encodeURIComponent(user?.productCategory || '')}`,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json();
        if (suppliersData.success) {
          setSuppliers(suppliersData.suppliers || []);
        } else {
          throw new Error(suppliersData.message || 'Failed to fetch suppliers');
        }
      } else {
        throw new Error('Failed to fetch suppliers from API');
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setError(error.message);
      setSuppliers(getMockSuppliers());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockSuppliers = () => [
    { 
      _id: '1', firstName: 'Tech', lastName: 'Manufacturer', 
      businessName: 'Tech Manufacturers Ltd', email: 'tech@example.com', 
      phone: '0785123456', productCategory: 'Electronic Components',
      city: 'Kampala', country: 'Uganda', isOnline: true, lastSeen: new Date()
    },
    { 
      _id: '2', firstName: 'Fashion', lastName: 'Supplier', 
      businessName: 'Fashion Wholesalers Inc', email: 'fashion@example.com', 
      phone: '0785654321', productCategory: 'Electronic Components',
      city: 'Kampala', country: 'Uganda', isOnline: false, 
      lastSeen: new Date(Date.now() - 30 * 60 * 1000)
    },
    { 
      _id: '3', firstName: 'Electro', lastName: 'Supplies', 
      businessName: 'Electro Supplies UG', email: 'electro@example.com', 
      phone: '0785123457', productCategory: 'Electronic Components',
      city: 'Kampala', country: 'Uganda', isOnline: true, 
      lastSeen: new Date()
    }
  ];

  const filterSuppliers = () => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const filtered = suppliers.filter(supplier => 
      supplier.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.productCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSuppliers(filtered);
  };

  const isUserOnline = (userId) => onlineUsers.has(userId);

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never online';
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleContactSupplier = (supplier) => {
    const isOnline = isUserOnline(supplier._id);
    if (isOnline) {
      navigation.navigate('Chat', { 
        recipientId: supplier._id,
        recipientName: supplier.businessName || `${supplier.firstName} ${supplier.lastName}`
      });
    } else {
      Alert.alert(
        'Supplier Offline',
        `${supplier.businessName || supplier.firstName + ' ' + supplier.lastName} is currently offline. Try again later.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleViewProducts = (supplier) => {
    if (onViewSupplierProducts) {
      onViewSupplierProducts(supplier);
    } else {
      navigation.navigate('SupplierProducts', { 
        supplierId: supplier._id,
        supplierName: supplier.businessName || `${supplier.firstName} ${supplier.lastName}`
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSuppliers();
  };

  const handleSortSelect = (sortType) => {
    setSortBy(sortType);
    setShowSortModal(false);
  };

  const SortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={[styles.modalContent, darkMode && styles.darkModalContent]}>
          <Text style={[styles.modalTitle, darkMode && styles.darkText]}>Sort By</Text>
          
          {['name', 'online', 'recent'].map((sortType) => (
            <TouchableOpacity
              key={sortType}
              style={[styles.sortOption, sortBy === sortType && styles.selectedSortOption]}
              onPress={() => handleSortSelect(sortType)}
            >
              <Feather 
                name={
                  sortType === 'name' ? 'user' : 
                  sortType === 'online' ? 'wifi' : 'clock'
                } 
                size={14} 
                color={sortBy === sortType ? '#10B981' : (darkMode ? '#D1D5DB' : '#6B7280')} 
              />
              <Text style={[
                styles.sortOptionText, 
                darkMode && styles.darkText,
                sortBy === sortType && styles.selectedSortText
              ]}>
                {sortType === 'name' ? 'Name' : 
                 sortType === 'online' ? 'Online Status' : 'Recently Active'}
              </Text>
              {sortBy === sortType && <Feather name="check" size={14} color="#10B981" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const SupplierCard = ({ supplier }) => {
    const isOnline = isUserOnline(supplier._id);
    
    return (
      <View style={[styles.supplierCard, darkMode && styles.darkSupplierCard]}>
        {/* Compact Header */}
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.supplierName, darkMode && styles.darkText]} numberOfLines={1}>
                {supplier.businessName || `${supplier.firstName} ${supplier.lastName}`}
              </Text>
              {isOnline ? (
                <View style={styles.onlineStatus}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              ) : (
                <View style={styles.offlineStatus}>
                  <View style={styles.offlineDot} />
                  <Text style={styles.offlineText}>Offline</Text>
                </View>
              )}
            </View>
            {supplier.productCategory && (
              <View style={[styles.categoryBadge, darkMode && styles.darkCategoryBadge]}>
                <Feather name="tag" size={10} color={darkMode ? "#D1FAE5" : "#065F46"} />
                <Text style={[styles.categoryText, darkMode && styles.darkCategoryText]}>
                  {supplier.productCategory}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Compact Contact Information */}
        <View style={styles.contactInfo}>
          <View style={styles.contactRow}>
            <Feather name="mail" size={12} color={darkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={[styles.contactText, darkMode && styles.darkSubtitle]} numberOfLines={1}>
              {supplier.email}
            </Text>
          </View>

          <View style={styles.contactRow}>
            <Feather name="phone" size={12} color={darkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={[styles.contactText, darkMode && styles.darkSubtitle]} numberOfLines={1}>
              {supplier.phone}
            </Text>
          </View>

          {supplier.city && (
            <View style={styles.contactRow}>
              <Feather name="map-pin" size={12} color={darkMode ? "#9CA3AF" : "#6B7280"} />
              <Text style={[styles.contactText, darkMode && styles.darkSubtitle]} numberOfLines={1}>
                {supplier.city}, {supplier.country}
              </Text>
            </View>
          )}
        </View>

        {/* Compact Action Buttons */}
        <View style={[styles.cardFooter, darkMode && styles.darkCardFooter]}>
          <TouchableOpacity
            style={[
              styles.chatButton, 
              !isOnline && styles.disabledButton,
              darkMode && styles.darkChatButton
            ]}
            onPress={() => handleContactSupplier(supplier)}
            disabled={!isOnline}
          >
            <Feather name="message-circle" size={12} color={isOnline ? "#FFFFFF" : "#9CA3AF"} />
            <Text style={[
              styles.buttonText, 
              !isOnline && styles.disabledButtonText
            ]}>
              {isOnline ? 'Chat' : 'Offline'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.productsButton, darkMode && styles.darkProductsButton]}
            onPress={() => handleViewProducts(supplier)}
          >
            <Feather name="package" size={12} color="#FFFFFF" />
            <Text style={styles.buttonText}>Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, darkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, darkMode && styles.darkText]}>Supplier Directory</Text>
          {user?.productCategory && (
            <View style={[styles.categoryBadgeHeader, darkMode && styles.darkCategoryBadgeHeader]}>
              <Feather name="tag" size={12} color={darkMode ? "#D1FAE5" : "#065F46"} />
              <Text style={[styles.categoryTextHeader, darkMode && styles.darkCategoryTextHeader]}>
                {user.productCategory}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={[styles.loadingText, darkMode && styles.darkText]}>
            Loading suppliers...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, darkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, darkMode && styles.darkText]}>Supplier Directory</Text>
          {user?.productCategory && (
            <View style={[styles.categoryBadgeHeader, darkMode && styles.darkCategoryBadgeHeader]}>
              <Feather name="tag" size={12} color={darkMode ? "#D1FAE5" : "#065F46"} />
              <Text style={[styles.categoryTextHeader, darkMode && styles.darkCategoryTextHeader]}>
                {user.productCategory}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.errorContainer, darkMode && styles.darkErrorContainer]}>
          <Feather name="alert-triangle" size={24} color="#DC2626" />
          <Text style={[styles.errorTitle, darkMode && styles.darkErrorTitle]}>
            Unable to load
          </Text>
          <Text style={[styles.errorMessage, darkMode && styles.darkErrorMessage]}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSuppliers}>
            <Feather name="refresh-cw" size={14} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor={darkMode ? '#3B82F6' : '#3B82F6'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, darkMode && styles.darkText]}>Supplier Directory</Text>
            {user?.productCategory && (
              <View style={[styles.categoryBadgeHeader, darkMode && styles.darkCategoryBadgeHeader]}>
                <Feather name="tag" size={12} color={darkMode ? "#D1FAE5" : "#065F46"} />
                <Text style={[styles.categoryTextHeader, darkMode && styles.darkCategoryTextHeader]}>
                  {user.productCategory}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Compact Controls */}
        {suppliers.length > 0 && (
          <View style={[styles.controlsContainer, darkMode && styles.darkControlsContainer]}>
            <View style={[styles.searchContainer, darkMode && styles.darkSearchContainer]}>
              <Feather name="search" size={14} color={darkMode ? "#9CA3AF" : "#6B7280"} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, darkMode && styles.darkSearchInput]}
                placeholder="Search suppliers..."
                placeholderTextColor={darkMode ? "#9CA3AF" : "#6B7280"}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Feather name="x" size={14} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={[styles.filterButton, darkMode && styles.darkFilterButton]}
              onPress={() => setShowSortModal(true)}
            >
              <Feather name="filter" size={14} color={darkMode ? "#D1D5DB" : "#374151"} />
              <Text style={[styles.filterText, darkMode && styles.darkText]}>
                {sortBy === 'name' ? 'Name' : sortBy === 'online' ? 'Online' : 'Recent'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Connection Status */}
        <View style={styles.connectionContainer}>
          <View style={[
            styles.connectionStatus, 
            isConnected ? styles.connected : styles.disconnected
          ]}>
            <View style={[
              styles.connectionDot, 
              isConnected && styles.connectedDot
            ]} />
            <Text style={styles.connectionText}>
              {isConnected ? 'Live Chat' : 'Chat Offline'}
            </Text>
          </View>
          
          <View style={[styles.onlineCount, darkMode && styles.darkOnlineCount]}>
            <Text style={styles.onlineCountText}>
              {onlineUsers.size} Online
            </Text>
          </View>
        </View>

        {/* Compact Content */}
        {!user?.productCategory ? (
          <View style={styles.emptyState}>
            <Feather name="x-circle" size={24} color="#3B82F6" />
            <Text style={[styles.emptyTitle, darkMode && styles.darkText]}>
              Category Required
            </Text>
            <Text style={[styles.emptyMessage, darkMode && styles.darkSubtitle]}>
              Set product category in profile
            </Text>
          </View>
        ) : filteredSuppliers.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="search" size={24} color={darkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={[styles.emptyTitle, darkMode && styles.darkText]}>
              {searchTerm ? 'No matches' : 'No suppliers'}
            </Text>
            <Text style={[styles.emptyMessage, darkMode && styles.darkSubtitle]}>
              {searchTerm
                ? `No matches for "${searchTerm}"`
                : 'None in your category'
              }
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <Text style={[styles.statsText, darkMode && styles.darkSubtitle]}>
                {filteredSuppliers.length} of {suppliers.length} suppliers
              </Text>
              <View style={styles.onlineStats}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineStatsText}>
                  {suppliers.filter(s => isUserOnline(s._id)).length} online
                </Text>
              </View>
            </View>

            <View style={styles.suppliersGrid}>
              {filteredSuppliers.map(supplier => (
                <SupplierCard key={supplier._id} supplier={supplier} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <SortModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },

  // Compact Header Styles
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },

  // Compact Category Badge
  categoryBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  darkCategoryBadgeHeader: {
    backgroundColor: '#065F46',
  },
  categoryTextHeader: {
    fontSize: 12,
    fontWeight: '500',
    color: '#065F46',
  },
  darkCategoryTextHeader: {
    color: '#D1FAE5',
  },

  // Connection Status
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#EF4444',
  },
  connected: {
    backgroundColor: '#10B981',
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  connectedDot: {
    backgroundColor: '#FFFFFF',
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  onlineCount: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkOnlineCount: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  onlineCountText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '500',
  },

  // Compact Controls
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  darkControlsContainer: {
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 8,
    minHeight: 36,
  },
  darkSearchContainer: {
    backgroundColor: '#1F2937',
    borderColor: '#4B5563',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#374151',
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    minHeight: 36,
  },
  darkFilterButton: {
    backgroundColor: '#1F2937',
    borderColor: '#4B5563',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },

  // Compact Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    paddingBottom: 20,
  },
  darkModalContent: {
    backgroundColor: '#1F2937',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedSortOption: {
    backgroundColor: '#F0FDF4',
  },
  sortOptionText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    marginLeft: 8,
  },
  selectedSortText: {
    color: '#10B981',
    fontWeight: '500',
  },

  // Compact Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Compact Error
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  darkErrorContainer: {
    backgroundColor: '#7F1D1D',
    borderColor: '#DC2626',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 8,
    textAlign: 'center',
  },
  darkErrorTitle: {
    color: '#FCA5A5',
  },
  errorMessage: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
    marginVertical: 8,
  },
  darkErrorMessage: {
    color: '#FECACA',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Compact Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 200,
  },

  // Compact Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  onlineStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineStatsText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },

  // Suppliers Grid
  suppliersGrid: {
    gap: 12,
  },

  // Compact Supplier Card
  supplierCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkSupplierCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  cardHeader: {
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameContainer: {
    flex: 1,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B7280',
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#065F46',
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
  },

  // Compact Category Badge in Card
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  darkCategoryBadge: {
    backgroundColor: '#1E40AF',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#1E40AF',
  },
  darkCategoryText: {
    color: '#DBEAFE',
  },

  // Compact Contact Info
  contactInfo: {
    gap: 6,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },

  // Compact Card Footer
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  darkCardFooter: {
    borderTopColor: '#374151',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  darkChatButton: {
    backgroundColor: '#2563EB',
  },
  productsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  darkProductsButton: {
    backgroundColor: '#059669',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
});

export default Suppliers;