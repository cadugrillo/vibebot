import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import type { ConnectionState } from '@/lib/websocket';

export interface ConnectionStatusProps {
  state: ConnectionState;
  isConnected: boolean;
  className?: string;
}

const getStatusConfig = (state: ConnectionState) => {
  switch (state) {
    case 'authenticated':
      return {
        icon: Wifi,
        label: 'Connected',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        dotColor: 'bg-green-500',
      };
    case 'connected':
      return {
        icon: Wifi,
        label: 'Authenticating...',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        dotColor: 'bg-blue-500',
      };
    case 'connecting':
      return {
        icon: Loader2,
        label: 'Connecting...',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        dotColor: 'bg-blue-500',
        animate: true,
      };
    case 'reconnecting':
      return {
        icon: Loader2,
        label: 'Reconnecting...',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        dotColor: 'bg-yellow-500',
        animate: true,
      };
    case 'error':
      return {
        icon: AlertCircle,
        label: 'Connection Error',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        dotColor: 'bg-red-500',
      };
    case 'disconnected':
    default:
      return {
        icon: WifiOff,
        label: 'Disconnected',
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        dotColor: 'bg-gray-500',
      };
  }
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  state,
  className = '',
}) => {
  const config = getStatusConfig(state);
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${className}`}
      role="status"
      aria-label={`Connection status: ${config.label}`}
    >
      {/* Status dot */}
      <div className="relative flex items-center justify-center">
        <span
          className={`block w-2 h-2 rounded-full ${config.dotColor}`}
          aria-hidden="true"
        />
        {/* Pulse animation for connecting/reconnecting states */}
        {config.animate && (
          <span
            className={`absolute w-2 h-2 rounded-full ${config.dotColor} animate-ping opacity-75`}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Icon */}
      <Icon
        className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />

      {/* Label - Hide on very small screens */}
      <span
        className={`text-sm font-medium ${config.color} hidden sm:inline`}
      >
        {config.label}
      </span>
    </div>
  );
};

// Compact version for mobile/header
export const ConnectionStatusCompact: React.FC<ConnectionStatusProps> = ({
  state,
  className = '',
}) => {
  const config = getStatusConfig(state);
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center justify-center p-2 rounded-full ${config.bgColor} ${className}`}
      role="status"
      aria-label={`Connection status: ${config.label}`}
      title={config.label}
    >
      <Icon
        className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
    </div>
  );
};
