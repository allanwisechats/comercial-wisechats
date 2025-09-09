import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Download } from 'lucide-react';

interface ContatoSpotter {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  whatsapp: string;
  cidade: string;
  fonte: string;
  origem: string;
  cargo: string;
  created_at: string;
  nicho_id: string;
  nichos?: {
    nome: string;
  };
}

export function ModeloSpotter() {
  const { user } = useAuth();
  const [contatos, setContatos] = useState<ContatoSpotter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadContatos();
    }
  }, [user]);

  const loadContatos = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contatos')
        .select(`
          *,
          nichos(nome)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContatos(data || []);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      toast.error('Erro ao carregar contatos');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCsv = () => {
    if (contatos.length === 0) {
      toast.error('Nenhum contato para exportar');
      return;
    }

    const headers = [
      'Nome do Lead', 'Origem', 'Sub-Origem', 'Mercado', 'Produto', 'Site', 'País', 'Estado', 
      'Cidade', 'Logradouro', 'Número', 'Bairro', 'Complemento', 'CEP', 'DDI', 'Telefones', 
      'Observação', 'CPF/CNPJ', 'Email Pré-vendedor', 'Nome Contato', 'E-mail Contato', 
      'Cargo Contato', 'DDI Contato', 'Telefones Contato', 'Tipo do Serv. Comunicação', 
      'ID do Serv. Comunicação', 'Faturamento', 'Contato Anterior com IA', 'Avaliacao Google', 
      'Total Reviews Google', 'Nome da Empresa', 'Etapa', 'Funil'
    ];

    const csvContent = [
      headers.join(','),
      ...contatos.map(contato => {
        const subOrigem = contato.fonte === 'LINKEDIN' ? 'Linkedin' : 'Casa dos Dados';
        const mercado = contato.nichos?.nome || '';
        
        return [
          contato.nome || '', // Nome do Lead
          contato.origem || '', // Origem
          subOrigem, // Sub-Origem
          mercado, // Mercado
          '', // Produto
          '', // Site
          'Brasil', // País
          '', // Estado
          contato.cidade || '', // Cidade
          '', // Logradouro
          '', // Número
          '', // Bairro
          '', // Complemento
          '', // CEP
          '55', // DDI
          contato.whatsapp || '', // Telefones
          '', // Observação
          '', // CPF/CNPJ
          'vendas.wisechats@gmail.com', // Email Pré-vendedor
          contato.nome || '', // Nome Contato
          contato.email || '', // E-mail Contato
          contato.cargo || '', // Cargo Contato
          '55', // DDI Contato
          contato.whatsapp || '', // Telefones Contato
          '', // Tipo do Serv. Comunicação
          '', // ID do Serv. Comunicação
          '', // Faturamento
          '', // Contato Anterior com IA
          '', // Avaliacao Google
          '', // Total Reviews Google
          contato.empresa || '', // Nome da Empresa
          '', // Etapa
          '' // Funil
        ].map(field => `"${field.replace(/"/g, '""')}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `modelo_spotter_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Arquivo CSV exportado com sucesso!');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Carregando contatos...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Modelo Spotter</CardTitle>
              <CardDescription>
                Exportar bases de dados no formato Spotter para importação no CRM
              </CardDescription>
            </div>
            <Button onClick={exportToCsv} disabled={contatos.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contatos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum contato encontrado. Extraia alguns leads primeiro.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Lead</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Sub-Origem</TableHead>
                    <TableHead>Mercado</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>DDI</TableHead>
                    <TableHead>Telefones</TableHead>
                    <TableHead>Email Pré-vendedor</TableHead>
                    <TableHead>Nome Contato</TableHead>
                    <TableHead>E-mail Contato</TableHead>
                    <TableHead>Cargo Contato</TableHead>
                    <TableHead>Nome da Empresa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contatos.map((contato) => {
                    const subOrigem = contato.fonte === 'LINKEDIN' ? 'Linkedin' : 'Casa dos Dados';
                    const mercado = contato.nichos?.nome || 'N/A';
                    
                    return (
                      <TableRow key={contato.id}>
                        <TableCell className="font-medium">{contato.nome}</TableCell>
                        <TableCell>{contato.origem}</TableCell>
                        <TableCell>{subOrigem}</TableCell>
                        <TableCell>{mercado}</TableCell>
                        <TableCell>Brasil</TableCell>
                        <TableCell>{contato.cidade}</TableCell>
                        <TableCell>55</TableCell>
                        <TableCell>{contato.whatsapp}</TableCell>
                        <TableCell>vendas.wisechats@gmail.com</TableCell>
                        <TableCell>{contato.nome}</TableCell>
                        <TableCell>{contato.email}</TableCell>
                        <TableCell>{contato.cargo}</TableCell>
                        <TableCell>{contato.empresa}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}