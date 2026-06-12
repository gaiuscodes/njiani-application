import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/api_config.dart';

class SocketProvider with ChangeNotifier {
  IO.Socket? _socket;
  bool _isConnected = false;
  String? _userId;

  IO.Socket? get socket => _socket;
  bool get isConnected => _isConnected;

  void connect(String userId) {
    _userId = userId;
    
    _socket = IO.io(
      ApiConfig.baseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      _socket!.emit('join', {'userId': userId, 'role': 'rider'}); // Update based on user role
      notifyListeners();
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      notifyListeners();
    });

    _socket!.onError((error) {
      debugPrint('Socket error: $error');
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    _isConnected = false;
    notifyListeners();
  }

  void emitLocation(String orderId, double lat, double lng) {
    if (_socket != null && _isConnected) {
      _socket!.emit('rider_location', {
        'orderId': orderId,
        'lat': lat,
        'lng': lng,
      });
    }
  }

  void listenToOrderUpdates(Function(Map<String, dynamic>) callback) {
    _socket?.on('order_update', (data) {
      callback(data);
    });
  }

  void listenToNewOrders(Function(Map<String, dynamic>) callback) {
    _socket?.on('new_order', (data) {
      callback(data);
    });
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}















