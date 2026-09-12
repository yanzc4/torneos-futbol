import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center gap-4 border-l-4 border-neon shadow-[0_0_50px_rgba(204,255,0,0.2)]">
        <Loader2 className="w-12 h-12 text-neon animate-spin" />
        <p className="text-neon font-black tracking-widest uppercase animate-pulse">Cargando...</p>
      </div>
    </div>
  );
}

