import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../screens/rider/rider_dashboard.dart';

class RiderSignupScreen extends StatefulWidget {
  const RiderSignupScreen({super.key});

  @override
  State<RiderSignupScreen> createState() => _RiderSignupScreenState();
}

class _RiderSignupScreenState extends State<RiderSignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nationalIdController = TextEditingController();
  String? _vehicleType;
  bool _termsAccepted = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _nationalIdController.dispose();
    super.dispose();
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_termsAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please accept terms and conditions')),
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.registerRider({
      'name': _nameController.text.trim(),
      'phone': _phoneController.text.trim(),
      'password': _passwordController.text,
      'nationalId': _nationalIdController.text.trim(),
      'vehicleType': _vehicleType ?? 'motorcycle',
      'preferredAreas': 'CBD/Parklands',
      'termsAccepted': 'true',
      'affidavitAccepted': 'true',
    });

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const RiderDashboard()),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Registration failed'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rider Sign Up'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Become a Rider',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  hintText: '0700123456',
                  prefixIcon: Icon(Icons.phone),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your phone number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  prefixIcon: Icon(Icons.lock),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty || value.length < 6) {
                    return 'Password must be at least 6 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nationalIdController,
                decoration: const InputDecoration(
                  labelText: 'National ID (Optional)',
                  prefixIcon: Icon(Icons.badge),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _vehicleType,
                decoration: const InputDecoration(
                  labelText: 'Vehicle Type',
                  prefixIcon: Icon(Icons.two_wheeler),
                ),
                items: const [
                  DropdownMenuItem(value: 'motorcycle', child: Text('Motorcycle')),
                  DropdownMenuItem(value: 'bicycle', child: Text('Bicycle')),
                  DropdownMenuItem(value: 'foot', child: Text('Foot Porter')),
                ],
                onChanged: (value) => setState(() => _vehicleType = value),
                validator: (value) {
                  if (value == null) {
                    return 'Please select vehicle type';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              CheckboxListTile(
                value: _termsAccepted,
                onChanged: (value) => setState(() => _termsAccepted = value ?? false),
                title: const Text('I accept Terms & Conditions'),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: authProvider.isLoading ? null : _handleSignup,
                child: authProvider.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Sign Up'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}















