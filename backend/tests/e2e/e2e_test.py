#!/usr/bin/env python3
"""
T091 Manual E2E Test - Automated via Python
Tests complete PDF upload and AI query workflow
"""

import requests
import json
import time
from pathlib import Path
from io import BytesIO
import uuid

# Configuration
API_BASE = "http://localhost:8000/v1"
FRONTEND_BASE = "http://localhost:5173"

# Test credentials
TEST_USER_1 = {
    "email": "e2e_student1@ogr.selcuk.edu.tr",
    "password": "TestPassword123!",
    "first_name": "E2E",
    "last_name": "Student1",
    "student_id": "202199999"
}

TEST_USER_2 = {
    "email": "e2e_student2@ogr.selcuk.edu.tr",
    "password": "TestPassword123!",
    "first_name": "E2E", 
    "last_name": "Student2",
    "student_id": "202199998"
}

def test_health_check():
    """Verify backend is healthy"""
    print("\n[TEST 1] Health Check")
    response = requests.get("http://localhost:8000/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200, "Backend health check failed"
    print("✅ PASS")
    return True

def test_register_users():
    """Register test users"""
    print("\n[TEST 2] User Registration")
    
    for user in [TEST_USER_1, TEST_USER_2]:
        print(f"  Registering: {user['email']}")
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=user
        )
        print(f"  Status: {response.status_code}")
        if response.status_code in [201, 200, 409]:  # 409 if user already exists
            print(f"  ✅ User ready")
        else:
            print(f"  Response: {response.text}")
            print(f"  ⚠️  User registration returned {response.status_code}")

def test_login_user1():
    """Login as Student 1"""
    print("\n[TEST 3] Login as Student 1")
    response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            "email": TEST_USER_1["email"],
            "password": TEST_USER_1["password"]
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"Token received: {token[:20]}...")
        print("✅ PASS")
        return token
    else:
        print(f"Response: {response.text}")
        print("❌ FAIL")
        return None

def test_upload_pdf(token):
    """Upload PDF document as Student 1"""
    print("\n[TEST 4] Upload PDF Document")
    
    # Create a minimal PDF
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< >>
stream
BT /F1 12 Tf 100 700 Td (Kampus Plus E2E Test Document) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000310 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
420
%%EOF
"""
    
    files = {
        "file": ("test_document.pdf", BytesIO(pdf_content), "application/pdf")
    }
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.post(
        f"{API_BASE}/documents",
        files=files,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        doc_id = data.get("document_id")
        status = data.get("processing_status")
        print(f"Document ID: {doc_id}")
        print(f"Processing Status: {status}")
        print("✅ PASS")
        return doc_id
    else:
        print(f"Response: {response.text}")
        print("❌ FAIL")
        return None

def test_list_documents(token):
    """List user's documents"""
    print("\n[TEST 5] List User Documents")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(
        f"{API_BASE}/documents",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        docs = data.get("documents", [])
        print(f"Documents found: {len(docs)}")
        for doc in docs:
            print(f"  - {doc.get('filename')} (Status: {doc.get('processing_status')})")
        print("✅ PASS")
        return docs
    else:
        print(f"Response: {response.text}")
        print("❌ FAIL")
        return []

def test_chat_with_document(token):
    """Test AI chat to verify document integration"""
    print("\n[TEST 6] Chat with AI (Document Context)")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Wait a moment for processing
    print("  Waiting 2 seconds for document processing...")
    time.sleep(2)
    
    # Step 1: Create a chat session
    print("  Creating chat session...")
    session_response = requests.post(
        f"{API_BASE}/chat/sessions",
        headers=headers,
        json={"title": "E2E Test Session"}
    )
    
    if session_response.status_code not in [200, 201]:
        print(f"  Failed to create session: {session_response.text}")
        print("❌ FAIL")
        return False
    
    session_data = session_response.json()
    session_id = session_data.get("id") or session_data.get("session_id")
    print(f"  Session created: {session_id}")
    
    # Step 2: Send message to session
    response = requests.post(
        f"{API_BASE}/chat/sessions/{session_id}/messages",
        headers=headers,
        json={
            "content": "Yüklediğim belgedeki ana konular nelerdir?"
        }
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        data = response.json()
        ai_response = data.get("response") or data.get("content") or data.get("message")
        print(f"AI Response: {ai_response[:100] if ai_response else 'No response'}...")
        print("✅ PASS")
        return True
    else:
        print(f"Response: {response.text}")
        print("⚠️  Chat response not as expected")
        return False

def test_access_control(token_user1):
    """Test document access control"""
    print("\n[TEST 7] Access Control - User Cannot Access Other's Documents")
    
    # First, login as User 2
    print("  Logging in as Student 2...")
    response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            "email": TEST_USER_2["email"],
            "password": TEST_USER_2["password"]
        }
    )
    
    if response.status_code != 200:
        print(f"  Could not login User 2: {response.status_code}")
        print("⚠️  SKIP - User 2 not available")
        return
    
    token_user2 = response.json().get("access_token")
    
    # Get User 1's documents
    headers = {
        "Authorization": f"Bearer {token_user1}"
    }
    response = requests.get(
        f"{API_BASE}/documents",
        headers=headers
    )
    
    if response.status_code != 200:
        print("  Could not get User 1 documents")
        return
    
    user1_docs = response.json().get("documents", [])
    if not user1_docs:
        print("  No documents found for User 1")
        print("⚠️  SKIP - No documents to test access control")
        return
    
    doc_id = user1_docs[0].get("id")
    print(f"  Testing access to User 1's document: {doc_id}")
    
    # Try to access User 1's document as User 2
    headers = {
        "Authorization": f"Bearer {token_user2}"
    }
    response = requests.get(
        f"{API_BASE}/documents/{doc_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 403:
        print("User 2 correctly forbidden from accessing User 1's document")
        print("✅ PASS")
    elif response.status_code == 404:
        print("Document not found (also acceptable - access denied)")
        print("✅ PASS")
    else:
        print(f"Response: {response.text}")
        print("❌ FAIL - Access control not working")

def main():
    """Run all E2E tests"""
    print("=" * 60)
    print("KAMPÜS+ E2E TEST SUITE - T091")
    print("=" * 60)
    
    try:
        # Basic tests
        test_health_check()
        test_register_users()
        
        # User 1 workflow
        token1 = test_login_user1()
        if not token1:
            print("\n❌ Cannot proceed - login failed")
            return
        
        doc_id = test_upload_pdf(token1)
        docs = test_list_documents(token1)
        test_chat_with_document(token1)
        
        # Access control
        test_access_control(token1)
        
        print("\n" + "=" * 60)
        print("E2E TEST SUITE COMPLETED")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
