from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date
import math

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.finance import Transaction, Category, TransactionType
from app.schemas.schemas import (
    TransactionCreate, TransactionUpdate, TransactionOut,
    TransactionListResponse, CategoryOut
)

router = APIRouter()


@router.get("/categories", response_model=list[CategoryOut])
async def get_categories(
    type: Optional[TransactionType] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Category).where(Category.user_id == current_user.id)
    if type:
        query = query.where(Category.type == type)
    result = await db.execute(query.order_by(Category.name))
    return result.scalars().all()


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[TransactionType] = None,
    category_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [Transaction.user_id == current_user.id]
    if type:
        filters.append(Transaction.type == type)
    if category_id:
        filters.append(Transaction.category_id == category_id)
    if month:
        filters.append(func.extract("month", Transaction.date) == month)
    if year:
        filters.append(func.extract("year", Transaction.date) == year)
    if search:
        filters.append(Transaction.description.ilike(f"%{search}%"))

    count_q = select(func.count()).select_from(Transaction).where(and_(*filters))
    total = (await db.execute(count_q)).scalar()

    query = (
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(and_(*filters))
        .order_by(desc(Transaction.date), desc(Transaction.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    return TransactionListResponse(
        items=[TransactionOut.model_validate(t) for t in items],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total else 0,
    )


@router.post("", response_model=TransactionOut, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify category belongs to user
    cat = await db.execute(
        select(Category).where(
            Category.id == data.category_id,
            Category.user_id == current_user.id
        )
    )
    if not cat.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Category not found")

    transaction = Transaction(**data.model_dump(), user_id=current_user.id)
    db.add(transaction)
    await db.commit()

    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == transaction.id)
    )
    return TransactionOut.model_validate(result.scalar_one())


@router.get("/{transaction_id}", response_model=TransactionOut)
async def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TransactionOut.model_validate(t)


@router.put("/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(t, field, value)
    await db.commit()
    await db.refresh(t)
    return TransactionOut.model_validate(t)


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.delete(t)
    await db.commit()
