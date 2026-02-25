import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Player, Match, TournamentSettings } from '../types';

interface GameState {
  players: Player[];
  matches: Match[];
  matchQueue: Match[];
  settings: TournamentSettings;

  addPlayer: (name: string, gender: 'M' | 'F', level: string, team?: 'Blue' | 'White') => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  togglePlayerActive: (id: string) => void;
  deletePlayer: (id: string) => void;
  removeAllPlayers: () => void;
  
  assignTeams: () => void;

  startMatch: (courtNumber: number, teamAIds: [string, string], teamBIds: [string, string]) => void;
  startMatchFromQueue: (matchId: string, courtNumber: number) => void;
  finishMatch: (matchId: string, scoreA: number, scoreB: number) => void;
  cancelMatch: (matchId: string) => void;
  
  resetMatches: () => void;
  setMatchQueue: (newQueue: Match[]) => void;
  
  updateSettings: (newSettings: Partial<TournamentSettings>) => void;
  resetTournament: () => void;
  importData: (data: Partial<GameState>) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      players: [],
      matches: [],
      matchQueue: [],
      settings: {
        courtCount: 3,
        targetGamesPerPlayer: 4,
        scoreLimit: 25,
        gameMode: 'TEAM_BATTLE', 
        tournamentName: '배드민턴 월례대회', // [New] 대회명 기본값
      },

      addPlayer: (name, gender, level, team) => set((state) => ({
        players: [
          ...state.players,
          {
            id: uuidv4(),
            name,
            gender,
            level,
            team,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            scoreDiff: 0,
            sameSexGames: 0,
            mixedGames: 0,
            partners: [],
            opponents: [],
            isActive: true,
          },
        ],
      })),

      updatePlayer: (id, updates) => set((state) => ({
        players: state.players.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      })),

