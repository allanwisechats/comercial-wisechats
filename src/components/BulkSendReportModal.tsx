import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Contato {
  id: string;
  nome: string | null;
  empresa: string | null;
  email: string | null;
}

interface BulkSendResult {
  total: number;
  successes: Contato[];
  failures: {
    contact: Contato;
    error: string;
  }[];
}

interface BulkSendReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: BulkSendResult | null;
}

export const BulkSendReportModal = ({
  open,
  onOpenChange,
  result
}: BulkSendReportModalProps) => {
  if (!result) return null;

  const successRate = (result.successes.length / result.total) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.failures.length === 0 ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : result.successes.length === 0 ? (
              <XCircle className="w-6 h-6 text-red-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            )}
            Relatório de Envio em Massa
          </DialogTitle>
          <DialogDescription>
            Operação concluída. {result.successes.length} de {result.total} contatos processados com sucesso ({Math.round(successRate)}%)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {result.successes.length} Sucessos
            </Badge>
            {result.failures.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {result.failures.length} Falhas
              </Badge>
            )}
          </div>

          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {/* Success List */}
              {result.successes.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Contatos Enviados com Sucesso
                  </h4>
                  <div className="space-y-2">
                    {result.successes.map((contact) => (
                      <div key={contact.id} className="p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                        <div className="font-medium text-sm">
                          {contact.empresa || contact.nome || 'Nome não informado'}
                        </div>
                        {contact.email && (
                          <div className="text-xs text-muted-foreground">
                            {contact.email}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failure List */}
              {result.failures.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Contatos com Falha no Envio
                  </h4>
                  <div className="space-y-2">
                    {result.failures.map((failure, index) => (
                      <div key={failure.contact.id || index} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                        <div className="font-medium text-sm">
                          {failure.contact.empresa || failure.contact.nome || 'Nome não informado'}
                        </div>
                        {failure.contact.email && (
                          <div className="text-xs text-muted-foreground mb-1">
                            {failure.contact.email}
                          </div>
                        )}
                        <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-1 rounded">
                          <strong>Erro:</strong> {failure.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};