from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_current_user, decode_token
)
from app.models.user import User
from app.models.finance import Category, TransactionType
from app.schemas.schemas import UserRegister, UserLogin, UserUpdate, UserOut, TokenResponse

router = APIRouter()

DEFAULT_CATEGORIES = [
    # Income
    {"name": "Salary", "icon": "💼", "color": "#10b981", "type": TransactionType.income},
    {"name": "Freelance", "icon": "💻", "color": "#06b6d4", "type": TransactionType.income},
    {"name": "Business", "icon": "🏢", "color": "#8b5cf6", "type": TransactionType.income},
    {"name": "Investment", "icon": "📈", "color": "#f59e0b", "type": TransactionType.income},
    {"name": "Gift", "icon": "🎁", "color": "#ec4899", "type": TransactionType.income},
    {"name": "Other Income", "icon": "💰", "color": "#6366f1", "type": TransactionType.income},
    # Expense
    {"name": "Food & Dining", "icon": "🍽️", "color": "#ef4444", "type": TransactionType.expense},
    {"name": "Transportation", "icon": "🚗", "color": "#f97316", "type": TransactionType.expense},
    {"name": "Shopping", "icon": "🛍️", "color": "#ec4899", "type": TransactionType.expense},
    {"name": "Entertainment", "icon": "🎬", "color": "#8b5cf6", "type": TransactionType.expense},
    {"name": "Healthcare", "icon": "🏥", "color": "#06b6d4", "type": TransactionType.expense},
    {"name": "Education", "icon": "📚", "color": "#10b981", "type": TransactionType.expense},
    {"name": "Utilities", "icon": "💡", "color": "#f59e0b", "type": TransactionType.expense},
    {"name": "Rent", "icon": "🏠", "color": "#6366f1", "type": TransactionType.expense},
    {"name": "Travel", "icon": "✈️", "color": "#14b8a6", "type": TransactionType.expense},
    {"name": "Personal Care", "icon": "💆", "color": "#a855f7", "type": TransactionType.expense},
    {"name": "Subscriptions", "icon": "📱", "color": "#0ea5e9", "type": TransactionType.expense},
    {"name": "Other Expense", "icon": "📦", "color": "#94a3b8", "type": TransactionType.expense},
]


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()

    # Seed default categories for user
    for cat_data in DEFAULT_CATEGORIES:
        cat = Category(**cat_data, user_id=user.id, is_default=True)
        db.add(cat)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token: str, db: AsyncSession = Depends(get_db)):
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)
