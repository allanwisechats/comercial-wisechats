-- Add unique constraints for email and whatsapp to prevent duplicates
-- Using partial unique indexes to handle NULL values properly

CREATE UNIQUE INDEX idx_contatos_email_unique 
ON public.contatos (email) 
WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX idx_contatos_whatsapp_unique 
ON public.contatos (whatsapp) 
WHERE whatsapp IS NOT NULL AND whatsapp != '';