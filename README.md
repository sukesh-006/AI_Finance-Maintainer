# 💰 AI Personal Finance Advisor

> A full-stack, production-style web application that helps students and early job holders track income, expenses, savings goals, and budgets — with AI-powered financial recommendations and a smart chatbot.

---

## 📸 What You Get

| Page | What it does |
|------|-------------|
| **Dashboard** | Income, expenses, savings rate, budget utilization, 6-month trend chart |
| **Transactions** | Add/delete income & expenses with search, filter, pagination |
| **Budgets** | Category-wise monthly budget limits with visual usage bars |
| **Goals** | Savings goal tracker with monthly amount needed & progress |
| **Analytics** | Bar, area, and pie charts for spending patterns |
| **AI Assistant** | Rule-based chatbot + auto-generated financial recommendations |
| **CSV Import** | Bulk import transactions via CSV file |
| **Admin Panel** | User management and platform-wide stats |
| **Settings** | Profile, currency, income preferences |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Backend | FastAPI, Python 3.12, SQLAlchemy (async) |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens), bcrypt |
| AI/ML | Rule-based engine, trend analysis (pandas) |
| DevOps | Docker, Docker Compose, GitHub Actions |

---

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

### Step 1 — Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/ai-finance-advisor.git
cd ai-finance-advisor
```

### Step 2 — Start the full stack
```bash
docker compose up --build
```

This starts:
- PostgreSQL on port `5432`
- FastAPI backend on port `8000`
- Next.js frontend on port `3000`

### Step 3 — Seed demo data (first time only)
Open a **new terminal** while containers are running:
```bash
docker compose run --rm seed
```

### Step 4 — Open the app
```
http://localhost:3000
```

**Demo accounts:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@financeai.com | admin123 |
| Demo User | demo@financeai.com | demo123 |

---

## 💻 Local Development (Without Docker)

### Backend

**Requirements:** Python 3.12+, PostgreSQL running locally

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env — update DATABASE_URL to point to your local PostgreSQL

# Run the server
uvicorn app.main:app --reload --port 8000
```

Tables are auto-created on first run.

**Seed demo data:**
```bash
python seed.py
```

**API docs:** http://localhost:8000/docs

---

### Frontend

**Requirements:** Node.js 20+

```bash
cd frontend

# Install packages
npm install

# Set environment variable
cp .env.example .env.local
# .env.local should contain:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

Frontend: http://localhost:3000

---

## 📁 Project Structure

```
ai-finance-advisor/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # auth, transactions, budgets, goals, analytics, ai, csv, admin
│   │   ├── core/             # config, database, security (JWT)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   └── schemas/          # Pydantic request/response schemas
│   ├── seed.py               # Demo data seeder
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   │   ├── dashboard/    # All protected pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── page.tsx      # Landing page
│   │   ├── lib/              # API client, auth store, utils
│   │   └── components/       # Reusable UI components
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── .github/workflows/ci.yml  # GitHub Actions CI
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/transactions` | List with filters & pagination |
| POST | `/api/transactions` | Add transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/budgets` | Monthly budgets with spend |
| POST | `/api/budgets` | Create budget |
| GET | `/api/goals` | All savings goals |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/{id}` | Update progress |
| GET | `/api/analytics/dashboard` | KPI summary |
| GET | `/api/analytics/monthly` | 6-month trend |
| GET | `/api/analytics/categories` | Category breakdown |
| POST | `/api/ai/recommend` | Generate AI recommendations |
| GET | `/api/ai/recommendations` | List recommendations |
| POST | `/api/ai/chat` | Chat with AI advisor |
| POST | `/api/csv/import` | Upload & import CSV |
| GET | `/api/admin/stats` | Platform stats (admin only) |
| GET | `/api/admin/users` | All users (admin only) |

Full interactive docs: http://localhost:8000/docs

---

## 📊 CSV Import Format

Your CSV file should have these columns:

```
date,description,amount,type,category,payment_mode
2024-01-15,Monthly salary,50000,income,Salary,bank_transfer
2024-01-16,Grocery shopping,2500,expense,Food & Dining,upi
2024-01-17,Movie ticket,350,expense,Entertainment,card
```

- **date**: `YYYY-MM-DD`
- **type**: `income` or `expense`
- **payment_mode**: `cash`, `upi`, `card`, `bank_transfer`, `other`

Download the template from the Import CSV page.

---

## 🗄 Database Schema

```
users               transactions         budgets
─────────────       ─────────────────    ──────────────
id                  id                   id
name                user_id (FK)         user_id (FK)
email               category_id (FK)     category_id (FK)
hashed_password     amount               amount
currency            type                 month
monthly_income      description          year
is_admin            payment_mode
                    date                 savings_goals
categories                               ─────────────────
─────────────       ai_recommendations   id
id                  ─────────────────    user_id (FK)
name                id                   title
icon                user_id (FK)         target_amount
color               type                 current_amount
type                title                target_date
user_id             message              status
                    priority
                    is_read
```

---

## 🚀 Deploy to GitHub

```bash
# 1. Create a new repo on github.com (do NOT initialize with README)

# 2. In your project folder
cd ai-finance-advisor
git init
git add .
git commit -m "feat: initial commit — AI Personal Finance Advisor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-finance-advisor.git
git push -u origin main
```

GitHub Actions will automatically run lint and Docker build checks on every push.

---

## 🎓 Resume Description

```
AI Personal Finance Advisor
Built a full-stack web application that helps users track income, expenses,
monthly budgets, and savings goals with AI-based financial recommendations.
Implemented secure JWT authentication, PostgreSQL database design, analytics
dashboards with Recharts, CSV import, rule-based AI engine, and
deployment-ready architecture using Next.js 14, FastAPI, and Docker.
```

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| `docker compose up` fails | Make sure Docker Desktop is running |
| Port 3000/8000 already in use | Stop other services or change ports in `docker-compose.yml` |
| DB connection refused (local) | Ensure PostgreSQL is running and `.env` has correct credentials |
| `npm install` fails | Use Node 20+. Run `node -v` to check |
| Seed fails | Run `docker compose up` first, wait for DB to be healthy, then seed |
| Frontend shows blank page | Check browser console; ensure `NEXT_PUBLIC_API_URL` is set |

---

## 📝 Environment Variables

### Backend `.env`
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/financeai
SECRET_KEY=your-random-secret-key-minimum-32-characters
DEBUG=false
ALLOWED_ORIGINS=["http://localhost:3000"]
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

Built with ❤️ for B.Tech final year placement portfolio.
