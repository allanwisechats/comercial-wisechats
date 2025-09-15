import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface FilterState {
  nichos: string[];
  fontes: string[];
  status: string[];
  cidade: string;
  dataInicio?: Date;
  dataFim?: Date;
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  nichos: Array<{ id: string; nome: string; }>;
  cidades: string[];
}

export function FilterPanel({ filters, onFiltersChange, nichos, cidades }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cidadeSearch, setCidadeSearch] = useState('');

  const statusOptions = [
    { id: 'enviado', label: 'Enviado' },
    { id: 'pendente', label: 'Pendente' },
  ];

  const fonteOptions = [
    { id: 'CASA_DOS_DADOS', label: 'Casa dos Dados' },
    { id: 'LINKEDIN', label: 'LinkedIn' },
  ];

  const handleNichoChange = (nichoId: string, checked: boolean) => {
    const newNichos = checked 
      ? [...filters.nichos, nichoId]
      : filters.nichos.filter(id => id !== nichoId);
    onFiltersChange({ ...filters, nichos: newNichos });
  };

  const handleFonteChange = (fonteId: string, checked: boolean) => {
    const newFontes = checked 
      ? [...filters.fontes, fonteId]
      : filters.fontes.filter(id => id !== fonteId);
    onFiltersChange({ ...filters, fontes: newFontes });
  };

  const handleStatusChange = (statusId: string, checked: boolean) => {
    const newStatus = checked 
      ? [...filters.status, statusId]
      : filters.status.filter(id => id !== statusId);
    onFiltersChange({ ...filters, status: newStatus });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      nichos: [],
      fontes: [],
      status: [],
      cidade: '',
      dataInicio: undefined,
      dataFim: undefined,
    });
    setCidadeSearch('');
  };

  const handleApplyFilters = () => {
    setIsOpen(false);
  };

  const filteredCidades = cidades.filter(cidade => 
    cidade.toLowerCase().includes(cidadeSearch.toLowerCase())
  );

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.nichos.length > 0) count++;
    if (filters.fontes.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.cidade) count++;
    if (filters.dataInicio || filters.dataFim) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filtros Avançados</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Nichos */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Nichos</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
              {nichos.map((nicho) => (
                <div key={nicho.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`nicho-${nicho.id}`}
                    checked={filters.nichos.includes(nicho.id)}
                    onCheckedChange={(checked) => handleNichoChange(nicho.id, checked as boolean)}
                  />
                  <Label 
                    htmlFor={`nicho-${nicho.id}`} 
                    className="text-sm cursor-pointer"
                  >
                    {nicho.nome}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Fontes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fontes</Label>
            <div className="flex flex-wrap gap-2">
              {fonteOptions.map((fonte) => (
                <div key={fonte.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`fonte-${fonte.id}`}
                    checked={filters.fontes.includes(fonte.id)}
                    onCheckedChange={(checked) => handleFonteChange(fonte.id, checked as boolean)}
                  />
                  <Label 
                    htmlFor={`fonte-${fonte.id}`} 
                    className="text-sm cursor-pointer"
                  >
                    {fonte.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <div key={status.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.id}`}
                    checked={filters.status.includes(status.id)}
                    onCheckedChange={(checked) => handleStatusChange(status.id, checked as boolean)}
                  />
                  <Label 
                    htmlFor={`status-${status.id}`} 
                    className="text-sm cursor-pointer"
                  >
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Cidade */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Cidade</Label>
            <div className="relative">
              <Input
                placeholder="Digite uma cidade..."
                value={cidadeSearch}
                onChange={(e) => setCidadeSearch(e.target.value)}
                onBlur={() => {
                  if (cidadeSearch && filteredCidades.includes(cidadeSearch)) {
                    onFiltersChange({ ...filters, cidade: cidadeSearch });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredCidades.length > 0) {
                    const cidade = filteredCidades[0];
                    setCidadeSearch(cidade);
                    onFiltersChange({ ...filters, cidade });
                  }
                }}
              />
              {cidadeSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => {
                    setCidadeSearch('');
                    onFiltersChange({ ...filters, cidade: '' });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {cidadeSearch && filteredCidades.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-32 overflow-y-auto">
                  {filteredCidades.slice(0, 10).map((cidade) => (
                    <button
                      key={cidade}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        setCidadeSearch(cidade);
                        onFiltersChange({ ...filters, cidade });
                      }}
                    >
                      {cidade}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filters.cidade && (
              <div className="text-sm text-muted-foreground">
                Filtrando por: {filters.cidade}
              </div>
            )}
          </div>

          {/* Data */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Período de Criação</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dataInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataInicio ? (
                        format(filters.dataInicio, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dataInicio}
                      onSelect={(date) => onFiltersChange({ ...filters, dataInicio: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dataFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataFim ? (
                        format(filters.dataFim, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dataFim}
                      onSelect={(date) => onFiltersChange({ ...filters, dataFim: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClearFilters}>
            Limpar Filtros
          </Button>
          <Button onClick={handleApplyFilters}>
            Aplicar Filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}