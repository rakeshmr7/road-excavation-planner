import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Any

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "GCC Road Excavation Planning Platform"
    API_V1_STR: str = "/api"
    
    # Database Settings
    # Use postgresql+asyncpg:// for async SQLAlchemy queries
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/road_excavation",
        validation_alias="DATABASE_URL"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: Any) -> Any:
        if isinstance(v, str):
            # Convert sync postgresql/postgres URLs to asyncpg
            if v.startswith("postgresql://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v
    
    # Supabase Settings
    SUPABASE_URL: str = Field(default="", validation_alias="SUPABASE_URL")
    SUPABASE_ANON_KEY: str = Field(default="", validation_alias="SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_KEY: str = Field(default="", validation_alias="SUPABASE_SERVICE_ROLE_KEY")
    JWT_SECRET: str = Field(default="", validation_alias="SUPABASE_JWT_SECRET") # Used for decoding JWTs locally
    
    # AI / LLM Keys
    GROQ_API_KEY: str = Field(default="", validation_alias="GROQ_API_KEY")
    GEMINI_API_KEY: str = Field(default="", validation_alias="GEMINI_API_KEY")
    OLLAMA_HOST: str = Field(default="http://localhost:11434", validation_alias="OLLAMA_HOST")
    
    # LangSmith / LangChain Tracing
    LANGCHAIN_TRACING_V2: str = Field(default="false", validation_alias="LANGCHAIN_TRACING_V2")
    LANGCHAIN_API_KEY: str = Field(default="", validation_alias="LANGCHAIN_API_KEY")
    LANGCHAIN_PROJECT: str = Field(default="road-excavation-planning", validation_alias="LANGCHAIN_PROJECT")
    
    # File Storage Upload Limits
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: list[str] = ["pdf", "docx", "png", "jpg", "jpeg", "dwg", "geojson"]
    
    # Vector DB
    CHROMA_DB_PATH: str = Field(default="./chroma_db", validation_alias="CHROMA_DB_PATH")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Explicitly export LangSmith keys to OS environment so the LangSmith SDK detects them
if settings.LANGCHAIN_TRACING_V2.lower() == "true":
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    if settings.LANGCHAIN_API_KEY:
        os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
    if settings.LANGCHAIN_PROJECT:
        os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
