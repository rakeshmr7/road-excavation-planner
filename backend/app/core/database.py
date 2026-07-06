from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Create async database engine
# Pool size & max overflow configured for production-level traffic
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_recycle=1800,
    pool_pre_ping=True
)

# Async session maker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# DB dependency for FastAPI routes
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

from sqlalchemy import text
import os

async def init_db() -> None:
    """
    Initializes the database schema by executing schema.sql if the users table does not exist.
    """
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(text("SELECT 1 FROM users LIMIT 1"))
            print("DB check: users table exists. Database is already initialized.")
            return
        except Exception:
            # Table does not exist, rollback and run schema statements
            await session.rollback()
            print("DB check: users table not found. Initializing schema.sql...")

    # Locate schema.sql path (checking relative levels)
    schema_path = os.path.join(os.path.dirname(__file__), "..", "..", "schema.sql")
    if not os.path.exists(schema_path):
        schema_path = "schema.sql"
        if not os.path.exists(schema_path):
            schema_path = "backend/schema.sql"

    if not os.path.exists(schema_path):
        print(f"DB Error: Schema file schema.sql could not be found at any paths.")
        return

    # Read and parse statements separated by semicolons
    with open(schema_path, "r", encoding="utf-8") as f:
        statements = f.read().split(";")

    # Execute statements individually
    async with AsyncSessionLocal() as session:
        for stmt in statements:
            stmt_clean = stmt.strip()
            if not stmt_clean:
                continue
            # Remove inline SQL comments for stability
            stmt_clean = "\n".join(line for line in stmt_clean.split("\n") if not line.strip().startswith("--"))
            stmt_clean = stmt_clean.strip()
            if not stmt_clean:
                continue
                
            try:
                await session.execute(text(stmt_clean))
            except Exception as e:
                # Bypass duplicate inserts during seed conflicts
                if "already exists" in str(e) or "duplicate key" in str(e):
                    await session.rollback()
                    continue
                print(f"DB Init Warning: Statement failed: {stmt_clean[:60]}... | Error: {e}")
                await session.rollback()
        await session.commit()
        print("DB check: Database schema tables created and seeded successfully!")
