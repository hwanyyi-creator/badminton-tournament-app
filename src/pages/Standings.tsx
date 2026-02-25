import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Medal, TrendingUp, Activity, Shield, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import type { Player } from '../types';
import clsx from 'clsx';

export default function Standings() {
  const navigate = useNavigate();
  const { players, settings, matches } = useGameStore();

  const isTeamMode = settings.gameMode === 'TEAM_BATTLE';
  // [New] 아코디언 상태 관리 (클릭한 선수의 ID 저장)
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const sortPlayers = (playerList: Player[]) => {
    return [...playerList].sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.scoreDiff !== b.scoreDiff) return b.scoreDiff - a.scoreDiff;
      
      const rateA = a.gamesPlayed ? a.wins / a.gamesPlayed : 0;
      const rateB = b.gamesPlayed ? b.wins / b.gamesPlayed : 0;
      return rateB - rateA;
    });
  };

  const sortedPlayers = sortPlayers(players);

  const { levelRanks, blueRanks, whiteRanks } = useMemo(() => {
    const levelMap = new Map<string, number>();
    const blueMap = new Map<string, number>();
    const whiteMap = new Map<string, number>();

    const levels = Array.from(new Set(players.map(p => p.level)));
    levels.forEach(lvl => {
      const levelPlayers = sortPlayers(players.filter(p => p.level === lvl));
      levelPlayers.forEach((p, index) => levelMap.set(p.id, index + 1));
    });

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

  const bluePlayers = players.filter(p => p.team === 'Blue');
  const whitePlayers = players.filter(p => p.team === 'White');
  const blueWins = Math.floor(bluePlayers.reduce((sum, p) => sum + p.wins, 0) / 2);
  const whiteWins = Math.floor(whitePlayers.reduce((sum, p) => sum + p.wins, 0) / 2);

  // 선수 헬퍼 함수
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '알 수 없음';

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
              <span className="text-xs text-gray-400 font-medium hidden md:inline-block">이름을 클릭하면 상세 경기 이력을 볼 수 있습니다.</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] md:text-xs">
                    <th className="px-4 py-3 font-semibold text-center w-16">순위</th>
                    <th className="px-4 py-3 font-semibold">참가자 정보 (세부 순위)</th>
                    <th className="px-4 py-3 font-semibold text-center">경기</th>
                    <th className="px-4 py-3 font-semibold text-center">승/패</th>
                    <th className="px-4 py-3 font-semibold text-center text-blue-600">득실</th>
                    <th className="px-4 py-3 font-semibold text-center">승률</th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPlayers.map((player, index) => {
                    const levelRank = levelRanks.get(player.id);
                    const teamRank = player.team === 'Blue' ? blueRanks.get(player.id) : whiteRanks.get(player.id);
                    const isExpanded = expandedPlayerId === player.id;

                    // [New] 해당 선수의 완료된 경기 데이터 추출
                    const playerMatches = matches
                      .filter(m => m.status === 'FINISHED' && (m.teamA.includes(player.id) || m.teamB.includes(player.id)))
                      .sort((a, b) => (a.seq || 0) - (b.seq || 0));

                    return (
                      <React.Fragment key={player.id}>
                        <tr 
                          onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                          className={clsx("transition-colors cursor-pointer group", getRankStyle(index), isExpanded ? "bg-blue-50" : "hover:bg-blue-50/50")}
                        >
                          <td className="px-4 py-3 text-center align-middle h-full">
                            <div className="flex justify-center items-center">
                              {getRankIcon(index)}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5">
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

                              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">
                                  {player.level}조 <span className="text-gray-900">{levelRank}위</span>
                                </span>
                                {isTeamMode && player.team && (
                                  <span className={clsx(
                                    "px-1.5 py-0.5 rounded border shadow-sm",
                                    player.team === 'Blue' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-700 border-gray-200"
                                  )}>
                                    {player.team === 'Blue' ? '팀내' : '팀내'} <span className={player.team === 'Blue' ? "text-blue-900" : "text-gray-900"}>{teamRank}위</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center align-middle">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold text-xs border border-gray-200">
                              {player.gamesPlayed}G
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center align-middle">
                            <span className="text-blue-600 font-extrabold">{player.wins}승</span>
                            <span className="text-gray-300 mx-1 font-light">|</span>
                            <span className="text-red-500 font-bold">{player.losses}패</span>
                          </td>

                          <td className="px-4 py-3 text-center align-middle">
                            <span className={clsx(
                              "font-mono font-extrabold text-sm px-2 py-1 rounded",
                              player.scoreDiff > 0 ? "bg-blue-50 text-blue-700" : player.scoreDiff < 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
                            )}>
                              {player.scoreDiff > 0 ? `+${player.scoreDiff}` : player.scoreDiff}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center align-middle">
                            <span className="text-gray-600 font-bold tracking-tight">
                              {getWinRate(player.wins, player.gamesPlayed)}%
                            </span>
                          </td>

                          <td className="px-2 py-3 text-center align-middle text-gray-400 group-hover:text-blue-500 transition-colors">
                            {isExpanded ? <ChevronUp className="w-5 h-5 mx-auto" /> : <ChevronDown className="w-5 h-5 mx-auto" />}
                          </td>
                        </tr>

                        {/* [New] 클릭 시 펼쳐지는 상세 경기 이력 행 */}
                        {isExpanded && (
                          <tr className="bg-gray-100/80 shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)] border-b-2 border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                            <td colSpan={7} className="p-0">
                              <div className="p-4 md:px-6">
                                <h4 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1.5">
                                  <History className="w-4 h-4" /> {player.name} 선수의 경기 기록 상세
                                </h4>
                                
                                {playerMatches.length === 0 ? (
                                  <p className="text-sm text-gray-400 py-2">아직 완료된 경기가 없습니다.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {playerMatches.map((m) => {
                                      const isTeamA = m.teamA.includes(player.id);
                                      const myTeam = isTeamA ? m.teamA : m.teamB;
                                      const oppTeam = isTeamA ? m.teamB : m.teamA;
                                      
                                      const partnerId = myTeam.find(id => id !== player.id);
                                      const myScore = isTeamA ? m.score[0] : m.score[1];
                                      const oppScore = isTeamA ? m.score[1] : m.score[0];
                                      const isWin = myScore > oppScore;

                                      return (
                                        <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:border-blue-300 transition-colors">
                                          <div className="flex items-center gap-2">
                                            <span className="bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded font-bold">Game {m.seq}</span>
                                            <span className="text-xs font-semibold text-gray-500 border px-1.5 py-0.5 rounded bg-gray-50">Court {m.courtNumber}</span>
                                          </div>
                                          
                                          <div className="flex-1 flex justify-center items-center gap-2 text-[13px]">
                                            <div className="text-right w-1/2 flex items-center justify-end gap-1 flex-wrap">
                                               <span className="font-extrabold text-blue-700">{player.name}</span>
                                               {partnerId && <span className="text-gray-600">, {getPlayerName(partnerId)}</span>}
                                            </div>
                                            <span className="font-black text-gray-300 text-[10px]">VS</span>
                                            <div className="text-left w-1/2 text-gray-600 font-medium flex items-center flex-wrap">
                                               {oppTeam.map(id => getPlayerName(id)).join(', ')}
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-3 self-end md:self-auto border-t md:border-none pt-2 md:pt-0 w-full md:w-auto justify-end">
                                            <div className="font-mono font-bold text-gray-700 text-base tracking-wider">
                                              <span className={isWin ? "text-blue-600" : ""}>{myScore}</span> : <span className={!isWin ? "text-red-500" : ""}>{oppScore}</span>
                                            </div>
                                            <span className={clsx("text-xs font-black px-2.5 py-1 rounded shadow-sm", isWin ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-red-50 text-red-600 border border-red-100")}>
                                              {isWin ? '승리' : '패배'}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
      </main>
      
      <footer className="text-center py-6 text-xs font-medium text-gray-400 mt-auto">
        ⓒ HWANY. All rights reserved.
      </footer>
    </div>
  );
}