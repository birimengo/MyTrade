// src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const Storage = {
  // Get item with better error handling
  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      
      // Try to parse as JSON
      try {
        return JSON.parse(value);
      } catch (parseError) {
        console.warn(`Failed to parse stored value for key "${key}". Returning raw value.`, parseError);
        // If it's not valid JSON, return the raw string
        return value;
      }
    } catch (error) {
      console.error(`Error getting item "${key}" from storage:`, error);
      return null;
    }
  },

  // Set item
  async setItem(key, value) {
    try {
      // Only stringify if it's not already a string and not null/undefined
      const valueToStore = (typeof value === 'string' || value === null || value === undefined) 
        ? value 
        : JSON.stringify(value);
      
      await AsyncStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error(`Error setting item "${key}" in storage:`, error);
    }
  },

  // Remove item
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item "${key}" from storage:`, error);
    }
  },

  // Clear all storage (useful for debugging)
  async clear() {
    try {
      await AsyncStorage.clear();
      console.log('Storage cleared successfully');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  // Get all keys (useful for debugging)
  async getAllKeys() {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys from storage:', error);
      return [];
    }
  },

  // Multi-get
  async multiGet(keys) {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('Error multi-get from storage:', error);
      return [];
    }
  },

  // Multi-set
  async multiSet(keyValuePairs) {
    try {
      // Ensure all values are properly stringified
      const processedPairs = keyValuePairs.map(([key, value]) => [
        key,
        (typeof value === 'string' || value === null || value === undefined) 
          ? value 
          : JSON.stringify(value)
      ]);
      
      await AsyncStorage.multiSet(processedPairs);
    } catch (error) {
      console.error('Error multi-set in storage:', error);
    }
  },

  // Multi-remove
  async multiRemove(keys) {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error multi-remove from storage:', error);
    }
  },

  // Debug method to inspect storage contents
  async debugStorage() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      
      console.log('=== Storage Contents ===');
      stores.forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
      console.log('=== End Storage Contents ===');
      
      return stores;
    } catch (error) {
      console.error('Error debugging storage:', error);
      return [];
    }
  },

  // Safe method to clear corrupted data
  async clearCorruptedData() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const corruptedKeys = [];
      
      // Check each key for corruption
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            JSON.parse(value); // Try to parse
          }
        } catch (error) {
          console.log(`Found corrupted data for key: ${key}`);
          corruptedKeys.push(key);
        }
      }
      
      if (corruptedKeys.length > 0) {
        await AsyncStorage.multiRemove(corruptedKeys);
        console.log(`Cleared ${corruptedKeys.length} corrupted keys:`, corruptedKeys);
      }
      
      return corruptedKeys;
    } catch (error) {
      console.error('Error clearing corrupted data:', error);
      return [];
    }
  }
};