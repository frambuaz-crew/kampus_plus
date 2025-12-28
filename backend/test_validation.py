"""Quick validation test for RegisterRequest."""
from src.api.routes.auth import RegisterRequest
from pydantic import ValidationError

print("=" * 60)
print("Backend RegisterRequest Validation Test")
print("=" * 60)

# Test 1: Valid email from allowed domain
print("\n[Test 1] Valid email from allowed domain")
try:
    r = RegisterRequest(
        email='test@ogr.selcuk.edu.tr',
        password='Test12345!',
        first_name='Test',
        last_name='User',
        student_id='202112345'
    )
    print("[PASS] Valid email accepted")
except ValidationError as e:
    print(f"[FAIL] Should have accepted: {e.errors()}")

# Test 2: Invalid email from non-allowed domain
print("\n[Test 2] Invalid email from non-allowed domain")
try:
    r = RegisterRequest(
        email='test@mit.edu',
        password='Test12345!',
        first_name='Test',
        last_name='User',
        student_id='202112345'
    )
    print("[FAIL] Should have rejected but accepted")
except ValidationError as e:
    print(f"[PASS] Invalid email rejected: {e.errors()[0]['msg']}")

# Test 3: Missing student_id
print("\n[Test 3] Missing student_id")
try:
    r = RegisterRequest(
        email='test@ogr.selcuk.edu.tr',
        password='Test12345!',
        first_name='Test',
        last_name='User'
    )
    print("[FAIL] Should have rejected but accepted")
except ValidationError as e:
    print(f"[PASS] Missing student_id rejected")

# Test 4: All 5 allowed domains
print("\n[Test 4] All 5 allowed domains")
allowed_domains = [
    'ogr.selcuk.edu.tr',
    'ktun.edu.tr',
    'ogr.erbakan.edu.tr',
    'karatay.edu.tr',
    'ogr.gidatarim.edu.tr'
]
all_passed = True
for domain in allowed_domains:
    try:
        r = RegisterRequest(
            email=f'test@{domain}',
            password='Test12345!',
            first_name='Test',
            last_name='User',
            student_id='202112345'
        )
        print(f"[PASS] {domain}")
    except ValidationError as e:
        print(f"[FAIL] {domain}: {e.errors()[0]['msg']}")
        all_passed = False

print("\n" + "=" * 60)
if all_passed:
    print("[SUCCESS] All backend validation tests passed!")
else:
    print("[FAILURE] Some tests failed")
print("=" * 60)

