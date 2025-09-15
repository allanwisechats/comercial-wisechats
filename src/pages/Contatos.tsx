import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, Download, Send, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSpotterApi } from '@/hooks/useSpotterApi';
import { ContactDetailsModal } from '@/components/ContactDetailsModal';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { BulkSendReportModal } from '@/components/BulkSendReportModal';
import { FilterPanel, FilterState } from '@/components/FilterPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Contato {
  id: string;
  nome: string | null;
  cargo: string | null;
  email: string | null;
  empresa: string | null;
  whatsapp: string | null;
  cidade: string | null;
  fonte: 'CASA_DOS_DADOS' | 'LINKEDIN';
  nicho_id: string | null;
  created_at: string;
  updated_at: string;
  origem?: string | null;
  texto_original?: string | null;
  enviado_spotter?: boolean;
  tag_importacao?: string | null;
  nichos?: {
    nome: string;
  };
}

interface Nicho {
  id: string;
  nome: string;
}

const Contatos = () => {
  const { user } = useAuth();
  const { sendToSpotter, isLoading: isSpotterLoading } = useSpotterApi();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [filteredContatos, setFilteredContatos] = useState<Contato[]>([]);
  const [nichos, setNichos] = useState<Nicho[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [tagsImportacao, setTagsImportacao] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    nichos: [],
    fontes: [],
    status: [],
    cidade: '',
    tagImportacao: '',
    dataInicio: undefined,
    dataFim: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<Contato | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contato | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkSendReportOpen, setBulkSendReportOpen] = useState(false);
  const [bulkSendResult, setBulkSendResult] = useState<{
    total: number;
    successes: Contato[];
    failures: { contact: Contato; error: string }[];
  } | null>(null);
  const itemsPerPage = 50;

  useEffect(() => {
    if (user) {
      loadContatos();
      loadNichos();
      loadCidades();
      loadTagsImportacao();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [contatos, searchTerm, filters]);

  const loadContatos = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contatos')
        .select(`
          id,
          nome,
          cargo,
          email,
          empresa,
          whatsapp,
          cidade,
          fonte,
          nicho_id,
          created_at,
          updated_at,
          origem,
          texto_original,
          enviado_spotter,
          tag_importacao,
          nichos (
            nome
          )
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

  const loadNichos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('nichos')
        .select('id, nome')
        .eq('user_id', user.id)
        .order('nome');

      if (error) throw error;
      setNichos(data || []);
    } catch (error) {
      console.error('Erro ao carregar nichos:', error);
    }
  };

  const loadCidades = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contatos')
        .select('cidade')
        .eq('user_id', user.id)
        .not('cidade', 'is', null);

      if (error) throw error;
      
      const uniqueCidades = Array.from(new Set(
        data?.map(item => item.cidade).filter(Boolean) || []
      )).sort();
      
      setCidades(uniqueCidades);
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
    }
  };

  const loadTagsImportacao = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contatos')
        .select('tag_importacao')
        .eq('user_id', user.id)
        .not('tag_importacao', 'is', null);

      if (error) throw error;
      
      const uniqueTags = Array.from(new Set(
        data?.map(item => item.tag_importacao).filter(Boolean) || []
      )).sort();
      
      setTagsImportacao(uniqueTags);
    } catch (error) {
      console.error('Erro ao carregar tags de importação:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...contatos];

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(contato =>
        Object.values(contato).some(value => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchTerm.toLowerCase());
          }
          return false;
        })
      );
    }

    // Filter by nichos
    if (filters.nichos.length > 0) {
      filtered = filtered.filter(contato => 
        filters.nichos.includes(contato.nicho_id || '')
      );
    }

    // Filter by fontes
    if (filters.fontes.length > 0) {
      filtered = filtered.filter(contato => 
        filters.fontes.includes(contato.fonte)
      );
    }

    // Filter by status
    if (filters.status.length > 0) {
      filtered = filtered.filter(contato => {
        const isEnviado = contato.enviado_spotter;
        return filters.status.some(status => 
          (status === 'enviado' && isEnviado) || 
          (status === 'pendente' && !isEnviado)
        );
      });
    }

    // Filter by cidade
    if (filters.cidade.trim()) {
      filtered = filtered.filter(contato => 
        contato.cidade?.toLowerCase().includes(filters.cidade.toLowerCase())
      );
    }

    // Filter by tag de importação
    if (filters.tagImportacao.trim()) {
      filtered = filtered.filter(contato => 
        contato.tag_importacao?.toLowerCase().includes(filters.tagImportacao.toLowerCase())
      );
    }

    // Filter by date range
    if (filters.dataInicio || filters.dataFim) {
      filtered = filtered.filter(contato => {
        const contatoDate = new Date(contato.created_at);
        const isAfterStart = !filters.dataInicio || contatoDate >= filters.dataInicio;
        const isBeforeEnd = !filters.dataFim || contatoDate <= filters.dataFim;
        return isAfterStart && isBeforeEnd;
      });
    }

    setFilteredContatos(filtered);
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filteredContatos.length === 0) {
      toast.error('Nenhum contato para exportar');
      return;
    }

    const csvContent = [
      ['#', 'Nome', 'Cargo', 'Email', 'Empresa', 'WhatsApp', 'Cidade', 'Fonte', 'Nicho', 'Tag Importação', 'Data de Criação'],
      ...filteredContatos.map((contato, index) => [
        index + 1,
        contato.nome || '',
        contato.cargo || '',
        contato.email || '',
        contato.empresa || '',
        contato.whatsapp || '',
        contato.cidade || '',
        contato.fonte === 'CASA_DOS_DADOS' ? 'Casa dos Dados' : 'LinkedIn',
        contato.nichos?.nome || '',
        contato.tag_importacao || '',
        new Date(contato.created_at).toLocaleDateString('pt-BR')
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contatos.csv';
    link.click();
    
    toast.success('Contatos exportados com sucesso!');
  };

  const handleSpotterSend = async (contato: Contato) => {
    const success = await sendToSpotter(contato);
    if (success) {
      // Atualizar o contato localmente
      setContatos(prevContatos => 
        prevContatos.map(c => 
          c.id === contato.id ? { ...c, enviado_spotter: true } : c
        )
      );
    }
  };

  const handleDeleteContact = async (contato: Contato) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('contatos')
        .delete()
        .eq('id', contato.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setContatos(prevContatos => 
        prevContatos.filter(c => c.id !== contato.id)
      );
      toast.success('Contato excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
      toast.error('Erro ao excluir contato');
    }
  };

  const handleContactUpdate = (updatedContact: Contato) => {
    setContatos(prevContatos => 
      prevContatos.map(c => 
        c.id === updatedContact.id ? updatedContact : c
      )
    );
    setIsModalOpen(false);
  };

  const openContactDetails = (contato: Contato) => {
    setSelectedContact(contato);
    setIsModalOpen(true);
  };

  const openDeleteDialog = (contato: Contato) => {
    setContactToDelete(contato);
    setIsDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      nichos: [],
      fontes: [],
      status: [],
      cidade: '',
      tagImportacao: '',
      dataInicio: undefined,
      dataFim: undefined,
    });
  };

  // Bulk actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(currentContatos.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts(prev => [...prev, contactId]);
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedContacts.length === 0) return;

    setIsBulkProcessing(true);
    try {
      const { error } = await supabase
        .from('contatos')
        .delete()
        .in('id', selectedContacts)
        .eq('user_id', user.id);

      if (error) throw error;

      setContatos(prevContatos => 
        prevContatos.filter(c => !selectedContacts.includes(c.id))
      );
      setSelectedContacts([]);
      toast.success(`${selectedContacts.length} contatos excluídos com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir contatos:', error);
      toast.error('Erro ao excluir contatos');
    } finally {
      setIsBulkProcessing(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  const handleBulkSpotterSend = async () => {
    if (selectedContacts.length === 0) return;

    setIsBulkProcessing(true);
    const contactsToSend = contatos.filter(c => 
      selectedContacts.includes(c.id) && !c.enviado_spotter
    );

    if (contactsToSend.length === 0) {
      toast.error('Todos os contatos selecionados já foram enviados ao Spotter');
      setIsBulkProcessing(false);
      return;
    }

    // Create promises for all contacts
    const promises = contactsToSend.map(async (contato) => {
      try {
        const success = await sendToSpotter(contato);
        if (!success) {
          throw new Error('Falha no envio para o Spotter');
        }
        return { contact: contato, success: true };
      } catch (error) {
        throw { contact: contato, error: error instanceof Error ? error.message : 'Erro desconhecido' };
      }
    });

    // Execute all promises and collect results
    const results = await Promise.allSettled(promises);
    
    const successes: typeof contactsToSend = [];
    const failures: { contact: typeof contactsToSend[0]; error: string }[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successes.push(result.value.contact);
      } else {
        const failure = result.reason;
        failures.push({
          contact: failure.contact || contactsToSend[index],
          error: failure.error || 'Erro desconhecido'
        });
      }
    });

    // Update local state for successful sends
    if (successes.length > 0) {
      setContatos(prevContatos => 
        prevContatos.map(c => 
          successes.some(s => s.id === c.id) ? { ...c, enviado_spotter: true } : c
        )
      );
    }

    setSelectedContacts([]);
    setIsBulkProcessing(false);

    // Show detailed report modal
    setBulkSendResult({
      total: contactsToSend.length,
      successes,
      failures
    });
    setBulkSendReportOpen(true);
  };

  const clearSelection = () => {
    setSelectedContacts([]);
  };

  // Pagination
  const totalPages = Math.ceil(filteredContatos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentContatos = filteredContatos.slice(startIndex, endIndex);

  // Selection helpers
  const isAllSelected = currentContatos.length > 0 && currentContatos.every(c => selectedContacts.includes(c.id));
  const isIndeterminate = currentContatos.some(c => selectedContacts.includes(c.id)) && !isAllSelected;

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(<PaginationEllipsis key="ellipsis1" />);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<PaginationEllipsis key="ellipsis2" />);
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => setCurrentPage(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando contatos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Contatos Salvos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Pesquisar contatos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                nichos={nichos}
                cidades={cidades}
                tagsImportacao={tagsImportacao}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                Limpar Tudo
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <Badge variant="secondary" className="text-sm">
                {filteredContatos.length} contatos encontrados
              </Badge>
              
              <Button
                onClick={handleExport}
                disabled={filteredContatos.length === 0}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>

            {filteredContatos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum contato encontrado.</p>
                {contatos.length === 0 ? (
                  <p className="text-sm">Comece extraindo alguns leads!</p>
                ) : (
                  <p className="text-sm">Tente ajustar os filtros de busca.</p>
                )}
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                      <TableHeader>
                       <TableRow>
                         <TableHead className="w-12">
                           <Checkbox
                             checked={isAllSelected}
                             onCheckedChange={handleSelectAll}
                             className={isIndeterminate ? "data-[state=indeterminate]:bg-primary" : ""}
                           />
                         </TableHead>
                         <TableHead className="w-12">#</TableHead>
                         <TableHead>Nome</TableHead>
                         <TableHead>Cargo</TableHead>
                         <TableHead>Email</TableHead>
                         <TableHead>WhatsApp</TableHead>
                          <TableHead>Fonte</TableHead>
                          <TableHead>Nicho</TableHead>
                          <TableHead>Tag Importação</TableHead>
                          <TableHead>Data</TableHead>
                         <TableHead className="w-24">Status</TableHead>
                         <TableHead className="w-32">Ações</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {currentContatos.map((contato, index) => (
                         <TableRow key={contato.id}>
                           <TableCell>
                             <Checkbox
                               checked={selectedContacts.includes(contato.id)}
                               onCheckedChange={(checked) => handleSelectContact(contato.id, checked as boolean)}
                             />
                           </TableCell>
                           <TableCell className="font-mono text-xs text-muted-foreground">
                             {startIndex + index + 1}
                           </TableCell>
                          <TableCell className="font-medium">
                            {contato.nome || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {contato.cargo || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {contato.email || '-'}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {contato.whatsapp || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={contato.fonte === 'LINKEDIN' ? 'default' : 'secondary'}>
                              {contato.fonte === 'CASA_DOS_DADOS' ? 'Casa dos Dados' : 'LinkedIn'}
                            </Badge>
                          </TableCell>
                            <TableCell className="text-sm">
                              {contato.nichos?.nome || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {contato.tag_importacao || '-'}
                            </TableCell>
                             <TableCell className="text-sm text-muted-foreground">
                               {new Date(contato.created_at).toLocaleDateString('pt-BR')}
                             </TableCell>
                            <TableCell>
                              <Badge variant={contato.enviado_spotter ? 'default' : 'secondary'}>
                                {contato.enviado_spotter ? 'Enviado' : 'Pendente'}
                              </Badge>
                            </TableCell>
                             <TableCell>
                               <div className="flex items-center gap-1">
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={() => openContactDetails(contato)}
                                   className="h-8 w-8 p-0"
                                 >
                                   <Eye className="w-4 h-4" />
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={() => handleSpotterSend(contato)}
                                   disabled={isSpotterLoading(contato.id) || contato.enviado_spotter}
                                   className="h-8 w-8 p-0"
                                 >
                                   {isSpotterLoading(contato.id) ? (
                                     <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                                   ) : (
                                     <Send className="w-4 h-4" />
                                   )}
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={() => openDeleteDialog(contato)}
                                   className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               </div>
                             </TableCell>
                         </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {renderPaginationItems()}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <BulkActionsBar
        selectedCount={selectedContacts.length}
        onDelete={() => setIsBulkDeleteDialogOpen(true)}
        onSendToSpotter={handleBulkSpotterSend}
        onClear={clearSelection}
        isVisible={selectedContacts.length > 0}
        isProcessing={isBulkProcessing}
      />

      <ContactDetailsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        contato={selectedContact}
        nichos={nichos}
        onSave={handleContactUpdate}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contato "{contactToDelete?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (contactToDelete) {
                  handleDeleteContact(contactToDelete);
                  setIsDeleteDialogOpen(false);
                  setContactToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir os {selectedContacts.length} contatos selecionados? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkProcessing ? 'Excluindo...' : 'Excluir Todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkSendReportModal
        open={bulkSendReportOpen}
        onOpenChange={setBulkSendReportOpen}
        result={bulkSendResult}
      />
    </div>
  );
};

export default Contatos;