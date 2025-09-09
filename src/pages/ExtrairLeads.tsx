import React, { useState } from 'react';
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
import { Search, Download, Trash2, Globe, Save } from 'lucide-react';
import { toast } from 'sonner';
import { SaveContactsModal } from '@/components/SaveContactsModal';

interface Contact {
  nome: string;
  cargo: string;
  email: string;
  empresa: string;
  whatsapp: string;
  cidade: string;
  textoOriginal: string;
}

const ExtrairLeads = () => {
  const [inputText, setInputText] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const itemsPerPage = 100;

  const extractContacts = (text: string): Contact[] => {
    const contacts: Contact[] = [];
    
    // Split text into lines and identify company entries
    const allLines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentEntry: string[] = [];
    const entries: string[][] = [];
    
    // Group lines into entries - each entry starts with a company name line
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      
      // Check if this line looks like a company name (contains LTDA, SA, ME, EPP, etc. or CNPJ)
      const isCompanyLine = line.match(/\b(LTDA|S\.?A\.?|ME|EPP|EIRELI|CNPJ)\b/i) && 
                           !line.toLowerCase().includes('casa dos dados') &&
                           !line.toLowerCase().includes('linkedin') &&
                           !line.includes('http');
      
      if (isCompanyLine && currentEntry.length > 0) {
        // Start of new company, save current entry
        entries.push([...currentEntry]);
        currentEntry = [line];
      } else if (isCompanyLine && currentEntry.length === 0) {
        // First company
        currentEntry = [line];
      } else if (currentEntry.length > 0) {
        // Add line to current entry
        currentEntry.push(line);
      }
    }
    
    // Don't forget the last entry
    if (currentEntry.length > 0) {
      entries.push(currentEntry);
    }
    
    // Process each entry
    entries.forEach(lines => {
      if (lines.length === 0) return;
      
      const contact: Contact = {
        nome: '',
        cargo: '',
        email: '',
        empresa: '',
        whatsapp: '',
        cidade: '',
        textoOriginal: lines.join('\n')
      };
      
      // The first line is always the company name
      const firstLine = lines[0];
      const companyName = firstLine.replace(/\s*-?\s*(CNPJ|CPF)[\s\d\/-]+/gi, '').trim();
      contact.empresa = companyName;
      contact.nome = companyName;
      
      // Process other lines for additional information
      lines.slice(1).forEach(line => {
        const lowerLine = line.toLowerCase();
        
        // Skip known data source names
        const dataSources = ['casa dos dados', 'linkedin', 'serasa', 'receita federal'];
        if (dataSources.some(source => lowerLine.includes(source))) {
          return;
        }
        
        // Skip URLs
        if (line.includes('http') || line.includes('www.') || line.includes('.com')) {
          return;
        }
        
        // Try to extract email
        const emailMatch = line.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (emailMatch && !contact.email) {
          contact.email = emailMatch[0];
        }
        
        // Try to extract WhatsApp/Phone
        const phoneMatch = line.match(/(?:whatsapp|telefone|fone|cel)[\s:]*(\+?[\d\s\(\)-]{8,20})/i);
        if (phoneMatch && !contact.whatsapp) {
          contact.whatsapp = phoneMatch[1].trim();
        } else {
          // Fallback for standalone numbers
          const numberMatch = line.match(/\+?[\d\s\(\)-]{10,20}/);
          if (numberMatch && !contact.whatsapp && !emailMatch) {
            contact.whatsapp = numberMatch[0].trim();
          }
        }
        
        // Try to identify positions/job titles
        const cargoKeywords = ['diretor', 'gerente', 'coordenador', 'supervisor', 'analista', 'assistente', 'consultor', 'especialista', 'líder', 'head', 'manager', 'ceo', 'cto', 'cfo', 'presidente', 'vice', 'sócio'];
        if (cargoKeywords.some(keyword => lowerLine.includes(keyword)) && !contact.cargo) {
          contact.cargo = line;
        }
        
        // Try to identify city
        const cityKeywords = ['cidade', 'município', 'localização'];
        if (cityKeywords.some(keyword => lowerLine.includes(keyword)) && !contact.cidade) {
          contact.cidade = line.replace(/.*?:\s*/i, '').trim();
        }
      });
      
      // Only add contact if we have at least a name
      if (contact.nome) {
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

  const handleSaveContacts = () => {
    if (contacts.length === 0) {
      toast.error('Nenhum contato para salvar');
      return;
    }
    setShowSaveModal(true);
  };

  const handleContactsSaved = () => {
    clearContacts();
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
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Extrair Leads WhatsApp
          </CardTitle>
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
                  <label htmlFor="input-text" className="text-sm font-medium mb-2 block">
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
                  <div className="text-xs text-muted-foreground mt-1">
                    {inputText.length.toLocaleString()} / 100.000 caracteres
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={handleExtract}
                    disabled={isProcessing || !inputText.trim()}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
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
                <div className="mt-8 p-4 bg-card rounded-lg border">
                  <div className="flex items-center gap-2 text-card-foreground">
                    <Globe className="w-5 h-5" />
                    <span className="font-medium">
                      {contacts.length} leads extraídos com sucesso!
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clique na aba "Resultados" para visualizar e exportar os dados.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {contacts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum lead extraído ainda.</p>
                  <p className="text-sm">Use a aba "Extrair Leads" para começar.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
                        onClick={handleSaveContacts}
                        disabled={contacts.length === 0}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Salvar Contatos
                      </Button>
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
                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Limpar
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead className="w-12">#</TableHead>
                           <TableHead>Nome</TableHead>
                           <TableHead>Email</TableHead>
                           <TableHead>Empresa</TableHead>
                           <TableHead>WhatsApp</TableHead>
                         </TableRow>
                       </TableHeader>
                      <TableBody>
                         {currentContacts.map((contact, index) => (
                           <TableRow key={startIndex + index}>
                             <TableCell className="font-mono text-xs text-muted-foreground">
                               {startIndex + index + 1}
                             </TableCell>
                             <TableCell className="font-medium">
                               {contact.nome || '-'}
                             </TableCell>
                             <TableCell className="text-sm">
                               {contact.email || '-'}
                             </TableCell>
                             <TableCell className="text-sm text-muted-foreground">
                               {contact.empresa || '-'}
                             </TableCell>
                             <TableCell className="text-sm font-mono">
                               {contact.whatsapp || '-'}
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

      <SaveContactsModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        contacts={contacts}
        onSave={handleContactsSaved}
      />
    </div>
  );
};

export default ExtrairLeads;