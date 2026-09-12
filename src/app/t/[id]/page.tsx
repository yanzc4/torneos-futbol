import connectToDatabase from '@/lib/mongoose';
import { Tournament } from '@/models/Tournament';
import { notFound } from 'next/navigation';
import TournamentClient from './TournamentClient';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  await connectToDatabase();
  try {
    const tournament = await Tournament.findById(resolvedParams.id);
    if (!tournament) return { title: 'Torneo no encontrado' };
    
    return {
      title: `${tournament.name}`,
      description: `Sigue los resultados en vivo, mira la tabla de posiciones y el fixture del torneo ${tournament.name} con ${tournament.teams.length} equipos.`,
      alternates: {
        canonical: `/t/${resolvedParams.id}`,
      },
      openGraph: {
        title: `${tournament.name} | Resultados en vivo`,
        description: `Sigue los resultados, mira la tabla de posiciones y el fixture del torneo ${tournament.name}.`,
        url: `/t/${resolvedParams.id}`,
        images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      },
    };
  } catch (error) {
    return { title: 'Error' };
  }
}

export default async function TournamentView({ params }: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  
  const { id } = await params;

  let tournament;
  try {
    tournament = await Tournament.findById(id).lean(); // lean() for plain JS objects
  } catch (e) {
    return notFound();
  }

  if (!tournament) {
    return notFound();
  }

  // Convert ObjectIds to strings to pass to Client Component safely
  const safeTournament = JSON.parse(JSON.stringify(tournament));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <TournamentClient tournament={safeTournament} />
    </div>
  );
}
