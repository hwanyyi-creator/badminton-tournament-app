import { useState, useRef } from 'react';
import { UserPlus, Trash2, Users, PlayCircle, Settings, Minus, Plus, X, ClipboardList, RefreshCw, CheckCircle2, Shield, Edit2, Check, Download, Upload, RotateCcw, UserX, Maximize2, Printer } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import { generateNextMatch } from '../utils/matchmaking';
import type { Player, Match } from '../types';

interface SimulatedMatch {
  id: string;
  seq: number;
  teamAIds: [string, string];
  teamBIds: [string, string];
  teamANames: [string, string];
  teamBNames: [string, string];
}

export default function Registration() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [level, setLevel] = useState('A');
  const [team, setTeam] = useState<'Blue' | 'White' | undefined>(undefined); 
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string, gender: 'M'|'F', level: string, team?: 'Blue'|'White'}>({ name: '', gender: 'M', level: 'A', team: undefined });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  
  const [simulationResults, setSimulationResults] = useState<SimulatedMatch[]>([]);
  const [swapTarget, setSwapTarget] = useState<{matchId: string, team: 'A'|'B', pIdx: number} | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bracketFileInputRef = useRef<HTMLInputElement>(null);
  
  const { players, matches, matchQueue, settings, addPlayer, updatePlayer, deletePlayer, updateSettings, removeAllPlayers, resetMatches, importData, setMatchQueue, assignTeams } = useGameStore();
  const navigate = useNavigate();

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.gender !== b.gender) return a.gender === 'M' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const maleCount = players.filter(p => p.gender === 'M').length;
  const femaleCount = players.filter(p => p.gender === 'F').length;
  const blueCount = players.filter(p => p.team === 'Blue').length;
  const whiteCount = players.filter(p => p.team === 'White').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      addPlayer(name.trim(), gender, level, team);
      setName('');
      inputRef.current?.focus();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) deletePlayer(id);
  };

  const handleEditStart = (player: any) => {
    setEditingId(player.id);
    setEditForm({ name: player.name, gender: player.gender, level: player.level, team: player.team });
  };

  const handleEditSave = (id: string) => {
    if (!editForm.name.trim()) return;
    updatePlayer(id, editForm);
    setEditingId(null);
  };

  const adjustSetting = (key: keyof typeof settings, delta: number) => {
    const currentValue = settings[key] as number;
    const newValue = currentValue + delta;
    if (newValue < 1) return;
    updateSettings({ [key]: newValue });
  };

  const handleAssignTeams = () => {
    if (players.length < 2) return alert('최소 2명 이상 필요합니다.');
    if (window.confirm('성별/급수에 맞춰 청팀/백팀으로 자동 배정하시겠습니까?')) {
      assignTeams();
      alert('배정 완료!');
    }
  };

  const copyPlayerList = () => {
    const listText = sortedPlayers.map(p => {
      const teamStr = p.team ? ` [${p.team === 'Blue' ? '청' : '백'}]` : '';
      return `${p.name} (${p.gender}/${p.level})${teamStr}`;
    }).join('\n');
    navigator.clipboard.writeText(listText).then(() => {
      alert(`총 ${players.length}명의 명단이 클립보드에 복사되었습니다.`);
    });
  };

  const handleRemoveAllPlayers = () => {
    if (players.length === 0) return;
    if (window.confirm('정말로 모든 참가자 명단과 경기 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      removeAllPlayers();
      alert('모든 데이터가 삭제되었습니다.');
      setIsSettingsOpen(false);
    }
  };

  const handleResetMatches = () => {
    if (window.confirm('참가자 명단은 유지하고, 대진표와 모든 경기 기록만 초기화하시겠습니까?\n대회를 처음부터 다시 시작합니다.')) {
      resetMatches();
      alert('경기 기록이 초기화되었습니다.');
      setIsSettingsOpen(false);
    }
  };

  const exportData = () => {
    const data = { players, matches, matchQueue, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `대회데이터_${new Date().toLocaleDateString().replace(/\./g, '').replace(/ /g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm('기존 데이터가 덮어씌워집니다. 진행하시겠습니까?')) {
          importData(json);
          alert('데이터를 성공적으로 불러왔습니다.');
          setIsSettingsOpen(false);
        }
      } catch (err) {
        alert('올바르지 않은 파일 형식입니다.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const exportBracket = () => {
    if (simulationResults.length === 0) return alert('저장할 대진표가 없습니다.');
    const blob = new Blob([JSON.stringify(simulationResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settings.tournamentName}_대진표.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBracketUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.length > 0 && json[0].teamAIds) {
          setSimulationResults(json);
          alert('대진표를 성공적으로 불러왔습니다.');
        } else {
          alert('올바르지 않은 대진표 파일입니다.');
        }
      } catch (err) {
        alert('올바르지 않은 파일 형식입니다.');
      }
      if (bracketFileInputRef.current) bracketFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '알 수 없음';

  // [New] 예상 대진 모달 열기 (기존 대진이 있으면 불러오고, 없으면 새로 생성)
  const handleOpenSimulation = () => {
    if (players.length < 4) return alert('최소 4명 이상 등록해야 합니다.');

    if (matches.length > 0 || matchQueue.length > 0) {
      // 대회가 이미 시작되었거나 대기열이 존재할 경우 기존 데이터를 불러옴 (랜덤 섞기 방지)
      const allMatches = [...matches, ...matchQueue].sort((a, b) => (a.seq || 0) - (b.seq || 0));
      const results: SimulatedMatch[] = allMatches.map(m => ({
        id: m.id,
        seq: m.seq || 0,
        teamAIds: m.teamA,
        teamBIds: m.teamB,
        teamANames: [getPlayerName(m.teamA[0]), getPlayerName(m.teamA[1])],
        teamBNames: [getPlayerName(m.teamB[0]), getPlayerName(m.teamB[1])]
      }));
      setSimulationResults(results);
      setIsSimulationOpen(true);
    } else if (simulationResults.length > 0) {
      setIsSimulationOpen(true);
    } else {
      runSimulation();
    }
  };

  // [New] 수동으로 다시 돌리기 (경고창 포함)
  const handleReRoll = () => {
    if (matches.length > 0 || matchQueue.length > 0) {
      if (!window.confirm("⚠️ 이미 진행 중인 대회가 있습니다.\n다시 돌리기를 실행하면 남은 대기열이 완전히 초기화되고 새로 생성됩니다.\n정말 새로 돌리시겠습니까?")) {
        return;
      }
    }
    runSimulation();
  };

  const runSimulation = () => {
    let virtualPlayers: Player[] = JSON.parse(JSON.stringify(players));
    let virtualMatches: Match[] = [];
    const results: SimulatedMatch[] = [];
    const totalMatchesNeeded = Math.ceil((players.length * settings.targetGamesPerPlayer) / 4);

    for (let i = 0; i < totalMatchesNeeded; i++) {
      const nextMatch = generateNextMatch(virtualPlayers, virtualMatches, settings.gameMode);
      if (!nextMatch) break;

      const tA_Names = [
        virtualPlayers.find(p => p.id === nextMatch.teamA[0])?.name || '',
        virtualPlayers.find(p => p.id === nextMatch.teamA[1])?.name || ''
      ] as [string, string];
      
      const tB_Names = [
        virtualPlayers.find(p => p.id === nextMatch.teamB[0])?.name || '',
        virtualPlayers.find(p => p.id === nextMatch.teamB[1])?.name || ''
      ] as [string, string];

      results.push({
        id: uuidv4(),
        seq: i + 1,
        teamAIds: nextMatch.teamA,
        teamBIds: nextMatch.teamB,
        teamANames: tA_Names,
        teamBNames: tB_Names
      });

      virtualPlayers.forEach(p => {
        if (nextMatch.teamA.includes(p.id) || nextMatch.teamB.includes(p.id)) {
          p.gamesPlayed++;
          const team = nextMatch.teamA.includes(p.id) ? nextMatch.teamA : nextMatch.teamB;
          const partnerId = team.find(id => id !== p.id);
          const partner = virtualPlayers.find(vp => vp.id === partnerId);
          if (partner && partner.gender !== p.gender) p.mixedGames++; 
          else p.sameSexGames++;
        }
      });
    }
    setSimulationResults(results);
    setSwapTarget(null);
    setIsSimulationOpen(true);
  };

  const handleSwapClick = (matchId: string, team: 'A'|'B', pIdx: number) => {
    // [New] 코트에 올라갔거나 끝난 경기는 수정 불가하도록 차단
    const isAlreadyPlayed = matches.find(m => m.id === matchId || m.id === swapTarget?.matchId);
    if (isAlreadyPlayed) {
      alert('이미 코트에 배정되었거나 완료된 경기의 선수는 자리를 바꿀 수 없습니다.');
      setSwapTarget(null);
      return;
    }

    if (!swapTarget) {
      setSwapTarget({ matchId, team, pIdx });
    } else {
      if (swapTarget.matchId === matchId && swapTarget.team === team && swapTarget.pIdx === pIdx) {
        setSwapTarget(null);
        return;
      }
      
      const newResults = [...simulationResults];
      const match1 = newResults.find(m => m.id === swapTarget.matchId)!;
      const match2 = newResults.find(m => m.id === matchId)!;

      const p1Id = swapTarget.team === 'A' ? match1.teamAIds[swapTarget.pIdx] : match1.teamBIds[swapTarget.pIdx];
      const p1Name = swapTarget.team === 'A' ? match1.teamANames[swapTarget.pIdx] : match1.teamBNames[swapTarget.pIdx];

      const p2Id = team === 'A' ? match2.teamAIds[pIdx] : match2.teamBIds[pIdx];
      const p2Name = team === 'A' ? match2.teamANames[pIdx] : match2.teamBNames[pIdx];

      if (settings.gameMode === 'TEAM_BATTLE') {
        const p1 = players.find(p => p.id === p1Id);
        const p2 = players.find(p => p.id === p2Id);
        if (p1?.team !== p2?.team) {
          alert(`[스왑 불가] ${p1?.name}(${p1?.team === 'Blue' ? '청' : '백'}) 선수와 ${p2?.name}(${p2?.team === 'Blue' ? '청' : '백'}) 선수는 소속 팀이 달라 자리를 바꿀 수 없습니다.`);
          setSwapTarget(null);
          return;
        }
      }

      if (swapTarget.team === 'A') { match1.teamAIds[swapTarget.pIdx] = p2Id; match1.teamANames[swapTarget.pIdx] = p2Name; }
      else { match1.teamBIds[swapTarget.pIdx] = p2Id; match1.teamBNames[swapTarget.pIdx] = p2Name; }

      if (team === 'A') { match2.teamAIds[pIdx] = p1Id; match2.teamANames[pIdx] = p1Name; }
      else { match2.teamBIds[pIdx] = p1Id; match2.teamBNames[pIdx] = p1Name; }

      setSimulationResults(newResults);
      setSwapTarget(null);
    }
  };

  const confirmSchedule = () => {
    if (!window.confirm(`해당 대진으로 "${settings.tournamentName}" 대회를 확정(또는 업데이트) 할까요?`)) return;
    
    const queueData = simulationResults.map(sim => ({
      id: sim.id,
      seq: sim.seq,
      courtNumber: 0,
      teamA: sim.teamAIds,
      teamB: sim.teamBIds,
      score: [0, 0] as [number, number],
      status: 'WAITING' as const,
      startTime: 0
    }));

    // [New] 이미 코트에 진행/완료된 경기는 빼고, 순수 남은 경기만 대기열로 밀어넣어 중복 방지
    if (matches.length > 0) {
      const existingMatchIds = new Set(matches.map(m => m.id));
      const filteredQueue = queueData.filter(q => !existingMatchIds.has(q.id));
      setMatchQueue(filteredQueue);
    } else {
      setMatchQueue(queueData);
    }

    setIsSimulationOpen(false);
    navigate('/matches');
  };

  const getMatchType = (teamA: string[], teamB: string[]) => {
    const allPlayers = [...teamA, ...teamB].map(id => players.find(p => p.id === id));
    const menCount = allPlayers.filter(p => p?.gender === 'M').length;
    if (menCount === 4) return '남복';
    if (menCount === 0) return '여복';
    if (menCount === 2) {
      const teamAMen = [players.find(p=>p.id===teamA[0]), players.find(p=>p.id===teamA[1])].filter(p=>p?.gender==='M').length;
      if (teamAMen === 1) return '혼복';
    }
    return '변칙';
  };

  if (isPrintViewOpen) {
    const matchCount = simulationResults.length;
    let titleClass = "text-xl mb-1";
    let subtitleClass = "text-[10px] mb-2";
    let thClass = "py-1 text-[11px]";
    let tdClass = "py-[3px] text-[11px] leading-tight"; 
    let nameSizeClass = "text-[11.5px]";

    if (matchCount <= 18) {
      titleClass = "text-3xl mb-4 mt-2";
      subtitleClass = "text-base mb-6";
      thClass = "py-3 text-sm";
      tdClass = "py-3 text-sm";
      nameSizeClass = "text-[15px]";
    } else if (matchCount <= 28) {
      titleClass = "text-2xl mb-3 mt-1";
      subtitleClass = "text-sm mb-4";
      thClass = "py-2 text-xs";
      tdClass = "py-2 text-xs";
      nameSizeClass = "text-[13px]";
    } else if (matchCount <= 36) {
      titleClass = "text-xl mb-2";
      subtitleClass = "text-xs mb-3";
      thClass = "py-1.5 text-[11px]";
      tdClass = "py-1.5 text-[11px]";
      nameSizeClass = "text-[12px]";
    }

    return (
      <div className="min-h-screen bg-gray-200 py-4 print:bg-white print:py-0 font-sans">
        <style>
          {`
            @media print {
              @page { size: A4 portrait; margin: 10mm 12mm; }
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `}
        </style>
        
        <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl print:shadow-none print:p-0 relative">
          <div className="flex justify-end gap-3 mb-4 print:hidden">
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors"><Printer className="w-5 h-5" /> 인쇄하기</button>
            <button onClick={() => setIsPrintViewOpen(false)} className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg font-bold hover:bg-gray-50 border border-gray-300 shadow-sm transition-colors"><X className="w-5 h-5" /> 닫기</button>
          </div>

          <div className="text-center">
            <h1 className={clsx("font-black text-gray-900 tracking-tight", titleClass)}>{settings.tournamentName}</h1>
            <p className={clsx("text-gray-500 font-bold", subtitleClass)}>전체 경기 대진표</p>
          </div>

          <table className="w-full border-collapse border-2 border-gray-900 mb-4">
            <thead>
              <tr className="bg-gray-200 border-b-2 border-gray-900">
                <th className={clsx("border border-gray-500 px-1 w-10 text-center font-extrabold text-gray-800", thClass)}>No</th>
                <th className={clsx("border border-gray-500 px-1 w-14 text-center font-extrabold text-gray-800", thClass)}>종목</th>
                <th className={clsx("border border-gray-500 px-2 text-center w-[35%] font-extrabold text-gray-800", thClass)}>Team A</th>
                <th className={clsx("border border-gray-500 px-2 text-center w-[35%] font-extrabold text-gray-800", thClass)}>Team B</th>
                <th className={clsx("border border-gray-500 px-1 text-center font-extrabold text-gray-800", thClass)}>심판 확인</th>
              </tr>
            </thead>
            <tbody>
              {simulationResults.map(match => {
                const typeName = getMatchType(match.teamAIds, match.teamBIds);
                const teamAColor = players.find(p => p.id === match.teamAIds[0])?.team;
                const teamBColor = players.find(p => p.id === match.teamBIds[0])?.team;

                const getCellClass = (teamColor: string | undefined) => {
                  if (settings.gameMode !== 'TEAM_BATTLE') return "bg-white text-gray-800";
                  if (teamColor === 'Blue') return "bg-[#e0f2fe] text-[#0369a1]"; 
                  if (teamColor === 'White') return "bg-[#f3f4f6] text-[#111827]"; 
                  return "bg-white text-gray-800";
                };

                const getTeamPrefix = (teamColor: string | undefined) => {
                  if (settings.gameMode !== 'TEAM_BATTLE') return "";
                  if (teamColor === 'Blue') return "[청]";
                  if (teamColor === 'White') return "[백]";
                  return "";
                };

                return (
                  <tr key={match.id} className="border-b border-gray-500">
                    <td className={clsx("border border-gray-500 px-1 text-center font-black text-gray-900", tdClass)}>{match.seq}</td>
                    <td className={clsx("border border-gray-500 px-1 text-center font-bold text-gray-600", tdClass)}>{typeName}</td>
                    <td className={clsx("border border-gray-500 px-2 text-center font-bold", tdClass, getCellClass(teamAColor))}>
                      {settings.gameMode === 'TEAM_BATTLE' && <span className={clsx("mr-1 opacity-70", nameSizeClass)}>{getTeamPrefix(teamAColor)}</span>}
                      <span className={nameSizeClass}>{match.teamANames.join(', ')}</span>
                    </td>
                    <td className={clsx("border border-gray-500 px-2 text-center font-bold", tdClass, getCellClass(teamBColor))}>
                      {settings.gameMode === 'TEAM_BATTLE' && <span className={clsx("mr-1 opacity-70", nameSizeClass)}>{getTeamPrefix(teamBColor)}</span>}
                      <span className={nameSizeClass}>{match.teamBNames.join(', ')}</span>
                    </td>
                    <td className={clsx("border border-gray-500 px-1 text-center text-gray-300", tdClass)}>
                       [ &nbsp;&nbsp;&nbsp; : &nbsp;&nbsp;&nbsp; ]
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="text-right text-[10px] font-medium text-gray-400 pb-2">
            ⓒ HWANY. All rights reserved.
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex-1 mr-4">
              <input
                type="text"
                value={settings.tournamentName}
                onChange={(e) => updateSettings({ tournamentName: e.target.value })}
                className="text-xl font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-full transition-colors pb-1"
                placeholder="대회 명을 입력하세요"
              />
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><Settings className="w-6 h-6" /></button>
          </div>
          <div className="flex gap-2 text-xs font-semibold overflow-x-auto pb-1">
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">총 {players.length}명</span>
            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">남 {maleCount}</span>
            <span className="bg-pink-50 text-pink-600 px-2 py-1 rounded">여 {femaleCount}</span>
            {(blueCount > 0 || whiteCount > 0) && (
              <><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-200">청 {blueCount}</span><span className="bg-white text-gray-600 px-2 py-1 rounded border border-gray-200">백 {whiteCount}</span></>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col gap-4 pb-40">
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <label className="block text-sm font-medium text-gray-700">새로운 참가자 정보</label>
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="flex-[2] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button type="button" onClick={() => setGender('M')} className={clsx("px-3 py-1 rounded-md text-sm font-bold transition-all", gender === 'M' ? "bg-blue-500 text-white" : "text-gray-500")}>남</button>
              <button type="button" onClick={() => setGender('F')} className={clsx("px-3 py-1 rounded-md text-sm font-bold transition-all", gender === 'F' ? "bg-pink-500 text-white" : "text-gray-500")}>여</button>
            </div>
          </div>
          <div className="flex gap-2">
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white outline-none">
              <option value="A">A조</option><option value="B">B조</option><option value="C">C조</option><option value="D">D조</option><option value="E">초심</option>
            </select>
            {(settings.gameMode === 'TEAM_BATTLE' || blueCount > 0 || whiteCount > 0) && (
                 <div className="flex bg-gray-100 rounded-lg p-1">
                 <button type="button" onClick={() => setTeam(team === 'Blue' ? undefined : 'Blue')} className={clsx("px-3 py-1 rounded-md text-sm font-bold transition-all", team === 'Blue' ? "bg-blue-600 text-white" : "text-gray-400")}>청</button>
                 <button type="button" onClick={() => setTeam(team === 'White' ? undefined : 'White')} className={clsx("px-3 py-1 rounded-md text-sm font-bold transition-all", team === 'White' ? "bg-white text-gray-800 border border-gray-200" : "text-gray-400")}>백</button>
               </div>
            )}
            <button type="submit" disabled={!name.trim()} className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-bold flex items-center gap-2"><UserPlus className="w-5 h-5" /></button>
          </div>
        </form>

        <div className="flex-1">
          {players.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300"><Users className="w-12 h-12 mx-auto mb-2 opacity-20" /><p>아직 등록된 참가자가 없습니다.</p></div>
          ) : (
            <ul className="grid grid-cols-1 gap-2">
              {sortedPlayers.map((player) => (
                <li key={player.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  {editingId === player.id ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="flex-[2] px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none" />
                        <div className="flex bg-gray-100 rounded-lg p-1">
                          <button onClick={() => setEditForm({...editForm, gender: 'M'})} className={clsx("px-2 py-1 rounded text-xs font-bold", editForm.gender === 'M' ? "bg-blue-500 text-white" : "text-gray-500")}>남</button>
                          <button onClick={() => setEditForm({...editForm, gender: 'F'})} className={clsx("px-2 py-1 rounded text-xs font-bold", editForm.gender === 'F' ? "bg-pink-500 text-white" : "text-gray-500")}>여</button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <select value={editForm.level} onChange={(e) => setEditForm({...editForm, level: e.target.value})} className="flex-1 px-2 py-2 text-sm border border-blue-300 rounded-lg outline-none"><option value="A">A조</option><option value="B">B조</option><option value="C">C조</option><option value="D">D조</option><option value="E">초심</option></select>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                          <button onClick={() => setEditForm({...editForm, team: editForm.team === 'Blue' ? undefined : 'Blue'})} className={clsx("px-2 py-1 rounded text-xs font-bold", editForm.team === 'Blue' ? "bg-blue-600 text-white" : "text-gray-400")}>청</button>
                          <button onClick={() => setEditForm({...editForm, team: editForm.team === 'White' ? undefined : 'White'})} className={clsx("px-2 py-1 rounded text-xs font-bold", editForm.team === 'White' ? "bg-white text-gray-800 border" : "text-gray-400")}>백</button>
                        </div>
                        <button onClick={() => handleEditSave(player.id)} className="bg-emerald-500 text-white px-3 rounded-lg hover:bg-emerald-600 flex items-center justify-center"><Check className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-10 h-10 rounded-full flex flex-col items-center justify-center text-xs font-bold border-2 relative", player.gender === 'M' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-pink-50 text-pink-600 border-pink-100")}>
                          <span>{player.level}</span>
                          {player.team && <div className={clsx("absolute -top-1 -right-1 w-4 h-4 rounded-full border border-white shadow-sm", player.team === 'Blue' ? "bg-blue-600" : "bg-gray-100")} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 text-lg">{player.name}</span>
                            {player.team && <span className={clsx("text-xs px-1.5 py-0.5 rounded font-bold", player.team === 'Blue' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 border border-gray-200")}>{player.team === 'Blue' ? '청팀' : '백팀'}</span>}
                          </div>
                          <span className="text-xs text-gray-400">{player.gender === 'M' ? '남성' : '여성'} · {player.level}조</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button onClick={() => handleEditStart(player)} className="text-gray-300 hover:text-blue-500 p-2"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(player.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-center py-6 text-xs font-medium text-gray-400">
          ⓒ HWANY. All rights reserved.
        </div>
      </div>

      <div className="bg-white border-t p-4 fixed bottom-0 left-0 right-0 z-10 space-y-3 print:hidden">
        <div className="max-w-md mx-auto flex gap-3">
          {/* [New] 예상 대진 불러오기 동작 적용 */}
          <button onClick={handleOpenSimulation} disabled={players.length < 4} className="flex-1 bg-white text-gray-700 border border-gray-300 py-4 rounded-xl font-bold shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"><ClipboardList className="w-5 h-5" /> 예상 대진</button>
          <button onClick={() => navigate('/matches')} disabled={players.length < 4} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:bg-gray-300 flex items-center justify-center gap-2"><PlayCircle className="w-6 h-6" /> 대회 시작</button>
        </div>
      </div>

      <div className={clsx("fixed inset-0 z-50 transition-all duration-300", isSettingsOpen ? "visible" : "invisible pointer-events-none")}>
        <div className={clsx("absolute inset-0 bg-black/50 transition-opacity duration-300", isSettingsOpen ? "opacity-100" : "opacity-0")} onClick={() => setIsSettingsOpen(false)} />
        <div className={clsx("absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl p-6 transition-transform duration-300 transform flex flex-col overflow-y-auto", isSettingsOpen ? "translate-x-0" : "translate-x-full")}>
          <div className="flex justify-between items-center mb-8"><h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Settings className="w-6 h-6" /> 설정 및 관리</h2><button onClick={() => setIsSettingsOpen(false)}><X className="w-6 h-6 text-gray-400" /></button></div>
          <div className="space-y-8 flex-1">
            <section>
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">대회 규칙 설정</h3>
               <div className="space-y-4">
                 <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">대회 모드</label>
                  <select 
                    value={settings.gameMode} 
                    onChange={(e) => updateSettings({ gameMode: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TEAM_BATTLE">청백전 (팀 대항전)</option>
                    <option value="INDIVIDUAL">개인전 (랜덤 파트너)</option>
                  </select>
                 </div>
                 <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">사용할 코트 수</label>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                    <button onClick={() => adjustSetting('courtCount', -1)} className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100"><Minus className="w-4 h-4" /></button>
                    <span className="text-xl font-bold text-gray-800 w-16 text-center">{settings.courtCount}</span>
                    <button onClick={() => adjustSetting('courtCount', 1)} className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-600 hover:bg-blue-50"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">인당 목표 게임 수</label>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                    <button onClick={() => adjustSetting('targetGamesPerPlayer', -1)} className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100"><Minus className="w-4 h-4" /></button>
                    <span className="text-xl font-bold text-gray-800 w-16 text-center">{settings.targetGamesPerPlayer}</span>
                    <button onClick={() => adjustSetting('targetGamesPerPlayer', 1)} className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-600 hover:bg-blue-50"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
               </div>
            </section>

            {settings.gameMode === 'TEAM_BATTLE' && (
              <section className="pt-6 border-t border-gray-100">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">청백전 기능</h3>
                 <button onClick={handleAssignTeams} className="w-full flex items-center justify-between p-4 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors">
                    <div className="flex items-center gap-3"><Shield className="w-5 h-5" /><span className="font-medium">팀 자동 배정 (밸런싱)</span></div>
                 </button>
              </section>
            )}

            <section className="pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">데이터 관리</h3>
              <div className="space-y-3">
                <button onClick={exportData} className="w-full flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors">
                  <div className="flex items-center gap-3"><Download className="w-5 h-5" /><span className="font-medium">대회 전체 저장</span></div>
                </button>
                <div className="relative">
                  <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
                    <div className="flex items-center gap-3"><Upload className="w-5 h-5" /><span className="font-medium">대회 전체 불러오기</span></div>
                  </button>
                </div>
                <button onClick={copyPlayerList} className="w-full flex items-center justify-between p-4 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3"><ClipboardList className="w-5 h-5" /><span className="font-medium">명단 복사</span></div>
                </button>

                <div className="pt-2 space-y-2">
                  <button onClick={handleResetMatches} className="w-full flex items-center gap-3 p-4 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors">
                    <RotateCcw className="w-5 h-5 shrink-0" />
                    <span className="font-medium text-left">경기 기록만 초기화<br/><span className="text-xs opacity-70">(명단 유지)</span></span>
                  </button>
                  <button onClick={handleRemoveAllPlayers} className="w-full flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors">
                    <UserX className="w-5 h-5 shrink-0" />
                    <span className="font-medium text-left">모든 데이터 초기화<br/><span className="text-xs opacity-70">(명단 포함 전체 삭제)</span></span>
                  </button>
                </div>

              </div>
            </section>
          </div>
          <button onClick={() => setIsSettingsOpen(false)} className="w-full py-4 mt-6 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800">설정 닫기</button>
        </div>
      </div>

      {isSimulationOpen && !isPrintViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsSimulationOpen(false); setSwapTarget(null); }} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col relative z-10 animate-in fade-in zoom-in duration-200">
             
             <div className="p-4 border-b bg-gray-50 rounded-t-2xl space-y-3">
               <div className="flex justify-between items-center">
                 <div>
                   <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-blue-600" /> 대진표 미리보기</h3>
                   <p className="text-xs text-gray-500 mt-1">이름을 클릭하여 서로 자리를 바꿀 수 있습니다.</p>
                 </div>
                 <button onClick={() => { setIsSimulationOpen(false); setSwapTarget(null); }} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
               </div>
               
               <div className="flex justify-end gap-2">
                 <button onClick={() => setIsPrintViewOpen(true)} className="text-xs font-bold flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-blue-700 shadow-sm mr-auto border-blue-300 transition-colors">
                   <Maximize2 className="w-3.5 h-3.5"/> 크게보기 (인쇄)
                 </button>
                 <button onClick={exportBracket} className="text-xs font-semibold flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm">
                   <Download className="w-3.5 h-3.5"/> 저장
                 </button>
                 <input ref={bracketFileInputRef} type="file" accept=".json" onChange={handleBracketUpload} className="hidden" />
                 <button onClick={() => bracketFileInputRef.current?.click()} className="text-xs font-semibold flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm">
                   <Upload className="w-3.5 h-3.5"/> 불러오기
                 </button>
               </div>
             </div>
             
             <div className="overflow-y-auto p-4 space-y-3 flex-1 bg-gray-50/50">
               {simulationResults.map((match) => (
                 <div key={match.id} className="flex items-center gap-2 bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                   <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold shrink-0">{match.seq}</div>
                   <div className="flex-1 flex justify-between items-center text-sm gap-2">
                     <div className="flex-1 flex flex-col gap-1 items-end">
                       {[0, 1].map(pIdx => {
                         const isSelected = swapTarget?.matchId === match.id && swapTarget?.team === 'A' && swapTarget?.pIdx === pIdx;
                         const playerTeam = players.find(p => p.id === match.teamAIds[pIdx])?.team;
                         
                         return (
                           <button key={pIdx} onClick={() => handleSwapClick(match.id, 'A', pIdx)}
                             className={clsx(
                               "px-2 py-1.5 rounded border text-xs font-bold transition-all w-full flex items-center justify-end gap-1.5",
                               isSelected ? "bg-blue-100 border-blue-500 text-blue-700 ring-2 ring-blue-500" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                             )}>
                             <TeamBadge team={playerTeam} />
                             <span className="truncate">{match.teamANames[pIdx]}</span>
                           </button>
                         )
                       })}
                     </div>
                     
                     <div className="text-xs font-bold text-gray-300 px-1">VS</div>
                     
                     <div className="flex-1 flex flex-col gap-1 items-start">
                       {[0, 1].map(pIdx => {
                         const isSelected = swapTarget?.matchId === match.id && swapTarget?.team === 'B' && swapTarget?.pIdx === pIdx;
                         const playerTeam = players.find(p => p.id === match.teamBIds[pIdx])?.team;

                         return (
                           <button key={pIdx} onClick={() => handleSwapClick(match.id, 'B', pIdx)}
                             className={clsx(
                               "px-2 py-1.5 rounded border text-xs font-bold transition-all w-full flex items-center justify-start gap-1.5",
                               isSelected ? "bg-blue-100 border-blue-500 text-blue-700 ring-2 ring-blue-500" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                             )}>
                             <TeamBadge team={playerTeam} />
                             <span className="truncate">{match.teamBNames[pIdx]}</span>
                           </button>
                         )
                       })}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
             <div className="p-4 border-t bg-white rounded-b-2xl flex gap-3 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
               {/* [New] 다시 돌리기 동작 적용 */}
               <button onClick={handleReRoll} className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> 다시 돌리기</button>
               <button onClick={confirmSchedule} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> 대진 확정 및 시작</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}