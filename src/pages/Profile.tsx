import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Key, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Profile = () => {
  const { user, userRole } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [spotterToken, setSpotterToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Load API token
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_api_tokens')
        .select('spotter_token')
        .eq('user_id', user.id)
        .single();

      if (tokenError && tokenError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw tokenError;
      }

      setDisplayName(profileData?.display_name || '');
      setSpotterToken(tokenData?.spotter_token || '');
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToken = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      // Update or insert API token
      const { error } = await supabase
        .from('user_api_tokens')
        .upsert({
          user_id: user.id,
          spotter_token: spotterToken
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Token da API salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar token:', error);
      toast.error('Erro ao salvar token da API');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleLabel = (role: 'admin' | 'manager' | 'member' | null) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'member': return 'Membro';
      default: return 'Carregando...';
    }
  };

  const getRoleBadgeVariant = (role: 'admin' | 'manager' | 'member' | null) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'member': return 'secondary';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Informações do Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Digite seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Badge variant={getRoleBadgeVariant(userRole)}>
                {getRoleLabel(userRole)}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label>Data de Cadastro</Label>
              <p className="text-sm text-muted-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
              </p>
            </div>

            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-6 h-6" />
              Configuração da API Spotter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spotterToken">Token da API Spotter</Label>
              <div className="relative">
                <Input
                  id="spotterToken"
                  type={showToken ? 'text' : 'password'}
                  value={spotterToken}
                  onChange={(e) => setSpotterToken(e.target.value)}
                  placeholder="Digite seu token da API Spotter"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este token será usado para fazer chamadas para a API do Spotter. 
                Mantenha-o seguro e não compartilhe com terceiros.
              </p>
            </div>

            <Button 
              onClick={handleSaveToken} 
              disabled={isSaving || !spotterToken.trim()}
              className="w-full"
            >
              {isSaving ? 'Salvando...' : 'Salvar Token da API'}
            </Button>

            {spotterToken && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ Token da API configurado. Todas as suas chamadas para o Spotter usarão este token.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;