import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Save, Calendar, User, Mail, Phone, Building, MapPin, FileText, History } from 'lucide-react';
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

interface ContactDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: Contato | null;
  nichos: Nicho[];
  onSave: (contato: Contato) => void;
}

export const ContactDetailsModal = ({ open, onOpenChange, contato, nichos, onSave }: ContactDetailsModalProps) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Contato>>({});

  useEffect(() => {
    if (contato) {
      setFormData({
        nome: contato.nome,
        cargo: contato.cargo,
        email: contato.email,
        empresa: contato.empresa,
        whatsapp: contato.whatsapp,
        cidade: contato.cidade,
        origem: contato.origem,
        nicho_id: contato.nicho_id,
        texto_original: contato.texto_original,
      });
    }
  }, [contato]);

  const handleSave = async () => {
    if (!contato || !user) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('contatos')
        .update({
          nome: formData.nome,
          cargo: formData.cargo,
          email: formData.email,
          empresa: formData.empresa,
          whatsapp: formData.whatsapp,
          cidade: formData.cidade,
          origem: formData.origem,
          nicho_id: formData.nicho_id,
          texto_original: formData.texto_original,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contato.id)
        .eq('user_id', user.id)
        .select(`
          *,
          nichos (
            nome
          )
        `)
        .single();

      if (error) throw error;

      toast.success('Contato atualizado com sucesso!');
      onSave(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar contato:', error);
      toast.error('Erro ao atualizar contato');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getActivityHistory = () => {
    if (!contato) return [];
    
    const activities = [
      {
        action: 'Contato criado',
        date: contato.created_at,
        icon: User,
      },
    ];

    if (contato.updated_at !== contato.created_at) {
      activities.push({
        action: 'Contato editado',
        date: contato.updated_at,
        icon: FileText,
      });
    }

    if (contato.enviado_spotter) {
      activities.push({
        action: 'Enviado ao Spotter',
        date: contato.updated_at, // Using updated_at as proxy for spotter send date
        icon: Mail,
      });
    }

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  if (!contato) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {isEditing ? 'Editar Contato' : 'Detalhes do Contato'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome</Label>
                    {isEditing ? (
                      <Input
                        id="nome"
                        value={formData.nome || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm mt-1">{contato.nome || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="cargo">Cargo</Label>
                    {isEditing ? (
                      <Input
                        id="cargo"
                        value={formData.cargo || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm mt-1">{contato.cargo || '-'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm mt-1">{contato.email || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    {isEditing ? (
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm mt-1 font-mono">{contato.whatsapp || '-'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Profissionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="empresa">Empresa</Label>
                    {isEditing ? (
                      <Input
                        id="empresa"
                        value={formData.empresa || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm mt-1">{contato.empresa || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    {isEditing ? (
                      <Input
                        id="cidade"
                        value={formData.cidade || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm mt-1">{contato.cidade || '-'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="nicho">Nicho</Label>
                  {isEditing ? (
                    <Select
                      value={formData.nicho_id || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, nicho_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um nicho" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum nicho</SelectItem>
                        {nichos.map((nicho) => (
                          <SelectItem key={nicho.id} value={nicho.id}>
                            {nicho.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm mt-1">{contato.nichos?.nome || '-'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="origem">Origem</Label>
                  {isEditing ? (
                    <Input
                      id="origem"
                      value={formData.origem || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, origem: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm mt-1">{contato.origem || '-'}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {contato.texto_original && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Texto Original</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={formData.texto_original || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, texto_original: e.target.value }))}
                      rows={4}
                      className="resize-none"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                      {contato.texto_original}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fonte:</span>
                  <Badge variant={contato.fonte === 'LINKEDIN' ? 'default' : 'secondary'}>
                    {contato.fonte === 'CASA_DOS_DADOS' ? 'Casa dos Dados' : 'LinkedIn'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Spotter:</span>
                  <Badge variant={contato.enviado_spotter ? 'default' : 'secondary'}>
                    {contato.enviado_spotter ? 'Enviado' : 'Pendente'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Datas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Criado em:</span>
                  <p className="text-sm text-muted-foreground">{formatDate(contato.created_at)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Atualizado em:</span>
                  <p className="text-sm text-muted-foreground">{formatDate(contato.updated_at)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getActivityHistory().map((activity, index) => {
                    const Icon = activity.icon;
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <div className="bg-muted rounded-full p-1">
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};