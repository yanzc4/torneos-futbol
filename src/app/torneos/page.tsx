import connectToDatabase from '@/lib/mongoose';
import { Tournament } from '@/models/Tournament';
import Link from 'next/link';
import { Trophy, CalendarDays, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explorar Torneos',
  description: 'Descubre torneos de E-Football, FIFA y PES creados por la comunidad. Mira tablas de posiciones y resultados en vivo.',
  alternates: {
    canonical: "/torneos",
  },
  openGraph: {
    title: 'Explorar Torneos | Torneos E-Football',
    description: 'Descubre torneos de E-Football, FIFA y PES creados por la comunidad. Mira tablas de posiciones y resultados en vivo.',
    url: '/torneos',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  }
};

export const dynamic = 'force-dynamic'; // Para que siempre lea la BD actualizada

export default async function TorneosPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || '1') || 1;
  const searchQ = searchParams.search || '';
  const limit = 10;
  const skip = (page - 1) * limit;

  await connectToDatabase();

  const query: any = {};
  if (searchQ) {
    query.name = { $regex: searchQ, $options: 'i' }; // Búsqueda case-insensitive
  }

  // Obtener torneos ordenados por fecha de creación descendente (los más nuevos primero)
  const [tournaments, total] = await Promise.all([
    Tournament.find(query)
      .sort({ _id: -1 }) // Ordenado por ID que incluye timestamp de creación implícito
      .skip(skip)
      .limit(limit)
      .lean(),
    Tournament.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon to-white">Explorar Torneos</h1>
          <p className="text-gray-400 mt-2">Encuentra y sigue los resultados de los campeonatos creados.</p>
        </div>
        <Link href="/crear" className="btn-neon px-6 py-3 font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Crear el Mío
        </Link>
      </div>

      <div className="mb-8">
        <SearchBar placeholder="Buscar un torneo específico..." className="max-w-none md:max-w-md mx-0" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tournaments.length === 0 ? (
          <div className="glass-panel p-10 text-center text-gray-400">
            {searchQ ? `No se encontraron torneos con el nombre "${searchQ}".` : 'No hay torneos creados aún. ¡Sé el primero!'}
          </div>
        ) : (
          tournaments.map((t: any) => (
            <Link href={`/t/${t._id}`} key={t._id.toString()}>
              <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-white/5 transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-neon">
                <div>
                  <h2 className="text-2xl font-bold group-hover:text-neon transition-colors">{t.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400 font-medium">
                    <span className="flex items-center gap-1 capitalize"><CalendarDays className="w-4 h-4 text-neon" /> {t.format === 'league' ? 'Liga' : t.format}</span>
                    <span className="flex items-center gap-1"><Users className="w-4 h-4 text-neon" /> {t.teams.length} Equipos</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-neon opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 font-bold">
                  Ver Detalles &rarr;
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-10">
          {page > 1 ? (
            <Link href={`/torneos?page=${page - 1}${searchQ ? `&search=${encodeURIComponent(searchQ)}` : ''}`} className="btn-glass px-4 py-2 flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Link>
          ) : (
            <button disabled className="btn-glass px-4 py-2 flex items-center gap-2 opacity-50 cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
          )}

          <span className="text-gray-400 font-bold bg-white/5 px-4 py-2 rounded-lg">
            Página <span className="text-neon">{page}</span> de {totalPages}
          </span>

          {page < totalPages ? (
            <Link href={`/torneos?page=${page + 1}${searchQ ? `&search=${encodeURIComponent(searchQ)}` : ''}`} className="btn-glass px-4 py-2 flex items-center gap-2">
              Siguiente <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button disabled className="btn-glass px-4 py-2 flex items-center gap-2 opacity-50 cursor-not-allowed">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
