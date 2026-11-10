import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'upload_screen.dart';
import 'evidence_details_screen.dart';
import 'qr_scanner_screen.dart';
import 'public_verification_screen.dart';

void main() {
  runApp(const ProofPathApp());
}

class ProofPathApp extends StatelessWidget {
  const ProofPathApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ProofPath',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B1220),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00D4FF),
          brightness: Brightness.dark,
        ),
      ),
      home: const AuthScreen(),
    );
  }
}

// ---------------- AUTHENTICATION ----------------

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  static const String baseUrl = 'http://192.168.1.100:5000/api';

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool isLogin = true;
  bool isLoading = false;
  bool obscurePassword = true;

  @override
  void initState() {
    super.initState();
    checkSession();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> checkSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('proofpath_token');
    final userData = prefs.getString('proofpath_user');

    if (token != null && userData != null && mounted) {
      try {
        final user = jsonDecode(userData);

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => HomeScreen(user: user)),
        );
      } catch (_) {
        await prefs.remove('proofpath_token');
        await prefs.remove('proofpath_user');
      }
    }
  }

  Future<void> authenticate() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => isLoading = true);

    try {
      final endpoint = isLogin ? '/auth/login' : '/auth/register';

      final body = {
        'email': _emailController.text.trim(),
        'password': _passwordController.text,
        if (!isLogin) 'name': _nameController.text.trim(),
      };

      final response = await http
          .post(
            Uri.parse('$baseUrl$endpoint'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final token = data['token'];
        final user = data['user'];

        if (token == null || user == null) {
          throw Exception('Invalid response from server.');
        }

        final prefs = await SharedPreferences.getInstance();

        await prefs.setString('proofpath_token', token.toString());
        await prefs.setString('proofpath_user', jsonEncode(user));

        if (!mounted) return;

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => HomeScreen(user: user)),
        );
      } else {
        throw Exception(data['message'] ?? 'Authentication failed.');
      }
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red.shade700,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(26),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(
                      Icons.verified_user_rounded,
                      size: 65,
                      color: Color(0xFF00D4FF),
                    ),
                    const SizedBox(height: 15),
                    const Text(
                      'ProofPath',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Trust Every File. Track Every Step.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white60),
                    ),
                    const SizedBox(height: 45),
                    Text(
                      isLogin ? 'Welcome Back' : 'Create Account',
                      style: const TextStyle(
                        fontSize: 25,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isLogin
                          ? 'Sign in to your ProofPath account.'
                          : 'Register to start securing your evidence.',
                      style: const TextStyle(color: Colors.white60),
                    ),
                    const SizedBox(height: 25),
                    if (!isLogin) ...[
                      TextFormField(
                        controller: _nameController,
                        decoration: inputDecoration(
                          'Full Name',
                          Icons.person_outline,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Enter your name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                    ],
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: inputDecoration(
                        'Email Address',
                        Icons.email_outlined,
                      ),
                      validator: (value) {
                        if (value == null ||
                            !RegExp(r'^[^@]+@[^@]+\.[^@]+')
                                .hasMatch(value.trim())) {
                          return 'Enter a valid email address';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: obscurePassword,
                      decoration:
                          inputDecoration(
                            'Password',
                            Icons.lock_outline,
                          ).copyWith(
                            suffixIcon: IconButton(
                              onPressed: () {
                                setState(() {
                                  obscurePassword = !obscurePassword;
                                });
                              },
                              icon: Icon(
                                obscurePassword
                                    ? Icons.visibility_off
                                    : Icons.visibility,
                              ),
                            ),
                          ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Enter your password';
                        }
                        if (!isLogin && value.length < 8) {
                          return 'Password must contain at least 8 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      height: 52,
                      child: FilledButton(
                        onPressed: isLoading ? null : authenticate,
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF00BFE8),
                          foregroundColor: Colors.black,
                        ),
                        child: isLoading
                            ? const CircularProgressIndicator(
                                color: Colors.black,
                              )
                            : Text(
                                isLogin ? 'LOGIN' : 'CREATE ACCOUNT',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    TextButton(
                      onPressed: isLoading
                          ? null
                          : () {
                              setState(() {
                                isLogin = !isLogin;
                                _formKey.currentState?.reset();
                                _nameController.clear();
                                _emailController.clear();
                                _passwordController.clear();
                              });
                            },
                      child: Text(
                        isLogin
                            ? "Don't have an account? Register"
                            : 'Already have an account? Login',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, color: const Color(0xFF00D4FF)),
      filled: true,
      fillColor: const Color(0xFF151F30),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
    );
  }
}

// ---------------- HOME / MY EVIDENCE ----------------

class HomeScreen extends StatefulWidget {
  final dynamic user;

  const HomeScreen({super.key, required this.user});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const String baseUrl = 'http://192.168.1.100:5000/api';

  List<dynamic> evidenceList = [];

  bool isLoading = true;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    fetchMyEvidence();
  }

  Future<void> openQRScanner() async {
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const QRScannerScreen()),
    );

    if (!mounted || result == null) return;

    final uri = Uri.tryParse(result);

    // Support both complete verification URLs and direct tokens.
    final token = uri != null && uri.pathSegments.isNotEmpty
        ? uri.pathSegments.last
        : result.trim();

    if (!RegExp(r'^[a-fA-F0-9]{64}$').hasMatch(token)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid evidence verification QR code.')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PublicVerificationScreen(token: token)),
    );
  }

  // ---------------- FETCH EVIDENCE ----------------

  Future<void> fetchMyEvidence() async {
    if (!mounted) return;

    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('proofpath_token');

      if (token == null) {
        throw Exception('Session expired. Please log in again.');
      }

      final response = await http
          .get(
            Uri.parse('$baseUrl/evidence/my-evidence'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        final records = data['evidence'];

        if (records is! List) {
          throw Exception('Unexpected evidence response from server.');
        }

        if (!mounted) return;

        setState(() {
          evidenceList = records;
          isLoading = false;
        });
      } else {
        throw Exception(data['message'] ?? 'Unable to load your evidence.');
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        errorMessage = e.toString().replaceFirst('Exception: ', '');
        isLoading = false;
      });
    }
  }

  // ---------------- OPEN UPLOAD SCREEN ----------------

  void openUploadScreen() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => UploadScreen(onUploadSuccess: fetchMyEvidence),
      ),
    );
  }

  // ---------------- OPEN EVIDENCE DETAILS ----------------

  void openEvidenceDetails(dynamic item) {
    if (item is! Map) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Invalid evidence record.')));
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            EvidenceDetailsScreen(evidence: Map<String, dynamic>.from(item)),
      ),
    );
  }

  // ---------------- LOGOUT ----------------

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.remove('proofpath_token');
    await prefs.remove('proofpath_user');

    if (!mounted) return;

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const AuthScreen()),
      (route) => false,
    );
  }

  // ---------------- STATUS COLOR ----------------

  Color statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'approved':
        return Colors.greenAccent;
      case 'rejected':
        return Colors.redAccent;
      case 'pending':
        return Colors.orangeAccent;
      default:
        return Colors.white60;
    }
  }

  // ---------------- DATE FORMAT ----------------

  String formatDate(dynamic value) {
    if (value == null) return 'Date unavailable';

    try {
      final date = DateTime.parse(value.toString()).toLocal();

      return '${date.day.toString().padLeft(2, '0')}/'
          '${date.month.toString().padLeft(2, '0')}/'
          '${date.year}';
    } catch (_) {
      return 'Date unavailable';
    }
  }

  // ---------------- EVIDENCE CARD ----------------

  Widget buildEvidenceCard(dynamic item) {
    final title = item['title']?.toString() ?? 'Untitled Evidence';
    final fileName = item['fileName']?.toString() ?? 'Unknown file';
    final status = item['status']?.toString() ?? 'pending';
    final date = formatDate(item['createdAt']);

    return Card(
      color: const Color(0xFF151F30),
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Colors.white10),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.insert_drive_file_outlined,
                  color: Color(0xFF00D4FF),
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              fileName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white60),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  Icons.calendar_today_outlined,
                  size: 14,
                  color: Colors.grey.shade400,
                ),
                const SizedBox(width: 6),
                Text(
                  date,
                  style: const TextStyle(color: Colors.white60, fontSize: 12),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor(status).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      color: statusColor(status),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => openEvidenceDetails(item),
                icon: const Icon(Icons.visibility_outlined),
                label: const Text('View Details'),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF00D4FF),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------- HOME SCREEN UI ----------------

  @override
  Widget build(BuildContext context) {
    final name = widget.user['name'] ?? 'User';
    final role = widget.user['role'] ?? 'user';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'ProofPath',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            onPressed: fetchMyEvidence,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh evidence',
          ),
          IconButton(
            onPressed: openQRScanner,
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan QR Code',
          ),
          IconButton(
            onPressed: logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
          ),
        ],
      ), // This closing line was missing.

      floatingActionButton: FloatingActionButton.extended(
        onPressed: openUploadScreen,
        backgroundColor: const Color(0xFF00D4FF),
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add),
        label: const Text('Upload Evidence'),
      ),

      body: RefreshIndicator(
        onRefresh: fetchMyEvidence,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 10),
            Text(
              'Hello, $name',
              style: const TextStyle(fontSize: 25, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 5),
            Text('Role: $role', style: const TextStyle(color: Colors.white60)),
            const SizedBox(height: 25),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFF102A3A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFF00D4FF).withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.folder_copy_outlined,
                    size: 35,
                    color: Color(0xFF00D4FF),
                  ),
                  const SizedBox(width: 15),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'My Evidence',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          isLoading
                              ? 'Loading records...'
                              : '${evidenceList.length} evidence records',
                          style: const TextStyle(color: Colors.white60),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${evidenceList.length}',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF00D4FF),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            const Text(
              'Your Evidence Records',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 15),
            if (isLoading)
              const Padding(
                padding: EdgeInsets.all(35),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (errorMessage != null)
              Column(
                children: [
                  const Icon(
                    Icons.error_outline,
                    color: Colors.redAccent,
                    size: 45,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    errorMessage!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                  const SizedBox(height: 15),
                  FilledButton(
                    onPressed: fetchMyEvidence,
                    child: const Text('Try Again'),
                  ),
                ],
              )
            else if (evidenceList.isEmpty)
              const Padding(
                padding: EdgeInsets.all(30),
                child: Column(
                  children: [
                    Icon(
                      Icons.folder_open_outlined,
                      size: 55,
                      color: Colors.white38,
                    ),
                    SizedBox(height: 15),
                    Text(
                      'No evidence found',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Your uploaded evidence will appear here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white60),
                    ),
                  ],
                ),
              )
            else
              ...evidenceList.map(buildEvidenceCard),
          ],
        ),
      ),
    );
  }
}
