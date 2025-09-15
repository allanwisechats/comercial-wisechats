import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Contact {
  nome: string;
  cargo: string;
  email: string;
  empresa: string;
  whatsapp: string;
  cidade: string;
  textoOriginal: string;
}

interface Nicho {
  id: string;
  nome: string;
}

interface SaveContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onSave: () => void;
}

export function SaveContactsModal({ open, onOpenChange, contacts, onSave }: SaveContactsModalProps) {
  const { user } = useAuth();
  const [fonte, setFonte] = useState<'CASA_DOS_DADOS' | 'LINKEDIN' | ''>('');
  const [origem, setOrigem] = useState('');
  const [cidade, setCidade] = useState('');
  const [nichoId, setNichoId] = useState('');
  const [newNicho, setNewNicho] = useState('');
  const [tagImportacao, setTagImportacao] = useState('');
  const [nichos, setNichos] = useState<Nicho[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewNicho, setShowNewNicho] = useState(false);
  const [duplicatesInfo, setDuplicatesInfo] = useState<{
    duplicated: Contact[];
    unique: Contact[];
    show: boolean;
  }>({
    duplicated: [],
    unique: [],
    show: false
  });

  useEffect(() => {
    if (open) {
      loadNichos();
      // Reset duplicates info when modal opens
      setDuplicatesInfo({ duplicated: [], unique: [], show: false });
      // Generate automatic import tag
      const now = new Date();
      const formattedDate = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + '_' + 
        String(now.getHours()).padStart(2, '0') + '-' + 
        String(now.getMinutes()).padStart(2, '0');
      setTagImportacao(`Importação_${formattedDate}`);
    }
  }, [open]);

  // Reset duplicates info when contacts or any relevant field changes
  useEffect(() => {
    setDuplicatesInfo({ duplicated: [], unique: [], show: false });
  }, [contacts, fonte, origem, cidade, nichoId, tagImportacao]);

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
      toast.error('Erro ao carregar nichos');
    }
  };

  const createNicho = async () => {
    if (!user || !newNicho.trim()) return;

    try {
      const { data, error } = await supabase
        .from('nichos')
        .insert([{ nome: newNicho.trim(), user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setNichos([...nichos, data]);
      setNichoId(data.id);
      setNewNicho('');
      setShowNewNicho(false);
      toast.success('Nicho criado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao criar nicho:', error);
      if (error.code === '23505') {
        toast.error('Nicho já existe');
      } else {
        toast.error('Erro ao criar nicho');
      }
    }
  };

  const checkForDuplicates = async () => {
    if (!user || contacts.length === 0) return;

    setIsLoading(true);

    try {
      // Get existing emails and whatsapps from database
      const { data: existingContacts, error } = await supabase
        .from('contatos')
        .select('email, whatsapp')
        .eq('user_id', user.id);

      if (error) throw error;

      // Create normalized sets matching database constraints
      const existingEmails = new Set(
        existingContacts?.map(c => {
          const email = c.email?.trim();
          return email && email !== '' ? email.toLowerCase() : null;
        }).filter(Boolean) || []
      );
      
      const existingWhatsapps = new Set(
        existingContacts?.map(c => {
          const whatsapp = c.whatsapp?.trim();
          return whatsapp && whatsapp !== '' ? whatsapp : null;
        }).filter(Boolean) || []
      );

      // Track internal duplicates within the current batch
      const batchEmails = new Set();
      const batchWhatsapps = new Set();
      const duplicated: Contact[] = [];
      const unique: Contact[] = [];

      contacts.forEach(contact => {
        const emailToCheck = contact.email?.trim();
        const whatsappToCheck = contact.whatsapp?.trim();
        
        const normalizedEmail = emailToCheck && emailToCheck !== '' ? emailToCheck.toLowerCase() : null;
        const normalizedWhatsapp = whatsappToCheck && whatsappToCheck !== '' ? whatsappToCheck : null;
        
        // Check for duplicates against existing database records
        const isDuplicateInDB = (normalizedEmail && existingEmails.has(normalizedEmail)) || 
                               (normalizedWhatsapp && existingWhatsapps.has(normalizedWhatsapp));
        
        // Check for duplicates within current batch
        const isDuplicateInBatch = (normalizedEmail && batchEmails.has(normalizedEmail)) || 
                                  (normalizedWhatsapp && batchWhatsapps.has(normalizedWhatsapp));
        
        if (isDuplicateInDB || isDuplicateInBatch) {
          duplicated.push(contact);
        } else {
          unique.push(contact);
          // Add to batch tracking
          if (normalizedEmail) batchEmails.add(normalizedEmail);
          if (normalizedWhatsapp) batchWhatsapps.add(normalizedWhatsapp);
        }
      });

      setDuplicatesInfo({
        duplicated,
        unique,
        show: true
      });
    } catch (error) {
      console.error('Erro ao verificar duplicatas:', error);
      toast.error('Erro ao verificar duplicatas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !fonte || !origem || !cidade || !nichoId || !tagImportacao.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (contacts.length === 0) {
      toast.error('Nenhum contato para salvar');
      return;
    }

    // If duplicates info is not shown yet, check for duplicates first
    if (!duplicatesInfo.show) {
      await checkForDuplicates();
      return;
    }

    // If no unique contacts to save
    if (duplicatesInfo.unique.length === 0) {
      toast.error('Todos os contatos são duplicatas. Nenhum contato será salvo.');
      return;
    }

    setIsLoading(true);

    try {
      const contactsToInsert = duplicatesInfo.unique.map(contact => ({
        nome: contact.nome || null,
        cargo: contact.cargo || null,
        email: contact.email?.trim() || null,
        empresa: contact.empresa || null,
        whatsapp: contact.whatsapp?.trim() || null,
        cidade: cidade || contact.cidade || null,
        fonte,
        origem,
        nicho_id: nichoId,
        user_id: user.id,
        texto_original: contact.textoOriginal || null,
        tag_importacao: tagImportacao.trim(),
      }));

      // Insert contacts one by one to handle individual errors
      let successCount = 0;
      let errorCount = 0;

      for (const contactData of contactsToInsert) {
        try {
          const { error } = await supabase
            .from('contatos')
            .insert([contactData]);

          if (error) {
            console.error('Erro ao inserir contato:', contactData.nome, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Erro inesperado ao inserir contato:', contactData.nome, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} contatos salvos com sucesso com a tag '${tagImportacao}'!`);
        if (errorCount > 0) {
          toast.warning(`${errorCount} contatos não puderam ser salvos devido a duplicatas ou outros erros.`);
        }
        onSave();
        onOpenChange(false);
        
        // Reset form
        setFonte('');
        setOrigem('');
        setCidade('');
        setNichoId('');
        setNewNicho('');
        setShowNewNicho(false);
        setTagImportacao('');
        setDuplicatesInfo({ duplicated: [], unique: [], show: false });
      } else {
        toast.error('Nenhum contato pôde ser salvo. Verifique se há duplicatas.');
      }
    } catch (error) {
      console.error('Erro geral ao salvar contatos:', error);
      toast.error('Erro inesperado ao salvar contatos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Contatos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="fonte">Fonte dos Dados *</Label>
            <Select value={fonte} onValueChange={(value) => setFonte(value as 'CASA_DOS_DADOS' | 'LINKEDIN' | '')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASA_DOS_DADOS">Casa dos Dados</SelectItem>
                <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="origem">Origem *</Label>
            <Input
              id="origem"
              placeholder="Digite a origem dos dados"
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cidade">Cidade *</Label>
            <Input
              id="cidade"
              placeholder="Digite a cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="nicho">Nicho *</Label>
            {!showNewNicho ? (
              <div className="space-y-2">
                <Select value={nichoId} onValueChange={setNichoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um nicho" />
                  </SelectTrigger>
                  <SelectContent>
                    {nichos.map((nicho) => (
                      <SelectItem key={nicho.id} value={nicho.id}>
                        {nicho.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewNicho(true)}
                >
                  Criar novo nicho
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Nome do novo nicho"
                  value={newNicho}
                  onChange={(e) => setNewNicho(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={createNicho}
                    disabled={!newNicho.trim()}
                  >
                    Criar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewNicho(false);
                      setNewNicho('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="tagImportacao">Tag de Importação *</Label>
            <Input
              id="tagImportacao"
              placeholder="Digite a tag de importação"
              value={tagImportacao}
              onChange={(e) => setTagImportacao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {!duplicatesInfo.show ? (
              <div className="text-sm text-muted-foreground">
                {contacts.length} contatos serão analisados para duplicatas
              </div>
            ) : (
              <div className="space-y-2 p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">Análise de Duplicatas:</div>
                <div className="text-sm text-green-600">
                  ✓ {duplicatesInfo.unique.length} contatos únicos serão salvos
                </div>
                {duplicatesInfo.duplicated.length > 0 && (
                  <div className="text-sm text-orange-600">
                    ⚠ {duplicatesInfo.duplicated.length} contatos duplicados serão ignorados
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !fonte || !origem || !cidade || !nichoId || !tagImportacao.trim()}
            >
              {isLoading 
                ? 'Analisando...' 
                : !duplicatesInfo.show 
                  ? 'Analisar Duplicatas' 
                  : `Salvar ${duplicatesInfo.unique.length} Contatos Únicos`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}