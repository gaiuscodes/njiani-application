import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class OrderProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<dynamic> _availableOrders = [];
  List<dynamic> _shopOrders = [];
  List<dynamic> _myBids = [];
  bool _isLoading = false;
  String? _error;

  List<dynamic> get availableOrders => _availableOrders;
  List<dynamic> get shopOrders => _shopOrders;
  List<dynamic> get myBids => _myBids;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadAvailableOrders() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.getAvailableOrders();
      if (response.statusCode == 200) {
        _availableOrders = response.data['orders'] ?? [];
      } else {
        _error = response.data['message'] ?? 'Failed to load orders';
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadShopOrders() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.getShopOrders();
      if (response.statusCode == 200) {
        _shopOrders = response.data['orders'] ?? [];
      } else {
        _error = response.data['message'] ?? 'Failed to load orders';
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMyBids() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.getMyBids();
      if (response.statusCode == 200) {
        _myBids = response.data['bids'] ?? [];
      } else {
        _error = response.data['message'] ?? 'Failed to load bids';
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> placeBid(String orderId, double price, int estimatedTime, String? message) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.placeBid(orderId, price, estimatedTime, message);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await loadAvailableOrders();
        await loadMyBids();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response.data['message'] ?? 'Failed to place bid';
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

  Future<bool> createOrder(Map<String, dynamic> orderData) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.createOrder(orderData);
      if (response.statusCode == 201) {
        await loadShopOrders();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response.data['message'] ?? 'Failed to create order';
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

  void clearError() {
    _error = null;
    notifyListeners();
  }
}















