import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool, StaticPool

load_dotenv()

Base = declarative_base()

def get_database_url() -> str:
    # 1. Check direct DATABASE_URL
    url = os.getenv("DATABASE_URL")
    
    # Check if discrete parameters are provided
    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    name = os.getenv("DB_NAME", "postgres")
    port = os.getenv("DB_PORT", "5432")

    if not url and host and user and password:
        url = f"postgresql://{user}:{password}@{host}:{port}/{name}"

    if url:
        # Check for placeholder passwords such as [YOUR-PASSWORD]
        if "[YOUR-PASSWORD]" in url or "<password>" in url or "[password]" in url:
            print("[Database] Warning: DATABASE_URL contains placeholder password. Falling back to local SQLite.")
            return "sqlite:///./calibtrack_dev.db"

        # Supabase and Heroku use postgres://, SQLAlchemy requires postgresql:// or postgresql+psycopg2://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    # Default fallback for local testing / sandbox
    print("[Database] Notice: No DATABASE_URL configured. Using local SQLite database (calibtrack_dev.db).")
    return "sqlite:///./calibtrack_dev.db"

DATABASE_URL = get_database_url()

is_sqlite = DATABASE_URL.startswith("sqlite")

if is_sqlite:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
else:
    pool_size = int(os.getenv("DB_CONNECTION_LIMIT", "5"))
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=pool_size,
        max_overflow=10,
        pool_timeout=10,
        pool_recycle=1800,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
