import { ITeam, IMatch } from '@/models/Tournament';

export function generateSingleKnockout(teams: ITeam[], doubleRound: boolean = false, randomize: boolean = true): IMatch[] {
  const matches: IMatch[] = [];
  
  // Si randomize es false, asumimos que 'teams' viene ya ordenado por Seed (cabezas de serie)
  const shuffled = randomize ? [...teams].sort(() => Math.random() - 0.5) : [...teams];
  const numTeams = shuffled.length;
  const powerOf2 = Math.pow(2, Math.ceil(Math.log2(numTeams)));
  const byes = powerOf2 - numTeams;
  const slots: (ITeam | null)[] = [];
  let teamIndex = 0;
  for (let i = 0; i < powerOf2; i++) {
    if (i < byes) {
      slots.push(shuffled[teamIndex++]);
      slots.push(null);
      i++;
    } else {
      if (teamIndex < numTeams) slots.push(shuffled[teamIndex++]);
    }
  }

  const numRounds = Math.log2(powerOf2);
  
  for (let i = 0; i < powerOf2 / 2; i++) {
    const home = slots[i * 2];
    const away = slots[i * 2 + 1];
    const isBye = !away;
    const matchId = `match_r1_${i}`;
    
    matches.push({
      id: matchId,
      round: 1,
      homeTeamId: home ? home.id : null,
      awayTeamId: away ? away.id : null,
      homeScore: isBye ? 1 : null,
      awayScore: isBye ? 0 : null,
      status: isBye ? 'finished' : 'pending',
      stage: 'knockout',
      placeholderHome: home ? undefined : `TBD`,
      placeholderAway: away ? undefined : (isBye ? 'BYE' : `TBD`),
      nextMatchWinnerId: `match_r2_${Math.floor(i / 2)}`,
      nextMatchWinnerSlot: i % 2 === 0 ? 'home' : 'away'
    } as any);
  }
  
  for (let r = 2; r <= numRounds; r++) {
    const matchesInRound = Math.pow(2, numRounds - r);
    for (let i = 0; i < matchesInRound; i++) {
      const matchId = `match_r${r}_${i}`;
      const nextMatchWinnerId = r === numRounds ? undefined : `match_r${r + 1}_${Math.floor(i / 2)}`;
      matches.push({
        id: matchId,
        round: r,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'pending',
        stage: 'knockout',
        placeholderHome: `Ganador R${r-1} M${i*2 + 1}`,
        placeholderAway: `Ganador R${r-1} M${i*2 + 2}`,
        nextMatchWinnerId,
        nextMatchWinnerSlot: i % 2 === 0 ? 'home' : 'away'
      } as any);
    }
  }
  
  return matches;
}

