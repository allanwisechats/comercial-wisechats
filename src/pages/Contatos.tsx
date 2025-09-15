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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, Download, Filter, Send, Eye, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSpotterApi } from '@/hooks/useSpotterApi';
import { ContactDetailsModal } from '@/components/ContactDetailsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNichos, setSelectedNichos] = useState<string[]>([]);
  const [selectedFonte, setSelectedFonte] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<Contato | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contato | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const itemsPerPage = 50;

  useEffect(() => {
    if (user) {
      loadContatos();
      loadNichos();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [contatos, searchTerm, selectedNichos, selectedFonte]);

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
    if (selectedNichos.length > 0) {
      filtered = filtered.filter(contato => 
        selectedNichos.includes(contato.nicho_id || '')
      );
    }

    // Filter by fonte
    if (selectedFonte && selectedFonte !== 'all') {
      filtered = filtered.filter(contato => contato.fonte === selectedFonte);
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
      ['#', 'Nome', 'Cargo', 'Email', 'Empresa', 'WhatsApp', 'Cidade', 'Fonte', 'Nicho', 'Data de Criação'],
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
    setSelectedNichos([]);
    setSelectedFonte('all');
  };

  // Pagination
  const totalPages = Math.ceil(filteredContatos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentContatos = filteredContatos.slice(startIndex, endIndex);

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
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-48 justify-between">
                    {selectedNichos.length === 0 
                      ? "Selecionar nichos"
                      : selectedNichos.length === 1
                      ? nichos.find(n => n.id === selectedNichos[0])?.nome
                      : `${selectedNichos.length} nichos selecionados`
                    }
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48" align="start">
                  {nichos.map((nicho) => (
                    <DropdownMenuItem
                      key={nicho.id}
                      onClick={() => {
                        setSelectedNichos(prev => 
                          prev.includes(nicho.id)
                            ? prev.filter(id => id !== nicho.id)
                            : [...prev, nicho.id]
                        );
                      }}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-3 h-3 border rounded-sm ${
                        selectedNichos.includes(nicho.id) 
                          ? 'bg-primary border-primary' 
                          : 'border-muted-foreground'
                      }`}>
                        {selectedNichos.includes(nicho.id) && (
                          <div className="w-full h-full bg-primary-foreground rounded-sm scale-50" />
                        )}
                      </div>
                      {nicho.nome}
                    </DropdownMenuItem>
                  ))}
                  {selectedNichos.length > 0 && (
                    <>
                      <DropdownMenuItem className="border-t" onClick={() => setSelectedNichos([])}>
                        Limpar seleção
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Select value={selectedFonte} onValueChange={setSelectedFonte}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  <SelectItem value="CASA_DOS_DADOS">Casa dos Dados</SelectItem>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Limpar
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
                         <TableHead className="w-12">#</TableHead>
                         <TableHead>Nome</TableHead>
                         <TableHead>Cargo</TableHead>
                         <TableHead>Email</TableHead>
                         <TableHead>WhatsApp</TableHead>
                         <TableHead>Fonte</TableHead>
                         <TableHead>Nicho</TableHead>
                         <TableHead>Data</TableHead>
                         <TableHead className="w-24">Status</TableHead>
                         <TableHead className="w-32">Ações</TableHead>
                       </TableRow>
                     </TableHeader>
                    <TableBody>
                      {currentContatos.map((contato, index) => (
                        <TableRow key={contato.id}>
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
    </div>
  );
};

export default Contatos;