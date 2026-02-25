import { useState, useEffect } from 'react';
import { Trophy, Clock, CheckCircle2, MonitorPlay, Activity } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
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
    <span className="text-blue-600 font-mono font-bold bg-white px-2 py-1 rounded shadow-sm text-sm border border-blue-100">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
};

export default function PublicBracket() {
  const { players, matches, matchQueue, settings } = useGameStore();
  const [, setLastSyncTime] = useState(new Date());

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tournament-storage') {
        useGameStore.persist.rehydrate();
        setLastSyncTime(new Date());
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      useGameStore.persist.rehydrate();
      setLastSyncTime(new Date());
    }, 10000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const getPlayer = (id: string) => players.find(p => p.id === id);
  const getPlayerName = (id: string) => getPlayer(id)?.name || '알 수 없음';

  const getMatchInfo = (teamA: string[], teamB: string[]) => {
    const allPlayers = [...teamA, ...teamB].map(id => getPlayer(id));
    const menCount = allPlayers.filter(p => p?.gender === 'M').length;
    
    let typeName = '변칙'; 
    let badgeColor = 'bg-gray-100 text-gray-700 border-gray-300';
    
    if (menCount === 4) {
      typeName = '남복';
      badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
    } else if (menCount === 0) {
      typeName = '여복';
      badgeColor = 'bg-pink-100 text-pink-700 border-pink-200';
    } else if (menCount === 2) {
      const teamAMen = [getPlayer(teamA[0]), getPlayer(teamA[1])].filter(p => p?.gender === 'M').length;
      if (teamAMen === 1) {
        typeName = '혼복';
        badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
      }
    }

    const teamAColor = getPlayer(teamA[0])?.team;
    const teamBColor = getPlayer(teamB[0])?.team;

    return { typeName, badgeColor, teamAColor, teamBColor };
  };

  const TeamBadge = ({ team }: { team?: 'Blue' | 'White' }) => {
    if (!team || settings.gameMode !== 'TEAM_BATTLE') return null;
    return (
      <span className={clsx(
        "text-[10px] px-1.5 py-0.5 rounded-sm font-black tracking-widest border",
        team === 'Blue' ? "bg-blue-600 text-white border-blue-700" : "bg-white text-gray-800 border-gray-300"
      )}>
        {team === 'Blue' ? '청' : '백'}
      </span>
    );
  };

  const playingMatches = matches.filter(m => m.status === 'PLAYING');
  const finishedMatches = [...matches].filter(m => m.status === 'FINISHED').reverse();

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-blue-600 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col items-center justify-center gap-1 relative">
          <h1 className="text-2xl font-black tracking-wider flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-300" />
            {settings.tournamentName}
          </h1>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-medium bg-blue-700/50 px-3 py-1 rounded-full mt-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            실시간 자동 갱신 중
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-8 mt-4">
        
        {/* 1. 진행 중인 경기 */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <MonitorPlay className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">현재 코트 현황</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: settings.courtCount }).map((_, idx) => {
              const courtNum = idx + 1;
              const match = playingMatches.find(m => m.courtNumber === courtNum);

              let info = match ? getMatchInfo(match.teamA, match.teamB) : null;

              return (
                <div key={courtNum} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={clsx("px-4 py-2 border-b flex justify-between items-center", match ? "bg-blue-50 border-blue-100" : "bg-gray-50")}>
                    <span className={clsx("font-extrabold flex items-center gap-2", match ? "text-blue-800" : "text-gray-400")}>
                      Court {courtNum}
                      {match && match.seq && (
                        <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-sm">Game {match.seq}</span>
                      )}
                      {info && <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border", info.badgeColor)}>{info.typeName}</span>}
                    </span>
                    {match ? <MatchTimer startTime={match.startTime} /> : <span className="text-xs text-gray-400 font-medium">비어있음</span>}
                  </div>
                  <div className="p-5">
                    {match && info ? (
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <TeamBadge team={info.teamAColor} />
                          {match.teamA.map(id => <div key={id} className="font-bold text-gray-800 text-sm md:text-base">{getPlayerName(id)}</div>)}
                        </div>
                        <div className="text-xl font-black text-blue-200 italic">VS</div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <TeamBadge team={info.teamBColor} />
                          {match.teamB.map(id => <div key={id} className="font-bold text-gray-800 text-sm md:text-base">{getPlayerName(id)}</div>)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-300">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <span className="text-sm">대기 중</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 다음 경기 대기열 */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Clock className="w-6 h-6 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-800">다음 경기 대기열 ({matchQueue.length})</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 max-h-64 overflow-y-auto">
            {matchQueue.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">대기 중인 경기가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {matchQueue.map((match) => {
                  const info = getMatchInfo(match.teamA, match.teamB);
                  return (
                    <div key={match.id} className="flex items-center bg-gray-50 border border-gray-100 p-3 rounded-lg">
                      <div className="w-10 flex flex-col items-center gap-1">
                        {/* [New] 다음 경기 대기열에서도 고유번호 seq 표시 */}
                        <span className="text-[11px] font-bold text-gray-500">Game {match.seq}</span>
                        <span className={clsx("text-[9px] px-1 rounded-sm border", info.badgeColor)}>{info.typeName}</span>
                      </div>
                      <div className="flex-1 flex justify-between items-center text-sm pl-2">
                        <div className="font-semibold text-gray-700 w-[42%] text-right truncate flex flex-col items-end gap-0.5">
                          <TeamBadge team={info.teamAColor} />
                          <span>{getPlayerName(match.teamA[0])}, {getPlayerName(match.teamA[1])}</span>
                        </div>
                        <span className="text-[10px] text-gray-300 font-bold px-2">VS</span>
                        <div className="font-semibold text-gray-700 w-[42%] text-left truncate flex flex-col items-start gap-0.5">
                          <TeamBadge team={info.teamBColor} />
                          <span>{getPlayerName(match.teamB[0])}, {getPlayerName(match.teamB[1])}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 3. 최근 경기 결과 */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <h2 className="text-lg font-bold text-gray-800">최근 경기 결과</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 max-h-64 overflow-y-auto">
            {finishedMatches.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">아직 완료된 경기가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {finishedMatches.map((match) => {
                  const info = getMatchInfo(match.teamA, match.teamB);
                  const teamAWon = match.score[0] > match.score[1];
                  
                  return (
                    <div key={match.id} className="flex items-center bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                      <div className="w-12 flex flex-col items-center justify-center shrink-0 border-r border-gray-100 pr-2 gap-0.5">
                        {/* [New] 최근 경기 결과에서도 고유번호 seq 표시 */}
                        <span className="text-[11px] font-black text-gray-600">Game {match.seq}</span>
                        <span className="text-[9px] font-bold text-gray-400">C-{match.courtNumber}</span>
                      </div>
                      
                      <div className="flex-1 flex justify-between items-center text-sm pl-3">
                        <div className={clsx("font-bold w-[38%] text-right truncate flex flex-col items-end gap-0.5", teamAWon ? "text-emerald-600" : "text-gray-500")}>
                          <TeamBadge team={info.teamAColor} />
                          <span>{getPlayerName(match.teamA[0])}, {getPlayerName(match.teamA[1])}</span>
                        </div>
                        
                        <div className="w-[24%] flex justify-center items-center gap-1 font-mono font-bold text-base">
                          <span className={teamAWon ? "text-emerald-600" : "text-gray-400"}>{match.score[0]}</span>
                          <span className="text-gray-300 pb-1">:</span>
                          <span className={!teamAWon ? "text-emerald-600" : "text-gray-400"}>{match.score[1]}</span>
                        </div>
                        
                        <div className={clsx("font-bold w-[38%] text-left truncate flex flex-col items-start gap-0.5", !teamAWon ? "text-emerald-600" : "text-gray-500")}>
                          <TeamBadge team={info.teamBColor} />
                          <span>{getPlayerName(match.teamB[0])}, {getPlayerName(match.teamB[1])}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 저작권 표시 */}
        <div className="text-center pt-4 pb-8 text-xs font-medium text-gray-400">
          ⓒ HWANY. All rights reserved.
        </div>
      </main>
    </div>
  );
}