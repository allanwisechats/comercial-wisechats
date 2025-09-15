import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { spotterEndpoints, buildLeadFilterUrl } from '@/lib/spotter';

interface Contato {
  id: string;
  nome: string | null;
  cargo: string | null;
  email: string | null;
  empresa: string | null;
  whatsapp: string | null;
  cidade: string | null;
}

interface SpotterResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const useSpotterApi = () => {
  const { user } = useAuth();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const getUserApiToken = async (): Promise<string | null> => {
    if (!user) return null;

    try {
      console.log('Buscando token da API para usuário:', user.id);
      
      const { data, error } = await supabase
        .from('user_api_tokens')
        .select('spotter_token')
        .eq('user_id', user.id)
        .single();

      console.log('Resultado da busca do token:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Nenhum token encontrado para o usuário');
          toast.error('Token da API Spotter não configurado. Acesse seu perfil para configurá-lo.');
          return null;
        }
        throw error;
      }

      if (!data?.spotter_token) {
        console.log('Token existe mas está vazio');
        toast.error('Token da API Spotter não configurado. Acesse seu perfil para configurá-lo.');
        return null;
      }

      console.log('Token encontrado:', data.spotter_token.substring(0, 10) + '...');
      return data.spotter_token;
    } catch (error) {
      console.error('Erro ao buscar token da API:', error);
      toast.error('Erro ao buscar configuração da API');
      return null;
    }
  };

  const setLoading = useCallback((contactId: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [contactId]: loading
    }));
  }, []);

  const isLoading = useCallback((contactId: string) => {
    return loadingStates[contactId] || false;
  }, [loadingStates]);

  const sendToSpotter = useCallback(async (contato: Contato): Promise<boolean> => {
    const apiToken = await getUserApiToken();
    if (!apiToken) return false;

    setLoading(contato.id, true);
    
    try {
      // Prepare lead data according to ExactSpotter API documentation
      const leadData = {
        duplicityValidation: false, // Campo no nível superior
        lead: {
          name: contato.empresa || contato.nome || 'Lead sem nome', // Campo obrigatório
          phone: contato.whatsapp?.replace(/\s+/g, '') || '', // Remove espaços do telefone
          website: '', // Pode ser preenchido se disponível
          description: `Contato importado: ${contato.nome || ''} - ${contato.cargo || ''}`.trim(),
          source: 'Importação Manual' // Origem do lead
        }
      };

      console.log('Enviando dados para o Spotter:', leadData);

      // Create lead using correct endpoint
      const createResponse = await fetch(spotterEndpoints.leadsAdd, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token_exact': apiToken,
          'Accept': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      console.log('Response status:', createResponse.status);
      console.log('Response headers:', createResponse.headers);

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Erro na criação do lead:', createResponse.status, errorText);
        
        // Try to parse error response as JSON if possible
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            throw new Error(`API Error: ${errorData.error.message}`);
          }
        } catch {
          // If not valid JSON, use the text as is
        }
        
        throw new Error(`Erro HTTP ${createResponse.status}: ${errorText}`);
      }

      const createResult = await createResponse.json();
      console.log('Lead criado com sucesso:', createResult);

      // 2) Capturar o ID do lead diretamente da resposta da criação
      const leadId = createResult.value;
      if (!leadId) {
        throw new Error('Lead criado, mas ID não retornado na resposta.');
      }
      console.log('ID do lead capturado:', leadId);

      // 3) Criar o contato (personsAdd) usando o ID do lead
      const personPayload = {
        leadId,
        Name: contato.nome || leadData.lead.name,
        "E-mail": contato.email || '',
        phone1: contato.whatsapp?.replace(/\s+/g, '') || '',
        jobTitle: contato.cargo || '',
        mainContact: true,
      };
      console.log('Criando contato no Spotter:', personPayload);
      const personRes = await fetch(spotterEndpoints.personsAdd, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token_exact': apiToken,
          'Accept': 'application/json',
        },
        body: JSON.stringify(personPayload),
      });
      if (!personRes.ok) {
        const errorText = await personRes.text();
        throw new Error(`Erro ao criar contato: HTTP ${personRes.status}: ${errorText}`);
      }
      const personResult = await personRes.json();
      console.log('Contato criado com sucesso:', personResult);

      // Update the contact in Supabase to mark as sent
      if (user) {
        const { error: updateError } = await supabase
          .from('contatos')
          .update({ enviado_spotter: true })
          .eq('id', contato.id)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Erro ao atualizar contato no Supabase:', updateError);
        }
      }

      toast.success(`Lead e contato de "${contato.empresa || contato.nome}" enviados ao Spotter com sucesso!`);
      return true;

    } catch (error) {
      console.error('Erro ao enviar para o Spotter:', error);
      toast.error(`Erro ao enviar lead: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return false;
    } finally {
      setLoading(contato.id, false);
    }
  }, [user, setLoading, getUserApiToken]);

  const findLeads = useCallback(async (leadName: string) => {
    const apiToken = await getUserApiToken();
    if (!apiToken) {
      return { success: false, message: 'Token não configurado', data: null } as SpotterResponse;
    }

    const url = buildLeadFilterUrl(leadName);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token_exact': apiToken,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      return { success: true, data } as SpotterResponse;
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
      toast.error(`Erro ao buscar leads: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      return { success: false, message: 'Erro na busca', data: null } as SpotterResponse;
    }
  }, [getUserApiToken]);

  return {
    sendToSpotter,
    findLeads,
    isLoading,
    getUserApiToken
  };
};