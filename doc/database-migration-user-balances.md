# Database Migration: User Balances

**Use this document when you want to understand the migration from single `investment_balance` column to multi-currency `user_balances` table.**

## Migration Overview

This migration updates the database schema to support multi-currency investment balances by:

1. Creating a new `user_balances` table with per-currency balance tracking
2. Migrating existing non-zero `investment_balance` values to EUR rows
3. Removing the legacy `investment_balance` column from `users` table

**Migration file:** `backend/src/app/migrate_add_user_balances.py`

**Database changes:** Single column (users.investment_balance: decimal) → Relationship table (user_balances: one-to-many)

## Prerequisites

- PostgreSQL 12+ (pgvector not required for this migration)
- Database backup created before running migration
- Development environment with database access
- Understanding of the [Multi-Currency Investment Balance Feature](./multi-currency-investment-balance.md)

## Migration Process

### Step 1: Backup Database (Required)

Before running the migration, create a backup:

```bash
# Local development environment
pg_dump -U postgres -h localhost -d syria_projects > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use Docker (if using docker-compose):
docker-compose exec postgres pg_dump -U postgres -d syria_projects > backup.sql
```

### Step 2: Run Migration

Execute the migration script:

```bash
# Navigate to backend directory
cd backend

# Set Python path
export PYTHONPATH=src

# Run migration
python3 -m app.migrate_add_user_balances
```

**Expected output:**
```
Migration successful: user_balances table created, investment_balance removed.
```

### Step 3: Verify Migration

Check that the migration was applied correctly:

```bash
# Connect to database
psql -U postgres -h localhost -d syria_projects

# List tables
\dt

# Check user_balances structure
\d user_balances

# Check investment_balance removed from users
\d users

# Sample query: verify data migration
SELECT user_id, currency, amount FROM user_balances ORDER BY user_id LIMIT 10;

# Verify counts match
SELECT COUNT(*) as users_with_balance FROM users;
SELECT COUNT(DISTINCT user_id) as users_with_balance_record FROM user_balances;
```

**Expected state after migration:**

```
user_balances columns:
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER, FK to users)
- currency (VARCHAR(10))
- amount (NUMERIC(14,2))
- UNIQUE(user_id, currency)

users table:
- investment_balance column REMOVED
- All other columns unchanged
```

## Migration Logic

### What Gets Migrated

**Rule:** Only `investment_balance > 0` values are migrated.

**Assumption:** All existing balances are in EUR currency.

**Migration SQL:**
```sql
INSERT INTO user_balances (user_id, currency, amount)
SELECT id, 'EUR', investment_balance
FROM users
WHERE investment_balance > 0
ON CONFLICT (user_id, currency) DO NOTHING
```

### What Doesn't Get Migrated

- Users with `investment_balance = 0` (default) → no row created
- Users with NULL `investment_balance` → no row created
- These users implicitly have zero balance in all currencies

**Example:**

| User ID | investment_balance (OLD) | Result (NEW) |
|---------|--------------------------|------|
| 1 | 1000.00 | user_balances: (user_id=1, currency=EUR, amount=1000.00) |
| 2 | 0 (default) | No row in user_balances (absence = 0) |
| 3 | NULL | No row in user_balances (absence = 0) |
| 4 | 500.50 | user_balances: (user_id=4, currency=EUR, amount=500.50) |

### Why This Design

| Design Choice | Rationale |
|---------------|-----------|
| **No row = 0** | Storage efficient; majority of users have 0 balance |
| **EUR assumption** | All existing balances were in EUR; adds currency attribute |
| **`ON CONFLICT DO NOTHING`** | Safe idempotency; running twice doesn't duplicate rows |
| **Drop column after** | Clean up legacy schema; prevents accidental dual writes |

## Data Integrity

### Before Migration Checks

Before running, verify:

```bash
# Check for unexpected NULLs
SELECT COUNT(*) FROM users WHERE investment_balance IS NULL;
# Expected: 0 or documented exceptional users

# Check for negative balances (should never happen)
SELECT COUNT(*) FROM users WHERE investment_balance < 0;
# Expected: 0

# Verify all users have unique IDs (FK constraint prerequisite)
SELECT COUNT(*) FROM (
    SELECT id, COUNT(*) FROM users GROUP BY id HAVING COUNT(*) > 1
);
# Expected: 0
```

