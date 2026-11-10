import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

class EvidenceDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> evidence;

  const EvidenceDetailsScreen({
    super.key,
    required this.evidence,
  });

  @override
  State<EvidenceDetailsScreen> createState() =>
      _EvidenceDetailsScreenState();
}

class _EvidenceDetailsScreenState
    extends State<EvidenceDetailsScreen> {
  static const Color cyan = Color(0xFF00D4FF);
  static const Color cardColor = Color(0xFF151F30);

  VideoPlayerController? videoController;

  bool videoLoading = false;
  String? videoError;

  Map<String, dynamic> get evidence => widget.evidence;

  String get fileName =>
      evidence['fileName']?.toString() ?? 'Unknown file';

  String get fileUrl =>
      evidence['fileUrl']?.toString() ?? '';

  String get fileType =>
      evidence['fileType']?.toString().toLowerCase() ?? '';

  bool get isImage {
    final name = fileName.toLowerCase();

    return fileType.startsWith('image/') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png') ||
        name.endsWith('.webp');
  }

  bool get isVideo {
    final name = fileName.toLowerCase();

    return fileType.startsWith('video/') ||
        name.endsWith('.mp4');
  }

  bool get isPdf {
    return fileType.contains('pdf') ||
        fileName.toLowerCase().endsWith('.pdf');
  }

  @override
  void initState() {
    super.initState();

    if (isVideo && fileUrl.isNotEmpty) {
      initializeVideo();
    }
  }

  Future<void> initializeVideo() async {
    if (!mounted) return;

    setState(() {
      videoLoading = true;
      videoError = null;
    });

    final controller = VideoPlayerController.networkUrl(
      Uri.parse(fileUrl),
    );

    videoController = controller;

    try {
      await controller.initialize();

      if (!mounted) return;

      setState(() {
        videoLoading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        videoLoading = false;
        videoError = 'Unable to load video. Please try again.';
      });
    }
  }

  @override
  void dispose() {
    videoController?.dispose();
    super.dispose();
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

  Future<void> openDocument() async {
    final uri = Uri.tryParse(fileUrl);

    if (uri == null ||
        !uri.hasScheme ||
        !['http', 'https'].contains(uri.scheme)) {
      showMessage('Invalid document URL.');
      return;
    }

    try {
      final opened = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );

      if (!opened) {
        showMessage('Unable to open document.');
      }
    } catch (_) {
      showMessage('Unable to open document.');
    }
  }

  Future<void> copyHash() async {
    final hash = evidence['fileHash']?.toString() ?? '';

    if (hash.isEmpty) {
      showMessage('SHA-256 hash is unavailable.');
      return;
    }

    await Clipboard.setData(ClipboardData(text: hash));

    if (!mounted) return;

    showMessage('SHA-256 hash copied.');
  }

  void showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Widget buildImagePreview() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Image.network(
        fileUrl,
        width: double.infinity,
        fit: BoxFit.contain,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;

          return const Center(
            child: CircularProgressIndicator(color: cyan),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.broken_image_outlined,
                  size: 55,
                  color: Colors.white54,
                ),
                SizedBox(height: 10),
                Text('Unable to load image'),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget buildVideoPreview() {
    if (videoLoading) {
      return const Center(
        child: CircularProgressIndicator(color: cyan),
      );
    }

    if (videoError != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline,
              color: Colors.redAccent,
              size: 45,
            ),
            const SizedBox(height: 10),
            Text(videoError!),
            TextButton(
              onPressed: initializeVideo,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final controller = videoController;

    if (controller == null || !controller.value.isInitialized) {
      return const Center(
        child: Text('Video unavailable'),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AspectRatio(
          aspectRatio: controller.value.aspectRatio,
          child: VideoPlayer(controller),
        ),
        const SizedBox(height: 12),
        VideoProgressIndicator(
          controller,
          allowScrubbing: true,
          padding: const EdgeInsets.symmetric(vertical: 8),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              onPressed: () {
                final current = controller.value.position;

                controller.seekTo(
                  current - const Duration(seconds: 10),
                );
              },
              icon: const Icon(Icons.replay_10),
              iconSize: 30,
            ),
            IconButton(
              onPressed: () {
                setState(() {
                  if (controller.value.isPlaying) {
                    controller.pause();
                  } else {
                    controller.play();
                  }
                });
              },
              icon: Icon(
                controller.value.isPlaying
                    ? Icons.pause_circle_filled
                    : Icons.play_circle_fill,
                color: cyan,
                size: 45,
              ),
            ),
            IconButton(
              onPressed: () {
                final current = controller.value.position;
                final duration = controller.value.duration;

                final next = current + const Duration(seconds: 10);

                controller.seekTo(
                  next > duration ? duration : next,
                );
              },
              icon: const Icon(Icons.forward_10),
              iconSize: 30,
            ),
          ],
        ),
      ],
    );
  }

  Widget buildDocumentPreview() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          isPdf ? Icons.picture_as_pdf : Icons.description_outlined,
          color: cyan,
          size: 65,
        ),
        const SizedBox(height: 12),
        Text(
          isPdf ? 'PDF Document' : 'Document File',
          style: const TextStyle(fontSize: 16),
        ),
        const SizedBox(height: 15),
        FilledButton.icon(
          onPressed: openDocument,
          icon: const Icon(Icons.open_in_new),
          label: const Text('Open Document'),
          style: FilledButton.styleFrom(
            backgroundColor: cyan,
            foregroundColor: Colors.black,
          ),
        ),
      ],
    );
  }

  Widget buildPreview() {
    if (fileUrl.isEmpty) {
      return const Center(
        child: Text('File URL unavailable'),
      );
    }

    if (isImage) return buildImagePreview();

    if (isVideo) return buildVideoPreview();

    return buildDocumentPreview();
  }

  Widget detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.white54,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 5),
          SelectableText(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget buildInformationCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Evidence Information',
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 15),
          detailRow(
            'Title',
            evidence['title']?.toString() ?? 'Untitled',
          ),
          detailRow(
            'Description',
            evidence['description']?.toString() ?? 'No description',
          ),
          detailRow('File Name', fileName),
          detailRow(
            'File Type',
            evidence['fileType']?.toString() ?? 'Unknown',
          ),
          detailRow(
            'Status',
            evidence['status']?.toString().toUpperCase() ?? 'PENDING',
          ),
          detailRow(
            'Submitted',
            formatDate(evidence['createdAt']),
          ),
          detailRow(
            'Last Updated',
            formatDate(evidence['updatedAt']),
          ),
        ],
      ),
    );
  }

  Widget buildHashCard() {
    final hash = evidence['fileHash']?.toString() ?? '';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'SHA-256 Fingerprint',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: const Color(0xFF102A3A),
              borderRadius: BorderRadius.circular(10),
            ),
            child: SelectableText(
              hash.isEmpty ? 'Unavailable' : hash,
              style: const TextStyle(
                color: cyan,
                fontSize: 12,
                height: 1.6,
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: hash.isEmpty ? null : copyHash,
              icon: const Icon(Icons.copy),
              label: const Text('Copy Hash'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Evidence Details'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              constraints: const BoxConstraints(
                minHeight: 220,
                maxHeight: 380,
              ),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: cardColor,
                borderRadius: BorderRadius.circular(15),
              ),
              child: buildPreview(),
            ),
            const SizedBox(height: 22),
            buildInformationCard(),
            const SizedBox(height: 18),
            buildHashCard(),
            const SizedBox(height: 25),
          ],
        ),
      ),
    );
  }
}