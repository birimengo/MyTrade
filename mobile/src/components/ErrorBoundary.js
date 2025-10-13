import React from 'react';
import { View, Text } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Specifically handle Text component errors
    if (error.message.includes('Text strings must be rendered within a <Text> component')) {
      console.log('🔧 Text component error detected - checking components...');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 20, backgroundColor: '#FEF2F2' }}>
          <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#DC2626', marginTop: 10 }}>
            {this.state.error?.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;