### After Migration Checks

After running, verify:

```bash
# 1. All non-zero balances migrated
SELECT COUNT(*) as migrated_count FROM user_balances;

# 2. EUR is assigned to all migrated balances
SELECT DISTINCT currency FROM user_balances;
# Expected: EUR (initially; other currencies added through requests)

# 3. No duplicate user-currency combinations
SELECT user_id, currency, COUNT(*)
FROM user_balances
GROUP BY user_id, currency
HAVING COUNT(*) > 1;
# Expected: Empty result set

# 4. Verify UNIQUE constraint exists
\d user_balances
# Expected: UNIQUE constraint listed

# 5. Sample verification: check a few migrated rows
SELECT u.id, u.email, ub.currency, ub.amount
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.id IN (1, 2, 3, 4, 5)
ORDER BY u.id;
```

## Rollback Plan

If issues occur, rollback to previous state:

```bash
# 1. Restore from backup
psql -U postgres -h localhost -d syria_projects < backup_20260625_143000.sql

# 2. OR manual rollback (if backup not available):

# Recreate investment_balance column
ALTER TABLE users ADD COLUMN investment_balance NUMERIC(14,2) DEFAULT 0;

# Restore values from user_balances
UPDATE users u
SET investment_balance = (
    SELECT amount FROM user_balances ub
    WHERE ub.user_id = u.id AND ub.currency = 'EUR'
)
WHERE EXISTS (
    SELECT 1 FROM user_balances ub
    WHERE ub.user_id = u.id AND ub.currency = 'EUR'
);

# Drop user_balances table
DROP TABLE IF EXISTS user_balances;
```

## Verification After Deployment

### API-Level Verification

After deploying code that uses new schema:

```bash
# 1. User endpoint returns new format
curl -X GET http://localhost:8000/users/me \
  -H "Authorization: Bearer TOKEN"

# Expected response includes:
{
  ...
  "investment_balances": [
    {"currency": "EUR", "amount": 1500.00}
  ]
}

# 2. Can submit balance request for new currency
curl -X POST http://localhost:8000/users/me/balance-request \
  -H "Authorization: Bearer TOKEN" \
  -d '{"amount": 500, "currency": "USD"}'

# Expected: 201 Created

# 3. Admin approval updates balance correctly
curl -X PATCH http://localhost:8000/admin/requests/ID/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Verify balance updated:
curl -X GET http://localhost:8000/users/me \
  -H "Authorization: Bearer TOKEN"

# Expected: investment_balances includes USD balance
```

### Frontend Verification

- [x] Profile page displays all currencies correctly
- [x] Balance request form allows selecting new currencies
- [x] Currency dropdown shows EUR, USD, SYP options
- [x] Balance changes reflected in management panel
- [x] No console errors related to undefined investment_balance

## Performance Considerations

### Index Performance

The migration creates a UNIQUE constraint on (user_id, currency), which automatically creates an index:

```sql
-- Verify index exists
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'user_balances' AND indexname LIKE '%unique%';

-- Expected: uq_user_currency index on (user_id, currency)
```

**Impact:**
- **Query performance:** Lookups by (user_id, currency) are O(log n) — excellent
- **Insert performance:** Constraint check requires index lookup — acceptable trade-off
- **Storage:** Index adds ~10-15% overhead (negligible)

### Query Optimization

Recommended queries:

```python
# ✓ Good: Use indexed columns
user_balances = db.query(UserBalance).filter(
    UserBalance.user_id == user_id,
    UserBalance.currency == "EUR"
).first()  # O(log n)

# ✓ Good: Get all balances for user
balances = db.query(UserBalance).filter(
    UserBalance.user_id == user_id
).all()  # O(log n) per currency

# ✗ Avoid: Full table scan on amount
expensive = db.query(UserBalance).filter(
    UserBalance.amount > 1000
).all()  # O(n) - consider adding index if needed
```

### N+1 Query Issue

Current implementation has N+1 issue in user list endpoint:

