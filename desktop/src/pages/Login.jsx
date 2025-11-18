import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export function Login({ onSwitchToRoleSelection, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, user } = useAuth();

  // Debug: Log authentication state changes
  useEffect(() => {
    console.log('🔐 Login Component - Auth State:', {
      isAuthenticated,
      user: user ? `${user.firstName} ${user.lastName}` : 'null',
      loading
    });
  }, [isAuthenticated, user, loading]);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('✅ User already authenticated, triggering success');
      setTimeout(() => {
        onLoginSuccess();
      }, 100);
    }
  }, [isAuthenticated, user, onLoginSuccess]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login for:', formData.email);
      
      // Call the login function from AuthContext
      const result = await login(formData.email, formData.password);
      
      console.log('🔐 Login result:', result);
      
      if (result.success) {
        console.log('✅ Login successful, user:', result.user);
        
        // Clear form
        setFormData({ email: '', password: '' });
        
        // Wait a moment for auth state to update throughout the app
        setTimeout(() => {
          console.log('🚀 Triggering login success callback');
          onLoginSuccess();
        }, 500);
        
      } else {
        console.log('❌ Login failed:', result.message);
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('🔐 Login error:', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-lg p-8 border border-slate-700">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Login to Trade Uganda</h2>
          <p className="text-gray-400">Access your business account</p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Success Message (if redirected but still showing login) */}
        {isAuthenticated && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-200 text-sm">
            Login successful! Redirecting to dashboard...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 pr-10"
                required
                disabled={loading}
                minLength="6"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors focus:outline-none"
                disabled={loading}
              >
                {showPassword ? (
                  <FaEyeSlash className="w-4 h-4" />
                ) : (
                  <FaEye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all duration-200 mb-4 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
            disabled={loading || !formData.email || !formData.password}
          >
            {loading ? (
              <>
                <svg 
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  ></circle>
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </>
            ) : (
              'Login to Dashboard'
            )}
          </button>
        </form>

        <div className="text-center space-y-3 pt-4 border-t border-slate-700">
          <button 
            onClick={onSwitchToRoleSelection}
            className="text-blue-400 hover:text-blue-300 transition-colors block w-full py-2 rounded-lg hover:bg-slate-700/50"
            disabled={loading}
          >
            Don't have an account? Sign up
          </button>
          
          <button 
            className="text-gray-400 hover:text-gray-300 text-sm transition-colors py-2 rounded-lg hover:bg-slate-700/50 w-full"
            onClick={() => {
              // You can implement forgot password functionality here
              alert('Forgot password functionality coming soon!');
            }}
            disabled={loading}
          >
            Forgot your password?
          </button>
        </div>

        {/* Desktop app hint */}
        {window.electronAPI && (
          <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-700/50">
            <p className="text-xs text-blue-300 text-center">
              <strong>Desktop App</strong> - Enhanced security and offline features enabled
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;