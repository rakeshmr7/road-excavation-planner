import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    
    # Development Bypass: Allow mock tokens directly to bypass database / Supabase calls
    if token.startswith("mock-token-"):
        import uuid
        dept = token.split("-")[-1]
        if dept == "superadmin" or dept == "admin":
            email = "admin@chennai.gov.in"
            full_name = "Super Admin"
            role = "admin"
            department = "admin"
        else:
            if dept not in ["water", "electricity", "gas", "telecom"]:
                dept = "water"
            email = f"planner@{dept}.chennai.gov.in"
            full_name = f"{dept.capitalize()} Board Planner"
            role = "planner"
            department = dept

        # Check if user profile already exists by email (to avoid unique email constraint violation)
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if not user:
            # Generate a consistent, stable UUID based on email
            import hashlib
            m = hashlib.md5()
            m.update(email.encode('utf-8'))
            user_id = uuid.UUID(m.hexdigest())
            
            user = User(
                id=user_id,
                email=email,
                full_name=full_name,
                role=role,
                department=department
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Attempt local JWT decoding if secret is available
    user_payload = None
    if settings.JWT_SECRET:
        try:
            user_payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        except jwt.PyJWTError:
            pass # fall through to supabase api validation
            
    # 2. Fallback: Authenticate via Supabase Auth API
    if not user_payload:
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            print("Security Error: Supabase URL or API Anon Key is not defined in backend settings.")
            raise credentials_exception
            
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": settings.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}"
            }
            try:
                url = settings.SUPABASE_URL
                if not url.startswith("http://") and not url.startswith("https://"):
                    url = f"https://{url}"
                user_endpoint = f"{url.rstrip('/')}/auth/v1/user"
                
                response = await client.get(
                    user_endpoint,
                    headers=headers,
                    timeout=5.0
                )
                if response.status_code == 200:
                    user_payload = response.json()
                else:
                    raise credentials_exception
            except (httpx.HTTPError, ValueError) as http_err:
                print(f"Security Error: Failed calling Supabase auth: {http_err}")
                raise credentials_exception

    if not user_payload:
        raise credentials_exception

    # Handle differences in payload structure between direct JWT and API response
    user_id_raw = user_payload.get("sub") or user_payload.get("id")
    email = user_payload.get("email")
    
    if not user_id_raw or not email:
        raise credentials_exception

    import uuid
    try:
        user_id = uuid.UUID(str(user_id_raw))
    except ValueError:
        raise credentials_exception

    # 3. Check if user profile exists in local DB, if not, create it (lazy-sync)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        # Resolve default role/dept from user metadata if present, or assign defaults
        user_metadata = user_payload.get("user_metadata") or {}
        full_name = user_metadata.get("full_name", email.split("@")[0].capitalize())
        role = user_metadata.get("role", "planner") # Default to planner
        department = user_metadata.get("department", "water") # Default to water board
        
        # Super admin email check
        if email == "admin@chennai.gov.in" or role == "admin":
            role = "admin"
            department = "admin"
            
        user = User(
            id=user_id,
            email=email,
            full_name=full_name,
            role=role,
            department=department
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role: {user.role}"
            )
        return user

# Helper dependency definitions for roles
require_admin = RoleChecker(["admin"])
require_planner = RoleChecker(["planner"])
require_any_user = RoleChecker(["admin", "planner"])
