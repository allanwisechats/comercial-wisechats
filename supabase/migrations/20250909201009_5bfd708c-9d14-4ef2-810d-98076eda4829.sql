-- Add unique constraints for email and whatsapp to prevent duplicates
-- First, let's handle any existing duplicates by keeping only the most recent ones

-- Create unique constraints on email and whatsapp (when not null)
CREATE UNIQUE INDEX CONCURRENTLY idx_contatos_email_unique 
ON public.contatos (email) 
WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX CONCURRENTLY idx_contatos_whatsapp_unique 
ON public.contatos (whatsapp) 
WHERE whatsapp IS NOT NULL AND whatsapp != '';