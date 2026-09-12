'use client';

import { Trophy } from 'lucide-react';

interface BracketVisualizerProps {
  tournament: any;
  onMatchClick: (match: any) => void;
  isAdmin: boolean;
}

export default function BracketVisualizer({ tournament, onMatchClick, isAdmin }: BracketVisualizerProps) {
  // Filter only knockout matches
  const knockoutMatches = tournament.matches.filter((m: any) => m.stage === 'knockout' || m.stage === 'phase2');
  
  // Group by round
  const matchesByRound: Record<number, any[]> = {};
  let maxRound = 1;
  
  knockoutMatches.forEach((m: any) => {
    if (!matchesByRound[m.round]) {
      matchesByRound[m.round] = [];
    }
    matchesByRound[m.round].push(m);
    if (m.round > maxRound) maxRound = m.round;
  });

  // Helper to get team name
  const getTeamName = (teamId: string | null, placeholder?: string) => {
    if (teamId) {
      const team = tournament.teams.find((t: any) => t.id === teamId);
      return team ? team.name : 'Unknown';
    }
    return placeholder || 'TBD';
  };

  return (
    <div className="w-full overflow-x-auto pb-10 custom-scrollbar">
      <div className="flex gap-12 min-w-max p-4 items-center">
        {Array.from({ length: maxRound }).map((_, i) => {
          const round = i + 1;
          const matches = matchesByRound[round] || [];
          // Sort by match ID roughly (they are named match_r1_0, match_r1_1, etc.)
          matches.sort((a, b) => {
            const numA = parseInt(a.id.split('_').pop() || '0');
            const numB = parseInt(b.id.split('_').pop() || '0');
            return numA - numB;
          });

          return (
            <div key={round} className="flex flex-col justify-around gap-8" style={{ minHeight: `${matchesByRound[1]?.length * 100}px` }}>
              {/* Encabezado de la Ronda */}
              <h3 className="text-center text-neon font-bold mb-4 uppercase tracking-widest text-sm">
                {round === maxRound ? 'Final' : round === maxRound - 1 ? 'Semifinal' : `Ronda ${round}`}
              </h3>
              
              {/* Partidos */}
              {matches.map((match: any) => {
                const isFinished = match.status === 'finished';
                const homeName = getTeamName(match.homeTeamId, match.placeholderHome);
                const awayName = getTeamName(match.awayTeamId, match.placeholderAway);
                
                let homeWon = false;
                let awayWon = false;
                if (isFinished && match.homeScore !== null && match.awayScore !== null) {
                  homeWon = match.homeScore > match.awayScore;
                  awayWon = match.awayScore > match.homeScore;
                }

                return (
                  <div 
                    key={match.id} 
                    className="relative flex flex-col justify-center"
                  >
                    <div 
                      onClick={() => onMatchClick(match)}
                      className={`glass-panel flex flex-col w-48 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isFinished ? 'border-white/10' : 'border-neon/30 hover:border-neon'}`}
                    >
                      {/* Equipo Local */}
                      <div className={`flex justify-between items-center px-3 py-2 border-b border-white/5 ${homeWon ? 'bg-neon/20' : 'bg-black/40'}`}>
                        <span className={`text-sm truncate font-bold ${homeWon ? 'text-neon' : 'text-gray-300'} ${!match.homeTeamId ? 'italic text-gray-500' : ''}`}>
                          {homeName}
                        </span>
                        <span className="font-mono text-sm font-bold text-white">
                          {match.homeScore !== null ? match.homeScore : '-'}
                        </span>
                      </div>
                      
                      {/* Equipo Visitante */}
                      <div className={`flex justify-between items-center px-3 py-2 ${awayWon ? 'bg-neon/20' : 'bg-black/40'}`}>
                        <span className={`text-sm truncate font-bold ${awayWon ? 'text-neon' : 'text-gray-300'} ${!match.awayTeamId ? 'italic text-gray-500' : ''}`}>
                          {awayName}
                        </span>
                        <span className="font-mono text-sm font-bold text-white">
                          {match.awayScore !== null ? match.awayScore : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Conectores visuales para el árbol (solo CSS básico para la demo) */}
                    {round < maxRound && (
                      <>
                        <div className="absolute w-6 h-[2px] bg-neon/30 -right-6 top-1/2"></div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        
        {/* El Trofeo al final */}
        <div className="flex flex-col justify-center items-center h-full pl-8">
          <Trophy className="w-32 h-32 text-neon/50 drop-shadow-[0_0_20px_rgba(204,255,0,0.3)] animate-pulse" />
          <span className="mt-4 text-neon font-black tracking-widest uppercase">Campeón</span>
        </div>
      </div>
    </div>
  );
}
