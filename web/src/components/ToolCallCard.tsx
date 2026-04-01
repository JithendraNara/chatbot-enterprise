import { clsx } from 'clsx';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ToolCallCardProps {
  toolCallId?: string;
  toolName?: string;
  params?: Record<string, unknown>;
  status?: 'loading' | 'success' | 'error';
}

export default function ToolCallCard({
  toolName = 'Unknown Tool',
  params = {},
  status = 'loading',
}: ToolCallCardProps) {
  const statusConfig = {
    loading: {
      icon: <Loader2 size={16} className="animate-spin text-accent" />,
      bgColor: 'bg-card',
      borderColor: 'border-accent/50',
    },
    success: {
      icon: <CheckCircle size={16} className="text-green-500" />,
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/50',
    },
    error: {
      icon: <XCircle size={16} className="text-red-500" />,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/50',
    },
  };

  const config = statusConfig[status];

  const formatParams = (params: Record<string, unknown>): string => {
    return JSON.stringify(params, null, 2);
  };

  return (
    <div
      className={clsx(
        'p-4 rounded-lg border my-2',
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {config.icon}
        <span className="font-medium text-sm">{toolName}</span>
      </div>

      {Object.keys(params).length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-text-secondary uppercase tracking-wide">
            Parameters
          </span>
          <pre className="mt-1 p-2 bg-background rounded text-xs font-mono overflow-x-auto">
            {formatParams(params)}
          </pre>
        </div>
      )}
    </div>
  );
}
