/*
# Household billing entitlements and Stripe linkage

1. Purpose
- Make the household the single source of truth for Pro plan status.
- Link one Stripe customer to each household instead of tying entitlement to an individual user.

2. Modified tables
- `households`
  - Adds `plan_status`, using the existing `stripe_subscription_status` enum and defaulting to `not_started`.
- `stripe_customers`
  - Adds required `household_id` referencing `households(id)`.
  - Makes `user_id` optional because it remains only an audit trail for the checkout initiator.
  - Replaces the user uniqueness constraint with one customer per household.
- `stripe_subscriptions` and `stripe_orders`
  - Keep their existing structures, but their read policies now follow household membership through `stripe_customers`.

3. Security changes
- Stripe customer, subscription, and order reads are limited to authenticated active members of the associated household.
- Household-scoped views run with the caller's privileges and are granted only to authenticated users.

4. Views
- Removes the unused user-scoped Stripe views.
- Adds `stripe_household_subscriptions` and `stripe_household_orders` with household identifiers.

5. Data safety
- No existing customer rows require backfill; the Stripe customer table is currently empty.
- No application data tables are dropped or altered destructively.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'households' AND column_name = 'plan_status'
  ) THEN
    ALTER TABLE households
      ADD COLUMN plan_status stripe_subscription_status NOT NULL DEFAULT 'not_started';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stripe_customers' AND column_name = 'household_id'
  ) THEN
    ALTER TABLE stripe_customers
      ADD COLUMN household_id uuid REFERENCES households(id);
  END IF;
END $$;

ALTER TABLE stripe_customers
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE stripe_customers
  DROP CONSTRAINT IF EXISTS stripe_customers_user_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stripe_customers_household_id_key'
      AND conrelid = 'public.stripe_customers'::regclass
  ) THEN
    ALTER TABLE stripe_customers
      ADD CONSTRAINT stripe_customers_household_id_key UNIQUE (household_id);
  END IF;
END $$;

ALTER TABLE stripe_customers
  ALTER COLUMN household_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
DROP POLICY IF EXISTS "Household members can view their customer data" ON stripe_customers;
CREATE POLICY "Household members can view their customer data"
  ON stripe_customers FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
DROP POLICY IF EXISTS "Household members can view their subscription data" ON stripe_subscriptions;
CREATE POLICY "Household members can view their subscription data"
  ON stripe_subscriptions FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers
      WHERE is_household_member(auth.uid(), household_id) AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;
DROP POLICY IF EXISTS "Household members can view their order data" ON stripe_orders;
CREATE POLICY "Household members can view their order data"
  ON stripe_orders FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers
      WHERE is_household_member(auth.uid(), household_id) AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

DROP VIEW IF EXISTS stripe_user_subscriptions;
DROP VIEW IF EXISTS stripe_user_orders;

CREATE VIEW stripe_household_subscriptions WITH (security_invoker = true) AS
SELECT
  c.household_id,
  c.customer_id,
  s.subscription_id,
  s.status AS subscription_status,
  s.price_id,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.payment_method_brand,
  s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE is_household_member(auth.uid(), c.household_id)
  AND c.deleted_at IS NULL
  AND s.deleted_at IS NULL;

GRANT SELECT ON stripe_household_subscriptions TO authenticated;

CREATE VIEW stripe_household_orders WITH (security_invoker = true) AS
SELECT
  c.household_id,
  c.customer_id,
  o.id AS order_id,
  o.checkout_session_id,
  o.payment_intent_id,
  o.amount_subtotal,
  o.amount_total,
  o.currency,
  o.payment_status,
  o.status AS order_status,
  o.created_at AS order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE is_household_member(auth.uid(), c.household_id)
  AND c.deleted_at IS NULL
  AND o.deleted_at IS NULL;

GRANT SELECT ON stripe_household_orders TO authenticated;