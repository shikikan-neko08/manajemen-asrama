import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useDorm } from '../../context/DormContext';

export const FeedbackLayer: React.FC = () => {
  const { toasts, dismissToast, confirmState, closeConfirm } = useDorm();

  return (
    <>
      {/* Toast Notifications */}
      <div
        className="fixed top-4 right-4 z-[70] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none no-print"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon =
            t.type === 'success' ? CheckCircle2 : t.type === 'error' ? XCircle : Info;
          const style =
            t.type === 'success'
              ? 'bg-white border-emerald-200 text-slate-900'
              : t.type === 'error'
              ? 'bg-white border-red-200 text-slate-900'
              : 'bg-white border-slate-200 text-slate-900';
          const iconColor =
            t.type === 'success'
              ? 'text-emerald-600'
              : t.type === 'error'
              ? 'text-red-600'
              : 'text-teal-700';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg ${style}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <p className="text-sm leading-snug flex-1">{t.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-700 p-0.5"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4 no-print"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-5">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-slate-900">{confirmState.title}</h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[40px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.onConfirm();
                  closeConfirm();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 min-h-[40px]"
              >
                {confirmState.confirmLabel || 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
