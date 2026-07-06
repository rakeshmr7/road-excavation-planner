import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def seed_admin():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in .env")
        print("Make sure you configure these in your backend/.env file first.")
        return
    
    print(f"Connecting to Supabase at: {SUPABASE_URL}")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    email = "admin@chennai.gov.in"
    password = "AdminPassword123!"
    
    try:
        # Create default admin user in Supabase Auth using the admin API bypass
        supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": "Super Admin",
                "role": "admin",
                "department": "admin"
            }
        })
        print("\n" + "="*50)
        print(f"Successfully seeded admin user in Supabase Auth!")
        print(f"Email: {email}")
        print(f"Default Password: {password}")
        print("="*50)
        print("When this user logs in, the backend will auto-sync and create their local database profile row.")
    except Exception as e:
        print(f"\nSeeding status: The admin user may already exist or there was a connection issue: {e}")

if __name__ == "__main__":
    asyncio.run(seed_admin())
