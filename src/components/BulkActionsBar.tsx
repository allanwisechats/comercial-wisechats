import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Send, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onSendToSpotter: () => void;
  onClear: () => void;
  isVisible: boolean;
  isProcessing?: boolean;
}

export const BulkActionsBar = ({
  selectedCount,
  onDelete,
  onSendToSpotter,
  onClear,
  isVisible,
  isProcessing = false
}: BulkActionsBarProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
      <Card className="px-4 py-3 shadow-lg border-border bg-card">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} contatos selecionados
          </Badge>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onSendToSpotter}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar para Spotter
            </Button>
            
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};