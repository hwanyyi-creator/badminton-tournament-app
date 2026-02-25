// types/index.ts

export type GameMode = 'INDIVIDUAL' | 'TEAM_BATTLE';
export type MatchType = 'MD' | 'WD' | 'XD'; 

export interface Player {
  id: string;
  name: string;
  gender: 'M' | 'F';
  level: string;
  team?: 'Blue' | 'White'; 
  
  gamesPlayed: number;
  wins: number;
  losses: number;
  scoreDiff: number;
  
  sameSexGames: number; 
  mixedGames: number;   
  
  partners: string[];
  opponents: string[];
  isActive: boolean;
}

export type MatchStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

export interface Match {
  id: string;
  seq?: number; // [New] 고유 게임 번호
  courtNumber: number;
  matchType?: MatchType; 
  teamA: [string, string]; 
  teamB: [string, string];
  score: [number, number]; 
  status: MatchStatus;
  startTime: number;
  endTime?: number;
}

export interface TournamentSettings {
  courtCount: number;
  targetGamesPerPlayer: number;
  scoreLimit: number;
  gameMode: GameMode; 
  tournamentName: string;
}