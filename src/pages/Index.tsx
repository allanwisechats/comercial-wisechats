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
      
      // Cargos comuns (expandir conforme necessário)
      const cargoPatterns = [
        /\b(?:diretor|diretora|CEO|CTO|CFO|COO|gerente|coordenador|coordenadora|supervisor|supervisora|analista|especialista|consultor|consultora|assistente|desenvolvedor|desenvolvedora|programador|programadora|designer|arquiteto|arquiteta|engenheiro|engenheira|vendedor|vendedora|representante|executivo|executiva)\b/gi
      ];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const emails = line.match(emailRegex) || [];
        
        if (emails.length > 0) {
          // Procura nome nas linhas anteriores e posteriores
          let nome = "";
          let cargo = "";
          let empresa = "";
          
          // Busca nome e cargo nas linhas próximas
          for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
            const nearLine = lines[j].trim();
            
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
            
            // Tenta extrair empresa (geralmente linhas que terminam com "Ltda", "SA", "Inc", etc.)
            if (!empresa && /\b(ltda|sa|inc|corp|corporation|company|co\.|cia|me|epp|eireli)\b/gi.test(nearLine)) {
              empresa = nearLine;
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
            empresa: empresa || "Empresa não identificada"
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
      "Nome,Cargo,Email,Empresa",
      ...contacts.map(contact => 
        `"${contact.nome}","${contact.cargo}","${contact.email}","${contact.empresa}"`
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
                      <TableHead>Nome da Empresa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{contact.nome}</TableCell>
                        <TableCell>{contact.cargo}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.empresa}</TableCell>
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
