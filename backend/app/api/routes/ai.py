from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from datetime import datetime, date
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.finance import (
    Transaction, Budget, SavingsGoal, AIRecommendation, ChatMessage,
    TransactionType, GoalStatus, Category
)
from app.schemas.schemas import ChatRequest, ChatResponse, RecommendationOut

router = APIRouter()


async def generate_recommendations(user: User, db: AsyncSession) -> List[dict]:
    """Rule-based AI recommendation engine"""
    now = datetime.now()
    month, year = now.month, now.year
    recs = []

    # Get last 3 months of expense data by category
    cat_spend = {}
    for i in range(3):
        m = (month - i - 1) % 12 + 1
        y = year - ((month - i - 1) // 12)
        result = await db.execute(
            select(Category.name, func.sum(Transaction.amount).label("total"))
            .join(Transaction, Transaction.category_id == Category.id)
            .where(
                Transaction.user_id == user.id,
                Transaction.type == TransactionType.expense,
                func.extract("month", Transaction.date) == m,
                func.extract("year", Transaction.date) == y,
            )
            .group_by(Category.name)
        )
        for row in result.all():
            cat_spend[row.name] = cat_spend.get(row.name, 0) + row.total

    # Average monthly income
    income_result = await db.execute(
        select(func.sum(Transaction.amount))
        .where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.income,
        )
    )
    total_income = income_result.scalar() or 0
    avg_monthly_income = total_income / 3 if total_income else user.monthly_income

    # Current month spend
    expense_result = await db.execute(
        select(func.sum(Transaction.amount))
        .where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.expense,
            func.extract("month", Transaction.date) == month,
            func.extract("year", Transaction.date) == year,
        )
    )
    current_expense = expense_result.scalar() or 0

    # Recommendation 1: Savings rate
    if avg_monthly_income > 0:
        savings = avg_monthly_income - (current_expense or avg_monthly_income * 0.7)
        savings_rate = (savings / avg_monthly_income) * 100
        if savings_rate < 20:
            reduction_needed = max(0, avg_monthly_income * 0.2 - savings)
            recs.append({
                "type": "savings",
                "title": "Boost your savings rate",
                "message": (
                    f"You're saving {savings_rate:.0f}% of your income. "
                    f"Financial experts recommend saving at least 20%. "
                    f"Try to reduce expenses by ₹{reduction_needed:.0f}."
                ),
                "priority": "high",
            })

    # Recommendation 2: Top overspending category
    if cat_spend:
        top_cat = max(cat_spend, key=cat_spend.get)
        top_amount = cat_spend[top_cat]
        avg_top = top_amount / 3
        if avg_top > (avg_monthly_income * 0.25):
            pct = (avg_top / avg_monthly_income * 100) if avg_monthly_income else 0
            recs.append({
                "type": "spending",
                "title": f"High spending on {top_cat}",
                "message": (
                    f"You spend an average of ₹{avg_top:.0f}/month on {top_cat}, "
                    f"which is {pct:.0f}% of your income. "
                    f"Consider reducing it by 10-15%."
                ),
                "priority": "medium",
            })

    # Recommendation 3: Budget check
    budgets = await db.execute(
        select(Budget).where(
            Budget.user_id == user.id,
            Budget.month == month,
            Budget.year == year,
        )
    )
    budget_count = len(budgets.scalars().all())
    if budget_count == 0:
        recs.append({
            "type": "general",
            "title": "Set up monthly budgets",
            "message": (
                "You haven't set any budgets for this month. "
                "Creating category-wise budgets helps you stay on track "
                "and avoid overspending."
            ),
            "priority": "medium",
        })

    # Recommendation 4: Emergency fund
    recs.append({
        "type": "savings",
        "title": "Build your emergency fund",
        "message": (
            f"Keep 3-6 months of expenses "
            f"(₹{current_expense * 3:.0f} - ₹{current_expense * 6:.0f}) "
            f"in a liquid savings account. "
            f"This protects you from unexpected events."
        ),
        "priority": "low",
    })

    # Recommendation 5: Goals check
    goals_result = await db.execute(
        select(SavingsGoal).where(
            SavingsGoal.user_id == user.id,
            SavingsGoal.status == GoalStatus.active,
        )
    )
    goals = goals_result.scalars().all()
    for goal in goals:
        remaining = goal.target_amount - goal.current_amount
        today = date.today()
        months_left = max(
            (goal.target_date.year - today.year) * 12
            + (goal.target_date.month - today.month),
            1,
        )
        needed = remaining / months_left
        if needed > avg_monthly_income * 0.3:
            pct = (
                (needed / avg_monthly_income * 100)
                if avg_monthly_income
                else 0
            )
            recs.append({
                "type": "goal",
                "title": f"Goal '{goal.title}' needs attention",
                "message": (
                    f"You need to save ₹{needed:.0f}/month to reach "
                    f"'{goal.title}' by {goal.target_date.strftime('%b %Y')}. "
                    f"This is {pct:.0f}% of your monthly income."
                ),
                "priority": "high",
            })

    return recs


