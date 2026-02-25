import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Medal, TrendingUp, Activity, Shield } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import type { Player } from '../types';
import clsx from 'clsx';

export default function Standings() {
  const navigate = useNavigate();
  const { players, settings } = useGameStore();

  const isTeamMode = settings.gameMode === 'TEAM_BATTLE';

  // [New] 선수 정렬 공통 로직 (1순위: 승수, 2순위: 득실차, 3순위: 승률)
  const sortPlayers = (playerList: Player[]) => {
    return [...playerList].sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.scoreDiff !== b.scoreDiff) return b.scoreDiff - a.scoreDiff;
      
      const rateA = a.gamesPlayed ? a.wins / a.gamesPlayed : 0;
      const rateB = b.gamesPlayed ? b.wins / b.gamesPlayed : 0;
      return rateB - rateA;
    });
  };

  // 1. 전체 순위 정렬
  const sortedPlayers = sortPlayers(players);

  // [New] 2. 부문별(급수, 팀) 순위 계산 (useMemo로 성능 최적화)
  const { levelRanks, blueRanks, whiteRanks } = useMemo(() => {
    const levelMap = new Map<string, number>();
    const blueMap = new Map<string, number>();
    const whiteMap = new Map<string, number>();

    // 급수별 순위 계산
    const levels = Array.from(new Set(players.map(p => p.level)));
    levels.forEach(lvl => {
      const levelPlayers = sortPlayers(players.filter(p => p.level === lvl));
      levelPlayers.forEach((p, index) => levelMap.set(p.id, index + 1));
    });

    // 팀별 순위 계산
    if (isTeamMode) {
      const bluePlayers = sortPlayers(players.filter(p => p.team === 'Blue'));
      bluePlayers.forEach((p, index) => blueMap.set(p.id, index + 1));

      const whitePlayers = sortPlayers(players.filter(p => p.team === 'White'));
      whitePlayers.forEach((p, index) => whiteMap.set(p.id, index + 1));
    }

    return { levelRanks: levelMap, blueRanks: blueMap, whiteRanks: whiteMap };
  }, [players, isTeamMode]);


  const getWinRate = (wins: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-50 border-yellow-200";
      case 1: return "bg-gray-50 border-gray-200";
      case 2: return "bg-orange-50 border-orange-200";
      default: return "bg-white border-gray-100";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500 drop-shadow-sm" />;
      case 1: return <Medal className="w-6 h-6 text-gray-400 fill-gray-400 drop-shadow-sm" />;
      case 2: return <Medal className="w-6 h-6 text-orange-400 fill-orange-400 drop-shadow-sm" />;
      default: return <span className="text-gray-500 font-black text-lg w-6 text-center">{index + 1}</span>;
    }
  };

  // 청백전 데이터 계산
  const bluePlayers = players.filter(p => p.team === 'Blue');
  const whitePlayers = players.filter(p => p.team === 'White');
  const blueWins = Math.floor(bluePlayers.reduce((sum, p) => sum + p.wins, 0) / 2);
  const whiteWins = Math.floor(whitePlayers.reduce((sum, p) => sum + p.wins, 0) / 2);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate('/matches')}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            실시간 순위
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full p-4 space-y-6 flex-1">
        
        {/* 청백전 팀 전광판 */}
        {isTeamMode && (
          <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden relative border-4 border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="flex justify-between items-center p-6 relative z-10">
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <Shield className="w-6 h-6 fill-blue-500/20" />
                  <span className="font-bold text-lg tracking-widest">청팀</span>
                </div>
                <div className="text-6xl md:text-7xl font-black text-white tabular-nums tracking-tighter shadow-blue-500/50 drop-shadow-lg">
                  {blueWins}
                </div>
              </div>
              
              <div className="px-4 flex flex-col items-center justify-center">
                <span className="text-gray-500 font-black text-xl italic tracking-widest">VS</span>
              </div>

              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-gray-300">
                  <Shield className="w-6 h-6 fill-white/20" />
                  <span className="font-bold text-lg tracking-widest">백팀</span>
                </div>
                <div className="text-6xl md:text-7xl font-black text-white tabular-nums tracking-tighter shadow-white/20 drop-shadow-lg">
                  {whiteWins}
                </div>
              </div>
            </div>
          </div>
        )}

        {players.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>등록된 선수가 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-gray-500" />
                <h2 className="font-bold text-gray-700">개인별 통합 순위표</h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">승수 &gt; 득실차 &gt; 승률 순</span>
            </div>
            
            {/* 좌우 스크롤이 가능하도록 overflow-x-auto 유지 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] md:text-xs">
                    <th className="px-4 py-3 font-semibold text-center w-16">전체 순위</th>
                    <th className="px-4 py-3 font-semibold">참가자 정보 (세부 순위)</th>
                    <th className="px-4 py-3 font-semibold text-center">경기수</th>
                    <th className="px-4 py-3 font-semibold text-center">승/패</th>
                    <th className="px-4 py-3 font-semibold text-center text-blue-600">득실차</th>
                    <th className="px-4 py-3 font-semibold text-center">승률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPlayers.map((player, index) => {
                    const levelRank = levelRanks.get(player.id);
                    const teamRank = player.team === 'Blue' ? blueRanks.get(player.id) : whiteRanks.get(player.id);

                    return (
                      <tr 
                        key={player.id} 
                        className={clsx("hover:bg-gray-50 transition-colors", getRankStyle(index))}
                      >
                        {/* 1. 전체 순위 */}
                        <td className="px-4 py-3 text-center align-middle h-full">
                          <div className="flex justify-center items-center">
                            {getRankIcon(index)}
                          </div>
                        </td>

                        {/* 2. 이름 및 세부 정보 (가로 정렬 유지, 세부 뱃지 추가) */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            {/* 상단: 이름 및 기본 정보 */}
                            <div className="flex items-center gap-2">
                              {isTeamMode && player.team && (
                                <span className={clsx(
                                  "text-[10px] px-1.5 py-0.5 rounded-sm font-black tracking-widest border",
                                  player.team === 'Blue' ? "bg-blue-600 text-white border-blue-700" : "bg-white text-gray-800 border-gray-300 shadow-sm"
                                )}>
                                  {player.team === 'Blue' ? '청' : '백'}
                                </span>
                              )}
                              <span className="font-extrabold text-gray-800 text-base">{player.name}</span>
                              <span className="text-xs text-gray-500 font-bold">({player.level}조)</span>
                              {!player.isActive && (
                                <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-200">퇴장</span>
                              )}
                            </div>

                            {/* 하단: 세부 순위 뱃지 (급수 내 순위, 팀 내 순위) */}
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              {/* 급수 내 순위 */}
                              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">
                                {player.level}조 <span className="text-gray-900">{levelRank}위</span>
                              </span>
                              
                              {/* 팀 내 순위 (청백전 모드일 때만) */}
                              {isTeamMode && player.team && (
                                <span className={clsx(
                                  "px-1.5 py-0.5 rounded border shadow-sm",
                                  player.team === 'Blue' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-700 border-gray-200"
                                )}>
                                  {player.team === 'Blue' ? '청팀' : '백팀'} <span className={player.team === 'Blue' ? "text-blue-900" : "text-gray-900"}>{teamRank}위</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. 경기수 */}
                        <td className="px-4 py-3 text-center align-middle">
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold text-xs border border-gray-200">
                            {player.gamesPlayed}G
                          </span>
                        </td>

                        {/* 4. 승패 */}
                        <td className="px-4 py-3 text-center align-middle">
                          <span className="text-blue-600 font-extrabold">{player.wins}승</span>
                          <span className="text-gray-300 mx-1.5 font-light">|</span>
                          <span className="text-red-500 font-bold">{player.losses}패</span>
                        </td>

                        {/* 5. 득실차 */}
                        <td className="px-4 py-3 text-center align-middle">
                          <span className={clsx(
                            "font-mono font-extrabold text-sm px-2 py-1 rounded",
                            player.scoreDiff > 0 ? "bg-blue-50 text-blue-700" : player.scoreDiff < 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
                          )}>
                            {player.scoreDiff > 0 ? `+${player.scoreDiff}` : player.scoreDiff}
                          </span>
                        </td>

                        {/* 6. 승률 */}
                        <td className="px-4 py-3 text-center align-middle">
                          <span className="text-gray-600 font-bold tracking-tight">
                            {getWinRate(player.wins, player.gamesPlayed)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
      </main>
      
      {/* 저작권 표시 */}
      <footer className="text-center py-6 text-xs font-medium text-gray-400">
        ⓒ HWANY. All rights reserved.
      </footer>
    </div>
  );
}