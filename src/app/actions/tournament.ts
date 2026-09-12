'use server';

import connectToDatabase from '@/lib/mongoose';
import { Tournament } from '@/models/Tournament';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { generateSingleKnockout } from '@/lib/tournament/knockout';

function hashPin(pin: string) {
  // Un hash simple para el PIN. En una app bancaria usaríamos bcrypt, 
  // pero para esto SHA-256 es suficientemente bueno.
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

export async function createTournament(formData: FormData) {
  const name = formData.get('name') as string;
  const format = formData.get('format') as string;
  const pin = formData.get('pin') as string;
  const doubleRound = formData.get('doubleRound') === 'on';
  const teamsListStr = formData.get('teamsList') as string;
  
  // Temporal: Leer phase1 y phase2 si format === 'multiphase'
  const phase1 = formData.get('phase1') as string;
  const phase2 = formData.get('phase2') as string;

  if (!['league', 'knockout_single', 'knockout_double', 'swiss', 'multiphase'].includes(format)) {
    // TODO: Implement other formats from the implementation plan
    throw new Error(`El formato ${format} aún está en construcción.`);
  }

  const teamNames = JSON.parse(teamsListStr) as string[];
  if (teamNames.length < 2) {
    throw new Error('Se necesitan al menos 2 equipos');
  }

  await connectToDatabase();

  const teams = teamNames.map((tName, index) => ({
    id: `team_${index + 1}`,
    name: tName
  }));

  // Generar Fixture (Calendario)
  let matches: any[] = [];
  if (format === 'league') {
    const teamsList = [...teams];
    const isOdd = teamsList.length % 2 !== 0;
    if (isOdd) {
      teamsList.push({ id: 'dummy', name: 'Descansa' });
    }

    const numTeams = teamsList.length;
    const numRounds = numTeams - 1;
    const half = numTeams / 2;
    
    // Extraer y fijar el primer equipo
    const fixedTeam = teamsList.shift()!;

    for (let round = 0; round < numRounds; round++) {
      const currentRoundTeams = [fixedTeam, ...teamsList];

      for (let match = 0; match < half; match++) {
        const home = currentRoundTeams[match];
        const away = currentRoundTeams[currentRoundTeams.length - 1 - match];

        if (home.id !== 'dummy' && away.id !== 'dummy') {
          // Alternar localía por ronda para más equidad
          const isHome = round % 2 === 0;
          matches.push({
            id: `match_ida_${round}_${match}_${Date.now()}`,
            homeTeamId: isHome ? home.id : away.id,
            awayTeamId: isHome ? away.id : home.id,
            homeScore: null,
            awayScore: null,
            round: round + 1,
            status: 'pending'
          });

          // Si es ida y vuelta, añadimos el partido de vuelta en las siguientes rondas
          if (doubleRound) {
            matches.push({
              id: `match_vuelta_${round}_${match}_${Date.now()}`,
              homeTeamId: isHome ? away.id : home.id, // Invertimos localía
              awayTeamId: isHome ? home.id : away.id,
              homeScore: null,
              awayScore: null,
              round: round + 1 + numRounds, // Se juega en la segunda mitad del torneo
              status: 'pending'
            });
          }
        }
      }

      // Rotar equipos (el último pasa al principio de los rotables)
      const last = teamsList.pop()!;
      teamsList.unshift(last);
    }
  } else if (format === 'knockout_single') {
    matches = generateSingleKnockout(teams, doubleRound);
  } else if (format === 'knockout_double') {
    const { generateDoubleKnockout } = await import('@/lib/tournament/knockout');
    matches = generateDoubleKnockout(teams, doubleRound);
  } else if (format === 'swiss') {
    // Generate only Round 1 (random pairings)
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const isOdd = shuffledTeams.length % 2 !== 0;
    if (isOdd) {
      shuffledTeams.push({ id: 'dummy', name: 'Descansa' });
    }
    const numTeams = shuffledTeams.length;
    const half = numTeams / 2;
    for (let match = 0; match < half; match++) {
      const home = shuffledTeams[match * 2];
      const away = shuffledTeams[match * 2 + 1];
      if (home.id !== 'dummy' && away.id !== 'dummy') {
        matches.push({
          id: `match_swiss_1_${match}_${Date.now()}`,
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeScore: null,
          awayScore: null,
          round: 1,
          status: 'pending'
        });
      }
    }
  } else if (format === 'multiphase' && phase1 === 'group_league') {
    // Determine number of groups. Optimal is 4 teams per group.
    const numTeams = teams.length;
    let groupCount = Math.max(1, Math.floor(numTeams / 4));
    if (numTeams % 4 !== 0 && groupCount > 1 && (numTeams / groupCount) < 3) {
      // Si dividir en grupos de 4 deja grupos muy pequeños (ej: 2 equipos), ajustamos.
      groupCount = Math.max(1, Math.floor(numTeams / 3));
    }
    if (groupCount > 8) groupCount = 8; // Max 8 groups (A-H)
    
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const groups: Record<string, any[]> = {};
    for (let i = 0; i < groupCount; i++) {
      groups[groupNames[i]] = [];
    }
    
    // Distribute teams evenly
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    shuffledTeams.forEach((team, index) => {
      const groupName = groupNames[index % groupCount];
      groups[groupName].push(team);
    });

    // Generate Round Robin for each group
    Object.keys(groups).forEach(groupName => {
      const groupTeams = groups[groupName];
      const isOdd = groupTeams.length % 2 !== 0;
      if (isOdd) {
        groupTeams.push({ id: 'dummy', name: 'Descansa' });
      }

      const numGroupTeams = groupTeams.length;
      const numRounds = numGroupTeams - 1;
      const half = numGroupTeams / 2;
      const fixedTeam = groupTeams.shift()!;

      for (let round = 0; round < numRounds; round++) {
        const currentRoundTeams = [fixedTeam, ...groupTeams];
        for (let match = 0; match < half; match++) {
          const home = currentRoundTeams[match];
          const away = currentRoundTeams[currentRoundTeams.length - 1 - match];
          if (home.id !== 'dummy' && away.id !== 'dummy') {
            const isHome = round % 2 === 0;
            matches.push({
              id: `match_g${groupName}_ida_${round}_${match}_${Date.now()}`,
              homeTeamId: isHome ? home.id : away.id,
              awayTeamId: isHome ? away.id : home.id,
              homeScore: null,
              awayScore: null,
              round: round + 1,
              group: groupName,
              stage: 'phase1',
              status: 'pending'
            });
            if (doubleRound) {
              matches.push({
                id: `match_g${groupName}_vuelta_${round}_${match}_${Date.now()}`,
                homeTeamId: isHome ? away.id : home.id,
                awayTeamId: isHome ? home.id : away.id,
                homeScore: null,
                awayScore: null,
                round: round + 1 + numRounds,
                group: groupName,
                stage: 'phase1',
                status: 'pending'
              });
            }
          }
        }
        const last = groupTeams.pop()!;
        groupTeams.unshift(last);
      }
    });
  }

  const tournament = new Tournament({
    name,
    format,
    phase1: format === 'multiphase' ? phase1 : undefined,
    phase2: format === 'multiphase' ? phase2 : undefined,
    adminPin: hashPin(pin),
    teams,
    matches
  });

  const saved = await tournament.save();

  // Redirigir a la vista del torneo
  redirect(`/t/${saved._id.toString()}`);
}