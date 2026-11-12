
import 'dart:convert';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

class UploadScreen extends StatefulWidget {
  final VoidCallback onUploadSuccess;

  const UploadScreen({
    super.key,
    required this.onUploadSuccess,
  });

  @override
  State<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  static const String baseUrl = 'https://proofpath-api-gzaj.onrender.com/api';

  final titleController = TextEditingController();
  final descriptionController = TextEditingController();
  final picker = ImagePicker();

  String? selectedFileName;
  Uint8List? selectedBytes;

  bool isUploading = false;
  bool isPicking = false;

  final allowedExtensions = [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'mp4',
    'pdf',
    'txt',
  ];

  @override
  void dispose() {
    titleController.dispose();
    descriptionController.dispose();
    super.dispose();
  }

  String getMimeType(String filename) {
    final extension = filename.split('.').last.toLowerCase();

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'mp4':
        return 'video/mp4';
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }

  Future<void> selectFromGallery() async {
    if (isPicking || isUploading) return;

    setState(() => isPicking = true);

    try {
      final file = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: allowedExtensions,
      );

      if (file == null) return;

      final bytes = await file.readAsBytes();

      if (bytes.isEmpty) {
        showMessage('The selected file is empty or could not be read.');
        return;
      }

      if (bytes.length > 50 * 1024 * 1024) {
        showMessage('File size must not exceed 50 MB.');
        return;
      }

      if (!mounted) return;

      setState(() {
        selectedFileName = file.name;
        selectedBytes = bytes;
      });
    } catch (e) {
      if (mounted) {
        showMessage('File selection failed: $e');
      }
    } finally {
      if (mounted) {
        setState(() => isPicking = false);
      }
    }
  }

  Future<void> capturePhoto() async {
    if (isPicking || isUploading) return;

    setState(() => isPicking = true);

    try {
      final photo = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );

      if (photo == null) return;

      final bytes = await photo.readAsBytes();

      if (bytes.isEmpty) {
        showMessage('Unable to read captured photo.');
        return;
      }

      if (!mounted) return;

      setState(() {
        selectedFileName = photo.name;
        selectedBytes = bytes;
      });
    } catch (e) {
      if (mounted) {
        showMessage('Camera error: $e');
      }
    } finally {
      if (mounted) {
        setState(() => isPicking = false);
      }
    }
  }

  void showMessage(String message, {bool success = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: success
            ? Colors.green.shade700
            : Colors.red.shade700,
      ),
    );
  }

  Future<void> uploadEvidence() async {
    if (titleController.text.trim().isEmpty) {
      showMessage('Please enter an evidence title.');
      return;
    }

    if (selectedFileName == null || selectedBytes == null) {
      showMessage('Please select an evidence file.');
      return;
    }

    if (selectedBytes!.length > 50 * 1024 * 1024) {
      showMessage('File size must not exceed 50 MB.');
      return;
    }

    setState(() => isUploading = true);

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('proofpath_token');

      if (token == null) {
        throw Exception('Session expired. Please log in again.');
      }

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/evidence'),
      );

      request.headers['Authorization'] = 'Bearer $token';

      request.fields['title'] = titleController.text.trim();
      request.fields['description'] =
          descriptionController.text.trim();

      request.files.add(
        http.MultipartFile.fromBytes(
          'evidence',
          selectedBytes!,
          filename: selectedFileName!,
          contentType: MediaType.parse(
            getMimeType(selectedFileName!),
          ),
        ),
      );

      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 90),
      );

      final response = await http.Response.fromStream(streamedResponse);

      final dynamic data = jsonDecode(response.body);

      if (response.statusCode == 200 ||
          response.statusCode == 201) {
        if (!mounted) return;

        widget.onUploadSuccess();

        Navigator.pop(context, true);
      } else {
        throw Exception(
          data is Map
              ? data['message'] ?? 'Evidence upload failed.'
              : 'Evidence upload failed.',
        );
      }
    } catch (e) {
      if (!mounted) return;

      showMessage(
        e.toString().replaceFirst('Exception: ', ''),
      );
    } finally {
      if (mounted) {
        setState(() => isUploading = false);
      }
    }
  }

  Widget buildSelectedFile() {
    if (selectedFileName == null || selectedBytes == null) {
      return const SizedBox.shrink();
    }

    final name = selectedFileName!;
    final mime = getMimeType(name);

    return Container(
      margin: const EdgeInsets.only(top: 18),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF151F30),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (mime.startsWith('image/'))
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.memory(
                selectedBytes!,
                height: 170,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            )
          else
            Center(
              child: Padding(
                padding: const EdgeInsets.all(25),
                child: Icon(
                  mime == 'video/mp4'
                      ? Icons.video_file
                      : Icons.insert_drive_file,
                  size: 65,
                  color: const Color(0xFF00D4FF),
                ),
              ),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              IconButton(
                onPressed: isUploading
                    ? null
                    : () {
                        setState(() {
                          selectedFileName = null;
                          selectedBytes = null;
                        });
                      },
                icon: const Icon(
                  Icons.close,
                  color: Colors.redAccent,
                ),
              ),
            ],
          ),
          Text(
            '${(selectedBytes!.length / (1024 * 1024)).toStringAsFixed(2)} MB',
            style: const TextStyle(color: Colors.white60),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Upload Evidence'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Register New Evidence',
                style: TextStyle(
                  fontSize: 23,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Upload a file to securely register it in ProofPath.',
                style: TextStyle(color: Colors.white60),
              ),
              const SizedBox(height: 25),

              TextField(
                controller: titleController,
                enabled: !isUploading,
                decoration: const InputDecoration(
                  labelText: 'Evidence Title',
                  prefixIcon: Icon(Icons.title),
                  filled: true,
                ),
              ),
              const SizedBox(height: 18),

              TextField(
                controller: descriptionController,
                enabled: !isUploading,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description (Optional)',
                  prefixIcon: Icon(Icons.description_outlined),
                  filled: true,
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 25),

              const Text(
                'Select Evidence File',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),

              OutlinedButton.icon(
                onPressed: isUploading || isPicking
                    ? null
                    : selectFromGallery,
                icon: const Icon(Icons.folder_open),
                label: const Text('Choose File / Gallery'),
              ),
              const SizedBox(height: 10),

              OutlinedButton.icon(
                onPressed: isUploading || isPicking
                    ? null
                    : capturePhoto,
                icon: const Icon(Icons.camera_alt_outlined),
                label: const Text('Take Photo'),
              ),

              if (isPicking)
                const Padding(
                  padding: EdgeInsets.all(15),
                  child: Center(
                    child: CircularProgressIndicator(),
                  ),
                ),

              buildSelectedFile(),

              const SizedBox(height: 18),
              const Text(
                'Supported: JPG, JPEG, PNG, WEBP, MP4, PDF, TXT\nMaximum size: 50 MB',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.white54,
                ),
              ),
              const SizedBox(height: 30),

              SizedBox(
                height: 52,
                child: FilledButton.icon(
                  onPressed: isUploading || isPicking
                      ? null
                      : uploadEvidence,
                  icon: isUploading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.black,
                          ),
                        )
                      : const Icon(Icons.cloud_upload_outlined),
                  label: Text(
                    isUploading ? 'Uploading...' : 'Upload Evidence',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF00BFE8),
                    foregroundColor: Colors.black,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
