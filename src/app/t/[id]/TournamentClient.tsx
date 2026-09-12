'use client';

import { useState, useEffect } from 'react';
import { updateMatch } from '@/app/actions/match';
import { Trophy, Calendar, Lock, Unlock, Loader2, Save, Share2, Download, Settings2 } from 'lucide-react';
import Confetti from 'react-confetti';
import BracketVisualizer from '@/components/BracketVisualizer';

export default function TournamentClient({ tournament }: { tournament: any }) {
  const [pin, setPin] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Custom Dialogs
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialogConfig({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const showAlert = (title: string, message: string) => {
    setDialogConfig({ isOpen: true, title, message, type: 'alert' });
  };
  
  // Para el Confetti
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Al cargar, verificar si hay un PIN guardado para este torneo
  useEffect(() => {
    // Leer cookie de forma segura en el cliente
    const match = document.cookie.match(new RegExp('(^| )' + `tournament_pin_${tournament._id}` + '=([^;]+)'));
    if (match) {
      setPin(match[2]);
      setIsAdmin(true); 
    }
  }, [tournament._id]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length > 0) {
      document.cookie = `tournament_pin_${tournament._id}=${pin}; path=/; max-age=2592000`; // 30 días
      setIsAdmin(true);
      setShowPinModal(false);
      setPinError('');
    }
  };

  const handleLogout = () => {
    document.cookie = `tournament_pin_${tournament._id}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    setPin('');
    setIsAdmin(false);
  };

  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [tempHomeScore, setTempHomeScore] = useState('');
  const [tempAwayScore, setTempAwayScore] = useState('');

  const openMatchEditor = (match: any) => {
    if (!isAdmin) {
      setShowPinModal(true);
      setPinError('Debes ingresar el PIN del torneo para editar los resultados.');
      return;
    }
    
    // Evitar editar partidos que aún no tienen equipos definidos
    if (!match.homeTeamId || !match.awayTeamId) {
      showAlert('Partido Bloqueado', 'Aún no se han definido los equipos para este partido. Por favor juega las rondas previas primero.');
      return;
    }

    setEditingMatch(match);
    setTempHomeScore(match.homeScore !== null ? String(match.homeScore) : '');
    setTempAwayScore(match.awayScore !== null ? String(match.awayScore) : '');
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    
    if (!isAdmin) {
      setEditingMatch(null); // Ocultar el editor
      setShowPinModal(true); // Mostrar el modal del PIN
      return;
    }
    
    setLoading(true);
    setPinError('');

    const homeScore = tempHomeScore === '' ? null : parseInt(tempHomeScore);
    const awayScore = tempAwayScore === '' ? null : parseInt(tempAwayScore);

    const result = await updateMatch(tournament._id, editingMatch.id, homeScore, awayScore, pin);
    
    if (!result.success) {
      if (result.error === 'PIN incorrecto') {
        handleLogout();
        setShowPinModal(true);
        setPinError('El PIN es incorrecto o ha caducado.');
      } else {
        showAlert('Error', result.error || 'Hubo un problema al guardar el resultado.');
      }
    } else {
      setEditingMatch(null); // Cerrar el popup en éxito
    }
    setLoading(false);
  };

  const calculateStandings = () => {
    const standings: Record<string, any> = {};

    tournament.teams.forEach((t: any) => {
      // Find which group this team belongs to by looking at its first match
      const firstMatch = tournament.matches.find((m: any) => m.homeTeamId === t.id || m.awayTeamId === t.id);
      const group = firstMatch?.group || 'Único';
      standings[t.id] = { id: t.id, name: t.name, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, group };
    });

    tournament.matches.forEach((m: any) => {
      if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
        const home = standings[m.homeTeamId];
        const away = standings[m.awayTeamId];

        if (!home || !away) return;

        home.p += 1;
        away.p += 1;
        home.gf += m.homeScore;
        away.gf += m.awayScore;
        home.ga += m.awayScore;
        away.ga += m.homeScore;
        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;

        if (m.homeScore > m.awayScore) {
          home.pts += 3;
          home.w += 1;
          away.l += 1;
        } else if (m.homeScore < m.awayScore) {
          away.pts += 3;
          away.w += 1;
          home.l += 1;
        } else {
          home.pts += 1;
          away.pts += 1;
          home.d += 1;
          away.d += 1;
        }
      }
    });

    const sortedStandings = Object.values(standings).sort((a: any, b: any) => {
      if (b.pts !== a.pts) return b.pts - a.pts; // Puntos
      if (b.gd !== a.gd) return b.gd - a.gd;     // Diferencia de goles
      return b.gf - a.gf;                        // Goles a favor
    });
    
    // Group them
    const byGroup: Record<string, any[]> = {};
    sortedStandings.forEach((t: any) => {
      if (!byGroup[t.group]) byGroup[t.group] = [];
      byGroup[t.group].push(t);
    });
    
    return { flat: sortedStandings, byGroup };
  };

  const standings = calculateStandings();
  const rounds = [...new Set(tournament.matches.map((m: any) => m.round))].sort((a: any, b: any) => a - b);
  
  const allMatchesFinished = tournament.matches.length > 0 && tournament.matches.every((m: any) => m.status === 'finished');
  
  // En torneos multifase, no hemos terminado si no existen partidos de la fase 2
  const hasPhase2Matches = tournament.matches.some((m: any) => m.stage === 'phase2' || m.stage === 'knockout');
  const isMultiphase = tournament.format === 'multiphase';
  
  // En Suizo, cada ronda termina todos los partidos.
  const currentMaxRound = tournament.matches.length > 0 ? Math.max(...tournament.matches.map((m: any) => m.round)) : 0;
  const isSwissMaxRounds = tournament.format === 'swiss' && currentMaxRound >= tournament.teams.length - 1;
  
  const isFinished = allMatchesFinished && (!isMultiphase || hasPhase2Matches);
  const phase1Finished = isMultiphase && allMatchesFinished && !hasPhase2Matches;
  const swissRoundFinished = tournament.format === 'swiss' && allMatchesFinished && !isSwissMaxRounds;
  
  let winner = null;
  if (isFinished) {
    if (tournament.format === 'knockout_single' || tournament.format === 'knockout_double' || hasPhase2Matches) {
      let finalMatch = tournament.matches.filter((m: any) => m.stage === 'knockout' || m.stage === 'phase2')[0];
      for (const m of tournament.matches) {
        if ((m.stage === 'knockout' || m.stage === 'phase2') && m.round > finalMatch.round) {
          finalMatch = m;
        }
      }
      if (finalMatch && finalMatch.homeScore !== null && finalMatch.awayScore !== null) {
        const winnerId = finalMatch.homeScore > finalMatch.awayScore ? finalMatch.homeTeamId : finalMatch.awayTeamId;
        const wTeam = tournament.teams.find((t: any) => t.id === winnerId);
        if (wTeam) {
          winner = { name: wTeam.name, pts: '-', gd: '-', gf: '-' };
        }
      }
    } else {
      winner = standings.flat[0];
    }
  }

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: tournament.name,
          text: `¡Sigue los resultados de ${tournament.name} en vivo!`,
          url: url,
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      navigator.clipboard.writeText(url);
      showAlert('¡Listo!', '¡Enlace copiado al portapapeles!');
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tournament, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", tournament.name.replace(/\s+/g, '_') + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <>
      {isFinished && (
        <Confetti 
          width={windowSize.width} 
          height={windowSize.height} 
          recycle={false} 
          numberOfPieces={800} 
          gravity={0.15}
          colors={['#ccff00', '#ffffff', '#18181b', '#b3e600']}
          style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0 }}
        />
      )}

      {/* Header */}
      <div className="glass-panel p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border-l-4 border-l-neon overflow-hidden">
        <div className="w-full md:w-auto overflow-hidden">
          <h1 className="text-2xl md:text-3xl font-black truncate">{tournament.name}</h1>
          <p className="text-gray-400 capitalize">
            {tournament.format === 'league' ? 'Liga' : 
             tournament.format === 'knockout_single' ? 'Eliminatoria' : 
             tournament.format === 'multiphase' ? 'Fase de Grupos' : tournament.format} • {tournament.teams.length} Equipos
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end w-full md:w-auto">
          <button onClick={handleShare} className="tour-share btn-glass text-sm px-3 py-2" title="Compartir">
            <Share2 className="w-4 h-4" />
          </button>
          
          <button onClick={handleExport} className="btn-glass text-sm px-3 py-2" title="Exportar JSON">
            <Download className="w-4 h-4" />
          </button>

          {isAdmin ? (
            <div className="flex items-center gap-4 ml-2 md:ml-4 pl-2 md:pl-4 border-l border-white/10">
              <span className="text-neon text-sm flex items-center gap-1 font-bold">
                <Unlock className="w-4 h-4" /> Admin
              </span>
              <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">
                Salir
              </button>
            </div>
          ) : (
            <button onClick={() => setShowPinModal(true)} className="tour-admin-btn btn-glass text-sm ml-2 md:ml-4">
              <Lock className="w-4 h-4 mr-2" />
              Editar
            </button>
          )}
        </div>
      </div>

      {/* Cartel de Campeón (Diseño para Redes) */}
      {isFinished && winner && (
        <div className="flex justify-center mb-10 w-full overflow-hidden px-2">
          <div className="relative overflow-hidden rounded-3xl p-1 bg-gradient-to-br from-neon via-green-500 to-black w-full max-w-4xl shadow-[0_0_80px_rgba(204,255,0,0.3)] animate-in zoom-in duration-1000">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon/30 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full"></div>
            
            <div className="bg-black/90 backdrop-blur-3xl rounded-[22px] p-6 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10 border border-white/5 w-full">
              <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon/10 border border-neon/30 text-neon text-xs md:text-sm font-bold tracking-widest mb-6 uppercase">
                  🏆 ¡Campeón Oficial!
                </div>
                <h3 className="text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 leading-tight break-words w-full">
                  {winner.name}
                </h3>
                <p className="text-gray-400 text-sm md:text-lg uppercase tracking-[0.1em] md:tracking-[0.2em] break-words w-full">{tournament.name}</p>
                
                {tournament.format !== 'knockout_single' && (
                  <div className="mt-8 grid grid-cols-3 gap-2 md:gap-6 bg-white/5 rounded-2xl p-4 md:p-6 w-full border border-white/5">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-2xl md:text-3xl font-black text-white">{winner.pts}</span>
                      <span className="text-[10px] md:text-xs text-gray-500 uppercase font-bold mt-1">Puntos</span>
                    </div>
                    <div className="flex flex-col items-center justify-center border-x border-white/10">
                      <span className="text-2xl md:text-3xl font-black text-neon">+{winner.gd}</span>
                      <span className="text-[10px] md:text-xs text-gray-500 uppercase font-bold mt-1 text-center">Dif. Goles</span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-2xl md:text-3xl font-black text-white">{winner.gf}</span>
                      <span className="text-[10px] md:text-xs text-gray-500 uppercase font-bold mt-1 text-center">A Favor</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 flex items-center justify-center relative w-full md:w-auto mt-6 md:mt-0">
                <div className="absolute inset-0 bg-neon/20 blur-3xl rounded-full"></div>
                <Trophy className="w-32 h-32 md:w-64 md:h-64 text-neon relative z-10 drop-shadow-[0_0_30px_rgba(204,255,0,0.8)]" style={{ filter: 'drop-shadow(0 0 20px #ccff00)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fase 1 Terminada - Esperando Fase 2 */}
      {phase1Finished && isAdmin && (
        <div className="glass-panel p-8 mb-8 border-l-4 border-l-neon bg-neon/5 flex flex-col items-center justify-center text-center animate-in fade-in">
          <h2 className="text-2xl font-black text-white mb-2">¡Fase de Grupos Completada!</h2>
          <p className="text-gray-400 mb-6">Todos los partidos de la primera fase han finalizado. Es momento de generar las llaves eliminatorias.</p>
          <button 
            onClick={() => {
              showConfirm(
                'Generar Llaves',
                '¿Estás seguro de generar las llaves? Los 2 mejores equipos de cada grupo clasificarán automáticamente.',
                async () => {
                  setLoading(true);
                  const { generatePhase2Knockout } = await import('@/app/actions/tournament_phase2');
                  const result = await generatePhase2Knockout(tournament._id, pin);
                  if (!result.success) {
                    showAlert('Error', result.error || 'No se pudo generar');
                  }
                  setLoading(false);
                }
              );
            }}
            disabled={loading}
            className="btn-neon px-8 py-3 text-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings2 className="w-5 h-5" />}
            {loading ? 'Generando...' : 'Generar Llaves Finales'}
          </button>
        </div>
      )}

      {/* Grid Principal */}
      <div className={`grid grid-cols-1 ${!isFinished && (tournament.format === 'league' || tournament.format === 'multiphase') ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8 items-start`}>
        
        {swissRoundFinished && isAdmin && (
          <div className="lg:col-span-3 mb-8 p-8 rounded-xl border border-neon/50 bg-black/60 relative overflow-hidden group">
            <div className="absolute inset-0 bg-neon/5 group-hover:bg-neon/10 transition-colors"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-2xl font-black text-white mb-2">¡Ronda {currentMaxRound} Completada!</h2>
              <p className="text-gray-400 mb-6">Todos los partidos de la ronda actual han finalizado. Puedes generar la siguiente ronda del Sistema Suizo emparejando a los equipos con puntajes similares.</p>
              <button 
                onClick={() => {
                  showConfirm(
                    'Generar Siguiente Ronda',
                    `¿Estás seguro de generar la Ronda ${currentMaxRound + 1}?`,
                    async () => {
                      setLoading(true);
                      const { generateNextSwissRound } = await import('@/app/actions/tournament_swiss');
                      const result = await generateNextSwissRound(tournament._id, pin);
                      if (!result.success) {
                        showAlert('Error', result.error || 'No se pudo generar');
                      }
                      setLoading(false);
                    }
                  );
                }}
                disabled={loading}
                className="btn-neon px-8 py-3 text-lg flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Generando...' : 'Emparejar Siguiente Ronda'}
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area (Table or Bracket) */}
        <div className={`tour-standings ${!isFinished && (tournament.format === 'league' || tournament.format === 'multiphase' || tournament.format === 'swiss') ? 'lg:col-span-2' : ''}`}>
          
          {(tournament.format === 'knockout_single' || tournament.format === 'knockout_double' || hasPhase2Matches) && (
            <div className="mb-8">
              {hasPhase2Matches && <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-neon" /> Playoffs (Fase Final)</h2>}
              
              {(tournament.format === 'knockout_double' || tournament.phase2 === 'knockout_cup_consolation') && (
                <div className="mb-4 text-center">
                  <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest bg-black/40 py-2 rounded-t-xl border-b border-white/10">
                    {tournament.phase2 === 'knockout_cup_consolation' ? 'Copa Oro' : 'Winners Bracket'}
                  </h3>
                </div>
              )}
              
              <BracketVisualizer 
                tournament={{...tournament, matches: tournament.matches.filter((m: any) => (m.stage === 'knockout' || m.stage === 'phase2') && !m.isLosersBracket)}} 
                onMatchClick={openMatchEditor} 
                isAdmin={isAdmin} 
              />
              
              {(tournament.format === 'knockout_double' || tournament.matches.some((m: any) => m.isLosersBracket)) && (
                <div className="mt-12">
                  <div className="mb-4 text-center">
                    <h3 className="text-lg font-bold text-red-500 mb-2 uppercase tracking-widest bg-black/40 py-2 rounded-t-xl border-b border-red-500/20">
                      {tournament.phase2 === 'knockout_cup_consolation' ? 'Copa Consuelo' : 'Losers Bracket'}
                    </h3>
                  </div>
                  <BracketVisualizer 
                    tournament={{...tournament, matches: tournament.matches.filter((m: any) => (m.stage === 'knockout' || m.stage === 'phase2') && m.isLosersBracket)}} 
                    onMatchClick={openMatchEditor} 
                    isAdmin={isAdmin} 
                  />
                </div>
              )}
            </div>
          )}

          {(tournament.format === 'league' || tournament.format === 'multiphase') && (
            <div className="flex flex-col gap-8">
              {Object.entries(standings.byGroup).map(([groupName, teamsList]) => (
                <div key={groupName} className="glass-panel overflow-hidden">
                  {Object.keys(standings.byGroup).length > 1 && (
                    <div className="bg-black/60 px-4 py-3 border-b border-white/10">
                      <h3 className="font-black text-neon uppercase tracking-widest text-sm">
                        Grupo {groupName}
                      </h3>
                    </div>
                  )}
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-black/40 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3">Pos</th>
                        <th className="px-4 py-3">Equipo</th>
                        <th className="px-4 py-3 text-center hidden sm:table-cell">PJ</th>
                        <th className="px-4 py-3 text-center hidden md:table-cell">G</th>
                        <th className="px-4 py-3 text-center hidden md:table-cell">E</th>
                        <th className="px-4 py-3 text-center hidden md:table-cell">P</th>
                        <th className="px-4 py-3 text-center hidden sm:table-cell">GF</th>
                        <th className="px-4 py-3 text-center hidden sm:table-cell">GC</th>
                        <th className="px-4 py-3 text-center">DG</th>
                        <th className="px-4 py-3 text-center text-neon font-black text-base">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(teamsList as any[]).map((team: any, index: number) => (
                        <tr key={team.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-bold">{index + 1}</td>
                          <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{team.name}</td>
                          <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">{team.p}</td>
                          <td className="px-4 py-3 text-center text-gray-400 hidden md:table-cell">{team.w}</td>
                          <td className="px-4 py-3 text-center text-gray-400 hidden md:table-cell">{team.d}</td>
                          <td className="px-4 py-3 text-center text-gray-400 hidden md:table-cell">{team.l}</td>
                          <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">{team.gf}</td>
                          <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">{team.ga}</td>
                          <td className="px-4 py-3 text-center font-semibold">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                          <td className="px-4 py-3 text-center font-black text-neon text-base">{team.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendario / Fixtures Area */}
        {(!isFinished || isAdmin) && (tournament.format === 'league' || tournament.format === 'multiphase' || tournament.format === 'swiss') && (
          <div className="tour-matches lg:col-span-1">
            <div className="glass-panel p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-neon" />
                  Calendario
                </h2>
                {loading && <Loader2 className="w-4 h-4 text-neon animate-spin" />}
              </div>

              <div className="flex flex-col gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {rounds.map((roundObj) => (
                  <div key={`round_${roundObj}`} className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-neon uppercase tracking-wider border-b border-neon/20 pb-1">Jornada {roundObj as number}</h3>
                    {tournament.matches
                      .filter((m: any) => m.round === roundObj)
                      .map((match: any) => {
                        const home = tournament.teams.find((t: any) => t.id === match.homeTeamId);
                        const away = tournament.teams.find((t: any) => t.id === match.awayTeamId);
                        
                        return (
                          <MatchRow 
                            key={match.id} 
                            match={match} 
                            home={home} 
                            away={away} 
                            isAdmin={isAdmin} 
                            onEdit={() => openMatchEditor(match)} 
                          />
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal para Editar Partido */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 w-full max-w-md animate-in zoom-in-95 relative">
            {loading && (
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-10 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 text-neon animate-spin" />
              </div>
            )}
            <h3 className="text-xl font-bold mb-6 text-center text-neon">Cargar Resultado</h3>
            <form onSubmit={handleSaveScore} className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                
                {/* Equipo Local */}
                <div className="flex flex-col items-center flex-1 text-center">
                  <span className="font-bold text-gray-300 mb-2 truncate w-full">
                    {tournament.teams.find((t:any) => t.id === editingMatch.homeTeamId)?.name || '?'}
                  </span>
                  <input 
                    type="number" 
                    min="0"
                    max="99"
                    className="glass-input text-center text-3xl font-black py-4 w-20"
                    value={tempHomeScore}
                    onChange={(e) => setTempHomeScore(e.target.value)}
                    autoFocus
                  />
                </div>

                <span className="text-gray-500 font-bold text-xl mt-6">VS</span>

                {/* Equipo Visitante */}
                <div className="flex flex-col items-center flex-1 text-center">
                  <span className="font-bold text-gray-300 mb-2 truncate w-full">
                    {tournament.teams.find((t:any) => t.id === editingMatch.awayTeamId)?.name || '?'}
                  </span>
                  <input 
                    type="number" 
                    min="0"
                    max="99"
                    className="glass-input text-center text-3xl font-black py-4 w-20"
                    value={tempAwayScore}
                    onChange={(e) => setTempAwayScore(e.target.value)}
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingMatch(null)} className="btn-glass px-4">
                  Cancelar
                </button>
                <button type="submit" className="btn-neon px-6">
                  Guardar Resultado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 w-full max-w-sm animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Acceso de Administrador</h3>
            {pinError && <p className="text-red-400 text-sm mb-4">{pinError}</p>}
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <input 
                type="password" 
                placeholder="Ingresa el PIN del torneo" 
                className="glass-input"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowPinModal(false)} className="btn-glass text-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn-neon text-sm py-2">
                  Verificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Dialog */}
      {dialogConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="glass-panel p-6 w-full max-w-sm animate-in zoom-in-95 border-2 border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-3 text-white">{dialogConfig.title}</h3>
            <p className="text-gray-300 mb-6">{dialogConfig.message}</p>
            <div className="flex justify-end gap-3">
              {dialogConfig.type === 'confirm' && (
                <button 
                  onClick={() => setDialogConfig({ ...dialogConfig, isOpen: false })} 
                  className="btn-glass px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={() => {
                  setDialogConfig({ ...dialogConfig, isOpen: false });
                  if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                }} 
                className="btn-neon px-5 py-2 text-sm font-bold"
              >
                {dialogConfig.type === 'confirm' ? 'Aceptar' : 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Componente para una fila de partido simplificado
function MatchRow({ match, home, away, isAdmin, onEdit }: any) {
  return (
    <div className="bg-black/40 rounded-lg p-3 border border-white/5 flex flex-col gap-2 relative group transition-colors hover:bg-white/5">
      {isAdmin && (
        <button 
          onClick={onEdit} 
          className="absolute -top-2 -right-2 bg-neon text-black rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg cursor-pointer"
          title="Editar resultado"
        >
          <Save className="w-3 h-3" />
        </button>
      )}

      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold text-gray-300 truncate pr-2">{home?.name || '?'}</span>
        <span className="bg-white/10 px-2 py-1 rounded text-xs min-w-[24px] text-center font-bold">
          {match.homeScore !== null ? match.homeScore : '-'}
        </span>
      </div>
      
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold text-gray-300 truncate pr-2">{away?.name || '?'}</span>
        <span className="bg-white/10 px-2 py-1 rounded text-xs min-w-[24px] text-center font-bold">
          {match.awayScore !== null ? match.awayScore : '-'}
        </span>
      </div>
    </div>
  );
}