export function generateDoubleKnockout(teams: ITeam[], doubleRound: boolean = false, randomize: boolean = true): IMatch[] {
  const matches: IMatch[] = [];
  const shuffled = randomize ? [...teams].sort(() => Math.random() - 0.5) : [...teams];
  
  const numTeams = shuffled.length;
  const powerOf2 = Math.pow(2, Math.ceil(Math.log2(numTeams)));
  const byes = powerOf2 - numTeams;

  // Rellenar con Byes
  const bracketTeams: ITeam[] = [...shuffled];
  for (let i = 0; i < byes; i++) {
    bracketTeams.push({ id: `bye_${i}`, name: 'BYE' });
  }

  const numWBRounds = Math.log2(powerOf2);
  const wbMatches: IMatch[][] = []; // Array of rounds, each is an array of matches
  const lbMatches: IMatch[][] = []; 

  let matchCounter = 1;

  // --- WINNERS BRACKET ---
  for (let r = 0; r < numWBRounds; r++) {
    const roundMatches: IMatch[] = [];
    const numMatchesInRound = powerOf2 / Math.pow(2, r + 1);
    
    for (let m = 0; m < numMatchesInRound; m++) {
      let homeTeamId = null;
      let awayTeamId = null;

      if (r === 0) {
        const team1 = bracketTeams[m * 2];
        const team2 = bracketTeams[m * 2 + 1];
        homeTeamId = team1.id;
        awayTeamId = team2.id;
      }

      roundMatches.push({
        id: `match_wb_${r+1}_${m}_${Date.now()}`,
        homeTeamId: homeTeamId,
        awayTeamId: awayTeamId,
        homeScore: null,
        awayScore: null,
        round: r + 1,
        stage: 'knockout',
        status: 'pending',
        isLosersBracket: false
      });
    }
    wbMatches.push(roundMatches);
  }

  // --- LOSERS BRACKET ---
  const numLBRounds = 2 * numWBRounds - 2;
  
  for (let r = 0; r < numLBRounds; r++) {
    const roundMatches: IMatch[] = [];
    let numMatchesInRound = 0;
    
    if (r === 0) {
      numMatchesInRound = powerOf2 / 4;
    } else if (r % 2 === 1) { // Even LB round (1, 3, 5) -> Receives WB losers
      numMatchesInRound = lbMatches[r-1].length; 
    } else { // Odd LB round (2, 4) -> Winners of LB play each other
      numMatchesInRound = lbMatches[r-1].length / 2;
    }

    for (let m = 0; m < numMatchesInRound; m++) {
      roundMatches.push({
        id: `match_lb_${r+1}_${m}_${Date.now()}`,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        round: r + 1, // Visual round for LB
        stage: 'knockout',
        status: 'pending',
        isLosersBracket: true
      });
    }
    lbMatches.push(roundMatches);
  }

  // --- LINK WINNERS BRACKET ---
  for (let r = 0; r < numWBRounds; r++) {
    for (let m = 0; m < wbMatches[r].length; m++) {
      const match = wbMatches[r][m];
      
      // Link WB winner forward
      if (r < numWBRounds - 1) {
        match.nextMatchWinnerId = wbMatches[r + 1][Math.floor(m / 2)].id;
        match.nextMatchWinnerSlot = m % 2 === 0 ? 'home' : 'away';
      }
      
      // Link WB loser down to LB
      if (numLBRounds > 0) {
        if (r === 0) { // Losers of WB R1 go to LB R1
          match.nextMatchLoserId = lbMatches[0][Math.floor(m / 2)].id;
          match.nextMatchLoserSlot = m % 2 === 0 ? 'home' : 'away';
        } else {
          // Losers of WB R2+ go to LB R2, R4, R6... (which are index 1, 3, 5)
          const targetLBRound = r * 2 - 1; 
          // Cross-matching to avoid playing the same team again too early
          // We reverse the order of losers dropping down
          const targetMatchIdx = (wbMatches[r].length - 1) - m; 
          
          match.nextMatchLoserId = lbMatches[targetLBRound][targetMatchIdx].id;
          // Home slot is usually reserved for the team dropping from WB
          match.nextMatchLoserSlot = 'home';
        }
      }
    }
  }

  // --- LINK LOSERS BRACKET ---
  for (let r = 0; r < numLBRounds; r++) {
    for (let m = 0; m < lbMatches[r].length; m++) {
      const match = lbMatches[r][m];
      
      if (r < numLBRounds - 1) {
        if (r % 2 === 0) { 
          // From LB R1 -> LB R2 (straight across, 1 to 1)
          match.nextMatchWinnerId = lbMatches[r + 1][m].id;
          match.nextMatchWinnerSlot = 'away'; // 'home' is the WB drop
        } else {
          // From LB R2 -> LB R3 (2 to 1, normal pairing)
          match.nextMatchWinnerId = lbMatches[r + 1][Math.floor(m / 2)].id;
          match.nextMatchWinnerSlot = m % 2 === 0 ? 'home' : 'away';
        }
      }
    }
  }

  // --- GRAND FINAL ---
  const grandFinalId = `match_gf_1_0_${Date.now()}`;
  const grandFinal: IMatch = {
    id: grandFinalId,
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    round: numWBRounds + 1, // visually after WB final
    stage: 'knockout',
    status: 'pending',
    isLosersBracket: false
  };

  // Link WB Final winner to GF home
  if (numWBRounds > 0) {
    const wbFinal = wbMatches[numWBRounds - 1][0];
    wbFinal.nextMatchWinnerId = grandFinalId;
    wbFinal.nextMatchWinnerSlot = 'home';
    
    // Si no hay losers bracket, el perdedor de la final no va a ningun lado
    if (numLBRounds > 0) {
      // In Double Elim, the loser of WB Final goes to LB Final
      wbFinal.nextMatchLoserId = lbMatches[numLBRounds - 1][0].id;
      wbFinal.nextMatchLoserSlot = 'home';
    }
  }

  // Link LB Final winner to GF away
  if (numLBRounds > 0) {
    const lbFinal = lbMatches[numLBRounds - 1][0];
    lbFinal.nextMatchWinnerId = grandFinalId;
    lbFinal.nextMatchWinnerSlot = 'away';
  }

  // Resolve Byes in WB R1 automatically (this happens dynamically usually, but we can set them to null scores later if we want)
  // Our schema handles byes manually or through UI.
  
  wbMatches.forEach(r => matches.push(...r));
  lbMatches.forEach(r => matches.push(...r));
  matches.push(grandFinal);

  return matches;
}
