-- Track Stripe customer and subscription IDs directly on households
alter table households
  add column stripe_customer_id text,
  add column stripe_subscription_id text;

-- Drop unused scaffolded tables, views, and policies (confirmed zero rows, zero code references)
drop table if exists stripe_customers cascade;
drop table if exists stripe_subscriptions cascade;
drop table if exists stripe_orders cascade;