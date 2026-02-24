"""Portable column types that work with both PostgreSQL and SQLite."""
import json
import uuid

from sqlalchemy import String, Text, TypeDecorator


class GUID(TypeDecorator):
    """Platform-independent UUID type. Uses CHAR(36) on SQLite, native UUID on Postgres."""

    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return uuid.UUID(value)
        return value


class JSONType(TypeDecorator):
    """JSON type that works on SQLite (stored as TEXT) and Postgres (native JSONB)."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and isinstance(value, str):
            return json.loads(value)
        return value


class StringArray(TypeDecorator):
    """Array of strings stored as JSON text. Works on SQLite and Postgres."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return "[]"

    def process_result_value(self, value, dialect):
        if value is not None and isinstance(value, str):
            return json.loads(value)
        if isinstance(value, list):
            return value
        return []
