# Modifying Currency Configuration

**Use this document when you want to add, remove, or modify the list of supported currencies for investment balances.**

> **⚠️ This is a breaking change operation** — modifying supported currencies affects:
> - User data validation and balance requests
> - Admin approval processes
> - Frontend UI and forms
> - Existing user balances
>
> Plan carefully and coordinate with stakeholders before implementing.

## Prerequisites

- Understanding of the [Multi-Currency Investment Balance Feature](./multi-currency-investment-balance.md)
- Ability to modify Python backend files and TypeScript frontend files
- Knowledge of how to run migrations in the development environment
- Access to database backup/rollback procedures

## Planning the Change

### Impact Analysis

Before modifying currencies, consider:

| Impact Area | Consideration |
|------------|---|
| **Backend Validation** | Currency codes must be updated in routers and schemas |
| **Database Queries** | Existing balances in removed currencies become orphaned (decide: migrate or delete) |
| **Frontend UI** | Currency dropdown must match backend supported list |
| **Admin Panel** | Balance display must handle all supported currencies |
| **Test Data** | Seed data uses current currencies (EUR, USD, SYP) |
| **Documentation** | All references to supported currencies must be updated |
| **Migration Path** | Decision needed: allow old currencies in DB or migrate existing balances |

### Common Scenarios

**Scenario 1: Add a new currency (e.g., GBP - British Pound)**

- ✓ Safe operation: new currency doesn't conflict with existing data
- Step-by-step: update validators, frontend, docs
- No data migration needed

**Scenario 2: Remove a currency (e.g., remove SYP)**

- ✗ Risky: users may have SYP balances
- Decision needed: migrate SYP → EUR? Delete? Keep in DB but disable new requests?
- Requires data audit and migration strategy

**Scenario 3: Replace currency (e.g., USD → EUR only)**

- ✗ High risk: breaking change
- Requires user notification and migration plan
- Consider temporary "sunset period" where both are supported

## Step-by-Step Implementation

### Step 1: Update Backend Validation

**Files to modify:**
- `backend/src/app/routers/users.py` — request validation
- `backend/src/app/schemas/user.py` — schema documentation (optional, hardcoded in router)

**What to do:**

1. Locate the currency validation in balance request endpoint:

```python
# backend/src/app/routers/users.py:158
if data.currency not in ("EUR", "USD", "SYP"):
    raise ValueError(f"Invalid currency: {data.currency}")
```

2. Update the tuple with new currencies:

```python
# Example: Add GBP, remove SYP
SUPPORTED_CURRENCIES = ("EUR", "USD", "GBP")

if data.currency not in SUPPORTED_CURRENCIES:
    raise ValueError(f"Invalid currency: {data.currency}. Supported: {', '.join(SUPPORTED_CURRENCIES)}")
```

3. Consider creating a constant file for reusability:

```python
# backend/src/app/core/constants.py
SUPPORTED_CURRENCIES = ("EUR", "USD", "GBP")

# backend/src/app/routers/users.py
from app.core.constants import SUPPORTED_CURRENCIES

if data.currency not in SUPPORTED_CURRENCIES:
    raise ValueError(...)
```

**Testing:**
```bash
# Test valid currency
curl -X POST http://localhost:8000/users/me/balance-request \
  -d '{"amount": 500, "currency": "GBP"}'
# Expected: 201 Created

# Test invalid currency
curl -X POST http://localhost:8000/users/me/balance-request \
  -d '{"amount": 500, "currency": "XXX"}'
# Expected: 400 Bad Request
```

### Step 2: Update Frontend Currency Dropdown

**Files to modify:**
- `frontend/src/components/profile/ProfileForm.tsx` — balance request form

**What to do:**

1. Locate the currency dropdown in the balance request form:

```typescript
// frontend/src/components/profile/ProfileForm.tsx
// Search for currency select/dropdown component
```

2. Update the currency options array:

```typescript
// OLD:
const currencies = ["EUR", "USD", "SYP"];

// NEW:
const currencies = ["EUR", "USD", "GBP"];
```

3. Or use a more maintainable approach with objects:

```typescript
const supportedCurrencies = [
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "US Dollar" },
  { code: "GBP", label: "British Pound" },
];

// In JSX:
{supportedCurrencies.map(c => (
  <option key={c.code} value={c.code}>{c.label}</option>
))}
```

**Testing:**

1. Open the profile page in the browser
2. Click "Request Balance Change" or similar button
3. Verify currency dropdown shows: EUR, USD, GBP (in your example)
4. Select each currency and verify form submits successfully
5. Verify an unsupported currency (SYP in this example) is NOT in the dropdown

