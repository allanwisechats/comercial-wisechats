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
      const { data, error } = await supabase
        .from('user_api_tokens')
        .select('spotter_token')
        .eq('user_id', user.id)
        .single();

      if (error || !data?.spotter_token) {
        toast.error('Token da API Spotter não configurado. Acesse seu perfil para configurá-lo.');
        return null;
      }

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
      // First, create the lead
      const leadData = {
        lead: contato.empresa || contato.nome || 'Lead sem nome',
        email: contato.email || '',
        whatsapp: contato.whatsapp || '',
        nome: contato.nome || '',
        cargo: contato.cargo || '',
        empresa: contato.empresa || ''
      };

      console.log('Enviando dados para o Spotter:', leadData);

      const createResponse = await fetch(spotterEndpoints.leads, {
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

      // Then, search for the created lead to get its ID
      const nomeDoLead = contato.empresa || contato.nome || 'Lead sem nome';
      const searchUrl = buildLeadFilterUrl(nomeDoLead);
      
      console.log('Buscando lead criado:', searchUrl);

      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token_exact': apiToken,
          'Accept': 'application/json',
        },
      });

      console.log('Search response status:', searchResponse.status);

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Erro na busca do lead:', searchResponse.status, errorText);
        throw new Error(`Erro na busca do lead: ${searchResponse.status} - ${errorText}`);
      }

      const searchResult = await searchResponse.json();
      console.log('Resultado da busca:', searchResult);

      if (!searchResult.value || searchResult.value.length === 0) {
        throw new Error('Lead não encontrado após criação');
      }

      // Get the most recent lead (assuming it's the one we just created)
      const leadEncontrado = searchResult.value[0];
      const leadId = leadEncontrado.id;

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

      toast.success(`Lead "${contato.empresa || contato.nome}" enviado para o Spotter com sucesso!`);
      return true;

    } catch (error) {
      console.error('Erro ao enviar para o Spotter:', error);
      toast.error(`Erro ao enviar lead: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return false;
    } finally {
      setLoading(contato.id, false);
    }
  }, [user, setLoading, getUserApiToken]);

  return {
    sendToSpotter,
    isLoading,
    getUserApiToken
  };
};