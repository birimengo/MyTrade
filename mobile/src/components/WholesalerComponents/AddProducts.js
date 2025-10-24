import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { height } = Dimensions.get('window');

const AddProducts = ({ 
  formData, 
  setFormData, 
  handleSubmit, 
  handleInputChange, 
  handleFileChange,
  categories, 
  editingProduct, 
  cancelForm,
  isDarkMode 
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showMeasurementUnits, setShowMeasurementUnits] = useState(false);
  
  const scrollViewRef = useRef();
  const descriptionInputRef = useRef();

  const measurementUnits = ['units', 'kg', 'g', 'l', 'ml', 'pack', 'box', 'carton', 'dozen'];

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const images = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`
        }));
        
        setSelectedImages(images);
        handleFileChange(images);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    handleFileChange(newImages);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    if (!formData.category.trim()) {
      Alert.alert('Error', 'Category is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert('Error', 'Valid price is required');
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      Alert.alert('Error', 'Valid quantity is required');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }

    setLoading(true);
    try {
      await handleSubmit();
    } finally {
      setLoading(false);
    }
  };

  const selectMeasurementUnit = (unit) => {
    handleInputChange('measurementUnit', unit);
    setShowMeasurementUnits(false);
  };

  const handleDescriptionFocus = () => {
    // Simple scroll to bottom when description is focused
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={[styles.container, isDarkMode && styles.darkContainer]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, isDarkMode && styles.darkText]}>
              {editingProduct ? 'Edit Product' : 'Create New Product'}
            </Text>
          </View>
          
          <View style={styles.form}>
            {/* Product Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Product Name *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholder="Enter product name"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                returnKeyType="next"
              />
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Category *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                value={formData.category}
                onChangeText={(text) => handleInputChange('category', text)}
                placeholder="Enter category"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                returnKeyType="next"
              />
              {categories.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList}>
                  {categories.map((cat, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.categoryChip, isDarkMode && styles.darkCategoryChip]}
                      onPress={() => handleInputChange('category', cat)}
                    >
                      <Text style={[styles.categoryText, isDarkMode && styles.darkCategoryText]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Price and Quantity Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>
                  Price (UGX) *
                </Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.darkInput]}
                  value={formData.price}
                  onChangeText={(text) => handleInputChange('price', text)}
                  placeholder="0.00"
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>
                  Quantity *
                </Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.darkInput]}
                  value={formData.quantity}
                  onChangeText={(text) => handleInputChange('quantity', text)}
                  placeholder="0"
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Measurement Unit and Min Order Quantity Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>
                  Measurement Unit *
                </Text>
                <View style={[styles.measurementContainer, isDarkMode && styles.darkInput]}>
                  <TextInput
                    style={[styles.measurementTextInput, isDarkMode && styles.darkText]}
                    value={formData.measurementUnit}
                    onChangeText={(text) => handleInputChange('measurementUnit', text)}
                    placeholder="Type or select unit"
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    editable={true}
                    onFocus={() => setShowMeasurementUnits(true)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowMeasurementUnits(!showMeasurementUnits)}
                    style={styles.measurementDropdownButton}
                  >
                    <Feather 
                      name={showMeasurementUnits ? "chevron-up" : "chevron-down"} 
                      size={14} 
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                    />
                  </TouchableOpacity>
                </View>
                
                {showMeasurementUnits && (
                  <View style={[styles.unitsDropdown, isDarkMode && styles.darkUnitsDropdown]}>
                    <ScrollView 
                      style={styles.unitsScrollView}
                      nestedScrollEnabled={true}
                    >
                      {measurementUnits.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitOption,
                            formData.measurementUnit === unit && styles.selectedUnitOption,
                            isDarkMode && formData.measurementUnit === unit && styles.darkSelectedUnitOption
                          ]}
                          onPress={() => selectMeasurementUnit(unit)}
                        >
                          <Text style={[
                            styles.unitOptionText,
                            isDarkMode && styles.darkText,
                            formData.measurementUnit === unit && styles.selectedUnitText
                          ]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>
                  Min Order Qty
                </Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.darkInput]}
                  value={formData.minOrderQuantity}
                  onChangeText={(text) => handleInputChange('minOrderQuantity', text)}
                  placeholder="1"
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Description *
              </Text>
              <TextInput
                ref={descriptionInputRef}
                style={[styles.textArea, isDarkMode && styles.darkInput]}
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Enter product description"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={handleDescriptionFocus}
                blurOnSubmit={true}
              />
            </View>

            {/* Product Images */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Product Images
              </Text>
              
              {selectedImages.length > 0 && (
                <View style={styles.selectedImages}>
                  <Text style={[styles.selectedImagesLabel, isDarkMode && styles.darkSubtext]}>
                    Selected images ({selectedImages.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.imagesList}>
                      {selectedImages.map((image, index) => (
                        <View key={index} style={styles.imageItem}>
                          <Image
                            source={{ uri: image.uri }}
                            style={styles.imagePreview}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => removeImage(index)}
                          >
                            <Feather name="x" size={12} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.imagePickerButton, isDarkMode && styles.darkImagePickerButton]}
                onPress={pickImages}
              >
                <Feather name="image" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={[styles.imagePickerText, isDarkMode && styles.darkSubtext]}>
                  {selectedImages.length > 0 ? 'Add More Images' : 'Select Images'}
                </Text>
              </TouchableOpacity>
              
              <Text style={[styles.helperText, isDarkMode && styles.darkSubtext]}>
                Upload multiple images to showcase your product
              </Text>
            </View>

            {/* Bulk Discount */}
            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <Switch
                  value={formData.bulkDiscount}
                  onValueChange={(value) => handleInputChange('bulkDiscount', value)}
                  trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                  thumbColor={formData.bulkDiscount ? '#FFFFFF' : '#FFFFFF'}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
                <Text style={[styles.switchLabel, isDarkMode && styles.darkText]}>
                  Offer bulk discount
                </Text>
              </View>

              {formData.bulkDiscount && (
                <View style={styles.discountInput}>
                  <Text style={[styles.label, isDarkMode && styles.darkText]}>
                    Discount Percentage
                  </Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.darkInput]}
                    value={formData.discountPercentage}
                    onChangeText={(text) => handleInputChange('discountPercentage', text)}
                    placeholder="0"
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              )}
            </View>

            {/* Tags */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Tags (comma-separated)
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                value={formData.tags}
                onChangeText={(text) => handleInputChange('tags', text)}
                placeholder="e.g., organic, fresh, local, premium"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                returnKeyType="done"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handleFormSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name={editingProduct ? "check" : "plus"} size={14} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.cancelButton, isDarkMode && styles.darkCancelButton]}
                onPress={cancelForm}
              >
                <Text style={[styles.cancelButtonText, isDarkMode && styles.darkCancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  darkContainer: {
    backgroundColor: '#374151',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 200, // Significantly increased padding for better keyboard avoidance
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#374151',
    minHeight: 36,
  },
  darkInput: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#374151',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  measurementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    minHeight: 36,
  },
  measurementTextInput: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    paddingVertical: 8,
  },
  measurementDropdownButton: {
    padding: 4,
  },
  unitsDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginTop: 4,
    maxHeight: 150, // Increased height for better scrolling
  },
  darkUnitsDropdown: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  unitsScrollView: {
    maxHeight: 148,
  },
  unitOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedUnitOption: {
    backgroundColor: '#3B82F6',
  },
  darkSelectedUnitOption: {
    backgroundColor: '#1D4ED8',
  },
  unitOptionText: {
    fontSize: 12,
    color: '#374151',
  },
  selectedUnitText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  categoriesList: {
    marginTop: 2,
  },
  categoryChip: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  darkCategoryChip: {
    backgroundColor: '#6B7280',
  },
  categoryText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
  darkCategoryText: {
    color: '#FFFFFF',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 12,
    gap: 6,
    justifyContent: 'center',
  },
  darkImagePickerButton: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  imagePickerText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedImages: {
    marginBottom: 8,
  },
  selectedImagesLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
  },
  imagesList: {
    flexDirection: 'row',
    gap: 8,
  },
  imageItem: {
    position: 'relative',
  },
  imagePreview: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  discountInput: {
    marginTop: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 40, // Increased margin to ensure buttons are visible
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  darkCancelButton: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  darkCancelButtonText: {
    color: '#D1D5DB',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
});

export default AddProducts;