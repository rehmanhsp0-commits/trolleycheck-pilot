# TrolleyCheck Pilot — Complete Project Specification

> Version: 1.0 | Status: Ready for build | Stack: Node.js + TypeScript + Prisma + Supabase + Railway + React Native + Expo
> This document is the single source of truth for the TrolleyCheck pilot app.
> Hand this to Claude Code to begin building. Every decision is documented. Every story has acceptance criteria.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Pilot scope](#2-pilot-scope)
3. [Tech stack](#3-tech-stack)
4. [Repo structure](#4-repo-structure)
5. [Branching strategy](#5-branching-strategy)
6. [Epics and user stories](#6-epics-and-user-stories)
7. [Data model](#7-data-model)
8. [API specification](#8-api-specification)
9. [Mobile screens](#9-mobile-screens)
10. [CI/CD pipeline](#10-cicd-pipeline)
11. [Infrastructure](#11-infrastructure)
12. [Security and privacy](#12-security-and-privacy)
13. [Definition of done](#13-definition-of-done)
14. [Azure migration rules](#14-azure-migration-rules)
15. [Claude Code instructions](#15-claude-code-instructions)

---

## 1. Project overview

**App name:** TrolleyCheck (pilot — use fictional store names FreshMart and ValueGrocer)
**Purpose:** Allow Australian shoppers to compare their weekly grocery basket total between two major supermarkets and identify where they'll save money.
**Platform:** iOS and Android (React Native + Expo)
**Backend:** Node.js + TypeScript REST API
**Database:** Supabase PostgreSQL (Sydney region)
**Hosting:** Railway (Sydney-adjacent)

### Pilot goals

1. Validate the core comparison concept with real users
2. Build the full enterprise SDLC from day one so TrolleyCheck production is a config change, not a rewrite
3. Use fictional store names (FreshMart, ValueGrocer) to avoid trademark issues during pilot
4. Prove the split-shop optimiser concept works technically

### What pilot is NOT

- Not a public product — invite-only beta
- Not scraping real store data — seed data only
- Not monetised — free during pilot
- Not branded as TrolleyCheck publicly — internal name only

---

## 2. Pilot scope

### In scope (MVP)

- User registration and login (email + password)
- Create, save, edit and delete grocery lists
- Add items to a list by name, quantity and unit
- Compare full basket total between FreshMart and ValueGrocer
- See which store is cheaper for the full basket
- See item-level price differences
- Split-shop optimiser — which items to buy where for maximum saving
- Price data via seed/admin (no scraping in pilot)

### Out of scope for pilot

- Real store data scraping
- Push notifications
- Price alerts
- Household sharing / collaborative lists
- Spend history and analytics
- Aldi, IGA, Costco support
- Payment or subscription
- App Store / Play Store public listing

---

## 3. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| API language | TypeScript | Strict mode enabled |
| API framework | Express v5 | REST API |
| ORM | Prisma v7 | All DB access via Prisma only |
| Database | Supabase PostgreSQL | Sydney region |
| Auth | Supabase Auth | JWT tokens |
| Cache | Upstash Redis | Price data caching (6hr TTL) |
| Logging | pino | Structured JSON, no PII |
| Validation | Zod | All endpoints validated |
| Testing | Jest + Supertest | 80% coverage minimum |
| Containerisation | Docker | Node 20 Alpine |
| Mobile | React Native + Expo | TypeScript |
| State management | Zustand | Mobile app state |
| HTTP client | React Query + fetch | API calls with caching |
| CI/CD | GitHub Actions | Full pipeline |
| Hosting | Railway | Sydney region |
| IaC | Terraform | Railway + Azure drafted |

---

## 4. Repo structure

```
trolleycheck/
├── apps/
│   ├── api/                      # Node.js + Express API
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── app.ts            # Express app
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts       # POST /auth/register, /auth/login
│   │   │   │   ├── lists.ts      # CRUD /lists
│   │   │   │   ├── items.ts      # CRUD /lists/:id/items
│   │   │   │   ├── products.ts   # GET /products
│   │   │   │   └── compare.ts    # POST /compare
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts       # JWT verification
│   │   │   │   ├── validate.ts   # Zod validation
│   │   │   │   └── rateLimit.ts  # Rate limiting
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts     # Prisma client
│   │   │   │   ├── logger.ts     # pino logger
│   │   │   │   ├── cache.ts      # Redis client
│   │   │   │   └── supabase.ts   # Supabase auth client
│   │   │   ├── services/
│   │   │   │   ├── comparison.service.ts   # Basket comparison logic
│   │   │   │   └── splitShop.service.ts    # Split shop optimiser
│   │   │   └── schemas/
│   │   │       ├── auth.schema.ts
│   │   │       ├── list.schema.ts
│   │   │       └── compare.schema.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── prisma.config.ts
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/__tests__/
│   │   │   ├── health.test.ts
│   │   │   ├── auth.test.ts
│   │   │   ├── lists.test.ts
│   │   │   ├── compare.test.ts
│   │   │   └── splitShop.test.ts
│   │   ├── .env.example
│   │   ├── .gitignore
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── prisma.config.ts
│   └── mobile/                   # React Native + Expo
│       ├── src/
│       │   ├── screens/
│       │   │   ├── LoginScreen.tsx
│       │   │   ├── RegisterScreen.tsx
│       │   │   ├── ListsScreen.tsx
│       │   │   ├── ListDetailScreen.tsx
│       │   │   ├── CompareScreen.tsx
│       │   │   └── SplitShopScreen.tsx
│       │   ├── components/
│       │   │   ├── ProductCard.tsx
│       │   │   ├── PriceTag.tsx
│       │   │   ├── StoreCompare.tsx
│       │   │   └── LoadingSpinner.tsx
│       │   ├── store/
│       │   │   ├── authStore.ts
│       │   │   └── listStore.ts
│       │   ├── api/
│       │   │   └── client.ts
│       │   └── constants/
│       │       └── theme.ts
│       ├── App.tsx
│       ├── app.json
│       └── package.json
├── infra/
│   ├── railway/
│   │   └── main.tf
│   └── azure/
│       └── main.tf
├── docs/
│   ├── adr/
│   │   ├── 001-tech-stack.md
│   │   └── 002-auth-strategy.md
│   ├── runbooks/
│   │   ├── deployment.md
│   │   └── azure-migration.md
│   └── playbook.md
├── .github/
│   └── workflows/
│       └── deploy.yml
├── Dockerfile
├── docker-compose.yml
├── railway.json
├── .gitignore
└── README.md
```

---

## 5. Branching strategy

### Branch model — GitHub Flow with develop

```
main          ← production — always live, always stable
  └── develop ← integration — features merge here first
        ├── feature/TC-1-user-auth
        ├── feature/TC-2-grocery-lists
        └── fix/TC-45-price-rounding
```

### Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/TC-{n}-short-description` | `feature/TC-1-user-auth` |
| Bug fix | `fix/TC-{n}-short-description` | `fix/TC-45-price-rounding` |
| Hotfix | `hotfix/TC-{n}-short-description` | `hotfix/TC-99-auth-expiry` |
| Release | `release/vX.Y.Z` | `release/v1.0.0` |

### Protection rules

| Branch | PR required | Approvals | Status checks |
|---|---|---|---|
| `main` | Yes | 1 | All must pass |
| `develop` | Yes | 1 | All must pass |
| `feature/*` | No | — | — |

### Commit message format

```
feat: add basket comparison endpoint
fix: handle missing price gracefully
test: add integration tests for compare route
docs: update playbook with comparison logic
chore: update dependencies
refactor: extract comparison logic to service
```

---

## 6. Epics and user stories

### Epic 1 — User authentication

---

#### TC-1: User registration

**Story:**
```
As a new user,
I want to create an account with my email and password,
So that I can save my grocery lists and access them on any device.
```

**Acceptance criteria:**
- [ ] User can register with email and password
- [ ] Password minimum 8 characters, must contain letter and number
- [ ] Duplicate email returns clear error message
- [ ] Successful registration returns JWT access token
- [ ] Successful registration returns JWT refresh token
- [ ] Tokens stored securely on device (not in plain storage)
- [ ] User receives confirmation that account was created

**API:** `POST /auth/register`

---

#### TC-2: User login

**Story:**
```
As a registered user,
I want to log in with my email and password,
So that I can access my saved grocery lists.
```

**Acceptance criteria:**
- [ ] User can log in with correct email and password
- [ ] Invalid credentials return generic error (not "wrong password" specifically)
- [ ] Successful login returns JWT access token (15 min expiry)
- [ ] Successful login returns JWT refresh token (7 days expiry)
- [ ] After 5 failed attempts, account is locked for 15 minutes
- [ ] Login works offline if token is still valid

**API:** `POST /auth/login`

---

#### TC-3: Token refresh

**Story:**
```
As a logged in user,
I want my session to stay active without logging in again,
So that I don't have to re-enter my credentials constantly.
```

**Acceptance criteria:**
- [ ] App silently refreshes token before expiry
- [ ] Refresh token rotation — new refresh token issued on each use
- [ ] Expired refresh token redirects to login screen
- [ ] User is never shown a session expired error mid-action

**API:** `POST /auth/refresh`

---

#### TC-4: Logout and account deletion

**Story:**
```
As a user,
I want to log out and delete my account,
So that I have full control over my data.
```

**Acceptance criteria:**
- [ ] Logout clears all tokens from device
- [ ] Delete account removes all user data (lists, items, profile)
- [ ] Delete account is confirmed with a second prompt
- [ ] Deleted account cannot be recovered
- [ ] User receives confirmation of deletion

**API:** `POST /auth/logout`, `DELETE /auth/account`

---

### Epic 2 — Grocery lists

---

#### TC-5: Create grocery list

**Story:**
```
As a logged in user,
I want to create a named grocery list,
So that I can organise my weekly shopping.
```

**Acceptance criteria:**
- [ ] User can create a list with a name
- [ ] List name maximum 100 characters
- [ ] User can create multiple lists
- [ ] New list appears immediately in the lists screen
- [ ] List creation works offline (syncs when online)

**API:** `POST /lists`

---

#### TC-6: View and manage lists

**Story:**
```
As a logged in user,
I want to see all my grocery lists and manage them,
So that I can keep my shopping organised.
```

**Acceptance criteria:**
- [ ] User sees all their lists sorted by last modified
- [ ] Each list shows name, item count and last modified date
- [ ] User can rename a list
- [ ] User can delete a list (with confirmation)
- [ ] User can duplicate a list
- [ ] Empty state shown when no lists exist

**API:** `GET /lists`, `PUT /lists/:id`, `DELETE /lists/:id`

---

#### TC-7: Add items to list

**Story:**
```
As a logged in user,
I want to add grocery items to my list with quantity and unit,
So that I can track exactly what I need to buy.
```

**Acceptance criteria:**
- [ ] User can add item by name
- [ ] User can set quantity (numeric)
- [ ] User can set unit (kg, g, L, mL, each)
- [ ] User can add notes to an item
- [ ] Item name maximum 200 characters
- [ ] List supports up to 100 items
- [ ] Items can be reordered
- [ ] Item can be marked as checked/unchecked

**API:** `POST /lists/:id/items`

---

#### TC-8: Edit and delete items

**Story:**
```
As a logged in user,
I want to edit and remove items from my list,
So that I can keep my list accurate.
```

**Acceptance criteria:**
- [ ] User can edit item name, quantity, unit and notes
- [ ] User can delete an item (swipe to delete on mobile)
- [ ] Changes save automatically without a save button
- [ ] Deleted item is removed immediately from the list

**API:** `PUT /lists/:id/items/:itemId`, `DELETE /lists/:id/items/:itemId`

---

### Epic 3 — Price comparison

---

#### TC-9: Compare basket prices

**Story:**
```
As a user with a grocery list,
I want to compare my full basket total between FreshMart and ValueGrocer,
So that I know which store is cheaper for my weekly shop.
```

**Acceptance criteria:**
- [ ] User can trigger comparison from their list screen
- [ ] Both store totals displayed side by side
- [ ] Cheaper store highlighted with saving amount in AUD
- [ ] Items not found at a store are flagged — not silently excluded
- [ ] Saving amount shown in dollars and percentage
- [ ] Prices are no more than 24 hours old (staleness shown if older)
- [ ] Comparison loads in under 2 seconds for lists up to 50 items
- [ ] Result shareable as text summary

**API:** `POST /compare`

---

#### TC-10: Item-level price breakdown

**Story:**
```
As a user viewing comparison results,
I want to see which items are cheaper at each store,
So that I understand exactly where the savings come from.
```

**Acceptance criteria:**
- [ ] Each item shows price at FreshMart and ValueGrocer
- [ ] Cheaper price highlighted in green
- [ ] Items not found shown clearly with "Not available" label
- [ ] Items can be sorted by saving amount (largest first)
- [ ] Items can be filtered by store

**API:** `POST /compare` (same endpoint, detailed response)

---

#### TC-11: Split-shop optimiser

**Story:**
```
As a budget-conscious user,
I want to know exactly which items to buy at each store,
So that I can minimise my total weekly spend across both stores.
```

**Acceptance criteria:**
- [ ] Shows which items to buy at FreshMart vs ValueGrocer
- [ ] Shows total saving vs single-store shop
- [ ] User can set minimum saving threshold (default $5)
- [ ] User can exclude specific items from the split
- [ ] Split list exportable as shareable text
- [ ] Clearly shows "not worth splitting" if saving below threshold

**API:** `POST /compare/split`

---

### Epic 4 — Products and pricing (admin/seed)

---

#### TC-12: Product catalogue

**Story:**
```
As a system,
I need a product catalogue with prices at each store,
So that basket comparisons can be calculated.
```

**Acceptance criteria:**
- [ ] Product has name, category, unit, price per store
- [ ] Each product can have different prices at each store
- [ ] Products can be active or inactive
- [ ] Price has a timestamp so staleness can be detected
- [ ] Minimum 50 seed products across common categories
- [ ] Categories: dairy, bread, meat, fruit & veg, pantry, drinks, household

**API:** `GET /products`, `GET /products/:id`

---

## 7. Data model

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lists     List[]
}

model List {
  id        String   @id @default(cuid())
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     Item[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Item {
  id        String   @id @default(cuid())
  name      String
  quantity  Float    @default(1)
  unit      String   @default("each")
  notes     String?
  checked   Boolean  @default(false)
  listId    String
  list      List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Product {
  id        String   @id @default(cuid())
  name      String
  category  String
  unit      String
  active    Boolean  @default(true)
  prices    Price[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Price {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  store     String
  amount    Float
  currency  String   @default("AUD")
  updatedAt DateTime @updatedAt

  @@unique([productId, store])
}
```

---

## 8. API specification

### Base URL
```
Development: http://localhost:3000
Production:  https://trolleycheck-api.up.railway.app
```

### Authentication
All endpoints except `/health`, `/auth/register`, `/auth/login` require:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### Health
```
GET /health
Response: { status: 'healthy', timestamp: string, version: string }
```

#### Auth
```
POST /auth/register
Body: { email: string, password: string }
Response: { user: User, accessToken: string, refreshToken: string }

POST /auth/login
Body: { email: string, password: string }
Response: { user: User, accessToken: string, refreshToken: string }

POST /auth/refresh
Body: { refreshToken: string }
Response: { accessToken: string, refreshToken: string }

POST /auth/logout
Body: { refreshToken: string }
Response: { success: true }

DELETE /auth/account
Response: { success: true }
```

#### Lists
```
GET /lists
Response: { data: List[], count: number }

POST /lists
Body: { name: string }
Response: { data: List }

PUT /lists/:id
Body: { name: string }
Response: { data: List }

DELETE /lists/:id
Response: { success: true }

POST /lists/:id/duplicate
Response: { data: List }
```

#### Items
```
GET /lists/:id/items
Response: { data: Item[], count: number }

POST /lists/:id/items
Body: { name: string, quantity: number, unit: string, notes?: string }
Response: { data: Item }

PUT /lists/:id/items/:itemId
Body: { name?: string, quantity?: number, unit?: string, notes?: string, checked?: boolean }
Response: { data: Item }

DELETE /lists/:id/items/:itemId
Response: { success: true }
```

#### Products
```
GET /products
Query: ?category=dairy&store=FreshMart
Response: { data: Product[], count: number }
```

#### Compare
```
POST /compare
Body: { listId: string }
Response: {
  freshmart: { total: number, items: ComparedItem[] },
  valuegrocer: { total: number, items: ComparedItem[] },
  cheaperStore: 'FreshMart' | 'ValueGrocer',
  saving: { amount: number, percentage: number },
  notFound: string[]
}

POST /compare/split
Body: { listId: string, minimumSaving?: number }
Response: {
  freshmart: { items: Item[], subtotal: number },
  valuegrocer: { items: Item[], subtotal: number },
  totalSaving: number,
  worthSplitting: boolean
}
```

### Error responses
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Email is required",
  "statusCode": 400
}
```

### Standard error codes
| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Valid token, wrong user |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate (e.g. email) |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | DB or cache down |

---

## 9. Mobile screens

### Screen map
```
App
├── Auth Stack (unauthenticated)
│   ├── LoginScreen
│   └── RegisterScreen
└── Main Stack (authenticated)
    ├── ListsScreen (home)
    ├── ListDetailScreen
    ├── CompareScreen
    └── SplitShopScreen
```

### Brand colours
```typescript
export const theme = {
  primary: '#1D9E75',      // Trolley green
  primaryDark: '#085041',  // Deep forest
  secondary: '#EF9F27',    // Savings amber
  danger: '#E24B4A',       // Alert red
  background: '#F1EFE8',   // Off white
  surface: '#FFFFFF',      // Card white
  textPrimary: '#2C2C2A',  // Almost black
  textSecondary: '#5F5E5A', // Muted
  textHint: '#888780',     // Hint
  border: '#D3D1C7',       // Light border
}
```

### Screen specifications

#### LoginScreen
- Email input
- Password input (hidden, show/hide toggle)
- Login button
- Link to RegisterScreen
- Error message display
- Loading state on button

#### RegisterScreen
- Email input
- Password input with requirements hint
- Confirm password input
- Register button
- Link to LoginScreen
- Inline validation feedback

#### ListsScreen
- Header: "My Lists"
- Create new list button (FAB)
- FlatList of list cards
- Each card: list name, item count, last modified, chevron
- Swipe to delete
- Empty state with CTA
- Pull to refresh

#### ListDetailScreen
- Header: list name (tappable to rename)
- Compare button (primary CTA)
- Add item button
- FlatList of items
- Each item: checkbox, name, quantity+unit, notes
- Swipe to delete item
- Tap item to edit
- Item count in header

#### CompareScreen
- Two store columns side by side
- Total for each store
- Saving badge (green)
- Item-by-item breakdown
- Not found items flagged
- Share button
- "View split shop" button

#### SplitShopScreen
- Two sections: Buy at FreshMart / Buy at ValueGrocer
- Items in each section
- Subtotals
- Total saving
- Minimum saving threshold slider
- Share button

---

## 10. CI/CD pipeline

### GitHub Actions workflow

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop, feature/**, fix/**]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Lint and Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/api/package-lock.json
      - run: npm ci
        working-directory: apps/api
      - run: npx prisma generate
        working-directory: apps/api
      - run: npm run lint
        working-directory: apps/api
      - run: npm run test:ci
        working-directory: apps/api
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
        working-directory: apps/api
      - run: npm audit --audit-level=high
        working-directory: apps/api

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [test, security]
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t trolleycheck-api .

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: railway up --service api --environment staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: railway up --service api --environment production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  # Azure deploy — uncomment when migrating
  # deploy-azure:
  #   name: Deploy to Azure
  #   runs-on: ubuntu-latest
  #   needs: [build]
  #   if: github.ref == 'refs/heads/main'
  #   steps:
  #     - uses: azure/login@v1
  #       with: { creds: '${{ secrets.AZURE_CREDENTIALS }}' }
  #     - run: az containerapp update --name ca-trolleycheck-api --image trolleycheck-api:${{ github.sha }}
```

### Required GitHub secrets

| Secret | Description |
|---|---|
| `DATABASE_URL` | Supabase pooled connection string |
| `DIRECT_URL` | Supabase direct connection string |
| `RAILWAY_TOKEN` | Railway deploy token |
| `SUPABASE_JWT_SECRET` | For JWT verification |

### Railway environments

| Environment | Branch | URL |
|---|---|---|
| Production | `main` | `https://trolleycheck-api.up.railway.app` |
| Staging | `develop` | `https://trolleycheck-api-staging.up.railway.app` |

---

## 11. Infrastructure

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Dockerfile (root level)
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY apps/api/package*.json ./

RUN npm install --legacy-peer-deps

COPY apps/api/prisma ./prisma

RUN npx prisma generate

COPY apps/api/. .

RUN npm run build

RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### docker-compose.yml (local dev)
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - apps/api/.env
    depends_on:
      - db
      - cache

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: trolleycheck
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine
    ports:
      - "6380:6379"

volumes:
  postgres_data:
```

### Environment variables (.env.example)
```
# Database
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@[HOST]:5432/postgres"

# Auth
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"

# Cache
REDIS_URL="redis://localhost:6379"

# App
PORT=3000
NODE_ENV=development
APP_VERSION=1.0.0
```

---

## 12. Security and privacy

### Australian Privacy Act compliance

- Collect only email address and grocery list contents
- All data stored in Supabase Sydney region
- Privacy policy required before public launch
- Delete account removes all user data
- Incident response plan required before public launch

### Security controls

- JWT access tokens: 15 min expiry
- JWT refresh tokens: 7 days, rotate on use
- Passwords: bcrypt via Supabase Auth
- Rate limiting: 100 req/min per IP, 10 req/min on auth endpoints
- Input validation: Zod schemas on all endpoints
- Row Level Security: enabled on all Supabase tables
- HTTPS only: enforced by Railway
- No PII in logs: user IDs only
- Helmet.js on all Express routes
- CORS: API domain only
- npm audit: runs on every PR

### Supabase Row Level Security policies

```sql
-- Users can only see their own lists
CREATE POLICY "users_own_lists" ON "List"
  FOR ALL USING (auth.uid()::text = "userId");

-- Users can only see items in their own lists
CREATE POLICY "users_own_items" ON "Item"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "List"
      WHERE "List".id = "Item"."listId"
      AND "List"."userId" = auth.uid()::text
    )
  );
```

---

## 13. Definition of done

A story is done when ALL of these are true:

- [ ] All acceptance criteria met and verified
- [ ] Unit tests written — coverage maintained above 80%
- [ ] Integration tests written and passing
- [ ] Code reviewed and approved via PR to develop
- [ ] No critical or high security findings from pipeline
- [ ] Deployed to staging and smoke tested
- [ ] API documented (endpoint added to spec above)
- [ ] No regressions in existing test suite
- [ ] Playbook updated if new architectural decisions made

---

## 14. Azure migration rules

Follow these from day one. Zero exceptions.

1. All config via environment variables — no hardcoded URLs or secrets
2. Dockerfile at repo root — Railway runs it, Azure Container Apps runs the same file
3. Prisma ORM only — no Supabase JS client in API business logic
4. StorageProvider interface — abstract file storage (implement when file upload added)
5. Redis via REDIS_URL env var — Upstash today, Azure Cache for Redis tomorrow
6. Structured JSON logging with pino — never console.log in production
7. GET /health endpoint — returns DB and cache status
8. 12-Factor App compliance — stateless processes, config in env vars

### Defined swap points on migration

| Layer | Current | Azure |
|---|---|---|
| API hosting | Railway | Azure Container Apps |
| Database | Supabase Postgres | Azure DB for PostgreSQL |
| Auth | Supabase Auth | Azure AD B2C |
| Cache | Upstash Redis | Azure Cache for Redis |
| Secrets | Railway env vars | Azure Key Vault |
| CI/CD | GitHub Actions → Railway | GitHub Actions → Azure (uncomment step) |

---

## 15. Claude Code instructions

### How to use this document

This document is the complete specification for TrolleyCheck pilot. Hand it to Claude Code with the following prompt:

---

### Claude Code handover prompt

```
You are building TrolleyCheck — an Australian grocery price comparison app.

CONTEXT:
- This is a pilot app using fictional store names (FreshMart, ValueGrocer) instead of real brands
- The developer has a .NET and Azure background, learning Node.js
- A learning project called PriceTag was completed first — same stack, simpler scope
- Full specification is in trolleycheck-pilot-spec.md

STACK:
- API: Node.js + TypeScript + Express v5 + Prisma v7 + Supabase PostgreSQL
- Auth: Supabase Auth (JWT)
- Cache: Upstash Redis
- Logging: pino (structured JSON, never log PII)
- Validation: Zod on all endpoints
- Testing: Jest + Supertest (80% coverage minimum)
- Mobile: React Native + Expo + TypeScript + Zustand + React Query
- CI/CD: GitHub Actions (full pipeline in spec)
- Hosting: Railway
- IaC: Terraform (Railway + Azure drafted)

CRITICAL RULES (Azure migration rules — never break these):
1. All config via environment variables — no hardcoded anything
2. Dockerfile at repo root
3. Prisma ORM only — no Supabase JS client in API business logic
4. Structured JSON logging with pino — no console.log
5. GET /health endpoint always returns DB and cache status
6. Never log PII (no emails, names, or list contents in logs — user IDs only)
7. All input validated with Zod schemas
8. Rate limiting on all endpoints

BRANCHING:
- main → production
- develop → staging
- feature/TC-{n}-description → features
- fix/TC-{n}-description → bug fixes
- Always branch from develop for features
- Always PR to develop first, then develop PRs to main for releases

BUILD ORDER:
1. Repo setup (GitHub, branch protection, develop branch)
2. API project initialisation (package.json, tsconfig, folder structure)
3. Prisma schema and migration
4. Seed data (50 products across 7 categories, prices at both stores)
5. Auth endpoints (register, login, refresh, logout, delete)
6. Lists CRUD endpoints
7. Items CRUD endpoints
8. Products endpoint
9. Comparison service (basket total comparison)
10. Split-shop optimiser service
11. Compare endpoints
12. Tests for all endpoints (80%+ coverage)
13. Docker + docker-compose
14. GitHub Actions CI/CD pipeline
15. Railway deployment (staging + production)
16. React Native mobile app (all screens in spec)
17. Terraform IaC
18. ADRs and documentation

START HERE:
Begin with TC-1 (user registration). Write the user story to a GitHub Issue first, create the feature branch, then build the code to satisfy the acceptance criteria. Run tests before marking complete.

Ask the developer to review and approve each story before moving to the next.
The developer will handle architectural decisions and reviews.
You handle the implementation.
```

---

*This specification is version 1.0. Update after each sprint with lessons learned and any scope changes.*

---

## 16. Design system

### Philosophy

Clean, modern, trustworthy. The app handles people's money decisions so it needs to feel reliable and precise — not playful or loud. Think: clear data, generous whitespace, purposeful colour use.

### Colour palette

```typescript
export const colors = {
  // Primary — Trolley green
  primary:         '#1D9E75',
  primaryLight:    '#E1F5EE',
  primaryDark:     '#085041',
  primaryMid:      '#5DCAA5',

  // Secondary — Savings amber (used for highlights and CTAs)
  secondary:       '#EF9F27',
  secondaryLight:  '#FAEEDA',
  secondaryDark:   '#633806',

  // Semantic
  danger:          '#E24B4A',
  dangerLight:     '#FCEBEB',
  success:         '#1D9E75',
  successLight:    '#E1F5EE',
  warning:         '#EF9F27',
  warningLight:    '#FAEEDA',

  // Store colours
  freshmart:       '#1D9E75',
  freshmartLight:  '#E1F5EE',
  valuegrocer:     '#378ADD',
  valuegrocerLight:'#E6F1FB',

  // Neutrals
  background:      '#F1EFE8',
  surface:         '#FFFFFF',
  textPrimary:     '#2C2C2A',
  textSecondary:   '#5F5E5A',
  textHint:        '#888780',
  border:          '#D3D1C7',
  borderLight:     '#F1EFE8',
}
```

### Typography

```typescript
export const typography = {
  screenTitle:  { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, color: colors.textPrimary },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  cardTitle:    { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  body:         { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
  caption:      { fontSize: 11, fontWeight: '400', color: colors.textHint },
  priceLarge:   { fontSize: 28, fontWeight: '700', letterSpacing: -1, color: colors.primary },
  priceMedium:  { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  priceSmall:   { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  label:        { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
}
```

### Spacing and layout

```typescript
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
}

export const radius = {
  sm:   8,   // inputs, small elements
  md:   12,  // cards
  lg:   16,  // buttons, large cards
  xl:   24,  // bottom sheets
  full: 99,  // pills, badges
}
```

### Component specifications

#### Cards
```typescript
// Standard card
{
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  padding: spacing.md,
  marginBottom: spacing.sm,
  // iOS shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  // Android elevation
  elevation: 2,
}
```

#### Pills / badges
```typescript
// Status pills
const pillStyles = {
  cheaper:      { bg: colors.successLight,  text: colors.primaryDark },
  notCompared:  { bg: colors.warningLight,  text: colors.secondaryDark },
  stale:        { bg: colors.dangerLight,   text: colors.danger },
  notAvailable: { bg: colors.background,    text: colors.textSecondary },
}
```

#### Buttons
```typescript
// Primary button
{
  backgroundColor: colors.primary,
  borderRadius: radius.lg,
  paddingVertical: 14,
  paddingHorizontal: 20,
  alignItems: 'center',
}

// Secondary button (outline)
{
  backgroundColor: 'transparent',
  borderWidth: 1.5,
  borderColor: colors.primary,
  borderRadius: radius.lg,
  paddingVertical: 12,
  paddingHorizontal: 20,
  alignItems: 'center',
}
```

#### Saving banner (signature component)
```typescript
// The green banner that shows the saving amount
{
  backgroundColor: colors.primary,
  borderRadius: radius.md,
  padding: spacing.md,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: spacing.md,
}
// Saving amount text: 28px bold white
// Supporting text: 11px #9FE1CB
```

### Screen-by-screen design notes

#### LoginScreen
- Centred logo mark (56×56 green rounded square with trolley icon)
- App name below: 22px/700 "TrolleyCheck"
- Tagline: 12px/400 muted "Shop smart. Save real."
- Full-width inputs with floating labels
- Primary green sign in button
- "Sign up" link below
- Privacy note at very bottom

#### ListsScreen
- Large "My lists" title with subtitle showing list count
- Floating action button (FAB) in primary green — bottom right
- Each list card shows: name, item count, last compared result, compare CTA
- Colour-coded badge per list: Saved $X (green), Not compared (amber), Stale (red)
- Pull to refresh
- Swipe left to delete with red background

#### ListDetailScreen
- Back button + list name as header (tap to rename inline)
- Large primary "Compare prices" button at top
- Item rows: checkbox, name, quantity+unit
- Swipe left to delete item
- Add item row at bottom (tap to add)
- Checked items move to bottom with strikethrough

#### CompareScreen
- Saving banner at top (primary green) — always first thing user sees
- Two store columns side by side — winner has green background, loser has grey
- Store total price large and bold
- Item breakdown below — green price = cheaper, strikethrough = not available
- "View split shop" secondary button at bottom
- Share button in top right header

#### SplitShopScreen
- Total saving banner (same green style)
- Two sections: "Buy at FreshMart" (green header pill) / "Buy at ValueGrocer" (blue header pill)
- Items listed under each section with prices
- Subtotal shown at top of each section
- Minimum saving threshold slider at bottom
- "Share split list" primary button

### Animation and interaction

```typescript
// All transitions: 200ms ease-out
// Card press: scale(0.98) with 100ms
// Loading: ActivityIndicator in primary green
// Toast messages: slide up from bottom, auto-dismiss 3s
// Swipe to delete: red background reveals on swipe left
// Pull to refresh: standard RefreshControl in primary green
```

### Dark mode

All colours above have dark mode equivalents. Use React Native's `useColorScheme()` and provide a dark palette:

```typescript
export const darkColors = {
  background:   '#1A1A18',
  surface:      '#2C2C2A',
  textPrimary:  '#F1EFE8',
  textSecondary:'#B4B2A9',
  textHint:     '#5F5E5A',
  border:       '#444441',
  // Primary and semantic colours remain the same
}
```

---

## 17. Beta testing and distribution plan

### Overview

The pilot runs in three phases before any public launch:

```
Phase 1 — Internal (you)         Week 1-2   API + mobile working end to end
Phase 2 — Family beta            Week 3-4   Real users, real feedback
Phase 3 — Friends beta           Week 5-6   Wider group, stress test
Public launch consideration      Week 7+    Only if pilot proves concept
```

---

### Phase 1 — Internal testing

**Goal:** Confirm the full stack works end to end before handing to real users.

**Checklist before moving to Phase 2:**
- [ ] All TC-1 through TC-12 stories deployed to staging
- [ ] All acceptance criteria verified manually on a real device
- [ ] No critical bugs in compare or split-shop logic
- [ ] App tested on at least one Android and one iOS device
- [ ] Railway staging environment stable for 48 hours
- [ ] Supabase database backed up
- [ ] Seed data covers at least 50 products across 7 categories

---

### Phase 2 — Family beta

**Goal:** Get real users using the app daily for one week. Collect qualitative feedback.

#### How to distribute

**Android (Expo Go — fastest, no build needed):**

```bash
cd apps/mobile
npx expo start --tunnel
```

Share the QR code via WhatsApp. Family opens Expo Go, scans, done. Your laptop must be running for this to work.

**Android (standalone APK — better experience):**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure (first time only)
eas build:configure

# Build preview APK
eas build --profile preview --platform android
```

EAS produces a download link. Share via WhatsApp or email. Family installs directly — no Play Store, no Expo Go needed.

**iOS (requires Apple Developer account — $149 AUD/yr):**

```bash
eas build --profile preview --platform ios
```

Then use TestFlight to distribute. Add family Apple IDs as internal testers.

#### app.json preview profile (add to your app.json)

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

#### eas.json (create in mobile root)

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

### Beta feedback collection

#### What to ask family testers

Send this via WhatsApp after they've used it for a few days:

```
TrolleyCheck Beta Feedback

1. How easy was it to add items to your list? (1-5)
2. Did the price comparison make sense at a glance?
3. Did you trust the prices shown?
4. Would you use the split-shop feature in real life?
5. What was the most confusing part?
6. What's missing that you'd want?
7. Would you use this for your weekly shop?
```

#### GitHub Issues for feedback

Add family as GitHub collaborators. When they report a bug or suggestion:
- You create a GitHub Issue tagged `beta-feedback`
- Prioritise in next sprint
- Close with a comment when fixed

---

### Phase 3 — Friends beta (wider group)

**Goal:** 10-20 people using the app for two weeks. Quantitative data.

#### Add analytics before Phase 3

Add PostHog for privacy-friendly analytics:

```bash
npm install posthog-react-native
```

Track these events:
- `list_created`
- `comparison_run`
- `split_shop_viewed`
- `share_tapped`
- `session_start`

**Never track:** email addresses, list contents, item names — PII rules apply.

#### Success metrics for pilot

| Metric | Target |
|---|---|
| Beta users retained after week 2 | > 60% |
| Comparisons run per user per week | > 1 |
| Split shop feature used | > 30% of comparisons |
| App crashes per session | < 1% |
| API error rate | < 0.5% |

If these targets are met — the concept is validated and TrolleyCheck production build begins.

---

### Adding family as GitHub collaborators

1. Go to `https://github.com/YOUR-USERNAME/trolleycheck-pilot`
2. **Settings → Collaborators**
3. **Add people** — enter their GitHub username or email
4. They accept the invite
5. They can now:
   - View all code and PRs
   - Comment on PRs and Issues
   - Approve PRs (replace your second account reviewer)
   - Open Issues for bug reports and feedback

**Recommended roles:**

| Person | Role | Why |
|---|---|---|
| Technical family member | Collaborator | Code reviewer, replaces second account |
| Non-technical family | Tester only | Expo Go / APK, WhatsApp feedback |

---

### Security checklist before sharing

Run these before adding any collaborators or making the repo public:

```bash
# Check no .env files were ever committed
git log --all --full-history -- "**/.env"

# Check no secrets in code
grep -r "supabase.co" apps/api/src/
grep -r "railway.app" apps/api/src/

# Both should return nothing
# All connection strings should only exist in .env files
```

Also verify in Supabase:
- Network restrictions set correctly
- RLS enabled on all tables
- No test accounts with real data

---

### Claude Code instructions for beta distribution

Add this to the handover prompt when you're ready for beta:

```
We are ready for Phase 2 beta testing.

Please:
1. Create eas.json with preview and production profiles
2. Update app.json with build configuration
3. Install and configure PostHog analytics
4. Track: list_created, comparison_run, split_shop_viewed, share_tapped
5. Create a BETA.md file with instructions for family testers
6. Create GitHub Issue labels: beta-feedback, bug, enhancement
7. Write a GitHub Issue template for beta feedback reports

Do not track any PII. User IDs only.
```


---

## 18. Master roadmap — from pilot to production

> This is the living roadmap. Each phase has clear entry criteria (what must be true before starting) and exit criteria (what must be true before moving on). Update this as you progress.

---

### Phase overview

```
Phase 0 — Foundation          COMPLETE ✅
  PriceTag learning project
  Full SDLC understood
  Stack validated
  Azure migration rules established

Phase 1 — Pilot build         YOU ARE HERE 🔄
  TrolleyCheck pilot app
  12 user stories
  Fictional store names
  Seed data only
  Family + friends beta

Phase 2 — Pilot validation    NEXT
  Real user feedback
  Analytics review
  Concept proven or pivoted

Phase 3 — Production build    PLANNED
  Real store names
  Real pricing data strategy
  App Store + Play Store
  Subscription monetisation

Phase 4 — Growth              FUTURE
  Aldi, IGA, Costco
  Price alerts
  Household sharing
  Community price reports
```

---

### Phase 0 — Foundation (complete ✅)

**What was built:**
- PriceTag learning project — full SDLC end to end
- Node.js + TypeScript + Prisma + Supabase + Railway + React Native
- GitHub Actions CI/CD pipeline
- Docker containerisation
- Branch protection and PR process
- Jest + Supertest testing (93% coverage)
- Azure migration rules documented and practiced
- Living playbook created

**Key lessons learned:**
- Norton antivirus blocks Postgres ports — check security software first
- CRLF line endings corrupt .env files on Windows — always run sed -i 's/\r//' .env
- Prisma v7 requires prisma.config.ts — schema.prisma no longer holds connection URLs
- Railway needs Dockerfile at repo root, not in subdirectory
- GitHub Free plan cannot enforce bypass rules on private repos — use public or Team plan
- Export env vars in terminal override .env files — always unset after testing
- npm ci fails if lock file out of sync with package.json — run npm install to resync

---

### Phase 1 — Pilot build (current phase 🔄)

#### Entry criteria (all must be true before starting)
- [x] PriceTag complete and deployed
- [x] TrolleyCheck pilot spec written (SPEC.md)
- [x] Claude Code installed and configured
- [x] GitHub repo created (trolleycheck-pilot)
- [x] Develop branch set up with protection rules
- [x] Supabase project created (Sydney region)
- [x] Railway account ready
- [x] Family identified as beta testers

#### Build plan — sprints

**Sprint 1 — Auth and lists (TC-1 to TC-8)**

| Story | Description | Estimate |
|---|---|---|
| TC-1 | User registration | 2 hrs |
| TC-2 | User login | 1 hr |
| TC-3 | Token refresh | 1 hr |
| TC-4 | Logout and account deletion | 1 hr |
| TC-5 | Create grocery list | 1 hr |
| TC-6 | View and manage lists | 2 hrs |
| TC-7 | Add items to list | 2 hrs |
| TC-8 | Edit and delete items | 1 hr |

Sprint 1 total estimate: ~11 hours with Claude Code
Sprint 1 deliverable: Working auth + grocery list management

**Sprint 2 — Comparison engine (TC-9 to TC-12)**

| Story | Description | Estimate |
|---|---|---|
| TC-9 | Compare basket prices | 3 hrs |
| TC-10 | Item-level price breakdown | 1 hr |
| TC-11 | Split-shop optimiser | 3 hrs |
| TC-12 | Product catalogue + seed data | 2 hrs |

Sprint 2 total estimate: ~9 hours with Claude Code
Sprint 2 deliverable: Full comparison and split-shop working

**Sprint 3 — Mobile app**

| Screen | Description | Estimate |
|---|---|---|
| — | Expo project setup + navigation | 1 hr |
| — | LoginScreen + RegisterScreen | 2 hrs |
| — | ListsScreen | 2 hrs |
| — | ListDetailScreen | 2 hrs |
| — | CompareScreen | 3 hrs |
| — | SplitShopScreen | 2 hrs |

Sprint 3 total estimate: ~12 hours with Claude Code
Sprint 3 deliverable: Full mobile app on Android

**Sprint 4 — Polish and beta prep**

| Task | Description | Estimate |
|---|---|---|
| — | EAS build configuration | 1 hr |
| — | PostHog analytics | 1 hr |
| — | Error handling and edge cases | 2 hrs |
| — | Beta tester onboarding (BETA.md) | 1 hr |
| — | Terraform IaC | 1 hr |
| — | ADRs and documentation | 1 hr |

Sprint 4 total estimate: ~7 hours with Claude Code
Sprint 4 deliverable: Beta-ready app

**Total pilot build estimate: ~39 hours of guided Claude Code work**
**Realistic calendar time: 2-3 weeks working evenings and weekends**

#### Exit criteria (all must be true before Phase 2)
- [ ] All 12 stories deployed to staging
- [ ] All AC verified manually on Android device
- [ ] Test coverage above 80% on all new code
- [ ] CI/CD pipeline green on every merge
- [ ] APK built and installable by family
- [ ] No P1 or P2 bugs outstanding
- [ ] Analytics tracking live (PostHog)
- [ ] BETA.md written and shared with testers

---

### Phase 2 — Pilot validation

#### Entry criteria
- [ ] Phase 1 exit criteria all met
- [ ] At least 3 family members actively using the app
- [ ] PostHog analytics recording events

#### What to measure (2 week beta period)

| Metric | Target | Action if missed |
|---|---|---|
| DAU / MAU ratio | > 40% | Interview users — what's missing? |
| Comparisons run per user per week | > 1 | Simplify the compare flow |
| Split shop feature used | > 30% | Make it more prominent |
| Session length | > 2 min | Content or UX problem |
| App crash rate | < 1% | Fix before Phase 3 |
| User-reported bugs | < 5 critical | Fix before Phase 3 |
| Would recommend to a friend | > 70% | Rethink core value prop |

#### Feedback collection
- 7-question WhatsApp survey after week 1
- GitHub Issues for all bug reports (beta-feedback label)
- Optional 15-minute video call with 2-3 family members

#### Pivot triggers (if any of these are true — stop and rethink)
- Less than 50% of beta users run a comparison in week 1
- Core comparison feature is confusing to non-technical users
- Split-shop optimiser is not compelling in practice
- Pricing data freshness is a dealbreaker (seed data not trusted)

#### Exit criteria
- [ ] 2-week beta complete
- [ ] All success metrics reviewed
- [ ] Pivot decision made: proceed / change scope / stop
- [ ] Top 5 feedback items logged as GitHub Issues
- [ ] Phase 3 go/no-go decision documented in ADR

---

### Phase 3 — Production build (if Phase 2 validates)

#### The big decisions before starting Phase 3

**Decision 1 — Pricing data strategy**

This is the hardest problem. Options ranked by risk:

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| Web scraping (Playwright) | Free, real data | Legally grey, brittle, ToS risk | Avoid long term |
| Third-party data provider (Grocer, Simplyfy) | Legal, reliable | Cost ($200-500/mo) | Best option |
| Manual catalogue entry | Legal, simple | Not scalable, stale fast | OK for Phase 3 launch |
| Community sourced (users report prices) | Scalable, fresh | Requires critical mass | Phase 4 addition |

**Recommendation:** Launch Phase 3 with manual catalogue data for top 200 products, then add a data provider in Phase 4.

**Decision 2 — Real store names**

Using Coles and Woolworths in the app requires:
- Legal review of trademark use in comparative advertising
- Privacy policy and terms of service reviewed by a lawyer
- No scraping of their websites (ToS violation)
- Pricing data sourced legally

**Recommendation:** Get a 1-hour legal consult before Phase 3 launch. ~$300-500 AUD.

**Decision 3 — Azure vs Railway**

| Stay on Railway | Move to Azure |
|---|---|
| Consumer app, < 10k users | Enterprise clients require it |
| Solo developer or small team | IRAP certification needed |
| < $100/mo hosting budget | Microsoft 365 org already exists |
| Speed to market priority | Compliance priority |

**Recommendation:** Stay on Railway for Phase 3 launch. Revisit Azure if you land a B2B client or need IRAP.

**Decision 4 — Monetisation**

| Model | Revenue | Complexity | Recommendation |
|---|---|---|---|
| Free forever | $0 | None | No — unsustainable |
| Freemium (basic free, premium paid) | Medium | Medium | Phase 3 option |
| Subscription $2.99/mo | Predictable | Low | Best for Phase 3 |
| Ads | Low, bad UX | Medium | Avoid |
| Affiliate (store loyalty) | Variable | High | Phase 4 |

**Recommendation:** $2.99 AUD/month subscription. First 30 days free. No ads ever.

#### Phase 3 build additions (beyond pilot)

**Real data layer:**
- [ ] Replace seed data with real product catalogue
- [ ] Integrate data provider API or manual admin panel
- [ ] Weekly price refresh cron job
- [ ] Price staleness detection and alerts

**Auth upgrades:**
- [ ] Google Sign-In (React Native Google OAuth)
- [ ] Apple Sign-In (required for iOS App Store)
- [ ] Password reset via email

**New features (from Phase 2 feedback):**
- [ ] Price alerts (notify when item drops)
- [ ] Spend history and trends
- [ ] Household sharing (shared lists)
- [ ] Barcode scanning (add item by scanning)

**App Store requirements:**
- [ ] Apple Developer Program ($149 AUD/yr)
- [ ] Google Play ($35 AUD once)
- [ ] App Store screenshots (6.5" iPhone, 12.9" iPad)
- [ ] Play Store screenshots (phone + tablet)
- [ ] Privacy policy URL (required by both stores)
- [ ] App icon all sizes (use EAS to generate)
- [ ] Age rating submission

**Infrastructure upgrades:**
- [ ] Supabase Pro plan ($25/mo) — connection pooling, daily backups
- [ ] Railway Pro ($20/mo) — always-on, no cold starts
- [ ] Upstash Redis paid plan — higher throughput
- [ ] Custom domain (trolleycheck.com.au — ~$15/yr)
- [ ] Cloudflare free CDN in front of API

**Estimated Phase 3 monthly costs:**
| Service | Cost |
|---|---|
| Railway Pro | $20 |
| Supabase Pro | $25 |
| Upstash Redis | ~$5 |
| Data provider | $200-500 |
| Domain | ~$1 |
| Apple Developer | ~$12 (annual) |
| Total | ~$263-563/mo |

Break-even at $3/mo subscription: ~90-190 paying users

---

### Phase 4 — Growth (post product-market fit)

Only start Phase 4 when:
- 500+ monthly active users
- Churn < 5% monthly
- NPS > 40

**Planned additions:**
- Aldi, IGA, Costco pricing
- Community price reports (Waze for groceries)
- Recipe integration (import ingredients as a list)
- Household sharing and collaborative lists
- Push notifications for price drops
- Android widget (basket total on home screen)
- Web app (React web app sharing API)
- B2B API (sell price data to other apps)
- Azure migration (if enterprise clients require it)

---

### Recommendations summary

| When | Recommendation |
|---|---|
| Now | Start Phase 1 with Claude Code using SPEC.md |
| Before Phase 2 | Get at least 3 family members committed to beta testing |
| Before Phase 3 | Get legal advice on store name trademark use |
| Before Phase 3 | Decide on pricing data strategy — budget for a data provider |
| Before App Store | Apple Developer account ($149 AUD) — buy early, takes time to activate |
| Before monetisation | Set up Stripe — Revenue Cat for in-app subscriptions is the easiest path |
| Always | Follow Azure migration rules — keep the migration path clean |
| Always | One story at a time — review before proceeding |
| Always | Never log PII — protect your users |

---

### Decision log

Record every major decision here as you progress:

| Date | Decision | Reasoning | Who decided |
|---|---|---|---|
| April 2026 | Use Railway over Azure for pilot | Speed to market, lower cost, Azure migration rules maintained | Solo developer |
| April 2026 | Use fictional store names for pilot | Avoid trademark risk during validation | Solo developer |
| April 2026 | Seed data over scraping for pilot | Legal, reliable, sufficient for concept validation | Solo developer |
| TBD | Phase 3 go/no-go | Based on Phase 2 metrics | Review after beta |
| TBD | Pricing data provider selection | Based on cost, reliability, coverage | Review before Phase 3 |
| TBD | Monetisation model | Based on user feedback and willingness to pay | Review after Phase 2 |

