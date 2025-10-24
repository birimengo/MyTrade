// src/components/WholesalerComponents/Retailers.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FontAwesome5, 
  MaterialCommunityIcons, 
  Ionicons,
  Feather,
  MaterialIcons
} from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

const Retailers = ({ user, onContactRetailer, onViewRetailerOrders, isDarkMode }) => {
  const { token } = useAuth();
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [refreshing, setRefreshing] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    fetchRetailers();
  }, [user?.productCategory]);

  const fetchRetailers = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.productCategory) {
        setLoading(false);
        return;
      }

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/retailers?category=${encodeURIComponent(user.productCategory)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setRetailers(data.retailers || []);
      } else {
        throw new Error(data.message || 'Failed to fetch retailers');
      }
    } catch (error) {
      console.error('Error fetching retailers:', error);
      setError(error.message || 'An error occurred while fetching retailers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRetailers();
  };

  // Filter and sort retailers
  const filteredRetailers = retailers
    .filter(retailer => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        retailer.businessName?.toLowerCase().includes(searchLower) ||
        retailer.contactPerson?.toLowerCase().includes(searchLower) ||
        retailer.email?.toLowerCase().includes(searchLower) ||
        `${retailer.firstName || ''} ${retailer.lastName || ''}`.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.businessName || `${a.firstName} ${a.lastName}`).localeCompare(b.businessName || `${b.firstName} ${b.lastName}`);
        case 'online':
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return 0;
        case 'recent':
          const aDate = new Date(a.lastSeen || 0);
          const bDate = new Date(b.lastSeen || 0);
          return bDate - aDate;
        default:
          return 0;
      }
    });

  const handleRetry = () => {
    setError(null);
    fetchRetailers();
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
        <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
          <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>Sort By</Text>
          
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
                color={sortBy === sortType ? '#10B981' : (isDarkMode ? '#D1D5DB' : '#6B7280')} 
              />
              <Text style={[
                styles.sortOptionText, 
                isDarkMode && styles.darkText,
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

  const RetailerCard = ({ retailer }) => (
    <View style={[styles.retailerCard, isDarkMode && styles.darkRetailerCard]}>
      {/* Compact Header */}
      <View style={styles.cardHeader}>
        <View style={styles.nameContainer}>
          <View style={styles.nameRow}>
            <Text style={[styles.retailerName, isDarkMode && styles.darkText]} numberOfLines={1}>
              {retailer.businessName || `${retailer.firstName} ${retailer.lastName}`}
            </Text>
            {retailer.isOnline ? (
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
          {user?.productCategory && (
            <View style={[styles.categoryBadge, isDarkMode && styles.darkCategoryBadge]}>
              <Feather name="tag" size={10} color={isDarkMode ? "#D1FAE5" : "#065F46"} />
              <Text style={[styles.categoryText, isDarkMode && styles.darkCategoryText]}>
                {user.productCategory}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Compact Contact Information */}
      <View style={styles.contactInfo}>
        <View style={styles.contactRow}>
          <Feather name="mail" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <Text style={[styles.contactText, isDarkMode && styles.darkSubtitle]} numberOfLines={1}>
            {retailer.email}
          </Text>
        </View>

        <View style={styles.contactRow}>
          <Feather name="phone" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <Text style={[styles.contactText, isDarkMode && styles.darkSubtitle]} numberOfLines={1}>
            {retailer.phone}
          </Text>
        </View>

        {retailer.address && (
          <View style={styles.contactRow}>
            <Feather name="map-pin" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={[styles.contactText, isDarkMode && styles.darkSubtitle]} numberOfLines={1}>
              {retailer.city}
            </Text>
          </View>
        )}
      </View>

      {/* Compact Action Buttons */}
      <View style={[styles.cardFooter, isDarkMode && styles.darkCardFooter]}>
        <TouchableOpacity
          style={[styles.contactButton, isDarkMode && styles.darkContactButton]}
          onPress={() => onContactRetailer(retailer)}
        >
          <Feather name="message-circle" size={12} color="#FFFFFF" />
          <Text style={styles.buttonText}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ordersButton}
          onPress={() => onViewRetailerOrders(retailer)}
        >
          <Feather name="shopping-cart" size={12} color="#FFFFFF" />
          <Text style={styles.buttonText}>Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>Retailer Network</Text>
          {user?.productCategory && (
            <View style={[styles.categoryBadgeHeader, isDarkMode && styles.darkCategoryBadgeHeader]}>
              <Feather name="tag" size={12} color={isDarkMode ? "#D1FAE5" : "#065F46"} />
              <Text style={[styles.categoryTextHeader, isDarkMode && styles.darkCategoryTextHeader]}>
                {user.productCategory}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#10B981" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading retailers...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>Retailer Network</Text>
          {user?.productCategory && (
            <View style={[styles.categoryBadgeHeader, isDarkMode && styles.darkCategoryBadgeHeader]}>
              <Feather name="tag" size={12} color={isDarkMode ? "#D1FAE5" : "#065F46"} />
              <Text style={[styles.categoryTextHeader, isDarkMode && styles.darkCategoryTextHeader]}>
                {user.productCategory}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.errorContainer, isDarkMode && styles.darkErrorContainer]}>
          <Feather name="alert-triangle" size={24} color="#DC2626" />
          <Text style={[styles.errorTitle, isDarkMode && styles.darkErrorTitle]}>
            Unable to load
          </Text>
          <Text style={[styles.errorMessage, isDarkMode && styles.darkErrorMessage]}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Feather name="refresh-cw" size={14} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor={isDarkMode ? '#10B981' : '#10B981'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, isDarkMode && styles.darkText]}>Retailer Network</Text>
            {user?.productCategory && (
              <View style={[styles.categoryBadgeHeader, isDarkMode && styles.darkCategoryBadgeHeader]}>
                <Feather name="tag" size={12} color={isDarkMode ? "#D1FAE5" : "#065F46"} />
                <Text style={[styles.categoryTextHeader, isDarkMode && styles.darkCategoryTextHeader]}>
                  {user.productCategory}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Compact Controls */}
        {retailers.length > 0 && (
          <View style={[styles.controlsContainer, isDarkMode && styles.darkControlsContainer]}>
            <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
              <Feather name="search" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
                placeholder="Search retailers..."
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Feather name="x" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={[styles.filterButton, isDarkMode && styles.darkFilterButton]}
              onPress={() => setShowSortModal(true)}
            >
              <Feather name="filter" size={14} color={isDarkMode ? "#D1D5DB" : "#374151"} />
              <Text style={[styles.filterText, isDarkMode && styles.darkText]}>
                {sortBy === 'name' ? 'Name' : sortBy === 'online' ? 'Online' : 'Recent'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Compact Content */}
        {!user?.productCategory ? (
          <View style={styles.emptyState}>
            <Feather name="x-circle" size={24} color="#10B981" />
            <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
              Category Required
            </Text>
            <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtitle]}>
              Set product category in profile
            </Text>
          </View>
        ) : filteredRetailers.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="search" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
              {searchTerm ? 'No matches' : 'No retailers'}
            </Text>
            <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtitle]}>
              {searchTerm
                ? `No matches for "${searchTerm}"`
                : 'None in your category'
              }
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <Text style={[styles.statsText, isDarkMode && styles.darkSubtitle]}>
                {filteredRetailers.length} of {retailers.length} retailers
              </Text>
              <View style={styles.onlineStats}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineStatsText}>
                  {retailers.filter(r => r.isOnline).length} online
                </Text>
              </View>
            </View>

            <View style={styles.retailersGrid}>
              {filteredRetailers.map(retailer => (
                <RetailerCard key={retailer._id} retailer={retailer} />
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

  // Compact Controls
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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

  // Retailer Grid
  retailersGrid: {
    gap: 12,
  },

  // Compact Retailer Card
  retailerCard: {
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
  darkRetailerCard: {
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
  retailerName: {
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
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  darkCategoryBadge: {
    backgroundColor: '#065F46',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#065F46',
  },
  darkCategoryText: {
    color: '#D1FAE5',
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
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  darkContactButton: {
    backgroundColor: '#4B5563',
  },
  ordersButton: {
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
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default Retailers;