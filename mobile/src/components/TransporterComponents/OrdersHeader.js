// C:\Users\ham\Desktop\trade\mobile\src\components\TransporterComponents\OrdersHeader.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

const OrdersHeader = ({ 
  filters, 
  setFilters, 
  statistics, 
  availableReturnOrders, 
  refreshOrders,
  isDarkMode 
}) => {
  const statusStats = [
    { status: 'assigned_to_transporter', label: 'Assigned', icon: 'truck' },
    { status: 'accepted_by_transporter', label: 'Accepted', icon: 'checkmark-circle' },
    { status: 'in_transit', label: 'In Transit', icon: 'navigate' },
    { status: 'delivered', label: 'Delivered', icon: 'home' },
    { status: 'return_requested', label: 'Return Req', icon: 'return-up-back' },
    { status: 'available_returns', label: 'Available', icon: 'cube', custom: availableReturnOrders.length }
  ];

  const statusColors = {
    assigned_to_transporter: { bg: '#e0e7ff', text: '#3730a3', darkBg: '#3730a3', darkText: '#c7d2fe' },
    accepted_by_transporter: { bg: '#dbeafe', text: '#1e40af', darkBg: '#1e40af', darkText: '#dbeafe' },
    in_transit: { bg: '#ffedd5', text: '#9a3412', darkBg: '#9a3412', darkText: '#fed7aa' },
    delivered: { bg: '#dcfce7', text: '#166534', darkBg: '#166534', darkText: '#dcfce7' },
    return_requested: { bg: '#fef3c7', text: '#92400e', darkBg: '#92400e', darkText: '#fef3c7' },
    available_returns: { bg: '#f3e8ff', text: '#7e22ce', darkBg: '#7e22ce', darkText: '#f3e8ff' }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Supplier Orders (S-Orders)
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>
            Manage orders assigned to you from suppliers
          </Text>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
            onPress={refreshOrders}
          >
            <Ionicons 
              name="refresh" 
              size={16} 
              color={isDarkMode ? "#d1d5db" : "#374151"} 
            />
            <Text style={[styles.actionButtonText, isDarkMode && styles.darkActionButtonText]}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {/* Order Type Filter */}
          <View style={[styles.filterWrapper, isDarkMode && styles.darkFilterWrapper]}>
            <Text style={[styles.filterLabel, isDarkMode && styles.darkText]}>Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {[
                { value: 'all', label: 'All Types' },
                { value: 'delivery', label: 'Delivery' },
                { value: 'return', label: 'Return' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    filters.type === type.value && styles.typeButtonActive,
                    isDarkMode && styles.darkTypeButton,
                    filters.type === type.value && isDarkMode && styles.darkTypeButtonActive
                  ]}
                  onPress={() => setFilters({ ...filters, type: type.value })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    filters.type === type.value && styles.typeButtonTextActive,
                    isDarkMode && styles.darkTypeButtonText,
                    filters.type === type.value && isDarkMode && styles.darkTypeButtonTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Status Filter */}
          <View style={[styles.filterWrapper, isDarkMode && styles.darkFilterWrapper]}>
            <Text style={[styles.filterLabel, isDarkMode && styles.darkText]}>Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
              {[
                { value: 'all', label: 'All Status' },
                { value: 'assigned_to_transporter', label: 'Assigned' },
                { value: 'accepted_by_transporter', label: 'Accepted' },
                { value: 'in_transit', label: 'In Transit' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'return_requested', label: 'Return Req' },
                { value: 'return_accepted', label: 'Return Acc' },
                { value: 'return_in_transit', label: 'Return Transit' },
                { value: 'returned_to_supplier', label: 'Returned' },
                { value: 'cancelled', label: 'Cancelled' }
              ].map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusButton,
                    filters.status === status.value && styles.statusButtonActive,
                    isDarkMode && styles.darkStatusButton,
                    filters.status === status.value && isDarkMode && styles.darkStatusButtonActive
                  ]}
                  onPress={() => setFilters({ ...filters, status: status.value })}
                >
                  <Text style={[
                    styles.statusButtonText,
                    filters.status === status.value && styles.statusButtonTextActive,
                    isDarkMode && styles.darkStatusButtonText,
                    filters.status === status.value && isDarkMode && styles.darkStatusButtonTextActive
                  ]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
            <Ionicons 
              name="search" 
              size={16} 
              color={isDarkMode ? "#9ca3af" : "#6b7280"} 
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
              placeholder="Search orders..."
              placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
              value={filters.search}
              onChangeText={(text) => setFilters({ ...filters, search: text })}
            />
          </View>
        </ScrollView>
      </View>

      {/* Statistics */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContent}
      >
        {statusStats.map(({ status, label, icon, custom }) => {
          const colors = statusColors[status] || statusColors.available_returns;
          const count = custom !== undefined ? custom : statistics[status] || 0;
          
          return (
            <View 
              key={status}
              style={[
                styles.statCard,
                { 
                  backgroundColor: isDarkMode ? colors.darkBg : colors.bg,
                  borderColor: isDarkMode ? colors.darkBg : colors.bg
                }
              ]}
            >
              <Ionicons 
                name={icon} 
                size={20} 
                color={isDarkMode ? colors.darkText : colors.text} 
              />
              <View style={styles.statTextContainer}>
                <Text style={[
                  styles.statLabel,
                  { color: isDarkMode ? colors.darkText : colors.text }
                ]}>
                  {label}
                </Text>
                <Text style={[
                  styles.statCount,
                  { color: isDarkMode ? colors.darkText : colors.text }
                ]}>
                  {count}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Available Returns Banner */}
      {availableReturnOrders.length > 0 && filters.type === 'all' && (
        <View style={[
          styles.returnsBanner,
          isDarkMode && styles.darkReturnsBanner
        ]}>
          <Ionicons 
            name="warning" 
            size={16} 
            color={isDarkMode ? "#fbbf24" : "#d97706"} 
          />
          <View style={styles.returnsContent}>
            <Text style={[
              styles.returnsTitle,
              isDarkMode && styles.darkReturnsTitle
            ]}>
              Available Return Orders ({availableReturnOrders.length})
            </Text>
            <Text style={[
              styles.returnsSubtitle,
              isDarkMode && styles.darkReturnsSubtitle
            ]}>
              These return orders are available for you to accept
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkContainer: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  darkText: {
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  darkSubtext: {
    color: '#d1d5db',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  darkActionButton: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  darkActionButtonText: {
    color: '#d1d5db',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersContent: {
    gap: 12,
  },
  filterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  darkFilterWrapper: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
    minWidth: 50,
  },
  typeScroll: {
    flex: 1,
  },
  statusScroll: {
    flex: 1,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  darkTypeButton: {
    backgroundColor: '#4b5563',
    borderColor: '#6b7280',
  },
  darkTypeButtonActive: {
    backgroundColor: '#60a5fa',
    borderColor: '#60a5fa',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  darkTypeButtonText: {
    color: '#d1d5db',
  },
  darkTypeButtonTextActive: {
    color: '#ffffff',
  },
  statusButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 6,
  },
  statusButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  darkStatusButton: {
    backgroundColor: '#4b5563',
    borderColor: '#6b7280',
  },
  darkStatusButtonActive: {
    backgroundColor: '#60a5fa',
    borderColor: '#60a5fa',
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  darkStatusButtonText: {
    color: '#d1d5db',
  },
  darkStatusButtonTextActive: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    minWidth: 200,
  },
  darkSearchContainer: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    padding: 0,
  },
  darkSearchInput: {
    color: '#ffffff',
  },
  statsScroll: {
    marginBottom: 12,
  },
  statsContent: {
    gap: 8,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    marginRight: 8,
  },
  statTextContainer: {
    marginLeft: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statCount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  returnsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  darkReturnsBanner: {
    backgroundColor: '#92400e',
    borderColor: '#d97706',
  },
  returnsContent: {
    marginLeft: 8,
    flex: 1,
  },
  returnsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  darkReturnsTitle: {
    color: '#fef3c7',
  },
  returnsSubtitle: {
    fontSize: 12,
    color: '#92400e',
  },
  darkReturnsSubtitle: {
    color: '#fef3c7',
  },
});

export default OrdersHeader;