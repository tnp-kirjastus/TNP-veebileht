ALTER TABLE commerce.orders
ADD COLUMN invoice_requested BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN company_name TEXT,
ADD COLUMN company_reg_code TEXT,
ADD COLUMN coupon_code TEXT,
ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN vat_amount DECIMAL(10,2),
ADD COLUMN vat_percent INTEGER DEFAULT 9;

COMMENT ON COLUMN commerce.orders.vat_percent IS 'Käibemaksu protsent (Eestis raamatutele 9%)';
