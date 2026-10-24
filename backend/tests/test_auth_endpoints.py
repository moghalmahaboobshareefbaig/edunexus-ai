"""
EduNexus AI — Auth API Endpoint Tests
Tests registration schema validation, credentials retrieval, and profile resolution.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_demo_credentials():
    response = client.get("/api/v1/auth/credentials")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "credentials" in data
    assert len(data["credentials"]) >= 4
    
    roles = [c["role"] for c in data["credentials"]]
    assert "administrator" in roles
    assert "advisor" in roles
    assert "faculty" in roles
    assert "student" in roles


def test_register_validation():
    # Password too short (< 6 chars)
    bad_payload = {
        "email": "short@edunexus.ai",
        "password": "123",
        "full_name": "Short Pass User",
        "role": "advisor",
    }
    response = client.post("/api/v1/auth/register", json=bad_payload)
    assert response.status_code == 422

    # Invalid email
    bad_email = {
        "email": "not-an-email",
        "password": "Password123!",
        "full_name": "Invalid Email",
        "role": "advisor",
    }
    response2 = client.post("/api/v1/auth/register", json=bad_email)
    assert response2.status_code == 422


def test_auth_me_unauthorized():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_auth_me_demo_token():
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer edunexus-demo-advisor-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "advisor"
    assert data["email"] == "advisor@edunexus.ai"
    assert data["is_demo_session"] is True
