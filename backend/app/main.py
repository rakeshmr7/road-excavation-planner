from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, proposals, admin, gis, chat

from app.core.database import init_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Greater Chennai Corporation Road Excavation Coordination & Planning Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.on_event("startup")
async def startup_event():
    print("FastAPI Startup: Running database checks...")
    try:
        await init_db()
    except Exception as e:
        print(f"FastAPI Startup Error: Database auto-initialization failed: {e}")

from fastapi.staticfiles import StaticFiles
import os
os.makedirs("./storage", exist_ok=True)
app.mount("/storage", StaticFiles(directory="./storage"), name="storage")

# Configure CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://road-excavation-planner.vercel.app",
        "https://road-excavation-planner-r1t7g0d50-myprojs.vercel.app",
        "https://road-excavation-planner.vercel.app/login"
    ], # In production, restrict to specific domains (e.g. settings.ALLOWED_ORIGINS)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register api routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth")
app.include_router(proposals.router, prefix=f"{settings.API_V1_STR}/proposals")
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin")
app.include_router(gis.router, prefix=f"{settings.API_V1_STR}/gis")
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat")

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print("--- VALIDATION ERROR DETAIL ---")
    print(exc.errors())
    print("-------------------------------")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

@app.get("/")
async def root_status():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "location": "Greater Chennai Corporation"
    }