      togglePlayerActive: (id) => set((state) => ({
        players: state.players.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)),
      })),

      deletePlayer: (id) => set((state) => ({
        players: state.players.filter((p) => p.id !== id),
      })),

      removeAllPlayers: () => set({
        players: [],
        matches: [],
        matchQueue: []
      }),

      assignTeams: () => set((state) => {
        const males = state.players.filter(p => p.gender === 'M');
        const females = state.players.filter(p => p.gender === 'F');

        const sortByLevel = (a: Player, b: Player) => a.level.localeCompare(b.level);
        males.sort(sortByLevel);
        females.sort(sortByLevel);
        
        const newPlayers = [...state.players];
        
        let totalBlue = 0;
        let totalWhite = 0;

        const assignSnake = (list: Player[], startTeam: 'Blue' | 'White') => {
          list.forEach((p, i) => {
            const mod = i % 4;
            let assignTo: 'Blue' | 'White';
            
            if (mod === 0 || mod === 3) {
              assignTo = startTeam;
            } else {
              assignTo = startTeam === 'Blue' ? 'White' : 'Blue';
            }
            
            const target = newPlayers.find(np => np.id === p.id);
            if (target) {
              target.team = assignTo;
              if (assignTo === 'Blue') totalBlue++;
              else totalWhite++;
            }
          });
        };

        assignSnake(males, 'Blue');
        
        const femaleStartTeam = totalBlue > totalWhite ? 'White' : 'Blue';
        assignSnake(females, femaleStartTeam);

        return { players: newPlayers };
      }),

      startMatch: (courtNumber, teamAIds, teamBIds) => set((state) => {
        const allGenders = [...teamAIds, ...teamBIds].map(id => state.players.find(p => p.id === id)?.gender);
        const menCount = allGenders.filter(g => g === 'M').length;
        
        let matchType: 'MD' | 'WD' | 'XD' | 'ETC' = 'ETC'; 
        if (menCount === 4) {
          matchType = 'MD'; 
        } else if (menCount === 0) {
          matchType = 'WD'; 
        } else if (menCount === 2) {
          const teamAMen = teamAIds.map(id => state.players.find(p => p.id === id)?.gender).filter(g => g === 'M').length;
          if (teamAMen === 1) matchType = 'XD'; 
        }

        return {
          matches: [
            ...state.matches,
            {
              id: uuidv4(),
              courtNumber,
              matchType: matchType as any,
              teamA: teamAIds,
              teamB: teamBIds,
              score: [0, 0],
              status: 'PLAYING',
              startTime: Date.now(),
            },
          ],
        };
      }),

      startMatchFromQueue: (matchId, courtNumber) => set((state) => {
        const matchIndex = state.matchQueue.findIndex(m => m.id === matchId);
        if (matchIndex === -1) return state;
        const matchToStart = state.matchQueue[matchIndex];
        const newQueue = [...state.matchQueue];
        newQueue.splice(matchIndex, 1);
        return {
          matchQueue: newQueue,
          matches: [
            ...state.matches,
            {
              ...matchToStart,
              courtNumber,
              status: 'PLAYING',
              startTime: Date.now()
            }
          ]
        };
      }),

      finishMatch: (matchId, scoreA, scoreB) => set((state) => {
        const matchIndex = state.matches.findIndex((m) => m.id === matchId);
        if (matchIndex === -1) return state;

        const match = state.matches[matchIndex];
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = {
          ...match,
          status: 'FINISHED',
          score: [scoreA, scoreB],
          endTime: Date.now(),
        };

        const updatedPlayers = state.players.map((player) => {
          const isTeamA = match.teamA.includes(player.id);
          const isTeamB = match.teamB.includes(player.id);

          if (!isTeamA && !isTeamB) return player;

          let newPartnerId = '';
          if (isTeamA) newPartnerId = match.teamA.find(id => id !== player.id) || '';
          else newPartnerId = match.teamB.find(id => id !== player.id) || '';

          const partner = state.players.find(p => p.id === newPartnerId);
          const isMixedGame = partner ? partner.gender !== player.gender : false;

          const isWinner = (isTeamA && scoreA > scoreB) || (isTeamB && scoreB > scoreA);
          const myScore = isTeamA ? scoreA : scoreB;
          const opponentScore = isTeamA ? scoreB : scoreA;

          return {
            ...player,
            gamesPlayed: player.gamesPlayed + 1,
            wins: player.wins + (isWinner ? 1 : 0),
            losses: player.losses + (isWinner ? 0 : 1),
            scoreDiff: player.scoreDiff + (myScore - opponentScore),
            sameSexGames: player.sameSexGames + (isMixedGame ? 0 : 1),
            mixedGames: player.mixedGames + (isMixedGame ? 1 : 0),
            partners: newPartnerId ? [...player.partners, newPartnerId] : player.partners,
          };
        });

        return { matches: updatedMatches, players: updatedPlayers };
      }),

      cancelMatch: (matchId) => set((state) => {
        const matchIndex = state.matches.findIndex((m) => m.id === matchId);
        if (matchIndex === -1) return state;

        const matchToCancel = state.matches[matchIndex];
        const updatedMatches = [...state.matches];
        updatedMatches.splice(matchIndex, 1); 

        const revertedMatch: Match = {
          ...matchToCancel,
          status: 'WAITING',
          courtNumber: 0,
          startTime: 0,
        };

        return {
          matches: updatedMatches,
          matchQueue: [revertedMatch, ...state.matchQueue],
        };
      }),

      resetMatches: () => set((state) => ({
        matches: [],
        matchQueue: [],
        players: state.players.map(p => ({
          ...p,
          gamesPlayed: 0, wins: 0, losses: 0, scoreDiff: 0, 
          sameSexGames: 0, mixedGames: 0,
          partners: [], opponents: []
        }))
      })),

      setMatchQueue: (newQueue) => set({ matchQueue: newQueue }),
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),

      resetTournament: () => set({ players: [], matches: [], matchQueue: [] }),
      
      importData: (data) => set((state) => ({ ...state, ...data, settings: data.settings || state.settings })),
    }),
    {
      name: 'tournament-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);