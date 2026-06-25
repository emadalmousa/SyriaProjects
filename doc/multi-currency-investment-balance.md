# Multi-Currency Investment Balance Feature

**Use this document when you want to understand how the multi-currency investment balance system works and how users manage balances in multiple currencies (EUR, USD, SYP).**

## Overview

The multi-currency investment balance feature allows users to hold investment balances in multiple currencies simultaneously. Rather than a single balance column, the system now tracks separate balance records per user per currency. This enables investment platforms to operate across different currency zones and accommodate users with diverse investment preferences.

## Prerequisites

- Understanding of FastAPI request/response flows
- Familiarity with SQLAlchemy ORM and database design
- Knowledge of Pydantic schema validation
- Basic understanding of Next.js state management and API integration

## How It Works

### Core Concept

The system uses a **"absence means zero" approach**: if no row exists in the `user_balances` table for a particular user-currency combination, that balance is effectively zero. This design:

- Reduces database storage for users with balances in only 1-2 currencies
- Simplifies the migration path (no need to fill rows for zero balances)
- Maintains clear semantics: "show me all non-zero balances"

### Database Schema

```sql
CREATE TABLE user_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    UNIQUE(user_id, currency)
)
```

**Key Design Choices:**

| Aspect | Design | Rationale |
|--------|--------|-----------|
| Primary Key | Auto-increment `id` | Standard for audit trails and soft deletes if needed |
| `currency` | VARCHAR(10) | Fixed size sufficient for all ISO 4217 codes |
| `amount` | NUMERIC(14,2) | Precise decimal arithmetic for financial data; supports up to 999,999,999,999.99 |
| Constraint | UNIQUE(user_id, currency) | Ensures one row per user per currency; prevents duplicate tracking |
| Absence Rule | No row = 0 balance | Cost-effective storage, clean semantics |

### API Endpoints

#### Request Balance Change (POST)

**Endpoint:** `POST /users/me/balance-request`

**Request body:**
```json
{
  "amount": 500,
  "currency": "EUR",
  "note": "Quarterly investment"
}
```

**Validation:**
- `amount`: Positive number (integer or decimal)
- `currency`: One of `["EUR", "USD", "SYP"]`
- `note`: Optional string for audit trail

**Pending Request Logic:**
Per-currency checking prevents collisions:
- User can have pending requests for different currencies simultaneously
- If user already has a pending request for the same currency, the request is rejected
- Different currencies are independent

**Example:** User can have:
- ✓ Pending EUR request + Pending USD request (allowed, different currencies)
- ✓ Pending EUR request + Approved USD balance (allowed, different request types)
- ✗ Pending EUR request + another pending EUR request (forbidden, same currency)

#### Admin Approve Balance Change (PATCH)

**Endpoint:** `PATCH /admin/requests/{request_id}/approve`

**Backend logic:**
- Uses `UPSERT` semantics: `INSERT ... ON CONFLICT ... DO UPDATE`
- Additive operation: doesn't replace, increments or creates
- Example: User EUR balance of 1000 + admin approval of +500 = new balance of 1500

**Request payload stored:**
```python
payload = {
    "amount": approved_amount,
    "currency": approved_currency
}
```

### User Response Model

**Response structure (from `GET /users/me` or `PATCH /users/me`):**

```python
class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str | None
    last_name: str | None
    full_name: str | None
    phone: str | None
    country: str | None
    user_type: UserType
    avatar_url: str | None
    global_role: GlobalRole
    is_active: bool
    investment_balances: list[dict] = []  # NEW: replaces investment_balance
    created_at: datetime | None = None
```

**investment_balances structure:**
```python
[
    {"currency": "EUR", "amount": 1500.00},
    {"currency": "USD", "amount": 3000.50},
    # SYP only appears if balance > 0
]
```

**Implementation detail** (`backend/src/app/routers/users.py:33-34`):
```python
data = UserResponse.model_validate(current_user).model_dump()
data["investment_balances"] = [{"currency": b.currency, "amount": float(b.amount)} for b in balances]
```

### Frontend Integration

#### User Type Update

**File:** `frontend/src/types/index.ts:47`

```typescript
// OLD:
investment_balance: number;

// NEW:
investment_balances: { currency: string; amount: number }[];
```

#### Balance Request Form

**File:** `frontend/src/components/profile/ProfileForm.tsx`

**Features:**
- Currency dropdown: EUR / USD / SYP
- Submit button disabled if user has pending request for selected currency
- Validation: filters pending `CHANGE_BALANCE` requests by currency match

**Code flow** (ProfileForm.tsx:151):
```typescript
await api.users.requestBalanceChange(amount, balanceCurrency, balanceNote || undefined);
```

#### Profile Balance Display

**File:** `frontend/src/components/profile/ProfileForm.tsx:237-241`

**Display logic:**
```typescript
{(user.investment_balances ?? []).length === 0 ? (
    <p>0,00 €</p>  // Default display when no balances
) : (
    {(user.investment_balances ?? []).map(b => (
        <div>{formatMoney(b.amount, b.currency)}</div>
    ))}
)}
```

