import Link from 'next/link';
import { Trophy, ArrowRight, ShieldHalf } from 'lucide-react';
import SearchBar from '@/components/SearchBar';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon/20 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -z-10"></div>

      <main className="max-w-4xl w-full flex flex-col items-center text-center z-10">
        <div className="glass-panel p-4 rounded-full mb-8 inline-flex items-center justify-center">
          <ShieldHalf className="w-8 h-8 text-neon" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
          Crea tu Torneo de <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-green-400">
            E-Football
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl">
          La plataforma definitiva para gestionar tus ligas y copas de PES, FIFA y más. 
          Genera fixtures, calcula posiciones automáticamente y compártelo con tus amigos.
        </p>

        <SearchBar className="tour-search mb-10 w-full" />
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
          <Link 
            href="/crear" 
            className="btn-neon text-lg px-8 py-4 font-bold flex items-center justify-center gap-2 group"
          >
            Crear Nuevo Torneo
            <Trophy className="w-5 h-5 group-hover:scale-125 transition-transform" />
          </Link>
          
          <Link 
            href="/torneos" 
            className="glass-panel text-white hover:bg-white/10 text-lg px-8 py-4 font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            Torneos
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      <footer className="w-full p-6 text-center text-gray-500 text-sm relative z-10">
        <p>
          Creado por <a href="https://codemultiall.net.pe" target="_blank" rel="noopener noreferrer" className="text-neon hover:underline font-bold">codemultiall</a>
        </p>
      </footer>
    </div>
  );
}
