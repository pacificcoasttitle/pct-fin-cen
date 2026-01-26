"""
Tests for health and basic endpoints.
"""


def test_health_endpoint(client):
    """Test that /health returns ok status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_version_endpoint(client):
    """Test that /version returns version info."""
    response = client.get("/version")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data


def test_root_endpoint(client):
    """Test that / returns API info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "PCT FinCEN API"
    assert "version" in data
    assert data["docs"] == "/docs"


def test_db_check_endpoint(client):
    """Test that /db-check works in test environment."""
    response = client.get("/db-check")
    assert response.status_code == 200
    data = response.json()
    # Should work since we're in test environment
    assert data["status"] == "ok"
    assert data["database"] == "connected"
