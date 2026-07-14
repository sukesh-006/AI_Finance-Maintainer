from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.finance import Budget, Transaction, Category, TransactionType
from app.schemas.schemas import BudgetCreate, BudgetOut

router = APIRouter()


async def enrich_budget(budget: Budget, db: AsyncSession) -> BudgetOut:
    # Calculate actual spending for this budget's category/month/year
    spent_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.user_id == budget.user_id,
                Transaction.category_id == budget.category_id,
                Transaction.type == TransactionType.expense,
                func.extract("month", Transaction.date) == budget.month,
                func.extract("year", Transaction.date) == budget.year,
            )
        )
    )
    spent = spent_result.scalar() or 0.0
    remaining = max(budget.amount - spent, 0)
    usage_pct = round((spent / budget.amount) * 100, 1) if budget.amount else 0

    out = BudgetOut.model_validate(budget)
    out.spent = spent
    out.remaining = remaining
    out.usage_pct = usage_pct
    return out


@router.get("")
async def list_budgets(
    month: int = None,
    year: int = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now()
    month = month or now.month
    year = year or now.year

    result = await db.execute(
        select(Budget)
        .options(selectinload(Budget.category))
        .where(
            Budget.user_id == current_user.id,
            Budget.month == month,
            Budget.year == year,
        )
    )
    budgets = result.scalars().all()
    return [await enrich_budget(b, db) for b in budgets]


@router.post("", response_model=BudgetOut, status_code=201)
async def create_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check for duplicate
    existing = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.category_id == data.category_id,
            Budget.month == data.month,
            Budget.year == data.year,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Budget already exists for this category and month"
        )

    budget = Budget(**data.model_dump(), user_id=current_user.id)
    db.add(budget)
    await db.commit()

    result = await db.execute(
        select(Budget)
        .options(selectinload(Budget.category))
        .where(Budget.id == budget.id)
    )
    b = result.scalar_one()
    return await enrich_budget(b, db)


@router.put("/{budget_id}", response_model=BudgetOut)
async def update_budget(
    budget_id: int,
    amount: float,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget)
        .options(selectinload(Budget.category))
        .where(Budget.id == budget_id, Budget.user_id == current_user.id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    budget.amount = amount
    await db.commit()
    return await enrich_budget(budget, db)


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == current_user.id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    await db.delete(budget)
    await db.commit()
