'use server';

import connectToDatabase from '@/lib/mongoose';
import { Tournament } from '@/models/Tournament';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

function hashPin(pin: string) {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

export async function generateNextSwissRound(tournamentId: string, pin: string) {
  await connectToDatabase();
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return { success: false, error: 'Torneo no encontrado' };
  
  if (tournament.adminPin !== hashPin(pin)) {
    return { success: false, error: 'PIN incorrecto' };
  }

  if (tournament.format !== 'swiss') {
    return { success: false, error: 'Este torneo no usa el sistema suizo.' };
  }

  const allMatchesFinished = tournament.matches.length > 0 && tournament.matches.every(m => m.status === 'finished');
  if (!allMatchesFinished) {
    return { success: false, error: 'Aún hay partidos pendientes. Debes terminar la ronda actual antes de generar la siguiente.' };
  }

  // Find max round
  const currentRound = Math.max(...tournament.matches.map(m => m.round));
  const nextRound = currentRound + 1;

  // Max rounds usually ceil(log2(N)) + 1 or similar. Let's allow up to N-1 rounds.
  if (nextRound > tournament.teams.length - 1) {
    return { success: false, error: 'Ya se alcanzó el número máximo de rondas.' };
  }

  // Calculate standings
  const standings: Record<string, any> = {};
  tournament.teams.forEach(t => {
    standings[t.id] = { id: t.id, pts: 0, gd: 0, played: [] };
  });

  tournament.matches.forEach(m => {
    if (m.homeScore !== null && m.awayScore !== null) {
      const home = standings[m.homeTeamId!];
      const away = standings[m.awayTeamId!];
      
      if (!home || !away) return; // In case of byes

      home.played.push(m.awayTeamId!);
      away.played.push(m.homeTeamId!);

      home.gd += (m.homeScore - m.awayScore); 
      away.gd += (m.awayScore - m.homeScore);
      
      if (m.homeScore > m.awayScore) home.pts += 3;
      else if (m.homeScore < m.awayScore) away.pts += 3;
      else { home.pts += 1; away.pts += 1; }
    }
  });

  const sortedTeams = Object.values(standings).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return b.gd - a.gd; // Tie-breaker by GD
  });

  // Pairing algorithm (greedy approach)
  const unassigned = [...sortedTeams];
  const newMatches: any[] = [];
  
  // Handle odd number of teams (give bye to lowest ranked team that hasn't had one)
  if (unassigned.length % 2 !== 0) {
    for (let i = unassigned.length - 1; i >= 0; i--) {
      const team = unassigned[i];
      if (!team.played.includes('dummy')) {
        team.played.push('dummy');
        // We don't need to add a dummy match, or we could just skip them for this round.
        unassigned.splice(i, 1);
        break;
      }
    }
  }

  let matchIndex = 0;
  while (unassigned.length > 1) {
    const home = unassigned.shift()!;
    let opponentIdx = -1;
    
    // Find highest ranked team they haven't played yet
    for (let i = 0; i < unassigned.length; i++) {
      if (!home.played.includes(unassigned[i].id)) {
        opponentIdx = i;
        break;
      }
    }
    
    // If everyone has played everyone (shouldn't happen before max rounds, but just in case), just play the next team.
    if (opponentIdx === -1) {
      opponentIdx = 0;
    }

    const away = unassigned.splice(opponentIdx, 1)[0];
    
    newMatches.push({
      id: `match_swiss_${nextRound}_${matchIndex}_${Date.now()}`,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: null,
      awayScore: null,
      round: nextRound,
      status: 'pending'
    });
    matchIndex++;
  }

  tournament.matches.push(...newMatches);
  await tournament.save();
  
  revalidatePath(`/t/${tournamentId}`);
  return { success: true };
}
