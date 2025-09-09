-- Remove duplicate emails, keeping only the most recent ones
DELETE FROM public.contatos 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY LOWER(email) 
                   ORDER BY created_at DESC
               ) AS rn
        FROM public.contatos 
        WHERE email IS NOT NULL AND email != ''
    ) t WHERE t.rn > 1
);

-- Remove duplicate whatsapp numbers, keeping only the most recent ones  
DELETE FROM public.contatos 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY whatsapp 
                   ORDER BY created_at DESC
               ) AS rn
        FROM public.contatos 
        WHERE whatsapp IS NOT NULL AND whatsapp != ''
    ) t WHERE t.rn > 1
);

-- Now create unique indexes
CREATE UNIQUE INDEX idx_contatos_email_unique 
ON public.contatos (LOWER(email)) 
WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX idx_contatos_whatsapp_unique 
ON public.contatos (whatsapp) 
WHERE whatsapp IS NOT NULL AND whatsapp != '';