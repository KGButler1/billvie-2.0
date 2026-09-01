ALTER TABLE financial_income ADD COLUMN frequency text NULL;

ALTER TABLE financial_debts
  ADD COLUMN linked_bill_id uuid NULL REFERENCES bills(id) ON DELETE SET NULL;