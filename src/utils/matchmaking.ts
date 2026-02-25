import type { Player, Match, GameMode } from '../types';

// 급수를 점수로 환산 (A:5 ~ E:1)
const getLevelPoint = (level: string) => {
  switch(level) {
    case 'A': return 5;
    case 'B': return 4;
    case 'C': return 3;
    case 'D': return 2;
    case 'E': return 1;
    default: return 3;
  }
};

/**
 * [매치 평가 함수]
 * 팀A와 팀B가 맞붙었을 때의 '불균형 점수(Penalty)'를 계산합니다.
 * 점수가 낮을수록(음수 포함) 훌륭한 매치입니다.
 */
const calculatePenalty = (teamA: Player[], teamB: Player[]) => {
  let penalty = 0;

  // 1. 급수 밸런스 페널티 (가장 중요)
  const scoreA = getLevelPoint(teamA[0].level) + getLevelPoint(teamA[1].level);
  const scoreB = getLevelPoint(teamB[0].level) + getLevelPoint(teamB[1].level);
  penalty += Math.abs(scoreA - scoreB) * 5; // 급수 차이 1점당 5점 페널티

  // 2. 성별 밸런스 페널티 (남복 vs 남복, 혼복 vs 혼복 유도)
  const menA = teamA.filter(p => p.gender === 'M').length;
  const menB = teamB.filter(p => p.gender === 'M').length;

  // [Fix] 정규 규칙 강제 (남복vs남복, 여복vs여복, 혼복vs혼복)
  // 양 팀의 남성 수가 다르면 배드민턴 정규 매치가 아님 -> 1000점 폭탄 페널티!
  if (menA !== menB) {
    penalty += 1000; 
  }

  // 3. 중복 매칭 페널티 (과거 파트너/상대)
  const applyHistoryPenalty = (p1: Player, p2: Player) => {
    if (p1.partners?.includes(p2.id)) penalty += 6;
  };
  const checkOpponents = (p: Player, oppTeam: Player[]) => {
    if (p.opponents?.includes(oppTeam[0].id)) penalty += 3;
    if (p.opponents?.includes(oppTeam[1].id)) penalty += 3;
  };

  applyHistoryPenalty(teamA[0], teamA[1]);
  applyHistoryPenalty(teamB[0], teamB[1]);
  checkOpponents(teamA[0], teamB);
  checkOpponents(teamA[1], teamB);
  checkOpponents(teamB[0], teamA);
  checkOpponents(teamB[1], teamA);

  // 4. [핵심] 황금 밸런스 페널티 계산 (구조가 정상일 때만 적용)
  const isMixedGame = menA === 1 && menB === 1; // 완벽한 혼복 매치
  const isSameSexGame = (menA === 2 && menB === 2) || (menA === 0 && menB === 0); // 완벽한 남복/여복 매치

  const allPlayers = [...teamA, ...teamB];

  if (isMixedGame) {
    allPlayers.forEach(p => {
      if (p.mixedGames >= 2) penalty += 50; // 혼복 2번 쳤으면 그만 치게 강한 페널티
      else penalty -= 15;                   // 혼복 안 쳤으면 우선권 부여 (인센티브)
    });
  } else if (isSameSexGame) {
    allPlayers.forEach(p => {
      if (p.sameSexGames >= 2) penalty += 50; // 동성복 2번 쳤으면 그만 치게 강한 페널티
      else penalty -= 15;                   // 동성복 안 쳤으면 우선권 부여 (인센티브)
    });
  }

  return penalty;
};


/**
 * [대진 생성기 메인]
 */
export const generateNextMatch = (
  players: Player[],
  matches: Match[],
  mode: GameMode = 'TEAM_BATTLE' // 설정된 모드에 따라 동작
): { teamA: [string, string], teamB: [string, string] } | null => {
  
  // 1. 현재 경기 중인 선수 제외
  const playingPlayerIds = new Set<string>();
  matches.forEach(match => {
    if (match.status === 'PLAYING') {
      match.teamA.forEach(id => playingPlayerIds.add(id));
      match.teamB.forEach(id => playingPlayerIds.add(id));
    }
  });

  const waitingPlayers = players.filter(
    p => p.isActive && !playingPlayerIds.has(p.id)
  );

  // 대기자가 적으면 매칭 불가
  if (waitingPlayers.length < 4) return null;

  // [수정됨] 경기 수가 같을 때 무작위로 섞어주는 정렬 함수 추가 (다시 돌리기 작동의 핵심)
  const sortWithRandom = (a: Player, b: Player) => {
    if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
    return Math.random() - 0.5; // 황금 밸런스 안에서 다양한 조합이 나오도록 난수 발생
  };

  // 2. 청백전(팀전) 모드 매칭 로직
  if (mode === 'TEAM_BATTLE') {
    const blueTeam = waitingPlayers.filter(p => p.team === 'Blue').sort(sortWithRandom);
    const whiteTeam = waitingPlayers.filter(p => p.team === 'White').sort(sortWithRandom);

    if (blueTeam.length < 2 || whiteTeam.length < 2) return null;

    // 경기 수가 가장 적은 상위 4~6명씩을 후보군(Pool)으로 추출
    const blueCandidates = blueTeam.slice(0, 6);
    const whiteCandidates = whiteTeam.slice(0, 6);

    let bestMatch = null;
    let minPenalty = Infinity;

    // 가능한 모든 2:2 조합을 탐색하여 최적의 매치 성사
    for (let i = 0; i < blueCandidates.length - 1; i++) {
      for (let j = i + 1; j < blueCandidates.length; j++) {
        for (let k = 0; k < whiteCandidates.length - 1; k++) {
          for (let l = k + 1; l < whiteCandidates.length; l++) {
            const tA = [blueCandidates[i], blueCandidates[j]];
            const tB = [whiteCandidates[k], whiteCandidates[l]];
            
            const penalty = calculatePenalty(tA, tB);
            
            if (penalty < minPenalty) {
              minPenalty = penalty;
              bestMatch = {
                teamA: [tA[0].id, tA[1].id] as [string, string],
                teamB: [tB[0].id, tB[1].id] as [string, string]
              };
            }
          }
        }
      }
    }
    return bestMatch;
  } 
  
  // 3. 일반 모드(개인전) 매칭 로직
  else {
    // 경기 수가 적은 상위 6명 추출
    const candidates = [...waitingPlayers].sort(sortWithRandom).slice(0, 6);
    
    let bestMatch = null;
    let minPenalty = Infinity;

    // 6명 중 4명을 뽑아 2:2를 만드는 모든 경우의 수 탐색
    for(let i=0; i<candidates.length; i++) {
      for(let j=i+1; j<candidates.length; j++) {
        for(let k=j+1; k<candidates.length; k++) {
          for(let l=k+1; l<candidates.length; l++) {
            const selected4 = [candidates[i], candidates[j], candidates[k], candidates[l]];
            
            // 4명을 2팀으로 나누는 3가지 방법
            const ways = [
              [[0,1], [2,3]],
              [[0,2], [1,3]],
              [[0,3], [1,2]]
            ];

            ways.forEach(way => {
              const tA = [selected4[way[0][0]], selected4[way[0][1]]];
              const tB = [selected4[way[1][0]], selected4[way[1][1]]];
              
              const penalty = calculatePenalty(tA, tB);
              if (penalty < minPenalty) {
                minPenalty = penalty;
                bestMatch = {
                  teamA: [tA[0].id, tA[1].id] as [string, string],
                  teamB: [tB[0].id, tB[1].id] as [string, string]
                };
              }
            });
          }
        }
      }
    }
    return bestMatch;
  }
};