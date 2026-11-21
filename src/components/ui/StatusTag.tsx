import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  XCircle,
} from 'lucide-react';

export type BadgeTone = 'emerald' | 'amber' | 'red' | 'blue' | 'slate' | 'orange';

interface StatusTagProps {
  label: string;
  tone?: BadgeTone;
  withIcon?: boolean;
}

const TONE_MAP: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const StatusTag: React.FC<StatusTagProps> = ({
  label,
  tone = 'slate',
  withIcon = true,
}) => {
  const Icon =
    tone === 'emerald'
      ? CheckCircle2
      : tone === 'red'
      ? XCircle
      : tone === 'amber' || tone === 'orange'
      ? AlertTriangle
      : tone === 'blue'
      ? Clock
      : Info;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${TONE_MAP[tone]}`}
    >
      {withIcon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
};
