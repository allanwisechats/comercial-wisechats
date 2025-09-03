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
  const [nichoId, setNichoId] = useState('');
  const [newNicho, setNewNicho] = useState('');
  const [nichos, setNichos] = useState<Nicho[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewNicho, setShowNewNicho] = useState(false);

  useEffect(() => {
    if (open) {
      loadNichos();
    }
  }, [open]);

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

  const handleSave = async () => {
    if (!user || !fonte || !nichoId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (contacts.length === 0) {
      toast.error('Nenhum contato para salvar');
      return;
    }

    setIsLoading(true);

    try {
      const contactsToInsert = contacts.map(contact => ({
        nome: contact.nome || null,
        cargo: contact.cargo || null,
        email: contact.email || null,
        empresa: contact.empresa || null,
        whatsapp: contact.whatsapp || null,
        cidade: contact.cidade || null,
        fonte,
        nicho_id: nichoId,
        user_id: user.id,
        texto_original: contact.textoOriginal || null,
      }));

      const { error } = await supabase
        .from('contatos')
        .insert(contactsToInsert);

      if (error) throw error;

      toast.success(`${contacts.length} contatos salvos com sucesso!`);
      onSave();
      onOpenChange(false);
      
      // Reset form
      setFonte('');
      setNichoId('');
      setNewNicho('');
      setShowNewNicho(false);
    } catch (error) {
      console.error('Erro ao salvar contatos:', error);
      toast.error('Erro ao salvar contatos');
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

          <div className="text-sm text-muted-foreground">
            {contacts.length} contatos serão salvos
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
              disabled={isLoading || !fonte || !nichoId}
            >
              {isLoading ? 'Salvando...' : 'Salvar Contatos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}