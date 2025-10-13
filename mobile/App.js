// App.js
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { DarkModeProvider, useDarkMode } from './src/context/DarkModeContext';
import { SocketProvider } from './src/context/SocketContext';
import ErrorBoundary from './src/components/ErrorBoundary';

// Import all screen components
import RoleSelection from './src/screens/RoleSelection';
import Signup from './src/screens/Signup';
import Login from './src/screens/Login';
import ForgotPassword from './src/screens/ForgotPassword';
import ResetPassword from './src/screens/ResetPassword';
import DashboardRedirect from './src/components/DashboardRedirect';
import RetailerDashboard from './src/screens/dashboards/RetailerDashboard';
import WholesalerDashboard from './src/screens/dashboards/WholesalerDashboard';
import SupplierDashboard from './src/screens/dashboards/SupplierDashboard';
import TransporterDashboard from './src/screens/dashboards/TransporterDashboard';
import AdminDashboard from './src/screens/dashboards/AdminDashboard';

const Stack = createNativeStackNavigator();

// Create a wrapper component that uses dark mode context
function AppContent() {
  const { isDarkMode } = useDarkMode();
  const systemColorScheme = useColorScheme();

  // Use custom dark mode preference, fallback to system
  const actualDarkMode = isDarkMode;

  const navigationTheme = actualDarkMode ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator 
        initialRouteName="RoleSelection"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: actualDarkMode ? '#111827' : '#FFFFFF'
          }
        }}
      >
        <Stack.Screen name="RoleSelection" component={RoleSelection} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="DashboardRedirect" component={DashboardRedirect} />
        
        {/* Dashboard Screens */}
        <Stack.Screen name="RetailerDashboard" component={RetailerDashboard} />
        <Stack.Screen name="WholesalerDashboard" component={WholesalerDashboard} />
        <Stack.Screen name="SupplierDashboard" component={SupplierDashboard} />
        <Stack.Screen name="TransporterDashboard" component={TransporterDashboard} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <DarkModeProvider>
          <AuthProvider>
            <SocketProvider>
              <AppContent />
            </SocketProvider>
          </AuthProvider>
        </DarkModeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}