import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITeam {
  id: string;
  name: string;
  logo?: string;
}

export interface IMatch {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  round: number; // Jornada o Fase
  group?: string; // Si pertenece a un grupo "A", "B", etc.
  status: 'pending' | 'finished';
  // Advanced format fields
  stage?: 'phase1' | 'phase2' | 'knockout';
  isLosersBracket?: boolean;
  nextMatchWinnerId?: string;
  nextMatchWinnerSlot?: 'home' | 'away';
  nextMatchLoserId?: string;
  nextMatchLoserSlot?: 'home' | 'away';
  placeholderHome?: string; // e.g. "Ganador M1", "1ro Grupo A"
  placeholderAway?: string;
}

export interface ITournament extends Document {
  name: string;
  format: string; // 'league', 'knockout_single', 'knockout_double', 'swiss', 'multiphase'
  phase1?: string; // 'group_league', 'group_swiss'
  phase2?: string; // 'knockout_single', 'knockout_double', 'knockout_cup_consolation'
  adminPin: string; // Hashed
  teams: ITeam[];
  matches: IMatch[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  logo: { type: String }
});

const MatchSchema = new Schema<IMatch>({
  id: { type: String, required: true },
  homeTeamId: { type: String }, // Puede ser nulo si el equipo aún no se ha clasificado en llaves
  awayTeamId: { type: String },
  homeScore: { type: Number, default: null },
  awayScore: { type: Number, default: null },
  round: { type: Number, required: true },
  group: { type: String },
  status: { type: String, enum: ['pending', 'finished'], default: 'pending' },
  stage: { type: String },
  isLosersBracket: { type: Boolean, default: false },
  nextMatchWinnerId: { type: String },
  nextMatchWinnerSlot: { type: String },
  nextMatchLoserId: { type: String },
  nextMatchLoserSlot: { type: String },
  placeholderHome: { type: String },
  placeholderAway: { type: String }
});

const TournamentSchema = new Schema<ITournament>({
  name: { type: String, required: true },
  format: { type: String, required: true },
  phase1: { type: String },
  phase2: { type: String },
  adminPin: { type: String, required: true },
  teams: [TeamSchema],
  matches: [MatchSchema],
}, {
  timestamps: true // Automáticamente añade createdAt y updatedAt
});

// Para evitar sobrescribir el modelo durante el hot reload de Next.js
export const Tournament: Model<ITournament> = mongoose.models.Tournament || mongoose.model<ITournament>('Tournament', TournamentSchema);
