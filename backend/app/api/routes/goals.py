from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
from dateutil.relativedelta import relativedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.finance import SavingsGoal, GoalStatus
from app.schemas.schemas import GoalCreate, GoalUpdate, GoalOut

router = APIRouter()


def enrich_goal(goal: SavingsGoal) -> GoalOut:
    today = date.today()
    progress_pct = round((goal.current_amount / goal.target_amount) * 100, 1) if goal.target_amount else 0
    progress_pct = min(progress_pct, 100)

    months_remaining = max(
        (goal.target_date.year - today.year) * 12 + (goal.target_date.month - today.month), 0
    )
    remaining_amount = max(goal.target_amount - goal.current_amount, 0)
    monthly_needed = round(remaining_amount / months_remaining, 2) if months_remaining > 0 else remaining_amount

    out = GoalOut.model_validate(goal)
    out.progress_pct = progress_pct
    out.months_remaining = months_remaining
    out.monthly_needed = monthly_needed
    return out


@router.get("", response_model=list[GoalOut])
async def list_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavingsGoal)
        .where(SavingsGoal.user_id == current_user.id)
        .order_by(SavingsGoal.target_date)
    )
    goals = result.scalars().all()
    return [enrich_goal(g) for g in goals]


@router.post("", response_model=GoalOut, status_code=201)
async def create_goal(
    data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = SavingsGoal(**data.model_dump(), user_id=current_user.id)
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return enrich_goal(goal)


@router.get("/{goal_id}", response_model=GoalOut)
async def get_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return enrich_goal(goal)


@router.put("/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: int,
    data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(goal, field, value)

    # Auto-complete if target reached
    if goal.current_amount >= goal.target_amount:
        goal.status = GoalStatus.completed

    await db.commit()
    await db.refresh(goal)
    return enrich_goal(goal)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
