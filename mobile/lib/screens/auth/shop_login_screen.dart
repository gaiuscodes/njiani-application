import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../screens/shop/shop_dashboard.dart';

class ShopLoginScreen extends StatelessWidget {
  const ShopLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      appBar: AppBar(title: Text('Shop Login')),
      body: Center(child: Text('Shop Login - Coming Soon')),
    );
  }
}

