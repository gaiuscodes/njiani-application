import 'package:flutter/material.dart';

class AppTheme {
  // Color palette matching the web app
  static const Color primaryOrange = Color(0xFFF97316);
  static const Color primaryOrangeDark = Color(0xFFEA580C);
  static const Color dark900 = Color(0xFF111827);
  static const Color dark800 = Color(0xFF1F2937);
  static const Color dark700 = Color(0xFF374151);
  static const Color dark600 = Color(0xFF4B5563);
  static const Color gray300 = Color(0xFFD1D5DB);
  static const Color gray400 = Color(0xFF9CA3AF);
  
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: primaryOrange,
      scaffoldBackgroundColor: dark900,
      colorScheme: const ColorScheme.dark(
        primary: primaryOrange,
        secondary: primaryOrangeDark,
        surface: dark800,
        background: dark900,
        error: Color(0xFFEF4444),
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: gray300,
        onBackground: gray300,
        onError: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: dark800,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.white),
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardTheme(
        color: dark800,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryOrange,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: dark800,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: dark600),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: dark600),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primaryOrange, width: 2),
        ),
        hintStyle: const TextStyle(color: gray400),
      ),
    );
  }
}















