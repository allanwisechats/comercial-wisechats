import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Trash2 } from "lucide-react";

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
  const [inputText, setInputText] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Extrator de Contatos</h1>
          <p className="text-xl text-muted-foreground">Cole aqui os resultados da pesquisa do Google para extrair informações de contatos</p>
        </div>

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
      </div>
    </div>
  );
};

export default Index;
