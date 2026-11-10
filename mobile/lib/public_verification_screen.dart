import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class PublicVerificationScreen extends StatefulWidget {
  final String token;

  const PublicVerificationScreen({
    super.key,
    required this.token,
  });

  @override
  State<PublicVerificationScreen> createState() =>
      _PublicVerificationScreenState();
}

class _PublicVerificationScreenState
    extends State<PublicVerificationScreen> {
  static const String baseUrl = 'http://192.168.1.100:5000/api';

  bool isLoading = true;
  String? errorMessage;
  Map<String, dynamic>? verification;

  @override
  void initState() {
    super.initState();
    verifyEvidence();
  }

  Future<void> verifyEvidence() async {
    try {
      final response = await http.get(
        Uri.parse(
          '$baseUrl/evidence/public/verify/${widget.token}',
        ),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        if (!mounted) return;

        setState(() {
          verification =
              Map<String, dynamic>.from(data['verification']);
          isLoading = false;
        });
      } else {
        throw Exception(
          data['message'] ?? 'Evidence verification failed.',
        );
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        errorMessage = e.toString().replaceFirst('Exception: ', '');
        isLoading = false;
      });
    }
  }

  String formatDate(dynamic value) {
    if (value == null) return 'Unavailable';

    try {
      final date = DateTime.parse(value.toString()).toLocal();

      return '${date.day.toString().padLeft(2, '0')}/'
          '${date.month.toString().padLeft(2, '0')}/'
          '${date.year}';
    } catch (_) {
      return 'Unavailable';
    }
  }

  Widget informationRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.white54,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 6),
          SelectableText(
            value,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final status =
        verification?['status']?.toString() ?? 'Unknown';

    return Scaffold(
      backgroundColor: const Color(0xFF0B1220),
      appBar: AppBar(
        title: const Text('Public Verification'),
        backgroundColor: const Color(0xFF0B1220),
      ),
      body: isLoading
          ? const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF00D4FF),
              ),
            )
          : errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(25),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          color: Colors.redAccent,
                          size: 65,
                        ),
                        const SizedBox(height: 15),
                        const Text(
                          'Verification Failed',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white60,
                          ),
                        ),
                        const SizedBox(height: 20),
                        FilledButton.icon(
                          onPressed: () {
                            setState(() {
                              isLoading = true;
                              errorMessage = null;
                            });
                            verifyEvidence();
                          },
                          icon: const Icon(Icons.refresh),
                          label: const Text('Try Again'),
                        ),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: const Color(0xFF102A3A),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: Colors.greenAccent.withValues(
                              alpha: 0.3,
                            ),
                          ),
                        ),
                        child: const Column(
                          children: [
                            Icon(
                              Icons.verified_user,
                              color: Colors.greenAccent,
                              size: 60,
                            ),
                            SizedBox(height: 12),
                            Text(
                              'Evidence Record Found',
                              style: TextStyle(
                                fontSize: 21,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(height: 6),
                            Text(
                              'This evidence is registered in ProofPath.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white60,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 25),

                      const Text(
                        'Evidence Information',
                        style: TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.bold,
                        ),
                      ),

                      const SizedBox(height: 12),

                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: const Color(0xFF151F30),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.white10,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            informationRow(
                              'Title',
                              verification?['title']?.toString() ?? 'Unavailable',
                            ),
                            informationRow(
                              'File Name',
                              verification?['fileName']?.toString() ?? 'Unavailable',
                            ),
                            informationRow(
                              'File Type',
                              verification?['fileType']?.toString() ?? 'Unavailable',
                            ),
                            informationRow(
                              'Status',
                              status.toUpperCase(),
                            ),
                            informationRow(
                              'Registered On',
                              formatDate(verification?['registeredAt']),
                            ),
                            informationRow(
                              'Last Updated',
                              formatDate(verification?['lastUpdatedAt']),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 25),

                      const Text(
                        'SHA-256 Fingerprint',
                        style: TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.bold,
                        ),
                      ),

                      const SizedBox(height: 12),

                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: const Color(0xFF151F30),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: SelectableText(
                          verification?['fileHash']?.toString() ?? 'Unavailable',
                          style: const TextStyle(
                            color: Color(0xFF00D4FF),
                            fontSize: 13,
                          ),
                        ),
                      ),

                      const SizedBox(height: 25),

                      const Center(
                        child: Text(
                          'ProofPath • Trust Every File. Track Every Step.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white38,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}