@router.post("/recommend")
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recs = await generate_recommendations(current_user, db)

    # Save to DB
    saved = []
    for r in recs:
        rec = AIRecommendation(**r, user_id=current_user.id)
        db.add(rec)
        saved.append(rec)
    await db.commit()

    # Return latest recommendations
    result = await db.execute(
        select(AIRecommendation)
        .where(AIRecommendation.user_id == current_user.id)
        .order_by(desc(AIRecommendation.created_at))
        .limit(10)
    )
    return result.scalars().all()


@router.get("/recommendations", response_model=List[RecommendationOut])
async def list_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIRecommendation)
        .where(AIRecommendation.user_id == current_user.id)
        .order_by(desc(AIRecommendation.created_at))
        .limit(20)
    )
    return result.scalars().all()


@router.put("/recommendations/{rec_id}/read")
async def mark_read(
    rec_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIRecommendation).where(
            AIRecommendation.id == rec_id,
            AIRecommendation.user_id == current_user.id,
        )
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.is_read = True
    await db.commit()
    return {"ok": True}


def rule_based_chat(message: str, context: dict) -> str:
    """Simple rule-based chatbot for finance questions"""
    msg = message.lower()
    income = context.get("monthly_income", 0)
    expense = context.get("monthly_expense", 0)
    savings = income - expense

    if any(kw in msg for kw in ["save", "saving", "savings"]):
        if income > 0:
            rate = (savings / income) * 100
            return (
                f"Based on this month's data, you're saving ₹{savings:.0f} "
                f"({rate:.0f}% of income). "
                f"The 50/30/20 rule suggests: 50% needs (₹{income * 0.5:.0f}), "
                f"30% wants (₹{income * 0.3:.0f}), 20% savings (₹{income * 0.2:.0f}). "
                f"Try to automate savings by transferring money at the start "
                f"of each month."
            )
        return (
            "Add your income transactions first so I can calculate "
            "your savings rate and give personalized advice."
        )

    if any(kw in msg for kw in ["overspend", "spend too much",
                                   "reduce expense", "cut"]):
        return (
            f"You're spending ₹{expense:.0f} this month. To reduce expenses: "
            f"1) Track every purchase — awareness alone cuts spending by 15%. "
            f"2) Cancel unused subscriptions. "
            f"3) Cook at home more often. "
            f"4) Use the 24-hour rule before non-essential purchases. "
            f"Check your Insights page for your top spending categories."
        )

    if any(kw in msg for kw in ["budget", "budget limit"]):
        return (
            "A good budget follows the 50/30/20 rule: "
            "50% for needs (rent, food, utilities), "
            "30% for wants (entertainment, dining out), "
            "20% for savings and investments. "
            "Go to the Budgets page to set category-wise limits."
        )

    if any(kw in msg for kw in ["goal", "target", "achieve",
                                  "phone", "laptop", "travel", "months"]):
        return (
            "To check if a goal is achievable, go to the Goals page "
            "and set your target amount and date. "
            "The app will calculate how much you need to save each month. "
            f"Currently you save ₹{savings:.0f}/month. "
            "If that's not enough, either increase income, reduce expenses, "
            "or extend the deadline."
        )

    if any(kw in msg for kw in ["invest", "investment",
                                  "mutual fund", "stock", "fd"]):
        return (
            "Once you have 3-6 months of emergency fund, consider investing: "
            "1) SIP in index funds for long-term goals (5+ years). "
            "2) FD or RD for short-term goals (1-3 years). "
            "3) PPF for tax savings. "
            "Start small — even ₹500/month grows significantly "
            "over time with compounding."
        )

    if any(kw in msg for kw in ["emergency", "fund"]):
        return (
            f"An emergency fund should cover 3-6 months of expenses. "
            f"Based on your spending, that's ₹{expense * 3:.0f} "
            f"- ₹{expense * 6:.0f}. "
            "Keep it in a high-interest savings account or liquid "
            "mutual fund for quick access."
        )

    return (
        "I can help with questions about saving money, budgeting, "
        "spending habits, financial goals, and investments. Try asking: "
        "'How much should I save?', 'Why am I overspending?', or "
        "'Can I reach my goal in 6 months?'"
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now()

    # Get context
    income_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.income,
            func.extract("month", Transaction.date) == now.month,
            func.extract("year", Transaction.date) == now.year,
        )
    )
    expense_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.expense,
            func.extract("month", Transaction.date) == now.month,
            func.extract("year", Transaction.date) == now.year,
        )
    )

    context = {
        "monthly_income": income_result.scalar()
        or current_user.monthly_income
        or 0,
        "monthly_expense": expense_result.scalar() or 0,
    }

    reply = rule_based_chat(request.message, context)

    # Save both messages
    user_msg = ChatMessage(
        user_id=current_user.id, role="user", content=request.message
    )
    bot_msg = ChatMessage(
        user_id=current_user.id, role="assistant", content=reply
    )
    db.add(user_msg)
    db.add(bot_msg)
    await db.commit()
    await db.refresh(bot_msg)

    return ChatResponse(reply=reply, created_at=bot_msg.created_at)


@router.get("/chat/history")
async def chat_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at)
        .limit(100)
    )
    return result.scalars().all()
