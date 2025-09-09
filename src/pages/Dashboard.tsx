import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Users, MapPin, Target } from 'lucide-react';

interface DashboardData {
  contatosPorCidade: { cidade: string; total: number }[];
  contatosPorNicho: { nicho: string; total: number }[];
  contatosPorOrigem: { origem: string; total: number }[];
  contatosPorData: { data: string; total: number }[];
}

interface Filters {
  nicho?: string;
  origem?: string;
  cidade?: string;
  dataInicio?: string;
  dataFim?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    contatosPorCidade: [],
    contatosPorNicho: [],
    contatosPorOrigem: [],
    contatosPorData: []
  });
  const [filters, setFilters] = useState<Filters>({
    dataInicio: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd')
  });
  const [nichos, setNichos] = useState<{ id: string; nome: string }[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFilterOptions = async () => {
    if (!user) return;

    try {
      // Fetch nichos
      const { data: nichosData } = await supabase
        .from('nichos')
        .select('id, nome')
        .eq('user_id', user.id);

      // Fetch unique origens
      const { data: origensData } = await supabase
        .from('contatos')
        .select('origem')
        .eq('user_id', user.id)
        .not('origem', 'is', null);

      // Fetch unique cidades
      const { data: cidadesData } = await supabase
        .from('contatos')
        .select('cidade')
        .eq('user_id', user.id)
        .not('cidade', 'is', null);

      setNichos(nichosData || []);
      setOrigens([...new Set(origensData?.map(item => item.origem).filter(Boolean) || [])]);
      setCidades([...new Set(cidadesData?.map(item => item.cidade).filter(Boolean) || [])]);
    } catch (error) {
      console.error('Erro ao carregar opções de filtro:', error);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('contatos')
        .select(`
          id,
          cidade,
          nicho_id,
          origem,
          created_at,
          nichos(nome)
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (filters.nicho) {
        query = query.eq('nicho_id', filters.nicho);
      }
      if (filters.origem) {
        query = query.eq('origem', filters.origem);
      }
      if (filters.cidade) {
        query = query.eq('cidade', filters.cidade);
      }
      if (filters.dataInicio) {
        query = query.gte('created_at', filters.dataInicio);
      }
      if (filters.dataFim) {
        query = query.lte('created_at', filters.dataFim + 'T23:59:59');
      }

      const { data: contatos } = await query;

      if (!contatos) return;

      // Process data for charts
      const contatosPorCidade = Object.entries(
        contatos
          .filter(c => c.cidade)
          .reduce((acc, contato) => {
            acc[contato.cidade] = (acc[contato.cidade] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      ).map(([cidade, total]) => ({ cidade, total }))
        .sort((a, b) => b.total - a.total);

      const contatosPorNicho = Object.entries(
        contatos
          .filter(c => c.nichos?.nome)
          .reduce((acc, contato) => {
            const nicho = contato.nichos?.nome || 'Sem nicho';
            acc[nicho] = (acc[nicho] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      ).map(([nicho, total]) => ({ nicho, total }))
        .sort((a, b) => b.total - a.total);

      const contatosPorOrigem = Object.entries(
        contatos
          .filter(c => c.origem)
          .reduce((acc, contato) => {
            acc[contato.origem] = (acc[contato.origem] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      ).map(([origem, total]) => ({ origem, total }))
        .sort((a, b) => b.total - a.total);

      // Group by date (last 30 days or filtered period)
      const contatosPorData = Object.entries(
        contatos.reduce((acc, contato) => {
          const date = format(parseISO(contato.created_at), 'dd/MM', { locale: ptBR });
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([data, total]) => ({ data, total }))
        .sort((a, b) => a.data.localeCompare(b.data));

      setData({
        contatosPorCidade,
        contatosPorNicho,
        contatosPorOrigem,
        contatosPorData
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [user, filters]);

  const clearFilters = () => {
    setFilters({
      dataInicio: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      dataFim: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const totalContatos = data.contatosPorCidade.reduce((sum, item) => sum + item.total, 0) +
                      data.contatosPorNicho.reduce((sum, item) => sum + item.total, 0) +
                      data.contatosPorOrigem.reduce((sum, item) => sum + item.total, 0);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Total de contatos: {totalContatos}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Configure os filtros para personalizar a visualização dos dados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-2">
              <Label>Nicho</Label>
              <Select value={filters.nicho || ''} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, nicho: value || undefined }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os nichos" />
                </SelectTrigger>
                <SelectContent>
                  {nichos.map(nicho => (
                    <SelectItem key={nicho.id} value={nicho.id}>{nicho.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={filters.origem || ''} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, origem: value || undefined }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as origens" />
                </SelectTrigger>
                <SelectContent>
                  {origens.map(origem => (
                    <SelectItem key={origem} value={origem}>{origem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Select value={filters.cidade || ''} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, cidade: value || undefined }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  {cidades.map(cidade => (
                    <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <input
                type="date"
                value={filters.dataInicio || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <input
                type="date"
                value={filters.dataFim || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button onClick={clearFilters} variant="outline">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contatos por Cidade */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Contatos por Cidade</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Total",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.contatosPorCidade.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cidade" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Contatos por Nicho */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Contatos por Nicho</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Total",
                  color: "hsl(var(--secondary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.contatosPorNicho}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="total"
                    label={({ nicho, percent }) => `${nicho} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.contatosPorNicho.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Contatos por Origem */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Contatos por Origem</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Total",
                  color: "hsl(var(--accent))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.contatosPorOrigem} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="origem" type="category" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Contatos por Data */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Contatos por Data</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Total",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.contatosPorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}