import 'package:flutter/material.dart';
import 'rider_login_screen.dart';
import 'shop_login_screen.dart';
import 'admin_login_screen.dart';
import 'rider_signup_screen.dart';
import 'shop_signup_screen.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Glassmorphism App Bar
          SliverAppBar(
            expandedHeight: 100,
            floating: true,
            pinned: true,
            backgroundColor: Colors.black.withOpacity(0.3),
            flexibleSpace: FlexibleSpaceBar(
              title: const Text(
                'Njiani',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(0xFF111827),
                      const Color(0xFF1F2937),
                      const Color(0xFF111827),
                    ],
                  ),
                ),
              ),
            ),
            actions: [
              _NavLink(
                label: 'Rider Login',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const RiderLoginScreen()),
                ),
              ),
              _NavLink(
                label: 'Shop Login',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ShopLoginScreen()),
                ),
              ),
              _NavLink(
                label: 'Admin',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AdminLoginScreen()),
                ),
              ),
            ],
          ),
          
          // Hero Section
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const SizedBox(height: 40),
                  const Text(
                    'Njiani',
                    style: TextStyle(
                      fontSize: 64,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFF97316),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Mizigo njiani',
                    style: TextStyle(
                      fontSize: 28,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Real-time delivery marketplace connecting online shops with delivery riders across Kenya',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white60,
                    ),
                  ),
                  const SizedBox(height: 48),
                  
                  // CTA Buttons
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const RiderSignupScreen()),
                      ),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text('Become a Rider'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ShopSignupScreen()),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: const BorderSide(color: Color(0xFFF97316)),
                      ),
                      child: const Text('Register Your Shop'),
                    ),
                  ),
                  
                  const SizedBox(height: 80),
                  
                  // How It Works
                  const Text(
                    'How It Works',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  _FeatureCard(
                    icon: Icons.shopping_bag,
                    title: 'Shop Creates Order',
                    description: 'Shops create delivery orders with pickup and destination details',
                  ),
                  const SizedBox(height: 16),
                  _FeatureCard(
                    icon: Icons.two_wheeler,
                    title: 'Riders Bid',
                    description: 'Available riders place bids with their price and estimated delivery time',
                  ),
                  const SizedBox(height: 16),
                  _FeatureCard(
                    icon: Icons.check_circle,
                    title: 'Track & Deliver',
                    description: 'Real-time tracking from pickup to delivery with live location updates',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavLink extends StatefulWidget {
  final String label;
  final VoidCallback onTap;

  const _NavLink({required this.label, required this.onTap});

  @override
  State<_NavLink> createState() => _NavLinkState();
}

class _NavLinkState extends State<_NavLink> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                widget.label,
                style: TextStyle(
                  color: _isHovered ? const Color(0xFFF97316) : Colors.white70,
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                height: 2,
                width: _isHovered ? double.infinity : 0,
                color: const Color(0xFFF97316),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _FeatureCard({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(icon, size: 48, color: const Color(0xFFF97316)),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }
}

