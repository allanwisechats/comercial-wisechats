-- Adicionar coluna para controlar se o contato foi enviado para o Spotter
ALTER TABLE public.contatos 
ADD COLUMN enviado_spotter BOOLEAN NOT NULL DEFAULT FALSE;