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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  user_roles?: {
    role: 'admin' | 'manager' | 'member';
  };
}

const AdminUsers = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'member'>('member');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && isAdmin()) {
      loadUsers();
    }
  }, [user, isAdmin]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      // First, get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then, get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles = (profiles || []).map(profile => {
        const userRole = roles?.find(role => role.user_id === profile.id);
        return {
          ...profile,
          user_roles: userRole ? { role: userRole.role } : undefined
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setSelectedRole(userProfile.user_roles?.role || 'member');
    setDisplayName(userProfile.display_name || '');
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSaving(true);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: selectedUser.id,
          role: selectedRole
        }, {
          onConflict: 'user_id,role'
        });

      if (roleError) {
        // If upsert failed, try update
        const { error: updateRoleError } = await supabase
          .from('user_roles')
          .update({ role: selectedRole })
          .eq('user_id', selectedUser.id);

        if (updateRoleError) throw updateRoleError;
      }

      toast.success('Usuário atualizado com sucesso!');
      setIsEditModalOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error('Erro ao salvar usuário');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: 'admin' | 'manager' | 'member') => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'member': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: 'admin' | 'manager' | 'member') => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'member': return 'Membro';
      default: return 'Membro';
    }
  };

  if (!isAdmin()) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-destructive">Acesso Negado</h2>
          <p className="text-muted-foreground mt-2">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gerenciamento de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Badge variant="secondary" className="text-sm">
                {users.length} usuários encontrados
              </Badge>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum usuário encontrado.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Data de Cadastro</TableHead>
                      <TableHead className="w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userProfile) => (
                      <TableRow key={userProfile.id}>
                        <TableCell className="font-medium">
                          {userProfile.email}
                        </TableCell>
                        <TableCell>
                          {userProfile.display_name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(userProfile.user_roles?.role || 'member')}>
                            {getRoleLabel(userProfile.user_roles?.role || 'member')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(userProfile.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(userProfile)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={selectedUser?.email || ''}
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
                placeholder="Digite o nome do usuário"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select value={selectedRole} onValueChange={(value: 'admin' | 'manager' | 'member') => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveUser}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;