import React from 'react';
import type { ForensicStatus } from '../../types/forensic';
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

interface ForensicStatusBadgeProps {
  status: ForensicStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const ForensicStatusBadge: React.FC<ForensicStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const configs = {
    VERIFIED: {
      label: 'VERIFIED',
      icon: ShieldCheck,
      classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
      dotClass: 'bg-emerald-400',
    },
    INFERRED: {
      label: 'INFERRED — REQUIRES HUMAN REVIEW',
      icon: AlertTriangle,
      classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
      dotClass: 'bg-amber-400',
    },
    CONTRADICTED: {
      label: 'CONTRADICTED',
      icon: AlertOctagon,
      classes: 'bg-red-500/15 text-red-400 border border-red-500/40 font-semibold',
      dotClass: 'bg-red-400',
    },
    NOT_FOUND: {
      label: 'NOT FOUND IN AVAILABLE EVIDENCE',
      icon: HelpCircle,
      classes: 'bg-slate-500/10 text-slate-300 border border-slate-500/30',
      dotClass: 'bg-slate-400',
    },
  };

  const config = configs[status] || configs.NOT_FOUND;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5',
  };

  return (
    <span className={`inline-flex items-center rounded-md font-mono tracking-wide ${sizeClasses[size]} ${config.classes}`}>
      {showIcon && <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5 flex-shrink-0'} />}
      <span>{config.label}</span>
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }> = ({ severity }) => {
  const styles = {
    CRITICAL: 'bg-red-950/50 text-red-400 border-red-700/50',
    HIGH: 'bg-orange-950/50 text-orange-400 border-orange-700/50',
    MEDIUM: 'bg-amber-950/40 text-amber-300 border-amber-700/40',
    LOW: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border font-medium uppercase tracking-wider ${styles[severity]}`}>
      {severity}
    </span>
  );
};
