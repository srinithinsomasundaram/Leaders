-- Add username_last_updated_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_last_updated_at TIMESTAMPTZ;

-- Trigger function to check username update cooldown (once a month / 30 days)
CREATE OR REPLACE FUNCTION public.check_username_update_cooldown()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF OLD.username_last_updated_at IS NOT NULL AND OLD.username_last_updated_at > now() - INTERVAL '30 days' THEN
      RAISE EXCEPTION 'You can only change your username once a month. Last changed at %', OLD.username_last_updated_at;
    END IF;
    NEW.username_last_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_username_cooldown_trigger ON public.profiles;
CREATE TRIGGER check_username_cooldown_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_username_update_cooldown();
