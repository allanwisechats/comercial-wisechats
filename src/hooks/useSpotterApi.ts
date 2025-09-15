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

interface SpotterContact {
  email: string;
  name: string;
  leadId: number;
  jobTitle: string;
  ddiPhone1: string;
  phone1: string;
  mainContact: boolean;
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
const SPOTTER_CONTACTS_API_URL = 'https://api.exactspotter.com/v3/personsAdd';
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

  const mapContatoToSpotterContact = (contato: Contato, leadId: number): SpotterContact => {
    const { ddiPhone, phone } = formatPhoneNumber(contato.whatsapp);
    
    return {
      email: contato.email || '',
      name: contato.nome || 'Nome não informado',
      leadId,
      jobTitle: contato.cargo || '',
      ddiPhone1: ddiPhone,
      phone1: phone,
      mainContact: true
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
      // Primeira chamada: Criar o lead
      const spotterLead = mapContatoToSpotterLead(contato);
      
      const leadRequestBody: SpotterRequest = {
        duplicityValidation: true,
        lead: spotterLead
      };

      const leadResponse = await fetch(SPOTTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token_exact': SPOTTER_TOKEN
        },
        body: JSON.stringify(leadRequestBody)
      });

      if (!leadResponse.ok) {
        throw new Error(`Erro ao criar lead: ${leadResponse.status} - ${leadResponse.statusText}`);
      }

      const leadResult = await leadResponse.json();
      console.log('Resposta da API de Lead:', leadResult);
      
      // Verificar diferentes possíveis propriedades de ID
      const leadId = leadResult.id || leadResult.leadId || leadResult.data?.id || leadResult.data?.leadId;

      if (!leadId) {
        console.error('Estrutura da resposta da API:', leadResult);
        throw new Error(`Lead criado, mas ID não foi encontrado. Resposta recebida: ${JSON.stringify(leadResult)}`);
      }

      console.log('Lead ID encontrado:', leadId);

      // Segunda chamada: Criar o contato usando o leadId
      const spotterContact = mapContatoToSpotterContact(contato, leadId);

      const contactResponse = await fetch(SPOTTER_CONTACTS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token_exact': SPOTTER_TOKEN
        },
        body: JSON.stringify(spotterContact)
      });

      if (!contactResponse.ok) {
        // Lead foi criado, mas contato falhou
        toast.error('Lead criado, mas houve um erro ao criar o contato. Por favor, crie-o manualmente no Spotter.');
        
        // Mesmo assim marcamos como enviado pois o lead foi criado
        await supabase
          .from('contatos')
          .update({ enviado_spotter: true })
          .eq('id', contactId);
        
        return true;
      }

      // Ambas as chamadas foram bem-sucedidas
      await supabase
        .from('contatos')
        .update({ enviado_spotter: true })
        .eq('id', contactId);
      
      toast.success('Lead e Contato enviados para o Spotter com sucesso!');
      return true;
      
    } catch (error) {
      console.error('Erro ao enviar para o Spotter:', error);
      toast.error('Erro ao enviar o lead para o Spotter.');
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