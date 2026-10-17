"""Copy the legacy SQLite database into an empty PostgreSQL database."""
import argparse
import sqlite3
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, create_engine, insert, inspect, text


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy all application records from SQLite to an empty PostgreSQL database."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(__file__).with_name("natillera.db"),
        help="SQLite source file (default: backend/natillera.db).",
    )
    return parser.parse_args()


def convert_value(value: Any, column_type: Any) -> Any:
    if value is None:
        return None
    if isinstance(column_type, Boolean):
        return bool(value)
    if isinstance(column_type, DateTime):
        if isinstance(value, str):
            value = datetime.fromisoformat(value)
        if column_type.timezone and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(column_type, Date) and isinstance(value, str):
        return date.fromisoformat(value)
    if isinstance(column_type, Numeric):
        return Decimal(str(value))
    if isinstance(column_type, Integer):
        return int(value)
    return value


def quote_sqlite_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def migrate(source_path: Path) -> dict[str, int]:
    if not source_path.is_file():
        raise FileNotFoundError(f"No se encontró la base SQLite: {source_path}")

    from app.core.config import settings
    from app.core.database import Base
    import app.models  # noqa: F401

    database_url = settings.DATABASE_URL
    destination_engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_size=2,
        max_overflow=0,
    )
    source = sqlite3.connect(
        f"file:{source_path.resolve().as_posix()}?mode=ro",
        uri=True,
    )
    source.row_factory = sqlite3.Row

    try:
        source_tables = {
            row["name"]
            for row in source.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
            )
        }
        model_tables = set(Base.metadata.tables)
        unknown_tables = source_tables - model_tables
        missing_tables = model_tables - source_tables
        if unknown_tables:
            raise ValueError(
                "Hay tablas SQLite sin modelo de destino; se cancela para evitar "
                f"pérdida de datos: {', '.join(sorted(unknown_tables))}"
            )
        if missing_tables:
            raise ValueError(
                "Faltan tablas requeridas en la base SQLite: "
                f"{', '.join(sorted(missing_tables))}"
            )

        Base.metadata.create_all(bind=destination_engine)
        inspector = inspect(destination_engine)
        populated_tables = []
        with destination_engine.connect() as connection:
            for table in Base.metadata.sorted_tables:
                if inspector.has_table(table.name) and connection.execute(
                    text(f"SELECT EXISTS (SELECT 1 FROM {table.name})")
                ).scalar_one():
                    populated_tables.append(table.name)
        if populated_tables:
            raise ValueError(
                "La base PostgreSQL de destino debe estar vacía. "
                f"Tablas con datos: {', '.join(populated_tables)}"
            )

        migrated_counts: dict[str, int] = {}
        with destination_engine.begin() as connection:
            for table in Base.metadata.sorted_tables:
                source_columns = {
                    row["name"]
                    for row in source.execute(
                        f"PRAGMA table_info({quote_sqlite_identifier(table.name)})"
                    )
                }
                target_columns = {column.name for column in table.columns}
                unknown_columns = source_columns - target_columns
                if unknown_columns:
                    raise ValueError(
                        f"La tabla SQLite {table.name} tiene columnas sin destino: "
                        f"{', '.join(sorted(unknown_columns))}"
                    )

                unavailable_required_columns = [
                    column.name
                    for column in table.columns
                    if column.name not in source_columns
                    and not column.nullable
                    and column.default is None
                    and column.server_default is None
                    and not column.primary_key
                ]
                if unavailable_required_columns:
                    raise ValueError(
                        f"Faltan columnas requeridas en {table.name}: "
                        f"{', '.join(unavailable_required_columns)}"
                    )

                cursor = source.execute(
                    f"SELECT * FROM {quote_sqlite_identifier(table.name)}"
                )
                count = 0
                while rows := cursor.fetchmany(500):
                    records = [
                        {
                            column.name: convert_value(
                                row[column.name], column.type
                            )
                            for column in table.columns
                            if column.name in source_columns
                        }
                        for row in rows
                    ]
                    connection.execute(insert(table), records)
                    count += len(records)
                migrated_counts[table.name] = count

                for column in table.primary_key.columns:
                    if not isinstance(column.type, Integer) or column.autoincrement is False:
                        continue
                    sequence = connection.execute(
                        text("SELECT pg_get_serial_sequence(:table_name, :column_name)"),
                        {"table_name": table.name, "column_name": column.name},
                    ).scalar_one()
                    if sequence:
                        max_value = connection.execute(
                            text(f"SELECT MAX({column.name}) FROM {table.name}")
                        ).scalar_one()
                        if max_value is None:
                            connection.execute(
                                text("SELECT setval(CAST(:sequence AS regclass), 1, false)"),
                                {"sequence": sequence},
                            )
                        else:
                            connection.execute(
                                text("SELECT setval(CAST(:sequence AS regclass), :value, true)"),
                                {"sequence": sequence, "value": max_value},
                            )
        return migrated_counts
    finally:
        source.close()
        destination_engine.dispose()


def main() -> None:
    args = parse_args()
    counts = migrate(args.source)
    print("Migración completada. Registros copiados:")
    for table_name, count in sorted(counts.items()):
        print(f"  {table_name}: {count}")
    print(f"Base SQLite conservada en: {args.source}")


if __name__ == "__main__":
    main()