### Step 3: Update Management Panel Display

**Files to modify:**
- `frontend/src/components/management/ManagementView.tsx` — balance request display

**What to do:**

1. The management panel doesn't have hardcoded currency list; it uses dynamic data from the API response
2. Verify that currency codes are rendered correctly in balance detail display:

```typescript
// backend/src/app/routers/users.py:224
if (r.type === "CHANGE_BALANCE") {
    const cur = p.currency || "EUR";  // Fallback if not provided
    detail = p.amount != null ? `+${Number(p.amount).toLocaleString()} ${cur}` : "—";
}
```

3. The fallback to "EUR" only applies if payload.currency is missing (edge case)
4. No code changes needed here; the panel automatically displays whatever currencies are in the request data

### Step 4: Update Documentation

**Files to modify:**
- `doc/multi-currency-investment-balance.md` — feature guide
- `doc/api-balance-request-endpoint.md` — API reference

**What to do:**

1. Update the "Supported Currencies" section in both docs:

```markdown
### Supported Currencies

| Currency | Context | Notes |
|----------|---------|-------|
| EUR | Euro | Primary currency for EU operations |
| USD | US Dollar | Secondary currency for international investors |
| GBP | British Pound | Tertiary currency for UK operations |
```

2. Update the validation code examples to reflect new currencies
3. Update any related references in endpoints documentation

### Step 5: Update Test Data and Seeds

**Files to modify:**
- `backend/src/app/testdata.py` — test data generation
- `backend/src/app/seed_demo.py` — demo data generation

**What to do:**

1. Search for hardcoded currency references in seed data:

```bash
grep -n "EUR\|USD\|SYP" backend/src/app/testdata.py
```

2. Update currency assignments to use new currencies:

```python
# Example: If demo users had SYP balances, update to new currency
# OLD:
demo_balance = UserBalance(user_id=user.id, currency="SYP", amount=5000)

# NEW:
demo_balance = UserBalance(user_id=user.id, currency="GBP", amount=5000)
```

3. Create a migration for existing test data (optional, if persistent):

```bash
# In dev environment, regenerate test data:
python -m app.testdata --reset
```

### Step 6: Handle Existing Balances (Data Migration)

**Critical step if removing/replacing currencies**

**What to do:**

1. **Audit existing data:**

```bash
# SSH into database or use psql:
SELECT currency, COUNT(*), SUM(amount) FROM user_balances GROUP BY currency;
```

2. **Create migration strategy:**

```python
# backend/src/app/migrate_update_currencies.py

def migrate():
    """
    Update supported currencies from EUR/USD/SYP to EUR/USD/GBP
    Strategy: Migrate SYP balances to EUR at 1:1 ratio (adjust as needed)
    """
    db = SessionLocal()
    try:
        # Convert SYP to EUR (example: 1 SYP = 0.0001 EUR, adjust ratio)
        db.execute(text("""
            UPDATE user_balances
            SET currency = 'EUR', amount = amount * 0.0001
            WHERE currency = 'SYP'
        """))

        db.commit()
        print("Migrated SYP balances to EUR")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()
```

3. **Run migration in development first, test thoroughly**

4. **For production:** coordinate with operations team, plan maintenance window

### Step 7: Testing the Changes

**Unit tests to create/modify:**

Create `backend/tests/test_currency_validation.py`:

```python
def test_valid_currencies():
    """Test that all supported currencies are accepted."""
    supported = ["EUR", "USD", "GBP"]
    for currency in supported:
        response = client.post(
            "/users/me/balance-request",
            json={"amount": 100, "currency": currency},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 201

def test_invalid_currency():
    """Test that unsupported currencies are rejected."""
    response = client.post(
        "/users/me/balance-request",
        json={"amount": 100, "currency": "XXX"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Invalid currency" in response.json()["detail"]

def test_unsupported_old_currency():
    """Test that removed currencies are no longer accepted."""
    response = client.post(
        "/users/me/balance-request",
        json={"amount": 100, "currency": "SYP"},  # If removing SYP
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
```

**Test cases to cover:**

- [ ] Happy path: submit request with each supported currency
- [ ] Error handling: reject unsupported currencies
- [ ] Frontend dropdown: shows only supported currencies
- [ ] Management panel: displays amounts correctly with new currencies
- [ ] Balance display: renders correctly for all currencies
- [ ] Pending request check: works for all currencies
- [ ] Admin approval: increments balance correctly for all currencies

