import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  String? get userRole => _user?['role'];
  String? get userId => _user?['_id'] ?? _user?['id'];

  AuthProvider() {
    _apiService.init();
    _loadUserFromStorage();
  }

  Future<void> _loadUserFromStorage() async {
    try {
      final response = await _apiService.getCurrentUser();
      if (response.statusCode == 200 && response.data['user'] != null) {
        _user = response.data['user'];
        notifyListeners();
      }
    } catch (e) {
      // User not logged in
      _user = null;
    }
  }

  Future<bool> login(String phone, String password, String role) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.login(phone, password, role);
      
      if (response.statusCode == 200) {
        _user = response.data['user'];
        
        // Extract token from cookies or response
        final cookies = response.headers['set-cookie'];
        if (cookies != null) {
          final tokenMatch = RegExp(r'token=([^;]+)').firstMatch(cookies.toString());
          if (tokenMatch != null) {
            await _apiService.setToken(tokenMatch.group(1)!);
          }
        }
        
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response.data['message'] ?? 'Login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> registerRider(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.registerRider(data);
      
      if (response.statusCode == 201) {
        _user = response.data['user'];
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response.data['message'] ?? 'Registration failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> registerShop(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.registerShop(data);
      
      if (response.statusCode == 201) {
        _user = response.data['user'];
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response.data['message'] ?? 'Registration failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _apiService.logout();
    } catch (e) {
      // Continue with logout even if API call fails
    }
    _user = null;
    _error = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}















