
/** --------------------- CONTEXTS --------------------- **/
  const { user } = useAuth();
  const { socket, isConnected, socketService, connectionStatus, reconnect } = useSocket();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  /** --------------------- STATES --------------------- **/
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [wholesalerProductsParams, setWholesalerProductsParams] = useState(null);

  /** --------------------- EFFECTS --------------------- **/
  // Reconnect automatically when user navigates to chat tab
  useEffect(() => {
    if (activeTab === 'chat' && !isConnected && connectionStatus === 'error') {
      reconnect();
    }
  }, [activeTab, isConnected, connectionStatus]);

  /** --------------------- HANDLERS --------------------- **/

  // Reconnect manually
  const handleReconnect = async () => {
    const success = await reconnect();
    if (success) {
      Alert.alert('Success', 'Connection restored!');
    } else {
      Alert.alert('Connection Failed', 'Unable to connect to chat server. Using offline mode.');
    }
  };

  // Sidebar toggle
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleCloseSidebar = () => setIsSidebarOpen(false);

  // Navigation between wholesaler and their products
  const handleNavigateToProducts = (wholesaler) => {
    setWholesalerProductsParams({ wholesaler });
    setCurrentScreen('wholesaler-products');
    setIsSidebarOpen(false);
  };

  const handleBackToWholesaler = () => {
    setCurrentScreen('dashboard');
    setActiveTab('Wholesaler');
    setWholesalerProductsParams(null);
  };

  // Tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
    setCurrentScreen('dashboard');
    setWholesalerProductsParams(null);
  };

  // Enhanced navigation for Wholesaler component
  const getEnhancedNavigation = () => ({
    ...navigation,
    navigate: (screenName, params) => {
      if (screenName === 'WholesalerProducts' && params?.wholesaler) {
        handleNavigateToProducts(params.wholesaler);
      } else {
        navigation.navigate(screenName, params);
      }
    },
  });

  /** --------------------- RENDER FUNCTIONS --------------------- **/

  const renderChatContent = () => (
    <View style={[styles.chatWrapper, isDarkMode && styles.darkChatWrapper]}>
      {/* Connection Status Banner */}
      {connectionStatus !== 'connected' && (
        <View
          style={[
            styles.connectionBanner,
            connectionStatus === 'connecting'
              ? styles.connectingBanner
              : connectionStatus === 'error'
              ? styles.errorBanner
              : styles.disconnectedBanner,
            isDarkMode && styles.darkConnectionBanner,
          ]}
        >
          <Ionicons
            name={
              connectionStatus === 'connecting'
                ? 'sync'
                : connectionStatus === 'error'
                ? 'warning'
                : 'cloud-offline'
            }
            size={16}
            color={
              connectionStatus === 'connecting'
                ? '#F59E0B'
                : connectionStatus === 'error'
                ? '#EF4444'
                : '#6B7280'
            }
          />
          <Text style={[styles.connectionText, isDarkMode && styles.darkConnectionText]}>
            {connectionStatus === 'connecting'
              ? 'Connecting to chat service...'
              : connectionStatus === 'error'
              ? 'Failed to connect to chat service'
              : 'You are currently offline'}
          </Text>
          {connectionStatus === 'error' && (
            <TouchableOpacity onPress={handleReconnect} style={styles.reconnectButton}>
              <Text style={styles.reconnectText}>Retry Connection</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Chat Container */}
      <ChatContainer 
        isDarkMode={isDarkMode}
        connectionStatus={connectionStatus}
        onReconnect={handleReconnect}
      />
    </View>
  );

  const renderContent = () => {
    if (currentScreen === 'wholesaler-products') {
      return (
        <WholesalerProducts
          navigation={getEnhancedNavigation()}
          route={{ params: wholesalerProductsParams }}
          onBack={handleBackToWholesaler}
          isDarkMode={isDarkMode}
        />
      );
    }

    switch (activeTab) {
      case 'settings':
        return <Settings isDarkMode={isDarkMode} />;
      case 'daily-sales':
        return <DailySales isDarkMode={isDarkMode} />;
      case 'Wholesaler':
        return (
          <Wholesaler
            navigation={getEnhancedNavigation()}
            socketService={socketService}
            isConnected={isConnected}
            isDarkMode={isDarkMode}
          />
        );
      case 'MyStock':
        return <MyStock isDarkMode={isDarkMode} />;
      case 'orders':
        return <Orders isDarkMode={isDarkMode} />;
      case 'receipts':
        return <Receipts isDarkMode={isDarkMode} />;
      case 'chat':
        return renderChatContent();
      case 'overview':
      default:
        return <Overview isDarkMode={isDarkMode} />;
    }
  };

  /** --------------------- HEADER HELPERS --------------------- **/
  const getHeaderTitle = () =>
    currentScreen === 'wholesaler-products'
      ? wholesalerProductsParams?.wholesaler?.businessName || 'Products'
      : 'Retailer Dashboard';

  const getHeaderSubtitle = () => {
    if (currentScreen === 'wholesaler-products') return 'Browse Products';
    declare interface subtitlesType {}
