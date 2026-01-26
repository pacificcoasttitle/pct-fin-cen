# Makefile for PCT FinCEN API

.PHONY: install dev test migrate migrate-new lint clean

# Install dependencies
install:
	pip install -r requirements.txt

# Run development server
dev:
	uvicorn app.main:app --reload --port 8000

# Run tests
test:
	pytest tests/ -v

# Run tests with coverage
test-cov:
	pytest tests/ -v --cov=app --cov-report=term-missing

# Run migrations
migrate:
	alembic upgrade head

# Create new migration (usage: make migrate-new msg="description")
migrate-new:
	alembic revision --autogenerate -m "$(msg)"

# Show migration history
migrate-history:
	alembic history

# Rollback last migration
migrate-down:
	alembic downgrade -1

# Check DB connectivity
db-check:
	python -c "from app.database import engine; engine.connect(); print('DB connected!')"

# Lint code
lint:
	python -m py_compile app/*.py app/models/*.py

# Clean up
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -f test.db
