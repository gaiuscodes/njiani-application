class ApiConfig {
  // Update this with your backend URL
  static const String baseUrl = 'http://localhost:5000';
  // For production, use your deployed backend URL
  // static const String baseUrl = 'https://your-backend-url.com';
  
  static const String apiPrefix = '/api';
  
  // Auth endpoints
  static String get login => '$baseUrl$apiPrefix/auth/login';
  static String get registerRider => '$baseUrl$apiPrefix/auth/register/rider';
  static String get registerShop => '$baseUrl$apiPrefix/auth/register/shop';
  static String get me => '$baseUrl$apiPrefix/auth/me';
  static String get logout => '$baseUrl$apiPrefix/auth/logout';
  
  // Rider endpoints
  static String riderProfile(String? id) => '$baseUrl$apiPrefix/rider/profile';
  static String get availableOrders => '$baseUrl$apiPrefix/rider/available-orders';
  static String bidOrder(String orderId) => '$baseUrl$apiPrefix/rider/bid/$orderId';
  static String get myBids => '$baseUrl$apiPrefix/rider/bids';
  static String pickupOrder(String orderId) => '$baseUrl$apiPrefix/rider/order/$orderId/pickup';
  static String completeOrder(String orderId) => '$baseUrl$apiPrefix/rider/order/$orderId/complete';
  static String updateLocation(String orderId) => '$baseUrl$apiPrefix/rider/order/$orderId/location';
  
  // Shop endpoints
  static String get shopProfile => '$baseUrl$apiPrefix/shop/profile';
  static String get shopOrders => '$baseUrl$apiPrefix/shop/orders';
  static String createOrder => '$baseUrl$apiPrefix/shop/orders';
  static String acceptBid(String orderId) => '$baseUrl$apiPrefix/shop/orders/$orderId/accept-bid';
  static String handoverOrder(String orderId) => '$baseUrl$apiPrefix/shop/orders/$orderId/handover';
  
  // Wallet endpoints
  static String get wallet => '$baseUrl$apiPrefix/wallet';
  static String get walletTransactions => '$baseUrl$apiPrefix/wallet/transactions';
  
  // M-Pesa endpoints
  static String get mpesaStkPush => '$baseUrl$apiPrefix/mpesa/stk-push';
  
  // Notifications
  static String get notifications => '$baseUrl$apiPrefix/notifications';
  static String markNotificationRead(String id) => '$baseUrl$apiPrefix/notifications/$id/read';
  
  // Messages
  static String get messages => '$baseUrl$apiPrefix/messages';
  static String sendMessage => '$baseUrl$apiPrefix/messages';
}