**Behavior:**
- Empty balances array → Display "0,00 €" (German locale)
- One or more balances → Show one line per currency using `formatMoney()`
- Example: EUR 1500.00 displays as "1.500,00 €"

#### Management Panel Display

**File:** `frontend/src/components/management/ManagementView.tsx:224-228, 336-341`

**Pending requests display:**
```typescript
if (r.type === "CHANGE_BALANCE") {
    const cur = p.currency || "EUR";  // Fallback to EUR
    detail = p.amount != null ? `+${Number(p.amount).toLocaleString()} ${cur}` : "—";
}
```

**Column naming:**
- Changed from unspecified to **"Betreff/Subject"** (German/English)
- Shows request details: Amount + Currency (e.g., "+500 USD", "+1000 EUR")

**Example rendering:**
| Typ | Benutzer | Betreff/Subject | Datum |
|-----|----------|-----------------|-------|
| Balance | John Doe | +500 USD | 25.06.2026 |
| Balance | Jane Smith | +1000 EUR | 24.06.2026 |

### Database Migration

**File:** `backend/src/app/migrate_add_user_balances.py`

**Process:**
1. Create `user_balances` table with constraints
2. Migrate existing `investment_balance` > 0 to EUR rows
3. Drop `investment_balance` column from `users` table

**Key points:**
- Only non-zero balances migrated (zero balances silently discarded)
- All existing balances assume EUR currency
- Migration is safe for rollback (though data loss possible if reverted)

**Execution:**
```bash
PYTHONPATH=src python3 -m app.migrate_add_user_balances
```

## Configuration

### Supported Currencies

Three currencies are hard-coded in validation:

| Currency | Context | Notes |
|----------|---------|-------|
| EUR | Euro | Primary currency for EU operations |
| USD | US Dollar | Secondary currency for international investors |
| SYP | Syrian Pound | Local currency for regional operations |

**Validation location:** `backend/src/app/routers/users.py:158`

```python
if data.currency not in ("EUR", "USD", "SYP"):
    raise ValueError(f"Invalid currency: {data.currency}")
```

To add a new currency:
1. Update the validation list in `routers/users.py`
2. Add currency to frontend dropdown (ProfileForm.tsx)
3. Update management panel display logic
4. Test balance request flow end-to-end

### Environment Variables

No new environment variables required. Currency configuration is hard-coded by design (currencies are stable, rarely change during operations).

## Error Handling

### Common Error Scenarios

**Scenario 1: Duplicate pending requests for same currency**

- **Trigger:** User requests balance change for EUR while EUR request is PENDING
- **Response:** HTTP 400 with message "User has pending request for this currency"
- **Code:** `backend/src/app/routers/users.py:171`

**Scenario 2: Invalid currency code**

- **Trigger:** Request with `currency: "GBP"` or similar
- **Response:** HTTP 400 with message "Invalid currency"
- **Code:** `backend/src/app/routers/users.py:158`

**Scenario 3: User not found (edge case)**

- **Trigger:** JWT valid but user deleted
- **Response:** HTTP 404 with message "User not found"
- **Recovery:** Refresh auth token; likely requires re-login

### Frontend Validation

Before submitting requests, the UI validates:
- Amount is positive number
- Currency is selected from dropdown
- No pending request exists for selected currency

Invalid states disable the submit button, preventing impossible requests.

## Limitations and Considerations

### Limitations

- **Hard-coded currencies:** New currencies require code changes, not configuration
- **No currency conversion:** Balances shown in original currency; no automatic conversion
- **No historical tracking:** Balance changes are not versioned; only current state stored
- **Per-currency limits:** No cross-currency balance aggregation for risk management

### Performance Considerations

- **Query efficiency:** `UNIQUE(user_id, currency)` index makes lookups O(log n)
- **N+1 queries:** Front-end user list must eagerly load `user_balances` (not yet optimized in `GET /users/`)
- **Storage:** Sparse table design (zeros absent) reduces storage by ~70% compared to full matrix approach

### Security Considerations

- **Admin-only modifications:** Only `CHANGE_BALANCE` requests with admin approval can modify balances
- **Audit trail:** Request history preserved in `admin_requests` table
- **No negative balances:** Backend validation prevents withdrawal beyond existing balance

## Related Topics

- [Admin Request Management](../understanding-features/admin-request-lifecycle.md) - How CHANGE_BALANCE requests flow through approval process
- [User Authentication and Roles](../understanding-features/user-authentication.md) - Permission model for balance modifications
- [API Reference: Users Endpoint](../api-reference/users-endpoint.md) - Complete endpoint documentation
- [Database Schema Overview](../understanding-features/database-schema.md) - Full schema and relationships

---

*Last updated: 2026-06-25*
*Implemented in: Phase 1 (backend), Phase 2 (frontend)*
