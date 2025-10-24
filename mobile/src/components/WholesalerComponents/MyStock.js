import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ManualStock from './ManualStock';
import SystemStock from './SystemStock';

const { width } = Dimensions.get('window');

const MyStock = ({ navigation, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState('manual');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Stock Management
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>
            {activeTab === 'manual' 
              ? 'Manage inventory manually' 
              : 'AI-powered stock predictions'
            }
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, isDarkMode && styles.darkTabsContainer]}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'manual' && styles.activeTab,
              activeTab === 'manual' && styles.manualActiveTab
            ]}
            onPress={() => handleTabChange('manual')}
          >
            <Ionicons 
              name="cube-outline" 
              size={16} 
              color={activeTab === 'manual' 
                ? '#3B82F6' 
                : isDarkMode ? '#9CA3AF' : '#6B7280'
              } 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'manual' && styles.activeTabText,
              activeTab === 'manual' && styles.manualActiveText,
              isDarkMode && styles.darkTabText
            ]}>
              Manual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'system' && styles.activeTab,
              activeTab === 'system' && styles.systemActiveTab
            ]}
            onPress={() => handleTabChange('system')}
          >
            <Ionicons 
              name="server-outline" 
              size={16} 
              color={activeTab === 'system' 
                ? '#10B981' 
                : isDarkMode ? '#9CA3AF' : '#6B7280'
              } 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'system' && styles.activeTabText,
              activeTab === 'system' && styles.systemActiveText,
              isDarkMode && styles.darkTabText
            ]}>
              System
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'manual' ? (
          <ManualStock navigation={navigation} isDarkMode={isDarkMode} />
        ) : (
          <SystemStock navigation={navigation} isDarkMode={isDarkMode} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  darkHeader: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  darkTabsContainer: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  manualActiveTab: {
    borderBottomColor: '#3B82F6',
  },
  systemActiveTab: {
    borderBottomColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    color: '#6B7280',
  },
  activeTabText: {
    fontWeight: '600',
  },
  manualActiveText: {
    color: '#3B82F6',
  },
  systemActiveText: {
    color: '#10B981',
  },
  darkTabText: {
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
});

export default MyStock;