```python
# ✗ Current (in routers/users.py:81):
users = db.query(User).all()  # N queries to fetch each user's balances

# ✓ TODO: Optimize with eager loading
users = db.query(User).options(
    joinedload(User.balances)
).all()  # 1 query with JOIN
```

## Common Issues and Solutions

### Issue 1: Migration Fails with "Column already exists"

**Cause:** Migration was partially run before

**Solution:**
```bash
# Check if table exists
\dt user_balances

# If exists, drop it and retry:
DROP TABLE IF EXISTS user_balances CASCADE;

# Then run migration again
python3 -m app.migrate_add_user_balances
```

### Issue 2: Foreign Key Constraint Violation

**Cause:** Investment_balance references deleted user

**Solution:**
```bash
# Identify orphaned balances
SELECT * FROM users WHERE id NOT IN (
    SELECT DISTINCT requester_id FROM admin_requests
);

# Delete orphaned user first, or handle in migration
```

### Issue 3: Data Loss on Rollback

**Problem:** Ran migration, then rollback deleted new USD/SYP balances

**Prevention:**
- Always backup before migration
- Plan rollback procedures
- Test in staging first
- Communicate maintenance window to users

### Issue 4: NUMERIC Precision Issues

**Problem:** 1000.10 becomes 1000.1 (loses trailing zero)

**Cause:** NUMERIC(14,2) is correct, but JSON serialization may drop trailing zero

**Solution:** Always format currency in frontend with locale settings
```typescript
formatMoney(amount, currency)  // Handles 1000.10 → "1.000,10 €"
```

## Testing the Migration

### Unit Test Example

```python
# backend/tests/test_migration_user_balances.py

def test_migration_creates_table():
    """Verify user_balances table created."""
    db = SessionLocal()
    inspector = inspect(db.engine)
    assert "user_balances" in inspector.get_table_names()

def test_non_zero_balances_migrated():
    """Verify non-zero balances migrated to EUR."""
    # Create test user with investment_balance
    user = User(id=999, email="test@example.com", investment_balance=1000)
    db.add(user)
    db.commit()

    # Run migration
    migrate()

    # Verify migration
    balance = db.query(UserBalance).filter(
        UserBalance.user_id == 999,
        UserBalance.currency == "EUR"
    ).first()
    
    assert balance is not None
    assert float(balance.amount) == 1000.00

def test_zero_balances_not_migrated():
    """Verify zero balances don't create rows."""
    # Create test user with zero balance
    user = User(id=998, email="test2@example.com", investment_balance=0)
    db.add(user)
    db.commit()

    # Run migration
    migrate()

    # Verify no row created
    balance = db.query(UserBalance).filter(
        UserBalance.user_id == 998
    ).first()
    
    assert balance is None
```

### Integration Test Example

```python
# Test entire flow after migration
def test_post_migration_balance_request():
    """Test balance requests work after migration."""
    # User has EUR 1000 from migration
    
    # Submit request for USD 500
    response = client.post(
        "/users/me/balance-request",
        json={"amount": 500, "currency": "USD"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    
    # Admin approves
    request_id = response.json()["id"]
    response = client.patch(
        f"/admin/requests/{request_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    
    # Verify balances
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    balances = response.json()["investment_balances"]
    
    assert len(balances) == 2
    assert {"currency": "EUR", "amount": 1000.00} in balances
    assert {"currency": "USD", "amount": 500.00} in balances
```

## Deployment Checklist

- [ ] Backup database created and verified
- [ ] Migration tested in development environment
- [ ] All automated tests passing post-migration
- [ ] API endpoints return new schema format
- [ ] Frontend handles new investment_balances array
- [ ] No console errors in browser dev tools
- [ ] Management panel displays balances correctly
- [ ] Rollback procedure documented and tested
- [ ] Team notified of maintenance window (if needed)
- [ ] Monitoring alerts set for migration issues

## Related Topics

- [Multi-Currency Investment Balance Feature](./multi-currency-investment-balance.md) - Feature overview
- [Modifying Currency Configuration](./modifying-currency-configuration.md) - Adding/removing currencies
- [Database Schema Overview](./understanding-features/database-schema.md) - Complete schema documentation

---

*Last updated: 2026-06-25*
*Migration file: backend/src/app/migrate_add_user_balances.py*
