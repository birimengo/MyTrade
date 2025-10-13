// src/components/DashboardRedirect.js
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const DashboardRedirect = ({ navigation }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    // Redirect based on user role
    switch (user.role) {
      case 'retailer':
        navigation.navigate('RetailerDashboard');
        break;
      case 'wholesaler':
        navigation.navigate('WholesalerDashboard');
        break;
      case 'supplier':
        navigation.navigate('SupplierDashboard');
        break;
      case 'transporter':
        navigation.navigate('TransporterDashboard');
        break;
      case 'admin':
        navigation.navigate('AdminDashboard');
        break;
      default:
        console.log('Unknown role, redirecting to login');
        navigation.navigate('Login');
        break;
    }
  }, [user, navigation]);

  return null;
};

export default DashboardRedirect;