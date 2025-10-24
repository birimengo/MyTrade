import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FontAwesome5, 
  Ionicons,
  Feather,
  MaterialIcons
} from '@expo/vector-icons';

const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

const ClientManagement = ({ navigation }) => {
  const { user, token } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/wholesalers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.wholesalers || data.data || []);
      } else {
        throw new Error('Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      // Demo data
      setClients([
        {
          _id: '1',
          businessName: 'City Mart Supermarket',
          contactPerson: 'John Kamya',
          email: 'john@citymart.com',
          phone: '+256712345678',
          status: 'active',
          totalOrders: 45
        },
        {
          _id: '2', 
          businessName: 'Quick Buy Stores',
          contactPerson: 'Sarah Nakato',
          email: 'sarah@quickbuy.com',
          phone: '+256773456789',
          status: 'active',
          totalOrders: 23
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ClientCard = ({ client }) => (
    <TouchableOpacity 
      style={[styles.clientCard, isDarkMode && styles.darkClientCard]}
      onPress={() => navigation.navigate('ClientDetails', { client })}
    >
      <View style={styles.clientHeader}>
        <View style={styles.clientAvatar}>
          <Text style={styles.avatarText}>
            {client.businessName?.charAt(0) || 'C'}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={[styles.businessName, isDarkMode && styles.darkText]}>
            {client.businessName}
          </Text>
          <Text style={[styles.contactPerson, isDarkMode && styles.darkSubtitle]}>
            {client.contactPerson}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          client.status === 'active' ? styles.activeBadge : styles.inactiveBadge
        ]}>
          <Text style={styles.statusText}>
            {client.status || 'active'}
          </Text>
        </View>
      </View>
      
      <View style={styles.clientDetails}>
        <View style={styles.detailRow}>
          <Feather name="phone" size={14} color="#6B7280" />
          <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]}>
            {client.phone}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="mail" size={14} color="#6B7280" />
          <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]}>
            {client.email}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <FontAwesome5 name="shopping-cart" size={12} color="#6B7280" />
          <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]}>
            {client.totalOrders || 0} orders
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          Clients
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
          Manage your wholesale clients
        </Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
        <Feather name="search" size={20} color="#6B7280" />
        <TextInput
          style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
          placeholder="Search clients..."
          placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Clients List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading clients...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={({ item }) => <ClientCard client={item} />}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={fetchClients}
              colors={['#2563eb']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={48} color="#9CA3AF" />
              <Text style={[styles.emptyText, isDarkMode && styles.darkSubtitle]}>
                No clients found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  darkSearchContainer: {
    backgroundColor: '#374151',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkClientCard: {
    backgroundColor: '#1F2937',
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clientInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  contactPerson: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clientDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ClientManagement;