import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SpotterLead {
  name: string;
  industry: string;
  source: string;
  subSource: string;
  ddiPhone: string;
  phone: string;
  city: string;
  description: string;
}

interface SpotterRequest {
  duplicityValidation: boolean;
  lead: SpotterLead;
}

interface Contato {
  id: string;
  nome: string | null;
  cargo: string | null;
  email: string | null;
  empresa: string | null;
  whatsapp: string | null;
  cidade: string | null;
  fonte: 'CASA_DOS_DADOS' | 'LINKEDIN';
  created_at: string;
  origem?: string | null;
  enviado_spotter?: boolean;
  nichos?: {
    nome: string;
  } | null;
}

const SPOTTER_API_URL = 'https://api.exactspotter.com/v3/LeadsAdd';
const SPOTTER_TOKEN = '803be888-0393-46e3-b907-4309bb86de26';

export const useSpotterApi = () => {
  const [loadingContacts, setLoadingContacts] = useState<Set<string>>(new Set());

  const formatPhoneNumber = (whatsapp: string | null): { ddiPhone: string; phone: string } => {
    if (!whatsapp) {
      return { ddiPhone: '55', phone: '' };
    }

    // Remove todos os caracteres não numéricos
    const cleanPhone = whatsapp.replace(/\D/g, '');
    
    // Se começar com 55, remove o código do país
    const phoneWithoutCountry = cleanPhone.startsWith('55') ? cleanPhone.substring(2) : cleanPhone;
    
    return {
      ddiPhone: '55',
      phone: phoneWithoutCountry
    };
  };

  const mapContatoToSpotterLead = (contato: Contato): SpotterLead => {
    const { ddiPhone, phone } = formatPhoneNumber(contato.whatsapp);
    
    // Monta a descrição com informações adicionais
    const descriptionParts = [];
    
    if (contato.cargo) {
      descriptionParts.push(`Cargo: ${contato.cargo}`);
    }
    
    if (contato.empresa) {
      descriptionParts.push(`Empresa: ${contato.empresa}`);
    }
    
    if (contato.email) {
      descriptionParts.push(`Email: ${contato.email}`);
    }
    
    if (contato.created_at) {
      const dataFormatada = new Date(contato.created_at).toLocaleDateString('pt-BR');
      descriptionParts.push(`Data de importação: ${dataFormatada}`);
    }

    return {
      name: contato.nome || 'Nome não informado',
      industry: contato.nichos?.nome || '',
      source: contato.origem || (contato.fonte === 'CASA_DOS_DADOS' ? 'Casa dos Dados' : 'LinkedIn'),
      subSource: contato.fonte === 'CASA_DOS_DADOS' ? 'Casa dos Dados' : 'LinkedIn',
      ddiPhone,
      phone,
      city: contato.cidade || '',
      description: descriptionParts.join(' | ')
    };
  };

  const sendToSpotter = async (contato: Contato): Promise<boolean> => {
    const contactId = contato.id;
    
    // Evita múltiplos cliques no mesmo contato
    if (loadingContacts.has(contactId)) {
      return false;
    }

    setLoadingContacts(prev => new Set(prev).add(contactId));

    try {
      const spotterLead = mapContatoToSpotterLead(contato);
      
      const requestBody: SpotterRequest = {
        duplicityValidation: true,
        lead: spotterLead
      };

      const response = await fetch(SPOTTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token_exact': SPOTTER_TOKEN
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      
      // Marcar o contato como enviado no banco de dados
      await supabase
        .from('contatos')
        .update({ enviado_spotter: true })
        .eq('id', contactId);
      
      toast.success('Contato enviado para o Spotter com sucesso!');
      return true;
      
    } catch (error) {
      console.error('Erro ao enviar contato para o Spotter:', error);
      toast.error('Erro ao enviar contato. Tente novamente.');
      return false;
      
    } finally {
      setLoadingContacts(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
    }
  };

  const isLoading = (contactId: string): boolean => {
    return loadingContacts.has(contactId);
  };

  return {
    sendToSpotter,
    isLoading
  };
};