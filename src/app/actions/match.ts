'use server';

import connectToDatabase from '@/lib/mongoose';
import { Tournament } from '@/models/Tournament';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

function hashPin(pin: string) {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

export async function updateMatch(
  tournamentId: string, 
  matchId: string, 
  homeScore: number | null, 
  awayScore: number | null, 
  providedPin?: string
) {
  await connectToDatabase();

  const cookieStore = await cookies();
  const savedPin = cookieStore.get(`tournament_pin_${tournamentId}`)?.value;
  const pin = providedPin || savedPin || '';

  console.log('--- DEBUG PIN ---');
  console.log('Provided PIN:', providedPin);
  console.log('Saved PIN:', savedPin);
  console.log('Final PIN:', pin);

  // Intentamos actualizar directamente el partido si el PIN es correcto
  const hashedInputPin = hashPin(pin);

  const updateResult = await Tournament.updateOne(
    { 
      _id: tournamentId, 
      adminPin: hashedInputPin 
    },
    { 
      $set: { 
        "matches.$[match].homeScore": homeScore,
        "matches.$[match].awayScore": awayScore,
        "matches.$[match].status": (homeScore !== null && awayScore !== null) ? 'finished' : 'pending'
      } 
    },
    { 
      arrayFilters: [ { "match.id": matchId } ] 
    }
  );

  if (updateResult.matchedCount === 0) {
    // Si matchedCount es 0, significa que o el torneo no existe o el PIN es incorrecto
    const exists = await Tournament.exists({ _id: tournamentId });
    if (!exists) return { success: false, error: 'Torneo no encontrado' };
    return { success: false, error: 'PIN incorrecto' };
  }

  if (updateResult.modifiedCount === 0) {
    // Si hubo match pero no se modificó nada (mismos datos), está bien.
  }

  // Lógica de progresión en Llaves (Knockout)
  const isFinished = (homeScore !== null && awayScore !== null);
  if (isFinished) {
    // Necesitamos el match actualizado para ver quién ganó y a dónde va
    const updatedTournament = await Tournament.findById(tournamentId).lean() as any;
    const currentMatch = updatedTournament.matches.find((m: any) => m.id === matchId);
    
    if (currentMatch) {
      let winnerId = null;
      let loserId = null;
      if (homeScore > awayScore) {
        winnerId = currentMatch.homeTeamId;
        loserId = currentMatch.awayTeamId;
      } else if (awayScore > homeScore) {
        winnerId = currentMatch.awayTeamId;
        loserId = currentMatch.homeTeamId;
      }
      
      // En eliminatorias directas no suele haber empates (se definen por penales),
      // Si hay empate, por ahora no avanzamos a nadie hasta que se desempaque.
      
      if (winnerId && loserId) {
        if (currentMatch.nextMatchWinnerId) {
          const winnerSlotUpdate = currentMatch.nextMatchWinnerSlot === 'home' 
            ? { "matches.$[nextMatch].homeTeamId": winnerId } 
            : { "matches.$[nextMatch].awayTeamId": winnerId };

          await Tournament.updateOne(
            { _id: tournamentId },
            { $set: winnerSlotUpdate },
            { arrayFilters: [ { "nextMatch.id": currentMatch.nextMatchWinnerId } ] }
          );
        }

        if (currentMatch.nextMatchLoserId) {
          const loserSlotUpdate = currentMatch.nextMatchLoserSlot === 'home' 
            ? { "matches.$[nextMatch].homeTeamId": loserId } 
            : { "matches.$[nextMatch].awayTeamId": loserId };

          await Tournament.updateOne(
            { _id: tournamentId },
            { $set: loserSlotUpdate },
            { arrayFilters: [ { "nextMatch.id": currentMatch.nextMatchLoserId } ] }
          );
        }
      }
    }
  }

  // Refrescar la página del torneo
  revalidatePath(`/t/${tournamentId}`);

  return { success: true };
}
