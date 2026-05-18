# AtomQuest — Demo Guide

A functional Goal Setting & Tracking Portal built for the Atomberg Assessment.

---

## 🏃‍♂️ Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python seed.py   # Creates demo users
uvicorn app.main:app --reload
```
Backend runs at: **http://localhost:8000**

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: **http://localhost:5173**

---

## 🔐 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Employee** | employee@atomquest.com | password123 |
| **Manager** | manager@atomquest.com | password123 |
| **Admin** | admin@atomquest.com | password123 |

---

## 👤 Employee Journey

**1. Login** → employee@atomquest.com

**2. My Goals Dashboard**
- Click "Add Goal" → fill title, thrust area, UoM, target, weightage
- Repeat until total weightage = 100%
- Click "Submit for Approval"

**3. Quarterly Check-ins** (after manager approves)
- Navigate to "Quarterly Check-ins"
- Enter actual achievement for the active quarter
- Select progress status (Not Started / On Track / Completed)
- See live score preview

---

## 👔 Manager Journey

**1. Login** → manager@atomquest.com

**2. Team Overview Dashboard**
- See all direct reports with goal submission status
- Expand an employee's accordion to review submitted goals
- Inline edit targets/weightages during review
- Click "Return" with a reason to send back for rework
- Click "Approve All" to lock goals (weightage must = 100%)

**3. Departmental KPI Push**
- Create a shared goal (title, thrust area, UoM, target, weightage)
- Select employees from your team
- KPI gets pushed to their sheets — weightage can be adjusted, title/target are read-only

**4. Team Check-ins**
- View each employee's approved goals with achievement data
- Add structured check-in comments to document discussions
- See overall weighted scores per employee

---

## 🛡️ Admin / HR Journey

**1. Login** → admin@atomquest.com

**2. Overview**
- View system-wide stats: total employees, submitted, approved, Q1 check-ins

**3. Cycles Management**
- Create new cycles with date ranges
- Activate a cycle
- Open/close check-in windows manually OR click "BRD Schedule" to auto-set Q1-Q4 windows per spec:
  - Phase 1: 1st May (Goal Setting)
  - Q1: July
  - Q2: October
  - Q3: January
  - Q4: March/April

**4. Analytics**
- QoQ employee scores
- Heatmap across quarters
- Thrust area distribution
- UoM distribution
- Manager effectiveness dashboard
- Goal status by department

**5. Completion Dashboard**
- Real-time view of who submitted and approved goals
- See which quarters have completed check-ins

**6. Escalation**
- Configure rules: how many days before an employee/manager gets escalated
- Run escalation checks manually
- View escalation logs with levels (Employee → Manager → HR)
- Mark escalations as resolved

**7. Shared Goals**
- Push a departmental KPI to any employee (not just direct reports)
- Prevents pushing if it would exceed 100% weightage

**8. Goal Unlock**
- Return an approved goal to DRAFT if the employee needs to make changes
- Requires manual rebalancing

**9. Hierarchy**
- View all users and their reporting managers
- Reassign managers

**10. Audit Trail**
- See every change made to goals after lock date: who changed what, when, and why

**11. Export Reports**
- Download Achievement Report as Excel (.xlsx)
- Download Achievement Report as CSV

---

## 📋 BRD Coverage

### Phase 1 — Goal Creation & Approval ✅
- [x] Employee creates goals with Thrust Area, UoM, Target, Weightage
- [x] Validation: weightage = 100%, min 10% per goal, max 8 goals
- [x] Manager L1 approval workflow
- [x] Lock on approval (no edits without Admin)
- [x] Manager inline edit (target/weightage) during review
- [x] Return with reason
- [x] Shared Goals (KPI push) — weightage only for recipients

### Phase 2 — Achievement Tracking ✅
- [x] Quarterly check-in interface
- [x] Status: Not Started / On Track / Completed
- [x] Manager module: Planned vs Achievement view
- [x] Manager check-in comments
- [x] Scoring engine (NUMERIC_MIN, NUMERIC_MAX, TIMELINE, ZERO)
- [x] Check-in schedule: Admin-controlled windows + BRD auto-schedule

### User Roles ✅
- [x] Employee: create goals, submit, check-ins, view locked
- [x] Manager: review, approve, inline edit, return, KPI push, comments
- [x] Admin: cycle management, hierarchy, completion, audit, unlock

### Reporting & Governance ✅
- [x] Achievement Report (CSV + Excel)
- [x] Real-time completion dashboard (SSE polling)
- [x] Audit trail (all post-lock changes)

### Good-to-Have ✅
- [x] Escalation module (rule-based, 3-level chain, HR panel)
- [x] Analytics module (QoQ trends, heatmaps, manager effectiveness)

---

## 🏗️ Architecture

```
Frontend:  React + Vite + TailwindCSS + Redux Toolkit
Backend:   FastAPI (Python) + SQLAlchemy ORM
Database:  PostgreSQL
Auth:      JWT (HS256)
Scoring:  Custom scoring engine (4 UoM types)
Reports:   openpyxl (Excel), csv (CSV)
Realtime:  SSE polling for completion dashboard
```

**Infrastructure choices:**
- PostgreSQL for relational data integrity (goals, check-ins, audit logs)
- FastAPI for async performance and auto-generated Swagger docs
- JWT auth (no session management overhead)
- SSE polling for real-time dashboard (simpler than WebSockets for single-page portal)
- TailwindCSS for consistent, dark-themed UI