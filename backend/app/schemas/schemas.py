from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, datetime
from app.models.finance import TransactionType, PaymentMode, GoalStatus


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    monthly_income: Optional[int] = None
    avatar_url: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    currency: str
    monthly_income: int
    avatar_url: Optional[str]
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Category ──────────────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    type: TransactionType

    model_config = {"from_attributes": True}


# ── Transaction ───────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    category_id: int
    amount: float
    type: TransactionType
    description: Optional[str] = None
    payment_mode: PaymentMode = PaymentMode.upi
    date: date
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class TransactionUpdate(BaseModel):
    category_id: Optional[int] = None
    amount: Optional[float] = None
    type: Optional[TransactionType] = None
    description: Optional[str] = None
    payment_mode: Optional[PaymentMode] = None
    date: Optional[date] = None
    notes: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    category_id: int
    category: CategoryOut
    amount: float
    type: TransactionType
    description: Optional[str]
    payment_mode: PaymentMode
    date: date
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: List[TransactionOut]
    total: int
    page: int
    per_page: int
    pages: int


# ── Budget ────────────────────────────────────────────────────────────────────

class BudgetCreate(BaseModel):
    category_id: int
    amount: float
    month: int
    year: int

    @field_validator("month")
    @classmethod
    def month_valid(cls, v):
        if v < 1 or v > 12:
            raise ValueError("Month must be 1-12")
        return v


class BudgetOut(BaseModel):
    id: int
    category_id: int
    category: CategoryOut
    amount: float
    month: int
    year: int
    spent: float = 0.0
    remaining: float = 0.0
    usage_pct: float = 0.0

    model_config = {"from_attributes": True}


# ── Goal ──────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_amount: float
    current_amount: float = 0.0
    target_date: date
    icon: str = "🎯"

    @field_validator("target_amount")
    @classmethod
    def target_positive(cls, v):
        if v <= 0:
            raise ValueError("Target amount must be positive")
        return v


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[date] = None
    icon: Optional[str] = None
    status: Optional[GoalStatus] = None


class GoalOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    target_amount: float
    current_amount: float
    target_date: date
    icon: str
    status: GoalStatus
    progress_pct: float = 0.0
    months_remaining: int = 0
    monthly_needed: float = 0.0
    created_at: datetime

    model_config = {"from_attributes": True}


# ── AI ────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    created_at: datetime


class RecommendationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    priority: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Analytics ─────────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_income: float
    total_expense: float
    net_savings: float
    savings_rate: float
    budget_used_pct: float
    active_goals: int
    unread_recommendations: int


class MonthlyStat(BaseModel):
    month: str
    income: float
    expense: float
    savings: float


class CategoryStat(BaseModel):
    category: str
    amount: float
    color: str
    icon: str
    pct: float
