-- Extend profiles table to support customer accounts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'unconfirmed'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Update existing rows to have status set
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;
UPDATE public.profiles SET updated_at = created_at WHERE updated_at IS NULL;

-- Drop and recreate the role check to include 'customer'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','editor','viewer','customer'));

-- Add user_id to orders if not exists (for linking orders to customer accounts)
ALTER TABLE commerce.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON commerce.orders (user_id);
