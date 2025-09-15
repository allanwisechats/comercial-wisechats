-- Ensure a single token per user for user_api_tokens
ALTER TABLE public.user_api_tokens
  ADD CONSTRAINT user_api_tokens_user_id_key UNIQUE (user_id);

-- Add trigger to keep updated_at fresh on updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_api_tokens_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_api_tokens_updated_at
    BEFORE UPDATE ON public.user_api_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;