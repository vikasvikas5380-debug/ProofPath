import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  final MobileScannerController controller = MobileScannerController();

  bool isScanned = false;

  void handleScan(BarcodeCapture capture) {
    if (isScanned) return;

    for (final barcode in capture.barcodes) {
      final String? value = barcode.rawValue;

      if (value == null || value.trim().isEmpty) continue;

      setState(() {
        isScanned = true;
      });

      controller.stop();
      Navigator.pop(context, value.trim());
      return;
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1220),
      appBar: AppBar(
        title: const Text('Scan QR Code'),
        backgroundColor: const Color(0xFF0B1220),
        actions: [
          IconButton(
            onPressed: () => controller.switchCamera(),
            icon: const Icon(Icons.cameraswitch),
            tooltip: 'Switch Camera',
          ),
          IconButton(
            onPressed: () => controller.toggleTorch(),
            icon: const Icon(Icons.flash_on),
            tooltip: 'Toggle Flash',
          ),
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 25),
          const Text(
            'Scan Evidence QR Code',
            style: TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Position the QR code inside the scanning frame.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white60),
          ),
          const SizedBox(height: 35),
          Expanded(
            child: Center(
              child: Container(
                width: 290,
                height: 290,
                decoration: BoxDecoration(
                  border: Border.all(
                    color: const Color(0xFF00D4FF),
                    width: 3,
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                clipBehavior: Clip.antiAlias,
                child: MobileScanner(
                  controller: controller,
                  onDetect: handleScan,
                ),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.all(25),
            child: Text(
              'ProofPath • Secure Evidence Verification',
              style: TextStyle(color: Colors.white38),
            ),
          ),
        ],
      ),
    );
  }
}
