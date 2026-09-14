'use client';

import { useState } from 'react';
import { createTournament } from '@/app/actions/tournament';
import { Trophy, Shield, Users, Save, X, Settings2 } from 'lucide-react';

export default function CrearTorneo() {
  const [teamInput, setTeamInput] = useState('');
  const [teams, setTeams] = useState<string[]>([]);
  const [isMultiPhase, setIsMultiPhase] = useState(false);
  const [doubleRound, setDoubleRound] = useState(false);
  const [loading, setLoading] = useState(false);

  const addCurrentInput = (inputVal: string) => {
    if (!inputVal.trim()) return;
    
    // Separar por comas o saltos de línea (ideal para copiar/pegar)
    const newTeams = inputVal.split(/[\n,]/).map(t => t.trim()).filter(t => t);
    
    setTeams(prevTeams => {
      const uniqueNew = newTeams.filter(t => !prevTeams.includes(t));
      return [...prevTeams, ...uniqueNew];
    });
    setTeamInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      addCurrentInput(teamInput);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Si el usuario escribe una coma en el móvil, lo convertimos automáticamente
    if (val.includes(',') || val.includes('\n')) {
      addCurrentInput(val);
    } else {
      setTeamInput(val);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    addCurrentInput(pasted);
  };

  const removeTeam = (teamToRemove: string) => {
    setTeams(teams.filter(t => t !== teamToRemove));
  };

  return (
    <div className="max-w-4xl mx-auto p-3 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-neon/10 rounded-full">
          <Trophy className="w-8 h-8 text-neon" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Nuevo Torneo</h1>
          <p className="text-gray-400 text-sm">Configura tu competición de e-sports</p>
        </div>
      </div>

      <form action={async (formData) => {
        setLoading(true);
        // Inject teams into formData
        formData.append('teamsList', JSON.stringify(teams));
        await createTournament(formData);
        // Nota: createTournament redirige, no hace falta setLoading(false) a menos que haya error
      }} className="glass-panel p-4 md:p-8 flex flex-col gap-6 md:gap-8">
        
        {/* Nombre del Torneo */}
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-bold text-gray-300">
            Nombre del Torneo
          </label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            required 
            placeholder="Ej: Copa Amigos 2026"
            className="glass-input text-lg font-bold placeholder:font-normal"
          />
        </div>

        {/* Tipo de Fases */}
        <div className="flex flex-col gap-4">
          <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-neon" />
            Estructura del Torneo
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setIsMultiPhase(false)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${!isMultiPhase ? 'border-neon bg-neon/5' : 'border-white/10 hover:border-white/30'}`}
            >
              <h3 className="font-bold text-white mb-1">Fase Única</h3>
              <p className="text-xs text-gray-400">Liga, Eliminatoria Directa o Sistema Suizo</p>
            </div>
            <div 
              onClick={() => setIsMultiPhase(true)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isMultiPhase ? 'border-neon bg-neon/5' : 'border-white/10 hover:border-white/30'}`}
            >
              <h3 className="font-bold text-white mb-1">Multifase</h3>
              <p className="text-xs text-gray-400">Grupos + Eliminatorias (Estilo Mundial o Champions)</p>
            </div>
          </div>
        </div>

        {/* Formatos Selectores */}
        {!isMultiPhase ? (
          <div className="tour-format flex flex-col gap-2 animate-in fade-in">
            <label htmlFor="format" className="text-sm font-bold text-gray-300">Formato</label>
            <select id="format" name="format" className="glass-input appearance-none cursor-pointer">
              <option value="league" className="bg-black text-white">Liga (Todos contra todos)</option>
              <option value="knockout_single" className="bg-black text-white">Cuadro Eliminatorio (Single Elimination)</option>
              <option value="knockout_double" className="bg-black text-white">Cuadro Doble Eliminación</option>
              <option value="swiss" className="bg-black text-white">Sistema Suizo</option>
            </select>
          </div>
        ) : (
          <div className="tour-format grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            <div className="flex flex-col gap-2">
              <label htmlFor="phase1" className="text-sm font-bold text-gray-300">Fase 1 (Clasificación)</label>
              <select id="phase1" name="phase1" className="glass-input appearance-none cursor-pointer">
                <option value="group_league" className="bg-black text-white">Grupos (Todos contra todos)</option>
                <option value="group_swiss" className="bg-black text-white">Fase Suiza</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="phase2" className="text-sm font-bold text-gray-300">Fase 2 (Playoffs)</label>
              <select id="phase2" name="phase2" className="glass-input appearance-none cursor-pointer">
                <option value="knockout_single" className="bg-black text-white">Cuadro Eliminatorio</option>
                <option value="knockout_double" className="bg-black text-white">Cuadro Doble Eliminación</option>
                <option value="knockout_cup_consolation" className="bg-black text-white">Copa Oro y Consuelo</option>
              </select>
            </div>
            <input type="hidden" name="format" value="multiphase" />
          </div>
        )}

        {/* Ida y Vuelta Switch */}
        <div className="flex items-center justify-between glass-panel p-4 bg-white/5 border-none">
          <div>
            <h4 className="font-bold text-white text-sm">Partidos de Ida y Vuelta</h4>
            <p className="text-xs text-gray-400">Jugar a doble partido (local y visitante)</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              name="doubleRound" 
              className="sr-only peer" 
              checked={doubleRound}
              onChange={(e) => setDoubleRound(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon"></div>
          </label>
        </div>

        {/* Equipos (Tag Input) */}
        <div className="tour-teams flex flex-col gap-2">
          <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-neon" />
            Equipos Participantes ({teams.length})
          </label>
          <p className="text-xs text-gray-400 mb-2">Escribe el nombre del equipo y presiona <strong>Enter</strong> o <strong>Coma</strong> para agregarlo.</p>
          
          <div className="glass-input min-h-[100px] flex flex-wrap gap-2 p-3 items-start">
            {teams.map((team, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-neon/20 text-neon border border-neon/50 px-3 py-1 rounded-full text-sm font-bold animate-in zoom-in duration-200">
                {team}
                <button 
                  type="button" 
                  onClick={() => removeTeam(team)}
                  className="ml-1 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex-1 min-w-[200px] flex items-center bg-transparent border-b border-transparent focus-within:border-neon transition-colors">
              <input 
                type="text"
                value={teamInput}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={teams.length === 0 ? "Ej: Real Madrid, presiona Enter" : "Agregar equipo..."}
                className="bg-transparent outline-none text-white w-full text-sm py-2"
                enterKeyHint="done"
              />
              {teamInput.trim() && (
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.preventDefault();
                    addCurrentInput(teamInput);
                  }}
                  className="text-black bg-neon px-3 py-1 text-xs font-bold rounded-lg transition-colors ml-2 hover:bg-white"
                >
                  Añadir
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PIN de Seguridad */}
        <div className="flex flex-col gap-2">
          <label htmlFor="pin" className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-neon" />
            PIN de Administración
          </label>
          <p className="text-xs text-gray-400 mb-1">Necesitarás este PIN para cargar los resultados de los partidos. ¡No lo olvides!</p>
          <input 
            type="password" 
            id="pin" 
            name="pin" 
            required 
            placeholder="Escribe un PIN seguro"
            className="glass-input tracking-widest text-lg font-mono w-full md:w-1/2"
          />
        </div>

        <hr className="border-white/10 my-2" />

        {/* Submit */}
        <button 
          type="submit" 
          disabled={loading || teams.length < 2}
          className="btn-neon self-end w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <span className="animate-pulse">Generando Torneo...</span>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Crear y Generar Calendario
            </>
          )}
        </button>

      </form>
    </div>
  );
}
