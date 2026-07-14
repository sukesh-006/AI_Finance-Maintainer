from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import csv
import io
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.finance import (
    Transaction, Category, TransactionType, PaymentMode, CSVUploadHistory
)

router = APIRouter()


@router.post("/import")
async def import_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    upload_record = CSVUploadHistory(
        user_id=current_user.id,
        filename=file.filename,
        status="processing",
    )
    db.add(upload_record)
    await db.flush()

    # Get user categories
    cat_result = await db.execute(
        select(Category).where(Category.user_id == current_user.id)
    )
    categories = {c.name.lower(): c for c in cat_result.scalars().all()}

    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    imported = 0
    failed = 0
    errors = []

    for i, row in enumerate(reader, 1):
        try:
            # Expected columns: date, description, amount, type, category, payment_mode
            tx_date = datetime.strptime(
                row.get("date", "").strip(), "%Y-%m-%d"
            ).date()
            amount = float(row.get("amount", "0").strip())
            tx_type = row.get("type", "expense").strip().lower()
            category_name = row.get("category", "other expense").strip().lower()

            if amount <= 0:
                raise ValueError("Amount must be positive")

            # Map category
            category = categories.get(category_name)
            if not category:
                # Try partial match
                for name, cat in categories.items():
                    if category_name in name or name in category_name:
                        category = cat
                        break
            if not category:
                # Fall back to "Other Expense" or "Other Income"
                fallback = (
                    "other expense" if tx_type == "expense" else "other income"
                )
                category = categories.get(fallback) or list(categories.values())[0]

            payment_mode_str = (
                row.get("payment_mode", "upi").strip().lower().replace(" ", "_")
            )
            try:
                payment_mode = PaymentMode(payment_mode_str)
            except ValueError:
                payment_mode = PaymentMode.other

            transaction = Transaction(
                user_id=current_user.id,
                category_id=category.id,
                amount=amount,
                type=(
                    TransactionType(tx_type)
                    if tx_type in ("income", "expense")
                    else TransactionType.expense
                ),
                description=row.get("description", "").strip()[:500] or None,
                payment_mode=payment_mode,
                date=tx_date,
                notes=f"Imported from {file.filename}",
            )
            db.add(transaction)
            imported += 1
        except Exception as e:
            failed += 1
            errors.append(f"Row {i}: {str(e)}")

    upload_record.rows_imported = imported
    upload_record.rows_failed = failed
    upload_record.status = "success" if failed == 0 else "partial"
    upload_record.error_log = "\n".join(errors[:20]) if errors else None

    await db.commit()

    return {
        "filename": file.filename,
        "imported": imported,
        "failed": failed,
        "errors": errors[:5] if errors else [],
    }


@router.get("/history")
async def upload_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CSVUploadHistory)
        .where(CSVUploadHistory.user_id == current_user.id)
        .order_by(CSVUploadHistory.created_at.desc())
        .limit(20)
    )
    return result.scalars().all()


@router.get("/template")
async def download_template():
    """Return CSV template format"""
    return {
        "columns": [
            "date", "description", "amount", "type", "category", "payment_mode"
        ],
        "example_rows": [
            {
                "date": "2024-01-15",
                "description": "Monthly salary",
                "amount": "50000",
                "type": "income",
                "category": "Salary",
                "payment_mode": "bank_transfer",
            },
            {
                "date": "2024-01-16",
                "description": "Grocery shopping",
                "amount": "2500",
                "type": "expense",
                "category": "Food & Dining",
                "payment_mode": "upi",
            },
            {
                "date": "2024-01-17",
                "description": "Movie ticket",
                "amount": "350",
                "type": "expense",
                "category": "Entertainment",
                "payment_mode": "card",
            },
        ],
        "notes": (
            "Date format: YYYY-MM-DD | Types: income / expense | "
            "Payment modes: cash, upi, card, bank_transfer, other"
        ),
    }
