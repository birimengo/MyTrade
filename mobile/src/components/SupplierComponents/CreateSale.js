// src/components/SupplierComponents/CreateSale.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDarkMode } from '../../context/DarkModeContext';

const CreateSaleTab = ({ apiCall, onSaleCreated }) => {
  const { isDarkMode } = useDarkMode();
  
  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.title, isDarkMode && styles.darkText]}>
        Create Sale - Coming Soon
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginTop: 20,
  },
  darkText: {
    color: '#FFFFFF',
  },
});

export default CreateSaleTab;