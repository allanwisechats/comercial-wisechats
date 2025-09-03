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
import { Search, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [filteredContatos, setFilteredContatos] = useState<Contato[]>([]);
  const [nichos, setNichos] = useState<Nicho[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNicho, setSelectedNicho] = useState('');
  const [selectedFonte, setSelectedFonte] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    if (user) {
      loadContatos();
      loadNichos();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [contatos, searchTerm, selectedNicho, selectedFonte]);

  const loadContatos = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contatos')
        .select(`
          *,
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

    // Filter by nicho
    if (selectedNicho) {
      filtered = filtered.filter(contato => contato.nicho_id === selectedNicho);
    }

    // Filter by fonte
    if (selectedFonte) {
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedNicho('');
    setSelectedFonte('');
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
              
              <Select value={selectedNicho} onValueChange={setSelectedNicho}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por nicho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os nichos</SelectItem>
                  {nichos.map((nicho) => (
                    <SelectItem key={nicho.id} value={nicho.id}>
                      {nicho.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFonte} onValueChange={setSelectedFonte}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as fontes</SelectItem>
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
    </div>
  );
};

export default Contatos;