"""
Database type utilities for cross-database compatibility.

Provides types that work with both PostgreSQL and SQLite.
"""
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator


class JSONBType(TypeDecorator):
    """
    A JSON type that uses JSONB on PostgreSQL and JSON on other databases.
    
    This allows models to be used with both PostgreSQL (production) and
    SQLite (testing) without modification.
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        else:
            return dialect.type_descriptor(JSON())
