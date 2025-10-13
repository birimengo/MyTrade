// components/RetailerComponents/Wholesaler.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  Ionicons, 
  FontAwesome, 
  FontAwesome5, 
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
  Entypo
} from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const Wholesaler = ({ navigation }) => {
  const [wholesalers, setWholesalers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const { user, token } = useAuth();
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    fetchWholesalers();
    extractCategories();
  }, [user?.productCategory, token]);

  const extractCategories = () => {
    const uniqueCategories = [...new Set(wholesalers.map(w => w.productCategory))];
    setCategories(['all', ...uniqueCategories]);
  };

  const getToken = async () => {
    try {
      if (token) {
        return token;
      }
      
      const commonKeys = ['userToken', 'token', 'authToken', 'accessToken'];
      
      for (const key of commonKeys) {
        try {
          const storedToken = await AsyncStorage.getItem(key);
          if (storedToken) {
            return storedToken;
          }
        } catch (err) {
          console.log(`No token found with key: ${key}`);
        }
      }
      
      if (user) {
        return 'demo-token';
      }
      
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  const fetchWholesalers = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.productCategory) {
        setLoading(false);
        return;
      }

      const authToken = await getToken();
      const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';
      
      if (authToken && authToken !== 'demo-token') {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/wholesalers?category=${encodeURIComponent(user.productCategory)}`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.wholesalers) {
              setWholesalers(data.wholesalers);
              extractCategories();
              return;
            }
          }
        } catch (apiError) {
          console.log('API call failed, using demo data:', apiError);
        }
      }
      
      // Demo data
      const demoWholesalers = [
        {
          _id: '1',
          businessName: 'Tech Wholesale Ltd',
          contactPerson: 'John Smith',
          email: 'john@techwholesale.com',
          phone: '+256712345678',
          productCategory: user?.productCategory || 'Electronics',
          isOnline: true,
          lastSeen: new Date().toISOString(),
          address: 'Kampala, Uganda',
          rating: 4.5,
          productsCount: 45,
          minOrder: 50000
        },
        {
          _id: '2',
          businessName: 'Global Suppliers UG',
          contactPerson: 'Sarah Johnson',
          email: 'sarah@globalsuppliers.com',
          phone: '+256773987654',
          productCategory: user?.productCategory || 'Electronics',
          isOnline: false,
          lastSeen: new Date(Date.now() - 86400000).toISOString(),
          address: 'Entebbe, Uganda',
          rating: 4.2,
          productsCount: 32,
          minOrder: 30000
        },
        {
          _id: '3',
          businessName: 'Premium Electronics',
          contactPerson: 'Mike Wilson',
          email: 'mike@premiumelectronics.com',
          phone: '+256702555123',
          productCategory: user?.productCategory || 'Electronics',
          isOnline: true,
          lastSeen: new Date().toISOString(),
          address: 'Kampala, Uganda',
          rating: 4.8,
          productsCount: 67,
          minOrder: 75000
        },
        {
          _id: '4',
          businessName: 'Quality Goods Wholesale',
          contactPerson: 'Emily Davis',
          email: 'emily@qualitygoods.com',
          phone: '+256789456123',
          productCategory: user?.productCategory || 'Electronics',
          isOnline: true,
          lastSeen: new Date(Date.now() - 3600000).toISOString(),
          address: 'Jinja, Uganda',
          rating: 4.3,
          productsCount: 28,
          minOrder: 25000
        },
        {
          _id: '5',
          businessName: 'Bulk Distributors Ltd',
          contactPerson: 'Robert Brown',
          email: 'robert@bulkdistributors.com',
          phone: '+256755111222',
          productCategory: user?.productCategory || 'Electronics',
          isOnline: false,
          lastSeen: new Date(Date.now() - 172800000).toISOString(),
          address: 'Mbarara, Uganda',
          rating: 4.6,
          productsCount: 89,
          minOrder: 100000
        }
      ];
      
      const filteredDemo = user?.productCategory 
        ? demoWholesalers.filter(w => w.productCategory === user.productCategory)
        : demoWholesalers;
      
      setWholesalers(filteredDemo);
      extractCategories();
      
    } catch (error) {
      console.error('Error in fetchWholesalers:', error);
      setError('Failed to load wholesalers. Using demo data.');
      
      const fallbackDemo = [
        {
          _id: '1',
          businessName: 'Demo Wholesaler',
          contactPerson: 'Demo Contact',
          email: 'demo@wholesaler.com',
          phone: '+256700000000',
          productCategory: user?.productCategory || 'General',
          isOnline: true,
          lastSeen: new Date().toISOString(),
          address: 'Kampala, Uganda',
          rating: 4.0,
          productsCount: 25,
          minOrder: 20000
        }
      ];
      setWholesalers(fallbackDemo);
      extractCategories();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWholesalers();
  };

  const filteredWholesalers = wholesalers
    .filter(wholesaler =>
      (selectedCategory === 'all' || wholesaler.productCategory === selectedCategory) &&
      (wholesaler.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.address.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.businessName.localeCompare(b.businessName);
        case 'online':
          return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
        case 'recent':
          return new Date(b.lastSeen) - new Date(a.lastSeen);
        case 'rating':
          return b.rating - a.rating;
        case 'products':
          return b.productsCount - a.productsCount;
        default:
          return 0;
      }
    });

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchWholesalers();
  };

  const makePhoneCall = (phoneNumber) => {
    const cleanedPhoneNumber = phoneNumber.replace(/\s/g, '');
    
    Alert.alert(
      'Call Wholesaler',
      `Do you want to call ${cleanedPhoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            const phoneUrl = `tel:${cleanedPhoneNumber}`;
            Linking.openURL(phoneUrl).catch(err => {
              Alert.alert('Error', 'Failed to make phone call');
              console.error('Error opening phone dialer:', err);
            });
          }
        },
      ]
    );
  };

  const sendEmail = (email) => {
    const emailUrl = `mailto:${email}`;
    Linking.openURL(emailUrl).catch(err => {
      Alert.alert('Error', 'Failed to open email client');
      console.error('Error opening email client:', err);
    });
  };

  const handleContact = (wholesaler) => {
    Alert.alert(
      `Contact ${wholesaler.businessName}`,
      `How would you like to contact ${wholesaler.contactPerson}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => makePhoneCall(wholesaler.phone)
        },
        { 
          text: 'Email', 
          onPress: () => sendEmail(wholesaler.email)
        },
        { 
          text: 'Message', 
          onPress: () => console.log('Open chat with:', wholesaler.contactPerson)
        },
        {
          text: 'View Details',
          onPress: () => showWholesalerDetails(wholesaler)
        }
      ]
    );
  };

  const showWholesalerDetails = (wholesaler) => {
    Alert.alert(
      `${wholesaler.businessName} Details`,
      `Contact Person: ${wholesaler.contactPerson}\nEmail: ${wholesaler.email}\nPhone: ${wholesaler.phone}\nAddress: ${wholesaler.address}\nRating: ${wholesaler.rating}/5\nProducts Available: ${wholesaler.productsCount}\nMinimum Order: UGX ${wholesaler.minOrder?.toLocaleString()}\nStatus: ${wholesaler.isOnline ? 'Online' : 'Offline'}`,
      [
        { text: 'OK', style: 'default' },
        { 
          text: 'Call', 
          onPress: () => makePhoneCall(wholesaler.phone)
        },
        { 
          text: 'Email', 
          onPress: () => sendEmail(wholesaler.email)
        },
        {
          text: 'View Products',
          onPress: () => handleViewProducts(wholesaler)
        }
      ]
    );
  };

  const handleViewProducts = (wholesaler) => {
    if (navigation && navigation.navigate) {
      navigation.navigate('WholesalerProducts', { 
        wholesaler: wholesaler 
      });
    } else {
      Alert.alert(
        'Products Preview',
        `This would show products from ${wholesaler.businessName}\n\nAvailable features:\n• Browse product catalog\n• View prices and stock\n• Add to cart\n• Place orders`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  const handleSortChange = () => {
    const options = [
      { text: 'Name', value: 'name' },
      { text: 'Online Status', value: 'online' },
      { text: 'Recently Active', value: 'recent' },
      { text: 'Rating', value: 'rating' },
      { text: 'Product Count', value: 'products' }
    ];
    
    Alert.alert(
      'Sort By',
      'Choose sorting option',
      [
        ...options.map((option) => ({
          text: option.text,
          onPress: () => setSortBy(option.value)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleCategoryFilter = () => {
    const options = categories.map(cat => ({
      text: cat === 'all' ? 'All Categories' : cat,
      value: cat
    }));
    
    Alert.alert(
      'Filter by Category',
      'Choose product category',
      [
        ...options.map((option) => ({
          text: option.text,
          onPress: () => setSelectedCategory(option.value)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const WholesalerCard = ({ wholesaler, isMobile }) => {
    const cardStyle = isMobile ? styles.mobileCard : styles.desktopCard;
    
    return (
      <View style={[
        styles.wholesalerCard,
        cardStyle,
        isDarkMode && styles.darkWholesalerCard
      ]}>
        <View style={styles.cardHeader}>
          <View style={styles.businessInfo}>
            <Text style={[styles.businessName, isDarkMode && styles.darkText]}>
              {wholesaler.businessName}
            </Text>
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" size={12} color="#F59E0B" />
              <Text style={[styles.ratingText, isDarkMode && styles.darkSubtitle]}>
                {wholesaler.rating}
              </Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            {wholesaler.isOnline ? (
              <View style={styles.onlineStatus}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}><Text style={styles.onlineText}>Online</Text></Text>
              </View>
            ) : (
              <View style={styles.offlineStatus}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineText}><Text style={styles.offlineText}>Offline</Text></Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.categoryContainer}>
          <TouchableOpacity 
            style={styles.categoryTag}
            onPress={() => setSelectedCategory(wholesaler.productCategory)}
          >
            <FontAwesome5 name="tag" size={10} color="#1D4ED8" />
            <Text style={styles.categoryText}>
              {wholesaler.productCategory}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.addressText, isDarkMode && styles.darkSubtitle]}>
            <Entypo name="location-pin" size={10} color="#6B7280" /> {wholesaler.address}
          </Text>
        </View>

        <View style={styles.contactInfo}>
          <View style={styles.contactRow}>
            <FontAwesome5 name="user" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={[styles.contactText, isDarkMode && styles.darkSubtitle]}>
              {wholesaler.contactPerson}
            </Text>
          </View>
          
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="email" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={[styles.contactText, isDarkMode && styles.darkSubtitle]}>
              {wholesaler.email}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.contactRow}
            onPress={() => makePhoneCall(wholesaler.phone)}
          >
            <FontAwesome5 name="phone" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={[styles.contactText, isDarkMode && styles.darkSubtitle]}>
              {wholesaler.phone}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <FontAwesome5 name="box" size={10} color="#6B7280" />
            <Text style={[styles.statText, isDarkMode && styles.darkSubtitle]}>
              {wholesaler.productsCount} products
            </Text>
          </View>
          <View style={styles.statItem}>
            <FontAwesome5 name="money-bill-wave" size={10} color="#6B7280" />
            <Text style={[styles.statText, isDarkMode && styles.darkSubtitle]}>
              Min: UGX {wholesaler.minOrder?.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.contactButton]}
              onPress={() => handleContact(wholesaler)}
            >
              <FontAwesome5 name="phone-alt" size={12} color="#FFFFFF" />
              <Text style={styles.buttonText}><Text style={styles.buttonText}>Contact</Text></Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.productsButton]}
              onPress={() => handleViewProducts(wholesaler)}
            >
              <FontAwesome5 name="boxes" size={12} color="#FFFFFF" />
              <Text style={styles.buttonText}><Text style={styles.buttonText}>Products</Text></Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Wholesaler Directory
          </Text>
          <View style={styles.loadingPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading wholesalers...
          </Text>
          <Text style={[styles.loadingSubtext, isDarkMode && styles.darkSubtitle]}>
            Finding the best matches for your business
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Wholesaler Directory
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
            Connect with wholesalers in your product category
          </Text>
        </View>
        {user?.productCategory && (
          <View style={[styles.categoryBadge, isDarkMode && styles.darkCategoryBadge]}>
            <FontAwesome5 name="tag" size={12} color="#1D4ED8" />
            <Text style={styles.categoryBadgeText}>
              {user.productCategory}
            </Text>
          </View>
        )}
      </View>

      {wholesalers.length > 0 && (
        <View style={[styles.controls, isDarkMode && styles.darkControls]}>
          <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
            <Feather name="search" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <TextInput
              style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
              placeholder="Search wholesalers..."
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.filterControls}>
            <TouchableOpacity 
              style={[styles.filterButton, isDarkMode && styles.darkFilterButton]}
              onPress={handleCategoryFilter}
            >
              <FontAwesome5 name="filter" size={12} color={isDarkMode ? "#D1D5DB" : "#374151"} />
              <Text style={[styles.filterButtonText, isDarkMode && styles.darkText]}>
                {selectedCategory === 'all' ? 'All' : selectedCategory}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, isDarkMode && styles.darkFilterButton]}
              onPress={handleSortChange}
            >
              <Feather name="sort" size={12} color={isDarkMode ? "#D1D5DB" : "#374151"} />
              <Text style={[styles.filterButtonText, isDarkMode && styles.darkText]}>
                {sortBy === 'name' ? 'Name' : 
                 sortBy === 'online' ? 'Online' : 
                 sortBy === 'recent' ? 'Recent' : 
                 sortBy === 'products' ? 'Products' : 'Rating'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={[styles.errorBanner, isDarkMode && styles.darkErrorBanner]}>
            <View style={styles.errorContent}>
              <MaterialIcons name="error-outline" size={20} color="#DC2626" />
              <View style={styles.errorTextContainer}>
                <Text style={[styles.errorTitle, isDarkMode && styles.darkErrorTitle]}>
                  Demo Mode
                </Text>
                <Text style={[styles.errorMessage, isDarkMode && styles.darkErrorMessage]}>
                  {error}
                </Text>
              </View>
            </View>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <Feather name="refresh-cw" size={14} color="#FFFFFF" />
                <Text style={styles.retryButtonText}><Text style={styles.retryButtonText}>Try Again</Text></Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dismissButton, isDarkMode && styles.darkDismissButton]}
                onPress={() => setError(null)}
              >
                <Text style={[styles.dismissButtonText, isDarkMode && styles.darkDismissButtonText]}>
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!user?.productCategory ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, isDarkMode && styles.darkEmptyIcon]}>
              <FontAwesome5 name="tag" size={32} color="#3B82F6" />
            </View>
            <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
              Product Category Required
            </Text>
            <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtitle]}>
              Your account doesn't have a product category set. Please update your profile to see relevant wholesalers.
            </Text>
            <TouchableOpacity style={styles.updateButton}>
              <Text style={styles.updateButtonText}><Text style={styles.updateButtonText}>Update Profile</Text></Text>
            </TouchableOpacity>
          </View>
        ) : filteredWholesalers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, isDarkMode && styles.darkEmptyIcon]}>
              <Feather name="search" size={32} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </View>
            <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
              {searchTerm ? 'No matching wholesalers' : 'No wholesalers found'}
            </Text>
            <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtitle]}>
              {searchTerm
                ? `No wholesalers match "${searchTerm}" in your category. Try a different search term.`
                : 'No wholesalers are currently available in your product category. Try broadening your category or check back later.'
              }
            </Text>
            {searchTerm && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchTerm('')}
              >
                <Text style={styles.clearButtonText}><Text style={styles.clearButtonText}>Clear Search</Text></Text>
              </TouchableOpacity>
            )}
            {(selectedCategory !== 'all') && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSelectedCategory('all')}
              >
                <Text style={styles.clearButtonText}><Text style={styles.clearButtonText}>Show All Categories</Text></Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.stats}>
              <Text style={[styles.statsText, isDarkMode && styles.darkSubtitle]}>
                Showing {filteredWholesalers.length} of {wholesalers.length} wholesalers
                {selectedCategory !== 'all' && ` in ${selectedCategory}`}
              </Text>
              <View style={styles.onlineStats}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineStatsText}>
                  {wholesalers.filter(w => w.isOnline).length} online
                </Text>
              </View>
            </View>

            {(!token || token === 'demo-token') && (
              <View style={[styles.demoNotice, isDarkMode && styles.darkDemoNotice]}>
                <Feather name="wifi-off" size={14} color={isDarkMode ? "#FEF3C7" : "#92400E"} />
                <Text style={[styles.demoNoticeText, isDarkMode && styles.darkDemoNoticeText]}>
                  Showing demo data. Connect to the internet for real wholesaler data.
                </Text>
              </View>
            )}

            <View style={isMobile ? styles.mobileGrid : styles.desktopGrid}>
              {filteredWholesalers.map(wholesaler => (
                <WholesalerCard
                  key={wholesaler._id}
                  wholesaler={wholesaler}
                  isMobile={isMobile}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  darkCategoryBadge: {
    backgroundColor: '#1E3A8A',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D4ED8',
    marginLeft: 4,
  },
  controls: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  darkControls: {
    backgroundColor: '#374151',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  darkSearchContainer: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    marginLeft: 6,
    color: '#374151',
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },
  filterControls: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    flex: 1,
  },
  darkFilterButton: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  stats: {
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
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7280',
  },
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 6,
  },
  darkDemoNotice: {
    backgroundColor: '#78350F',
    borderColor: '#D97706',
  },
  demoNoticeText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  darkDemoNoticeText: {
    color: '#FEF3C7',
  },
  mobileGrid: {
    gap: 12,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  wholesalerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  darkWholesalerCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  mobileCard: {
    width: '100%',
  },
  desktopCard: {
    width: '48%',
    minHeight: 240,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  businessInfo: {
    flex: 1,
    marginRight: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusContainer: {
    alignItems: 'flex-end',
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
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#065F46',
  },
  addressText: {
    fontSize: 10,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  contactInfo: {
    gap: 6,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 10,
    color: '#6B7280',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  contactButton: {
    backgroundColor: '#059669',
  },
  productsButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  loadingPlaceholder: {
    width: 60,
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  darkErrorBanner: {
    backgroundColor: '#7F1D1D',
    borderColor: '#DC2626',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  darkErrorTitle: {
    color: '#FCA5A5',
  },
  errorMessage: {
    fontSize: 12,
    color: '#DC2626',
  },
  darkErrorMessage: {
    color: '#FCA5A5',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dismissButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  darkDismissButton: {
    borderColor: '#6B7280',
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  darkDismissButtonText: {
    color: '#D1D5DB',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  darkEmptyIcon: {
    backgroundColor: '#374151',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  updateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  clearButton: {
    backgroundColor: '#4B5563',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default Wholesaler;