"""
Seed script — run once to populate demo data.
Usage: python seed.py
"""
import asyncio
import random
from datetime import date, timedelta
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.user import User
from app.models.finance import (
    Category, Transaction, Budget, SavingsGoal,
    TransactionType, PaymentMode, GoalStatus
)
from app.core.security import hash_password
from sqlalchemy import select


EXPENSE_CATEGORIES = [
    {"name": "Food & Dining",    "icon": "🍽️", "color": "#ef4444"},
    {"name": "Transportation",   "icon": "🚗", "color": "#f97316"},
    {"name": "Shopping",         "icon": "🛍️", "color": "#ec4899"},
    {"name": "Entertainment",    "icon": "🎬", "color": "#8b5cf6"},
    {"name": "Healthcare",       "icon": "🏥", "color": "#06b6d4"},
    {"name": "Education",        "icon": "📚", "color": "#10b981"},
    {"name": "Utilities",        "icon": "💡", "color": "#f59e0b"},
    {"name": "Rent",             "icon": "🏠", "color": "#6366f1"},
    {"name": "Travel",           "icon": "✈️", "color": "#14b8a6"},
    {"name": "Personal Care",    "icon": "💆", "color": "#a855f7"},
    {"name": "Subscriptions",    "icon": "📱", "color": "#0ea5e9"},
    {"name": "Other Expense",    "icon": "📦", "color": "#94a3b8"},
]

INCOME_CATEGORIES = [
    {"name": "Salary",           "icon": "💼", "color": "#10b981"},
    {"name": "Freelance",        "icon": "💻", "color": "#06b6d4"},
    {"name": "Business",         "icon": "🏢", "color": "#8b5cf6"},
    {"name": "Investment",       "icon": "📈", "color": "#f59e0b"},
    {"name": "Gift",             "icon": "🎁", "color": "#ec4899"},
    {"name": "Other Income",     "icon": "💰", "color": "#6366f1"},
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing = await db.execute(select(User).where(User.email == "admin@financeai.com"))
        if existing.scalar_one_or_none():
            print("✅ Already seeded — skipping.")
            return

        print("🌱 Seeding database...")

        # ── Create admin user ──────────────────────────────────────────────
        admin = User(
            name="Admin User",
            email="admin@financeai.com",
            hashed_password=hash_password("admin123"),
            is_admin=True,
            monthly_income=80000,
            currency="INR",
        )
        db.add(admin)

        # ── Create demo user ───────────────────────────────────────────────
        demo = User(
            name="Aarthaa Sharma",
            email="demo@financeai.com",
            hashed_password=hash_password("demo123"),
            monthly_income=55000,
            currency="INR",
        )
        db.add(demo)
        await db.flush()

        # ── Seed categories for both users ─────────────────────────────────
        for user in [admin, demo]:
            cats = {}
            for c in EXPENSE_CATEGORIES:
                cat = Category(**c, type=TransactionType.expense, user_id=user.id)
                db.add(cat)
                cats[c["name"]] = cat
            for c in INCOME_CATEGORIES:
                cat = Category(**c, type=TransactionType.income, user_id=user.id)
                db.add(cat)
                cats[c["name"]] = cat
            await db.flush()

            # ── Seed 6 months of transactions ─────────────────────────────
            today = date.today()
            for month_offset in range(6):
                base_date = today.replace(day=1) - timedelta(days=30 * month_offset)
                month = base_date.month
                year = base_date.year

                # Income
                db.add(Transaction(
                    user_id=user.id,
                    category_id=cats["Salary"].id,
                    amount=user.monthly_income,
                    type=TransactionType.income,
                    description="Monthly salary",
                    payment_mode=PaymentMode.bank_transfer,
                    date=base_date.replace(day=1),
                ))

                if random.random() > 0.5:
                    db.add(Transaction(
                        user_id=user.id,
                        category_id=cats["Freelance"].id,
                        amount=random.randint(3000, 12000),
                        type=TransactionType.income,
                        description="Freelance project",
                        payment_mode=PaymentMode.upi,
                        date=base_date.replace(day=random.randint(5, 20)),
                    ))

                # Expenses — realistic spread
                expense_data = [
                    ("Rent",           10000, 12000, PaymentMode.bank_transfer, 1),
                    ("Food & Dining",   800,  1500,  PaymentMode.upi,           15),
                    ("Food & Dining",   500,  900,   PaymentMode.cash,          10),
                    ("Transportation",  300,  600,   PaymentMode.upi,           8),
                    ("Shopping",        500,  3000,  PaymentMode.card,          14),
                    ("Entertainment",   200,  800,   PaymentMode.upi,           18),
                    ("Utilities",      1200,  1800,  PaymentMode.upi,           5),
                    ("Subscriptions",   500,   700,  PaymentMode.card,          3),
                    ("Education",       500,  2000,  PaymentMode.upi,           12),
                    ("Personal Care",   200,   800,  PaymentMode.cash,          20),
                    ("Healthcare",      200,  1000,  PaymentMode.card,          random.randint(1, 28)),
                ]
                for cat_name, low, high, mode, day in expense_data:
                    db.add(Transaction(
                        user_id=user.id,
                        category_id=cats[cat_name].id,
                        amount=random.randint(low, high),
                        type=TransactionType.expense,
                        description=f"{cat_name} expense",
                        payment_mode=mode,
                        date=base_date.replace(day=min(day, 28)),
                    ))

                # ── Budgets ────────────────────────────────────────────────
                for cat_name, budget_amt in [
                    ("Food & Dining", 5000),
                    ("Transportation", 2000),
                    ("Shopping", 4000),
                    ("Entertainment", 2000),
                    ("Utilities", 2000),
                    ("Subscriptions", 1000),
                ]:
                    existing_budget = await db.execute(
                        select(Budget).where(
                            Budget.user_id == user.id,
                            Budget.category_id == cats[cat_name].id,
                            Budget.month == month,
                            Budget.year == year,
                        )
                    )
                    if not existing_budget.scalar_one_or_none():
                        db.add(Budget(
                            user_id=user.id,
                            category_id=cats[cat_name].id,
                            amount=budget_amt,
                            month=month,
                            year=year,
                        ))

        # ── Savings goals for demo user ────────────────────────────────────
        goals = [
            SavingsGoal(
                user_id=demo.id,
                title="New Laptop",
                description="MacBook Pro for college projects",
                target_amount=90000,
                current_amount=22000,
                target_date=today + timedelta(days=180),
                icon="💻",
                status=GoalStatus.active,
            ),
            SavingsGoal(
                user_id=demo.id,
                title="Emergency Fund",
                description="3 months of expenses",
                target_amount=75000,
                current_amount=35000,
                target_date=today + timedelta(days=270),
                icon="🏦",
                status=GoalStatus.active,
            ),
            SavingsGoal(
                user_id=demo.id,
                title="Goa Trip",
                description="End of semester trip with friends",
                target_amount=15000,
                current_amount=15000,
                target_date=today + timedelta(days=30),
                icon="✈️",
                status=GoalStatus.completed,
            ),
        ]
        for g in goals:
            db.add(g)

        await db.commit()
        print("✅ Seed complete!")
        print("   Admin  → admin@financeai.com / admin123")
        print("   Demo   → demo@financeai.com  / demo123")


if __name__ == "__main__":
    asyncio.run(seed())
