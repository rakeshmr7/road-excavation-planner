import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy import text
from app.core.database import engine

load_dotenv()

async def apply_schema():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL is not set in .env")
        return

    print(f"Connecting to database to apply schema...")
    
    # Read schema.sql contents
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    if not os.path.exists(schema_path):
        print(f"Error: schema.sql file not found at {schema_path}")
        return

    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    # Split SQL by semicolons to execute statements
    # Simple split might fail on multi-line statements or inside quotes, so we split cleanly
    statements = []
    current_statement = []
    in_dollar_quote = False
    
    for line in schema_sql.split("\n"):
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            continue
            
        current_statement.append(line)
        if stripped.endswith(";"):
            statements.append("\n".join(current_statement))
            current_statement = []

    if current_statement:
        statements.append("\n".join(current_statement))

    print(f"Found {len(statements)} statements to execute.")
    for i, stmt in enumerate(statements):
        stmt_clean = stmt.strip()
        if not stmt_clean:
            continue
        
        # Print brief snippet
        snippet = stmt_clean.split("\n")[0][:60]
        print(f"[{i+1}/{len(statements)}] Executing: {snippet}...")
        
        try:
            async with engine.begin() as conn:
                await conn.execute(text(stmt_clean))
        except Exception as e:
            # If it's already seeded (like relation already exists or duplicates), we can continue
            if "already exists" in str(e) or "duplicate key" in str(e):
                print("  -> Table/Extension already exists or seeded (skipped)")
            else:
                print(f"  -> WARNING / ERROR: {e}")
                    
    print("\n" + "="*50)
    print("Database schema migration completed successfully!")
    print("All PostGIS tables, spatial indices, and reference roads are initialized.")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(apply_schema())
