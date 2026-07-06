from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.finance import Transaction, TransactionType

router = APIRouter()


@router.get("/stats")
async def admin_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    active_users = (await db.execute(select(func.count()).select_from(User).where(User.is_active == True))).scalar()
    total_transactions = (await db.execute(select(func.count()).select_from(Transaction))).scalar()
    total_income = (await db.execute(
        select(func.sum(Transaction.amount)).where(Transaction.type == TransactionType.income)
    )).scalar() or 0
    total_expense = (await db.execute(
        select(func.sum(Transaction.amount)).where(Transaction.type == TransactionType.expense)
    )).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_transactions": total_transactions,
        "total_income_on_platform": round(total_income, 2),
        "total_expense_on_platform": round(total_expense, 2),
    }


@router.get("/users")
async def list_users(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(100)
    )
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.put("/users/{user_id}/toggle")
async def toggle_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    await db.commit()
    return {"id": user.id, "is_active": user.is_active}