**Integration test:**
```bash
# Full flow for each currency:
# 1. Submit balance request in GBP
# 2. Admin approves
# 3. Verify balance updated
# 4. Verify no pending request exists
# 5. Verify user sees balance in profile
```

## Validation and Testing

### Manual Testing Checklist

- [ ] Backend accepts all new currencies in balance requests
- [ ] Backend rejects old currencies (if removing)
- [ ] Frontend currency dropdown shows only supported currencies
- [ ] Frontend form submits successfully for each currency
- [ ] Admin panel displays balance changes correctly for all currencies
- [ ] User profile shows balances for all currencies
- [ ] Multi-currency: user can have pending requests for different currencies simultaneously
- [ ] No regression: existing EUR/USD functionality unchanged

### Automated Testing

```bash
# Run backend tests
cd backend
python -m pytest tests/test_currency_validation.py -v
python -m pytest tests/test_balance_request.py -v

# Run frontend tests (if exists)
cd ../frontend
npm test -- currency.test.tsx
```

## Documentation Updates Required

- [x] Feature guide: Update supported currencies list
- [x] API reference: Update validation documentation
- [x] This guide: Already addresses modifications

## Deployment Considerations

### Environment Variables

No new environment variables needed (currencies are code-level constants).

### Database Migrations

If removing currencies:

```bash
# 1. Run data migration first (move old currency balances)
PYTHONPATH=src python -m app.migrate_update_currencies

# 2. Verify migration succeeded:
SELECT currency, COUNT(*) FROM user_balances GROUP BY currency;

# 3. Deploy code with new currency validation
```

### Rollback Plan

If issues occur after deployment:

1. **Code rollback:** Revert backend and frontend code to previous version
2. **Database rollback:** If migration ran, may need to restore backup
3. **User communication:** If changes removed user currencies, notify affected users
4. **Verification:** After rollback, verify balances display correctly

**Timeline:**
- Coordinate with operations team
- Notify users if their currency is no longer supported
- Plan maintenance window if data migration needed
- Have rollback procedure ready

## Common Pitfalls and Solutions

### Pitfall 1: Frontend and backend currency lists out of sync

**Problem:** Backend accepts GBP but frontend dropdown only shows EUR/USD
**Solution:** Use a shared constant file or maintain both lists in version control
**Example:**
```python
# backend/src/app/core/constants.py
SUPPORTED_CURRENCIES = ("EUR", "USD", "GBP")
```
Then reference this in both backend validation and frontend types documentation.

### Pitfall 2: Forgot to update test data generation

**Problem:** Test suite fails because seed data tries to create balance for unsupported currency
**Solution:** Always search for all currency references before deploying
**Example:**
```bash
grep -rn "EUR\|USD\|SYP\|GBP" backend/src/app/ --include="*.py" | grep -v __pycache__
```

### Pitfall 3: Removing currency without migrating existing balances

**Problem:** Users have GBP balances but GBP is no longer supported; balances become inaccessible
**Solution:** Always plan data migration before removing currencies
**Example:** Create a migration script that converts GBP → EUR at appropriate exchange rate

### Pitfall 4: Not testing pending request logic after currency changes

**Problem:** User can submit multiple requests for new currency because pending check wasn't validated
**Solution:** Run integration tests specifically for pending request validation
**Example:**
```bash
# Test duplicate request prevention for NEW currency
curl -X POST /users/me/balance-request -d '{"amount": 100, "currency": "GBP"}'
curl -X POST /users/me/balance-request -d '{"amount": 200, "currency": "GBP"}'  # Should fail
```

## Examples

### Adding GBP (British Pound)

**Files to change:**

1. `backend/src/app/routers/users.py:158`
   ```python
   if data.currency not in ("EUR", "USD", "SYP", "GBP"):
   ```

2. `frontend/src/components/profile/ProfileForm.tsx`
   ```typescript
   const currencies = ["EUR", "USD", "SYP", "GBP"];
   ```

3. `doc/multi-currency-investment-balance.md`
   ```markdown
   | GBP | British Pound | New currency for UK market expansion |
   ```

4. Update seed data if needed

5. Run tests and deploy

## Related Topics

- [Multi-Currency Investment Balance Feature](./multi-currency-investment-balance.md) - Feature documentation
- [Balance Request Endpoint](./api-balance-request-endpoint.md) - API details
- [Database Schema Overview](./understanding-features/database-schema.md) - Schema documentation

---

*Last updated: 2026-06-25*
*Related implementation: backend/src/app/routers/users.py, frontend/src/components/profile/ProfileForm.tsx*
