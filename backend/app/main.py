from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from app.core.database import engine, Base
from app.api.routes import auth, transactions, budgets, goals, analytics, ai, admin, csv_upload
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="AI Personal Finance Advisor API",
    description="Smart budgeting and savings assistant for students and early job holders",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(csv_upload.router, prefix="/api/csv", tags=["CSV Import"])


@app.get("/")
async def root():
    return {"message": "AI Personal Finance Advisor API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
