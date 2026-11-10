import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('ProofPath application launches successfully',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const ProofPathApp());

    await tester.pumpAndSettle();

    expect(find.text('ProofPath'), findsOneWidget);
    expect(find.text('Welcome Back'), findsOneWidget);
    expect(
      find.text('Trust Every File. Track Every Step.'),
      findsOneWidget,
    );
  });
}