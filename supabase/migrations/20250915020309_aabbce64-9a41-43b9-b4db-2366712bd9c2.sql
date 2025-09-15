-- Add tag_importacao column to contatos table
ALTER TABLE public.contatos 
ADD COLUMN tag_importacao text;