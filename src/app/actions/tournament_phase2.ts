'use server';

import connectToDatabase from '@/lib/mongoose';
import { Tournament } from '@/models/Tournament';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

function hashPin(pin: string) {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

export async function generatePhase2Knockout(tournamentId: string, pin: string) {
  await connectToDatabase();
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return { success: false, error: 'Torneo no encontrado' };
  
  if (tournament.adminPin !== hashPin(pin)) {
    return { success: false, error: 'PIN incorrecto' };
  }

  // Verificar que estamos en fase de grupos y ya terminó
  const isMultiphase = tournament.format === 'multiphase';
  if (!isMultiphase) return { success: false, error: 'Este torneo no es multifase' };
  
  const phase1Matches = tournament.matches.filter(m => m.stage === 'phase1');
  const allPhase1Finished = phase1Matches.length > 0 && phase1Matches.every(m => m.status === 'finished');
  
  if (!allPhase1Finished) return { success: false, error: 'Aún hay partidos pendientes en la fase de grupos.' };

  const hasPhase2Matches = tournament.matches.some(m => m.stage === 'phase2');
  if (hasPhase2Matches) return { success: false, error: 'Las llaves ya fueron generadas.' };

  // Calcular las posiciones por grupo
  const standings: Record<string, any> = {};
  tournament.teams.forEach(t => {
    const firstMatch = phase1Matches.find(m => m.homeTeamId === t.id || m.awayTeamId === t.id);
    const group = firstMatch?.group || 'A';
    standings[t.id] = { id: t.id, name: t.name, pts: 0, gd: 0, gf: 0, group };
  });

  phase1Matches.forEach(m => {
    if (m.homeScore !== null && m.awayScore !== null) {
      const home = standings[m.homeTeamId!];
      const away = standings[m.awayTeamId!];
      home.gf += m.homeScore; away.gf += m.awayScore;
      home.gd += (m.homeScore - m.awayScore); away.gd += (m.awayScore - m.homeScore);
      if (m.homeScore > m.awayScore) home.pts += 3;
      else if (m.homeScore < m.awayScore) away.pts += 3;
      else { home.pts += 1; away.pts += 1; }
    }
  });

  const sortedStandings = Object.values(standings).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  const byGroup: Record<string, any[]> = {};
  sortedStandings.forEach(t => {
    if (!byGroup[t.group]) byGroup[t.group] = [];
    byGroup[t.group].push(t);
  });

  // Extraer los clasificados según el formato de phase2
  let goldTeams: any[] = [];
  let consolationTeams: any[] = [];

  Object.keys(byGroup).forEach(g => {
    goldTeams.push(...byGroup[g].slice(0, 2));
    if (tournament.phase2 === 'knockout_cup_consolation') {
      consolationTeams.push(...byGroup[g].slice(2, 4));
    }
  });

  // Ordenar los clasificados (Seed) para Oro
  const firstPlaces = goldTeams.filter((_, i) => i % 2 === 0);
  const secondPlaces = goldTeams.filter((_, i) => i % 2 !== 0);
  const seedOrderedGold = [...firstPlaces, ...secondPlaces.reverse()];

  // Generar bracket
  const { generateSingleKnockout, generateDoubleKnockout } = await import('@/lib/tournament/knockout');
  
  let knockoutMatches: any[] = [];
  
  if (tournament.phase2 === 'knockout_double') {
    knockoutMatches = generateDoubleKnockout(seedOrderedGold, false, false);
  } else {
    knockoutMatches = generateSingleKnockout(seedOrderedGold, false, false);
  }
  
  const numRoundsPhase1 = Math.max(...phase1Matches.map(m => m.round));
  
  // Si hay Copa Consuelo, generar una segunda llave
  let consolationMatches: any[] = [];
  if (tournament.phase2 === 'knockout_cup_consolation' && consolationTeams.length > 0) {
    const thirdPlaces = consolationTeams.filter((_, i) => i % 2 === 0);
    const fourthPlaces = consolationTeams.filter((_, i) => i % 2 !== 0);
    const seedOrderedConsolation = [...thirdPlaces, ...fourthPlaces.reverse()];
    
    consolationMatches = generateSingleKnockout(seedOrderedConsolation, false, false);
    
    // Marcar los de consuelo como "isLosersBracket: true" para que se renderice como llave secundaria en el cliente
    consolationMatches = consolationMatches.map(m => ({
      ...m,
      id: `consolation_${m.id}`,
      isLosersBracket: true,
      nextMatchWinnerId: m.nextMatchWinnerId ? `consolation_${m.nextMatchWinnerId}` : undefined,
      nextMatchLoserId: m.nextMatchLoserId ? `consolation_${m.nextMatchLoserId}` : undefined,
    }));
  }

  const allPhase2Raw = [...knockoutMatches, ...consolationMatches];
  
  // Ajustar las llaves para que correspondan a phase2 y no interfieran IDs con phase1
  const formattedMatches = allPhase2Raw.map(m => ({
    ...m,
    id: `phase2_${m.id}`,
    round: m.round + numRoundsPhase1,
    stage: 'phase2',
    nextMatchWinnerId: m.nextMatchWinnerId ? `phase2_${m.nextMatchWinnerId}` : undefined,
    nextMatchLoserId: m.nextMatchLoserId ? `phase2_${m.nextMatchLoserId}` : undefined,
  }));

  tournament.matches.push(...formattedMatches);
  await tournament.save();
  
  revalidatePath(`/t/${tournamentId}`);
  return { success: true };
}
