from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from datetime import datetime, date
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.finance import (
    Transaction, Budget, SavingsGoal, AIRecommendation,
    TransactionType, Category, GoalStatus
)
from app.schemas.schemas import DashboardSummary, MonthlyStat, CategoryStat

router = APIRouter()

MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]


@router.get("/dashboard", response_model=DashboardSummary)
async def dashboard(
    month: int = None,
    year: int = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now()
    month = month or now.month
    year = year or now.year

    filters = [
        Transaction.user_id == current_user.id,
        func.extract("month", Transaction.date) == month,
        func.extract("year", Transaction.date) == year,
    ]

    income_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            and_(*filters, Transaction.type == TransactionType.income)
        )
    )
    total_income = income_result.scalar() or 0.0

    expense_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            and_(*filters, Transaction.type == TransactionType.expense)
        )
    )
    total_expense = expense_result.scalar() or 0.0

    net_savings = total_income - total_expense
    savings_rate = (
        round((net_savings / total_income) * 100, 1) if total_income > 0 else 0
    )

    # Budget usage
    budget_result = await db.execute(
        select(func.sum(Budget.amount)).where(
            Budget.user_id == current_user.id,
            Budget.month == month,
            Budget.year == year,
        )
    )
    total_budget = budget_result.scalar() or 0.0
    budget_used_pct = (
        round((total_expense / total_budget) * 100, 1) if total_budget > 0 else 0
    )

    # Active goals
    goals_result = await db.execute(
        select(func.count()).select_from(SavingsGoal).where(
            SavingsGoal.user_id == current_user.id,
            SavingsGoal.status == GoalStatus.active,
        )
    )
    active_goals = goals_result.scalar() or 0

    # Unread recommendations
    recs_result = await db.execute(
        select(func.count()).select_from(AIRecommendation).where(
            AIRecommendation.user_id == current_user.id,
            AIRecommendation.is_read == False,
        )
    )
    unread_recs = recs_result.scalar() or 0

    return DashboardSummary(
        total_income=total_income,
        total_expense=total_expense,
        net_savings=net_savings,
        savings_rate=savings_rate,
        budget_used_pct=min(budget_used_pct, 100),
        active_goals=active_goals,
        unread_recommendations=unread_recs,
    )


@router.get("/monthly", response_model=List[MonthlyStat])
async def monthly_trend(
    months: int = Query(6, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now()
    stats = []

    for i in range(months - 1, -1, -1):
        m = (now.month - i - 1) % 12 + 1
        y = now.year - ((now.month - i - 1) // 12 + (1 if (now.month - i - 1) < 0 else 0))

        filters = [
            Transaction.user_id == current_user.id,
            func.extract("month", Transaction.date) == m,
            func.extract("year", Transaction.date) == y,
        ]

        income = (await db.execute(
            select(func.sum(Transaction.amount)).where(
                and_(*filters, Transaction.type == TransactionType.income)
            )
        )).scalar() or 0.0

        expense = (await db.execute(
            select(func.sum(Transaction.amount)).where(
                and_(*filters, Transaction.type == TransactionType.expense)
            )
        )).scalar() or 0.0

        stats.append(MonthlyStat(
            month=f"{MONTH_NAMES[m-1]} {y}",
            income=round(income, 2),
            expense=round(expense, 2),
            savings=round(income - expense, 2),
        ))

    return stats


@router.get("/categories", response_model=List[CategoryStat])
async def category_breakdown(
    month: int = None,
    year: int = None,
    type: TransactionType = TransactionType.expense,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now()
    month = month or now.month
    year = year or now.year

    result = await db.execute(
        select(
            Category.name, Category.color, Category.icon,
            func.sum(Transaction.amount).label("total")
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == current_user.id,
            Transaction.type == type,
            func.extract("month", Transaction.date) == month,
            func.extract("year", Transaction.date) == year,
        )
        .group_by(Category.name, Category.color, Category.icon)
        .order_by(func.sum(Transaction.amount).desc())
    )
    rows = result.all()

    grand_total = sum(r.total for r in rows) or 1
    return [
        CategoryStat(
            category=r.name,
            amount=round(r.total, 2),
            color=r.color,
            icon=r.icon,
            pct=round((r.total / grand_total) * 100, 1),
        )
        for r in rows
    ]
