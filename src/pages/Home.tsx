import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Timer, PlayCircle, Users, CalendarClock, Plus, X, CheckCircle2 } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { generateNextMatch } from '../utils/matchmaking';
import type { Match } from '../types';
import clsx from 'clsx';

const MatchTimer = ({ startTime }: { startTime: number }) => {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  return (
    <span className="text-blue-600 font-mono font-bold bg-blue-50 px-2 py-1 rounded-md text-sm border border-blue-100">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const { players, matches, matchQueue, settings, startMatch, startMatchFromQueue, finishMatch, cancelMatch } = useGameStore();
  
  const [finishingMatchId, setFinishingMatchId] = useState<string | null>(null);
  const [scores, setScores] = useState({ teamA: 0, teamB: 0 });
  
  const [selectingCourt, setSelectingCourt] = useState<number | null>(null);

  const getPlayer = (id: string) => players.find(p => p.id === id);
  const getPlayerName = (id: string) => getPlayer(id)?.name || '알 수 없음';

  const handleDynamicStart = (courtNumber: number) => {
    const nextMatch = generateNextMatch(players, matches, settings.gameMode);
    if (!nextMatch) {
      alert('대기 중인 선수가 부족하거나 모두 경기 중입니다.');
      return;
    }
    startMatch(courtNumber, nextMatch.teamA, nextMatch.teamB);
  };

  const handleQueueMatchSelect = (match: Match, courtNumber: number) => {
    for (const playerId of [...match.teamA, ...match.teamB]) {
      const playingMatch = matches.find(m => m.status === 'PLAYING' && (m.teamA.includes(playerId) || m.teamB.includes(playerId)));
      if (playingMatch) {
        const playerName = getPlayerName(playerId);
        alert(`${playerName} 선수가 현재 Court ${playingMatch.courtNumber}에서 경기 중이라 경기를 시작할 수 없습니다.`);
        return;
      }
    }
    startMatchFromQueue(match.id, courtNumber);
    setSelectingCourt(null);
  };

  const handleFinishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finishingMatchId) {
      finishMatch(finishingMatchId, scores.teamA, scores.teamB);
      setFinishingMatchId(null);
      setScores({ teamA: 0, teamB: 0 });
    }
  };

  const getActiveMatch = (courtNumber: number) => 
    matches.find(m => m.courtNumber === courtNumber && m.status === 'PLAYING');

  const activePlayers = players.filter(p => p.isActive);
  const waitingPlayers = activePlayers
    .filter(p => !matches.some(m => m.status === 'PLAYING' && (m.teamA.includes(p.id) || m.teamB.includes(p.id))))
    .sort((a, b) => a.gamesPlayed - b.gamesPlayed);

  const isAllMatchesFinished = 
    activePlayers.length >= 4 && 
    activePlayers.every(p => p.gamesPlayed >= settings.targetGamesPerPlayer) && 
    matchQueue.length === 0;

  const matchToFinish = matches.find(m => m.id === finishingMatchId);

  const getTeamLabel = (teamIds: string[]) => {
    if (settings.gameMode === 'TEAM_BATTLE' && teamIds.length > 0) {
      const team = getPlayer(teamIds[0])?.team;
      if (team === 'Blue') return { name: '청팀', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
      if (team === 'White') return { name: '백팀', color: 'text-gray-700', bg: 'bg-white', border: 'border-gray-300' };
    }
    return { name: 'Team', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
  };

  const teamAInfo = matchToFinish ? getTeamLabel(matchToFinish.teamA) : { name: 'Team A', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
  const teamBInfo = matchToFinish ? getTeamLabel(matchToFinish.teamB) : { name: 'Team B', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };

  const TeamBadge = ({ team }: { team?: 'Blue' | 'White' }) => {
    if (!team || settings.gameMode !== 'TEAM_BATTLE') return null;
    return (
      <span className={clsx(
        "text-[10px] px-1.5 py-0.5 rounded-sm font-black tracking-widest border mx-1",
        team === 'Blue' ? "bg-blue-600 text-white border-blue-700" : "bg-white text-gray-800 border-gray-300"
      )}>
        {team === 'Blue' ? '청' : '백'}
      </span>
    );
  };

  const getSortedMatchQueueForModal = () => {
    return matchQueue.map((match, originalIndex) => {
      const isPlayable = ![...match.teamA, ...match.teamB].some(playerId =>
        matches.some(m => m.status === 'PLAYING' && (m.teamA.includes(playerId) || m.teamB.includes(playerId)))
      );
      return { match, originalIndex, isPlayable };
    }).sort((a, b) => {
      if (a.isPlayable === b.isPlayable) return a.originalIndex - b.originalIndex;
      return a.isPlayable ? -1 : 1;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            경기 현황판
          </h1>
          <button onClick={() => navigate('/standings')} className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1">
            순위표 보기 &rarr;
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: settings.courtCount }).map((_, idx) => {
            const courtNum = idx + 1;
            const match = getActiveMatch(courtNum);

            return (
              <div key={courtNum} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                <div className={clsx("px-4 py-3 border-b flex justify-between items-center", match ? "bg-blue-50 text-blue-800" : "bg-gray-50 text-gray-500")}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Court {courtNum}</span>
                    {match && match.seq && (
                      <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                        Game {match.seq}
                      </span>
                    )}
                  </div>
                  {match && <MatchTimer startTime={match.startTime} />}
                </div>
                <div className="p-6">
                  {match ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <TeamBadge team={getPlayer(match.teamA[0])?.team} />
                          {match.teamA.map(id => <div key={id} className="font-semibold text-gray-800 truncate">{getPlayerName(id)}</div>)}
                        </div>
                        <div className="text-xl font-bold text-gray-300">VS</div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <TeamBadge team={getPlayer(match.teamB[0])?.team} />
                          {match.teamB.map(id => <div key={id} className="font-semibold text-gray-800 truncate">{getPlayerName(id)}</div>)}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button onClick={() => {
                          if(window.confirm(`정말 Court ${courtNum}의 경기 시작을 취소하고 다시 대기열로 되돌리시겠습니까?`)) {
                            cancelMatch(match.id);
                          }
                        }} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-lg font-bold shadow-sm border border-red-200 transition-all flex items-center justify-center">
                          시작 취소
                        </button>
                        <button onClick={() => setFinishingMatchId(match.id)} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2">
                          <Timer className="w-5 h-5" /> 경기 종료
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-gray-400 mb-4">현재 비어있음</div>
                      
                      {matchQueue.length > 0 ? (
                        <button onClick={() => setSelectingCourt(courtNum)} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2">
                          <CalendarClock className="w-5 h-5" /> 대기열에서 경기 배정
                        </button>
                      ) : isAllMatchesFinished ? (
                        <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-lg font-bold border border-gray-200 flex items-center justify-center gap-2 cursor-not-allowed">
                          <CheckCircle2 className="w-5 h-5" /> 해당 대회의 모든 경기 완료
                        </button>
                      ) : (
                        <button onClick={() => handleDynamicStart(courtNum)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2">
                          <PlayCircle className="w-5 h-5" /> 새로운 경기 생성
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {matchQueue.length > 0 ? (
            <div>
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-blue-600" />
                남은 경기 일정 ({matchQueue.length}게임)
              </h2>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {matchQueue.map((match, idx) => (
                  <div key={match.id} className={clsx("p-3 rounded-lg flex items-center gap-3 border", idx === 0 ? "bg-yellow-50 border-yellow-200 ring-1 ring-yellow-200" : "bg-gray-50 border-gray-100 opacity-70")}>
                    {/* [New] 남은 대기열에서도 경기 고유번호(seq) 표시 */}
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs font-black text-gray-600 shadow-sm border border-gray-200 shrink-0">
                      {match.seq}
                    </div>
                    <div className="flex-1 text-sm flex justify-between items-center text-gray-700">
                       <div className="w-[45%] text-right truncate flex flex-col items-end gap-0.5">
                         <TeamBadge team={getPlayer(match.teamA[0])?.team} />
                         <span>{getPlayerName(match.teamA[0])}, {getPlayerName(match.teamA[1])}</span>
                       </div>
                       <span className="text-gray-300 text-xs">VS</span>
                       <div className="w-[45%] text-left truncate flex flex-col items-start gap-0.5">
                         <TeamBadge team={getPlayer(match.teamB[0])?.team} />
                         <span>{getPlayerName(match.teamB[0])}, {getPlayerName(match.teamB[1])}</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                대기 현황 ({waitingPlayers.length}명)
              </h2>
              {waitingPlayers.length === 0 ? (
                <p className="text-gray-400 text-center py-4">대기 중인 선수가 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {waitingPlayers.map((player) => (
                    <div key={player.id} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 border border-gray-200">
                      <span className="font-semibold">{player.name}</span>
                      <span className="text-xs text-gray-400">({player.level})</span>
                      <span className="bg-white px-1.5 rounded text-xs text-gray-500 border border-gray-200">{player.gamesPlayed}G</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="text-center pt-4 pb-8 text-xs font-medium text-gray-400">
          ⓒ HWANY. All rights reserved.
        </div>
      </main>

      {/* 배정 모달창 */}
      {selectingCourt !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-4 border-b pb-3">
               <div>
                 <h3 className="text-lg font-bold text-gray-800">Court {selectingCourt} 배정</h3>
                 <p className="text-xs text-gray-500 mt-1">이 코트에서 시작할 경기를 대기열에서 선택해주세요.</p>
               </div>
               <button onClick={() => setSelectingCourt(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
             </div>
             
             <div className="overflow-y-auto space-y-2 flex-1 pr-1">
               {getSortedMatchQueueForModal().map(({ match, isPlayable }) => (
                 <button 
                   key={match.id} 
                   onClick={() => handleQueueMatchSelect(match, selectingCourt)}
                   className={clsx(
                     "w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group shadow-sm relative",
                     isPlayable 
                       ? "border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer" 
                       : "border-gray-100 bg-gray-50 opacity-60"
                   )}
                 >
                   {/* [New] 코트 배정 모달에서도 경기 고유번호(seq) 표시 */}
                   <div className={clsx(
                     "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors shrink-0 shadow-sm border",
                     isPlayable 
                       ? "bg-white border-gray-200 text-gray-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600" 
                       : "bg-gray-200 border-gray-300 text-gray-400"
                   )}>
                     {match.seq}
                   </div>
                   <div className="flex-1 text-sm flex justify-between items-center text-gray-700">
                      <div className="w-[45%] text-right truncate flex flex-col items-end gap-0.5">
                        <TeamBadge team={getPlayer(match.teamA[0])?.team} />
                        <span className="font-semibold">{getPlayerName(match.teamA[0])}, {getPlayerName(match.teamA[1])}</span>
                      </div>
                      <span className="text-gray-300 text-xs font-bold px-2">VS</span>
                      <div className="w-[45%] text-left truncate flex flex-col items-start gap-0.5">
                        <TeamBadge team={getPlayer(match.teamB[0])?.team} />
                        <span className="font-semibold">{getPlayerName(match.teamB[0])}, {getPlayerName(match.teamB[1])}</span>
                      </div>
                   </div>
                   
                   {!isPlayable && (
                     <div className="absolute right-2 top-2 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold">
                       경기중
                     </div>
                   )}
                 </button>
               ))}
             </div>
           </div>
        </div>
      )}

      {finishingMatchId && matchToFinish && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
             <div className="mb-6 border-b pb-4">
               <h3 className="text-xl font-bold text-center mb-2">C-{matchToFinish.courtNumber} 코트 결과 입력</h3>
             </div>
             
             <div className="flex justify-between gap-4 mb-8">
               <button type="button" onClick={() => setScores({ teamA: settings.scoreLimit, teamB: scores.teamB })} className={`flex-1 py-2 text-xs font-bold ${teamAInfo.color} ${teamAInfo.bg} hover:bg-opacity-70 rounded-lg border ${teamAInfo.border} shadow-sm transition-colors`}>
                 {teamAInfo.name === 'Team' ? 'Team A' : teamAInfo.name} 승리 ({settings.scoreLimit}점)
               </button>
               <button type="button" onClick={() => setScores({ teamA: scores.teamA, teamB: settings.scoreLimit })} className={`flex-1 py-2 text-xs font-bold ${teamBInfo.color} ${teamBInfo.bg} hover:bg-opacity-70 rounded-lg border ${teamBInfo.border} shadow-sm transition-colors`}>
                 {teamBInfo.name === 'Team' ? 'Team B' : teamBInfo.name} 승리 ({settings.scoreLimit}점)
               </button>
             </div>

             <form onSubmit={handleFinishSubmit} className="space-y-6">
               <div className="flex justify-between items-center gap-2">
                 <div className="text-center flex-1">
                   <label className={`block text-lg font-black ${teamAInfo.color} mb-1`}>
                     {teamAInfo.name === 'Team' ? 'Team A' : teamAInfo.name}
                   </label>
                   <div className="text-[13px] text-gray-500 font-semibold mb-4 h-10 flex flex-col items-center justify-center bg-gray-50 rounded py-1 border border-gray-100">
                     <span>{getPlayerName(matchToFinish.teamA[0])}</span>
                     <span>{getPlayerName(matchToFinish.teamA[1])}</span>
                   </div>
                   <input type="number" value={scores.teamA} onChange={(e) => setScores({ ...scores, teamA: Number(e.target.value) })} className="w-20 h-20 text-center text-4xl font-black text-gray-800 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:bg-blue-50 outline-none transition-colors" inputMode="numeric" />
                 </div>
                 
                 <span className="text-2xl font-bold text-gray-300 mt-12">:</span>
                 
                 <div className="text-center flex-1">
                   <label className={`block text-lg font-black ${teamBInfo.color} mb-1`}>
                     {teamBInfo.name === 'Team' ? 'Team B' : teamBInfo.name}
                   </label>
                   <div className="text-[13px] text-gray-500 font-semibold mb-4 h-10 flex flex-col items-center justify-center bg-gray-50 rounded py-1 border border-gray-100">
                     <span>{getPlayerName(matchToFinish.teamB[0])}</span>
                     <span>{getPlayerName(matchToFinish.teamB[1])}</span>
                   </div>
                   <input type="number" value={scores.teamB} onChange={(e) => setScores({ ...scores, teamB: Number(e.target.value) })} className="w-20 h-20 text-center text-4xl font-black text-gray-800 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:bg-blue-50 outline-none transition-colors" inputMode="numeric" />
                 </div>
               </div>
               <div className="flex gap-3 mt-8">
                 <button type="button" onClick={() => setFinishingMatchId(null)} className="flex-1 py-3.5 text-gray-600 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors">취소</button>
                 <button type="submit" className="flex-[2] py-3.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg font-bold transition-all flex justify-center items-center gap-2">결과 저장</button>
               </div>
             </form>
           </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4">
        <button onClick={() => navigate('/')} className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}