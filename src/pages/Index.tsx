import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Trash2, Globe } from "lucide-react";

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
  // States for Version 1
  const [inputText, setInputText] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // States for Version 2
  const [nicho, setNicho] = useState("");
  const [cidade, setCidade] = useState("");
  const [contactsV2, setContactsV2] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const processText = () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const extractedContacts: Contact[] = [];
      const lines = inputText.split('\n');
      
      // Regex patterns para extrair informações
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const nameRegex = /^[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+)*$/;
      const whatsappRegex = /(?:\+55\s?)?(?:\(?0?\d{2}\)?\s?)?(?:9\s?)?[6-9]\d{3}[-\s]?\d{4}/g;
      
      // Regex para cidades brasileiras comuns
      const cidadeRegex = /\b(?:São Paulo|Rio de Janeiro|Belo Horizonte|Salvador|Brasília|Fortaleza|Manaus|Curitiba|Recife|Goiânia|Belém|Porto Alegre|Guarulhos|Campinas|São Luís|Maceió|Duque de Caxias|Natal|Teresina|Campo Grande|São Bernardo do Campo|Nova Iguaçu|João Pessoa|Santo André|São José dos Campos|Ribeirão Preto|Uberlândia|Sorocaba|Contagem|Aracaju|Feira de Santana|Cuiabá|Joinville|Juiz de Fora|Londrina|Aparecida de Goiânia|Niterói|Ananindeua|Porto Velho|Serra|Caxias do Sul|Vila Velha|Florianópolis|Macapá|Campos dos Goytacazes|São José do Rio Preto|Mauá|Carapicuíba|Olinda|Campina Grande|São José dos Pinhais|Mogi das Cruzes|Betim|Diadema|Jundiaí|Piracicaba|Cariacica|Bauru|Montes Claros|Canoas|Pelotas|Anápolis|Maringá|São Carlos|Petrolina|Praia Grande|Franca|Ponta Grossa|Foz do Iguaçu|Santa Maria|Blumenau|Vitória|Paulista|Limeira|Uberaba|Suzano|Caucaia|Governador Valadares|Volta Redonda|Santos|Petrópolis|Taboão da Serra|Caruaru|Guarujá|Magé|Taubaté|Marília|São Vicente|Mossoró|Viçosa|Rio Branco|Boa Vista|Americana)\b/gi;
      
      // Cargos comuns (expandir conforme necessário)
      const cargoPatterns = [
        /\b(?:diretor|diretora|CEO|CTO|CFO|COO|gerente|coordenador|coordenadora|supervisor|supervisora|analista|especialista|consultor|consultora|assistente|desenvolvedor|desenvolvedora|programador|programadora|designer|arquiteto|arquiteta|engenheiro|engenheira|vendedor|vendedora|representante|executivo|executiva)\b/gi
      ];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const emails = line.match(emailRegex) || [];
        
        if (emails.length > 0) {
          // Procura informações nas linhas anteriores e posteriores
          let nome = "";
          let cargo = "";
          let empresa = "";
          let whatsapp = "";
          let cidade = "";
          let linhasUsadas: string[] = [];
          
          // Busca informações nas linhas próximas
          for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 5); j++) {
            const nearLine = lines[j].trim();
            
            // Adiciona linha ao contexto se tiver conteúdo relevante
            if (nearLine.length > 3) {
              linhasUsadas.push(nearLine);
            }
            
            // Tenta extrair nome
            if (!nome && nameRegex.test(nearLine) && nearLine.length < 50) {
              nome = nearLine;
            }
            
            // Tenta extrair cargo
            if (!cargo) {
              for (const pattern of cargoPatterns) {
                const matches = nearLine.match(pattern);
                if (matches) {
                  cargo = matches[0];
                  break;
                }
              }
            }
            
            // Tenta extrair WhatsApp
            if (!whatsapp) {
              const whatsappMatches = nearLine.match(whatsappRegex);
              if (whatsappMatches) {
                whatsapp = whatsappMatches[0];
              }
            }
            
            // Tenta extrair cidade
            if (!cidade) {
              const cidadeMatches = nearLine.match(cidadeRegex);
              if (cidadeMatches) {
                cidade = cidadeMatches[0];
              }
            }
            
            // Nova lógica para empresa: primeira frase próxima ao email (sem regex específico)
            if (!empresa && nearLine.length > 5 && nearLine.length < 80 && 
                !emailRegex.test(nearLine) && !whatsappRegex.test(nearLine) &&
                !nameRegex.test(nearLine) && j !== i) {
              // Verifica se não é um cargo
              let isCargo = false;
              for (const pattern of cargoPatterns) {
                if (pattern.test(nearLine)) {
                  isCargo = true;
                  break;
                }
              }
              if (!isCargo) {
                empresa = nearLine;
              }
            }
          }
          
          // Se não encontrou empresa, tenta pegar domínio do email
          if (!empresa && emails[0]) {
            const domain = emails[0].split('@')[1];
            empresa = domain.split('.')[0];
          }
          
          extractedContacts.push({
            nome: nome || "Nome não identificado",
            cargo: cargo || "Cargo não identificado", 
            email: emails[0],
            empresa: empresa || "Empresa não identificada",
            whatsapp: whatsapp || "Não informado",
            cidade: cidade || "Cidade não identificada",
            textoOriginal: linhasUsadas.join(" | ")
          });
        }
      }
      
      // Remove duplicatas baseado no email
      const uniqueContacts = extractedContacts.filter((contact, index, self) => 
        index === self.findIndex(c => c.email === contact.email)
      );
      
      setContacts(uniqueContacts);
    } catch (error) {
      console.error("Erro ao processar texto:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearData = () => {
    setInputText("");
    setContacts([]);
  };

  const searchGoogleContacts = async () => {
    if (!nicho.trim() || !cidade.trim()) return;
    
    setIsSearching(true);
    setContactsV2([]);
    
    try {
      const query = `site:casadosdados.com.br+"${nicho}"+("@gmail.com"+OR+"@yahoo.com"+OR+"@hotmail.com"+OR+"@outlook.com"+OR+"@aol.com"+OR+"@icloud.com")+AND+${cidade}`;
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=100`;
      
      console.log("Fazendo busca no Google:", googleUrl);
      
      // Simular extração básica por enquanto (até implementarmos scraping real)
      // Em um ambiente real, seria necessário usar uma API de scraping ou proxy
      const mockContacts: Contact[] = [
        {
          nome: "João Silva", 
          cargo: "Corretor",
          email: "joao@exemplo.com",
          empresa: "Silva Imóveis",
          whatsapp: "(48) 99999-9999",
          cidade: "Florianópolis",
          textoOriginal: "João Silva - Corretor de Imóveis - Silva Imóveis - joao@exemplo.com - (48) 99999-9999"
        }
      ];
      
      // Por enquanto, vamos retornar dados de exemplo
      // TODO: Implementar scraping real do Google
      setTimeout(() => {
        setContactsV2(mockContacts);
        setIsSearching(false);
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
      setIsSearching(false);
    }
  };

  const extractContactsFromHTML = (html: string): Contact[] => {
    // Usar a mesma lógica de extração da versão 1
    const extractedContacts: Contact[] = [];
    const lines = html.split('\n');
    
    // Reutilizar as mesmas regex patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const nameRegex = /^[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+)*$/;
    const whatsappRegex = /(?:\+55\s?)?(?:\(?0?\d{2}\)?\s?)?(?:9\s?)?[6-9]\d{3}[-\s]?\d{4}/g;
    const cidadeRegex = /\b(?:São Paulo|Rio de Janeiro|Belo Horizonte|Salvador|Brasília|Fortaleza|Manaus|Curitiba|Recife|Goiânia|Belém|Porto Alegre|Guarulhos|Campinas|São Luís|Maceió|Duque de Caxias|Natal|Teresina|Campo Grande|São Bernardo do Campo|Nova Iguaçu|João Pessoa|Santo André|São José dos Campos|Ribeirão Preto|Uberlândia|Sorocaba|Contagem|Aracaju|Feira de Santana|Cuiabá|Joinville|Juiz de Fora|Londrina|Aparecida de Goiânia|Niterói|Ananindeua|Porto Velho|Serra|Caxias do Sul|Vila Velha|Florianópolis|Macapá|Campos dos Goytacazes|São José do Rio Preto|Mauá|Carapicuíba|Olinda|Campina Grande|São José dos Pinhais|Mogi das Cruzes|Betim|Diadema|Jundiaí|Piracicaba|Cariacica|Bauru|Montes Claros|Canoas|Pelotas|Anápolis|Maringá|São Carlos|Petrolina|Praia Grande|Franca|Ponta Grossa|Foz do Iguaçu|Santa Maria|Blumenau|Vitória|Paulista|Limeira|Uberaba|Suzano|Caucaia|Governador Valadares|Volta Redonda|Santos|Petrópolis|Taboão da Serra|Caruaru|Guarujá|Magé|Taubaté|Marília|São Vicente|Mossoró|Viçosa|Rio Branco|Boa Vista|Americana)\b/gi;
    const cargoPatterns = [
      /\b(?:diretor|diretora|CEO|CTO|CFO|COO|gerente|coordenador|coordenadora|supervisor|supervisora|analista|especialista|consultor|consultora|assistente|desenvolvedor|desenvolvedora|programador|programadora|designer|arquiteto|arquiteta|engenheiro|engenheira|vendedor|vendedora|representante|executivo|executiva)\b/gi
    ];
    
    // Reutilizar a mesma lógica de extração
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const emails = line.match(emailRegex) || [];
      
      if (emails.length > 0) {
        let nome = "";
        let cargo = "";
        let empresa = "";
        let whatsapp = "";
        let cidade = "";
        let linhasUsadas: string[] = [];
        
        for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 5); j++) {
          const nearLine = lines[j].trim();
          
          if (nearLine.length > 3) {
            linhasUsadas.push(nearLine);
          }
          
          if (!nome && nameRegex.test(nearLine) && nearLine.length < 50) {
            nome = nearLine;
          }
          
          if (!cargo) {
            for (const pattern of cargoPatterns) {
              const matches = nearLine.match(pattern);
              if (matches) {
                cargo = matches[0];
                break;
              }
            }
          }
          
          if (!whatsapp) {
            const whatsappMatches = nearLine.match(whatsappRegex);
            if (whatsappMatches) {
              whatsapp = whatsappMatches[0];
            }
          }
          
          if (!cidade) {
            const cidadeMatches = nearLine.match(cidadeRegex);
            if (cidadeMatches) {
              cidade = cidadeMatches[0];
            }
          }
          
          if (!empresa && nearLine.length > 5 && nearLine.length < 80 && 
              !emailRegex.test(nearLine) && !whatsappRegex.test(nearLine) &&
              !nameRegex.test(nearLine) && j !== i) {
            let isCargo = false;
            for (const pattern of cargoPatterns) {
              if (pattern.test(nearLine)) {
                isCargo = true;
                break;
              }
            }
            if (!isCargo) {
              empresa = nearLine;
            }
          }
        }
        
        if (!empresa && emails[0]) {
          const domain = emails[0].split('@')[1];
          empresa = domain.split('.')[0];
        }
        
        extractedContacts.push({
          nome: nome || "Nome não identificado",
          cargo: cargo || "Cargo não identificado", 
          email: emails[0],
          empresa: empresa || "Empresa não identificada",
          whatsapp: whatsapp || "Não informado",
          cidade: cidade || "Cidade não identificada",
          textoOriginal: linhasUsadas.join(" | ")
        });
      }
    }
    
    // Remove duplicatas
    return extractedContacts.filter((contact, index, self) => 
      index === self.findIndex(c => c.email === contact.email)
    );
  };

  const clearDataV2 = () => {
    setNicho("");
    setCidade("");
    setContactsV2([]);
  };

  const exportToCsv = () => {
    if (contacts.length === 0) return;
    
    const csvContent = [
      "Nome,Cargo,Email,Empresa,WhatsApp,Cidade,Texto Original",
      ...contacts.map(contact => 
        `"${contact.nome}","${contact.cargo}","${contact.email}","${contact.empresa}","${contact.whatsapp}","${contact.cidade}","${contact.textoOriginal}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contatos_extraidos.csv';
    link.click();
  };

  const exportToCsvV2 = () => {
    if (contactsV2.length === 0) return;
    
    const csvContent = [
      "Nome,Cargo,Email,Empresa,WhatsApp,Cidade,Texto Original",
      ...contactsV2.map(contact => 
        `"${contact.nome}","${contact.cargo}","${contact.email}","${contact.empresa}","${contact.whatsapp}","${contact.cidade}","${contact.textoOriginal}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contatos_busca_automatica.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Extrator de Contatos</h1>
          <p className="text-xl text-muted-foreground">Extraia informações de contatos de diferentes formas</p>
        </div>

        <Tabs defaultValue="v1" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="v1" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Versão 1 - Manual
            </TabsTrigger>
            <TabsTrigger value="v2" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Versão 2 - Automática
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="v1" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Texto de Entrada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Cole aqui o texto dos resultados da pesquisa do Google (até 30.000 caracteres)..."
                  className="min-h-[200px] resize-none"
                  maxLength={30000}
                />
                <div className="text-sm text-muted-foreground">
                  {inputText.length}/30.000 caracteres
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={processText} 
                    disabled={!inputText.trim() || isProcessing}
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    {isProcessing ? "Processando..." : "Extrair Contatos"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearData}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {contacts.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      Contatos Extraídos
                      <Badge variant="secondary">{contacts.length}</Badge>
                    </CardTitle>
                    <Button 
                      onClick={exportToCsv}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome do Contato</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead>Texto Original</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((contact, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{contact.nome}</TableCell>
                            <TableCell>{contact.cargo}</TableCell>
                            <TableCell>{contact.email}</TableCell>
                            <TableCell>{contact.empresa}</TableCell>
                            <TableCell>{contact.whatsapp}</TableCell>
                            <TableCell>{contact.cidade}</TableCell>
                            <TableCell className="max-w-xs truncate" title={contact.textoOriginal}>
                              {contact.textoOriginal}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="v2" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Busca Automática
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="nicho" className="text-sm font-medium">
                      Nicho
                    </label>
                    <Input
                      id="nicho"
                      value={nicho}
                      onChange={(e) => setNicho(e.target.value)}
                      placeholder="ex: imobiliária"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cidade" className="text-sm font-medium">
                      Cidade
                    </label>
                    <Input
                      id="cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="ex: Florianópolis"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={searchGoogleContacts} 
                    disabled={!nicho.trim() || !cidade.trim() || isSearching}
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    {isSearching ? "Buscando..." : "Buscar Contatos"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearDataV2}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {contactsV2.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      Contatos Encontrados
                      <Badge variant="secondary">{contactsV2.length}</Badge>
                    </CardTitle>
                    <Button 
                      onClick={exportToCsvV2}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome do Contato</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead>Texto Original</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contactsV2.map((contact, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{contact.nome}</TableCell>
                            <TableCell>{contact.cargo}</TableCell>
                            <TableCell>{contact.email}</TableCell>
                            <TableCell>{contact.empresa}</TableCell>
                            <TableCell>{contact.whatsapp}</TableCell>
                            <TableCell>{contact.cidade}</TableCell>
                            <TableCell className="max-w-xs truncate" title={contact.textoOriginal}>
                              {contact.textoOriginal}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
