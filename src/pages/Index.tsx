import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, Download, Trash2, Globe, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface Contact {
  nome: string;
  cargo: string;
  email: string;
  empresa: string;
  whatsapp: string;
  cidade: string;
  textoOriginal: string;
}

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  const [inputText, setInputText] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso!');
      navigate('/auth');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const extractContacts = (text: string): Contact[] => {
    const contacts: Contact[] = [];
    
    // Split by double newlines or multiple spaces to get individual entries
    const entries = text.split(/\n\s*\n|\t\t+/).filter(entry => entry.trim());
    
    entries.forEach(entry => {
      const lines = entry.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) return;
      
      const contact: Contact = {
        nome: '',
        cargo: '',
        email: '',
        empresa: '',
        whatsapp: '',
        cidade: '',
        textoOriginal: entry.trim()
      };
      
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        // Try to extract email
        const emailMatch = line.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (emailMatch && !contact.email) {
          contact.email = emailMatch[0];
        }
        
        // Try to extract WhatsApp
        const whatsappMatch = line.match(/\+?[\d\s\(\)-]{10,20}/);
        if (whatsappMatch && !contact.whatsapp) {
          contact.whatsapp = whatsappMatch[0].trim();
        }
        
        // Try to identify positions/job titles
        const cargoKeywords = ['diretor', 'gerente', 'coordenador', 'supervisor', 'analista', 'assistente', 'consultor', 'especialista', 'líder', 'head', 'manager', 'ceo', 'cto', 'cfo'];
        if (cargoKeywords.some(keyword => lowerLine.includes(keyword)) && !contact.cargo) {
          contact.cargo = line;
        }
        
        // If no specific pattern is found and we don't have a name yet, assume first non-email/phone line is name
        if (!contact.nome && !emailMatch && !whatsappMatch && line.length > 3) {
          contact.nome = line;
        }
      });
      
      // If we still don't have a name, use the first line
      if (!contact.nome && lines.length > 0) {
        contact.nome = lines[0];
      }
      
      // Only add contact if we have at least a name or email or phone
      if (contact.nome || contact.email || contact.whatsapp) {
        contacts.push(contact);
      }
    });
    
    return contacts;
  };

  const handleExtract = () => {
    if (!inputText.trim()) {
      toast.error('Por favor, insira o texto para extrair os leads');
      return;
    }

    if (inputText.length > 100000) {
      toast.error('Texto muito longo. Máximo de 100.000 caracteres.');
      return;
    }

    setIsProcessing(true);
    
    setTimeout(() => {
      try {
        const extractedContacts = extractContacts(inputText);
        
        if (extractedContacts.length === 0) {
          toast.error('Nenhum lead encontrado no texto');
        } else {
          setContacts(extractedContacts);
          setFilteredContacts(extractedContacts);
          setCurrentPage(1);
          toast.success(`${extractedContacts.length} leads extraídos com sucesso!`);
        }
      } catch (error) {
        toast.error('Erro ao processar o texto');
      } finally {
        setIsProcessing(false);
      }
    }, 1000);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => 
        Object.values(contact).some(value => 
          value.toLowerCase().includes(term.toLowerCase())
        )
      );
      setFilteredContacts(filtered);
    }
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filteredContacts.length === 0) {
      toast.error('Nenhum lead para exportar');
      return;
    }

    const csvContent = [
      ['#', 'Nome', 'Cargo', 'Email', 'Empresa', 'WhatsApp', 'Cidade'],
      ...filteredContacts.map((contact, index) => [
        index + 1,
        contact.nome,
        contact.cargo,
        contact.email,
        contact.empresa,
        contact.whatsapp,
        contact.cidade
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'leads_whatsapp.csv';
    link.click();
    
    toast.success('Leads exportados com sucesso!');
  };

  const clearContacts = () => {
    setContacts([]);
    setFilteredContacts([]);
    setSearchTerm('');
    setCurrentPage(1);
    toast.success('Lista limpa com sucesso!');
  };

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentContacts = filteredContacts.slice(startIndex, endIndex);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-3xl font-bold text-gray-800">
                Extrair Leads WhatsApp
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User size={16} />
                  <span>{user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sair
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="extract" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="extract">Extrair Leads</TabsTrigger>
                <TabsTrigger value="results">
                  Resultados {contacts.length > 0 && `(${contacts.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="extract" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="input-text" className="text-sm font-medium text-gray-700 mb-2 block">
                      Cole aqui o texto contendo os contatos do WhatsApp:
                    </label>
                    <Textarea
                      id="input-text"
                      placeholder="Cole aqui o texto com os contatos... (máximo 100.000 caracteres)"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="min-h-[300px] text-sm"
                      maxLength={100000}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {inputText.length.toLocaleString()} / 100.000 caracteres
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={handleExtract}
                      disabled={isProcessing || !inputText.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processando...
                        </>
                      ) : (
                        'Extrair Leads'
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setInputText('')}
                      disabled={!inputText.trim()}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>

                {contacts.length > 0 && (
                  <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-800">
                      <Globe className="w-5 h-5" />
                      <span className="font-medium">
                        {contacts.length} leads extraídos com sucesso!
                      </span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Clique na aba "Resultados" para visualizar e exportar os dados.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="results" className="space-y-6">
                {contacts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum lead extraído ainda.</p>
                    <p className="text-sm">Use a aba "Extrair Leads" para começar.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            placeholder="Pesquisar leads..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-10 w-64"
                          />
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          {filteredContacts.length} leads encontrados
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleExport}
                          disabled={filteredContacts.length === 0}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Exportar CSV
                        </Button>
                        <Button
                          onClick={clearContacts}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Limpar
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>WhatsApp</TableHead>
                            <TableHead>Cidade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentContacts.map((contact, index) => (
                            <TableRow key={startIndex + index} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-xs text-gray-500">
                                {startIndex + index + 1}
                              </TableCell>
                              <TableCell className="font-medium">
                                {contact.nome || '-'}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {contact.cargo || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {contact.email || '-'}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {contact.empresa || '-'}
                              </TableCell>
                              <TableCell className="text-sm font-mono">
                                {contact.whatsapp || '-'}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {contact.cidade || '-'}
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;