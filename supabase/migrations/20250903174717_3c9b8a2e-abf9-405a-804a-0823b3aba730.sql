-- Criar tabela de nichos
CREATE TABLE public.nichos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS na tabela nichos
ALTER TABLE public.nichos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para nichos
CREATE POLICY "Usuários podem ver seus próprios nichos" 
ON public.nichos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios nichos" 
ON public.nichos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios nichos" 
ON public.nichos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios nichos" 
ON public.nichos FOR DELETE 
USING (auth.uid() = user_id);

-- Criar tipo enum para fontes de dados
CREATE TYPE public.fonte_dados AS ENUM ('CASA_DOS_DADOS', 'LINKEDIN');

-- Criar tabela de contatos/leads
CREATE TABLE public.contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  cargo TEXT,
  email TEXT,
  empresa TEXT,
  whatsapp TEXT,
  cidade TEXT,
  fonte public.fonte_dados NOT NULL,
  nicho_id UUID REFERENCES public.nichos(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  texto_original TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS na tabela contatos
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contatos
CREATE POLICY "Usuários podem ver seus próprios contatos" 
ON public.contatos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios contatos" 
ON public.contatos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios contatos" 
ON public.contatos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios contatos" 
ON public.contatos FOR DELETE 
USING (auth.uid() = user_id);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_contatos_updated_at
  BEFORE UPDATE ON public.contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX idx_contatos_user_id ON public.contatos(user_id);
CREATE INDEX idx_contatos_nicho_id ON public.contatos(nicho_id);
CREATE INDEX idx_contatos_fonte ON public.contatos(fonte);
CREATE INDEX idx_nichos_user_id ON public.nichos(user_id);