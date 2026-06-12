import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../screens/auth/landing_screen.dart';

class RiderDashboard extends StatefulWidget {
  const RiderDashboard({super.key});

  @override
  State<RiderDashboard> createState() => _RiderDashboardState();
}

class _RiderDashboardState extends State<RiderDashboard> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<OrderProvider>(context, listen: false).loadAvailableOrders();
      Provider.of<OrderProvider>(context, listen: false).loadMyBids();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Njiani Rider'),
        actions: [
          IconButton(
            icon: const Icon(Icons.home),
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const LandingScreen()),
              );
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: const [
          _AvailableOrdersTab(),
          _MyBidsTab(),
          _ProfileTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.list),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.gavel),
            label: 'My Bids',
          ),
          NavigationDestination(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _AvailableOrdersTab extends StatelessWidget {
  const _AvailableOrdersTab();

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);

    if (orderProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (orderProvider.availableOrders.isEmpty) {
      return const Center(
        child: Text('No available orders'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: orderProvider.availableOrders.length,
      itemBuilder: (context, index) {
        final order = orderProvider.availableOrders[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          child: ListTile(
            title: Text(order['shop']?['shopName'] ?? 'Unknown Shop'),
            subtitle: Text(order['deliveryAddress'] ?? ''),
            trailing: ElevatedButton(
              onPressed: () {
                // Show bid dialog
                _showBidDialog(context, order['_id']);
              },
              child: const Text('BID'),
            ),
          ),
        );
      },
    );
  }

  void _showBidDialog(BuildContext context, String orderId) {
    // Implement bid dialog
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Place Bid'),
        content: const Text('Bid functionality coming soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

class _MyBidsTab extends StatelessWidget {
  const _MyBidsTab();

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);

    if (orderProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return const Center(
      child: Text('My Bids - Coming Soon'),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: ListTile(
            leading: const CircleAvatar(
              child: Icon(Icons.person),
            ),
            title: Text(authProvider.user?['name'] ?? 'Rider'),
            subtitle: Text(authProvider.user?['phone'] ?? ''),
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: () async {
            await authProvider.logout();
            if (context.mounted) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const LandingScreen()),
              );
            }
          },
          child: const Text('Logout'),
        ),
      ],
    );
  }
}















