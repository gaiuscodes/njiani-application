import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late Dio _dio;
  String? _token;

  void init() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Load token from storage
        if (_token == null) {
          final prefs = await SharedPreferences.getInstance();
          _token = prefs.getString('auth_token');
        }
        
        if (_token != null) {
          options.headers['Cookie'] = 'token=$_token';
        }
        
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          // Handle unauthorized - clear token and redirect to login
          _clearToken();
        }
        return handler.next(error);
      },
    ));
  }

  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<void> _clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  // Auth methods
  Future<Response> login(String phone, String password, String role) async {
    return await _dio.post(
      ApiConfig.login,
      data: {'phone': phone, 'password': password, 'role': role},
      options: Options(
        headers: {'Content-Type': 'application/json'},
        validateStatus: (status) => status! < 500,
      ),
    );
  }

  Future<Response> registerRider(Map<String, dynamic> data) async {
    final formData = FormData.fromMap(data);
    return await _dio.post(
      ApiConfig.registerRider,
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        validateStatus: (status) => status! < 500,
      ),
    );
  }

  Future<Response> registerShop(Map<String, dynamic> data) async {
    final formData = FormData.fromMap(data);
    return await _dio.post(
      ApiConfig.registerShop,
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        validateStatus: (status) => status! < 500,
      ),
    );
  }

  Future<Response> getCurrentUser() async {
    return await _dio.get(
      ApiConfig.me,
      options: Options(
        validateStatus: (status) => status! < 500,
      ),
    );
  }

  Future<Response> logout() async {
    final response = await _dio.post(ApiConfig.logout);
    await _clearToken();
    return response;
  }

  // Rider methods
  Future<Response> getRiderProfile() async {
    return await _dio.get(ApiConfig.riderProfile(null));
  }

  Future<Response> getAvailableOrders() async {
    return await _dio.get(ApiConfig.availableOrders);
  }

  Future<Response> placeBid(String orderId, double price, int estimatedTime, String? message) async {
    return await _dio.post(
      ApiConfig.bidOrder(orderId),
      data: {
        'price': price,
        'estimatedTime': estimatedTime,
        if (message != null) 'message': message,
      },
    );
  }

  Future<Response> getMyBids() async {
    return await _dio.get(ApiConfig.myBids);
  }

  // Shop methods
  Future<Response> getShopProfile() async {
    return await _dio.get(ApiConfig.shopProfile);
  }

  Future<Response> getShopOrders() async {
    return await _dio.get(ApiConfig.shopOrders);
  }

  Future<Response> createOrder(Map<String, dynamic> orderData) async {
    return await _dio.post(
      ApiConfig.createOrder,
      data: orderData,
    );
  }

  Future<Response> acceptBid(String orderId, int bidIndex) async {
    return await _dio.post(
      ApiConfig.acceptBid(orderId),
      data: {'bidIndex': bidIndex},
    );
  }

  // Wallet methods
  Future<Response> getWallet() async {
    return await _dio.get(ApiConfig.wallet);
  }

  Future<Response> topUpWallet(double amount, String? phone) async {
    return await _dio.post(
      ApiConfig.mpesaStkPush,
      data: {
        'amount': amount,
        if (phone != null) 'phone': phone,
      },
    );
  }

  // Generic GET request
  Future<Response> get(String url) async {
    return await _dio.get(url);
  }

  // Generic POST request
  Future<Response> post(String url, {Map<String, dynamic>? data}) async {
    return await _dio.post(url, data: data);
  }
}















