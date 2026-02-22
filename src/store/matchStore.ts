import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Match } from '../types/models';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface MatchState {
    matches: Match[];
    createMatch: (tournamentId: string, teamAId: string, teamBId: string, overs: number, venue?: string, matchDate?: string) => Promise<Match>;
    getTournamentMatches: (tournamentId: string) => Match[];
    deleteMatch: (matchId: string) => Promise<void>;
    updateMatch: (matchId: string, updates: Partial<Match>) => Promise<void>;
    updateMatchStatus: (matchId: string, status: Match['status']) => Promise<void>;
    getAllVenues: () => string[];
    updateMatchPlayers: (matchId: string, teamAPlayerIds: string[], teamBPlayerIds: string[]) => Promise<void>;
    updateTossResult: (matchId: string, tossWinnerId: string, battingFirstId: string) => Promise<void>;
    importMatches: (matches: Match[]) => void;
}

export const useMatchStore = create<MatchState>()(
    persist(
        (set, get) => ({
            matches: [],
            createMatch: async (tournamentId, teamAId, teamBId, overs, venue, matchDate) => {
                const newMatch: Match = {
                    id: uuidv4(),
                    tournamentId,
                    teamAId,
                    teamBId,
                    overs,
                    venue,
                    matchDate,
                    status: 'SCHEDULED',
                    createdAt: new Date().toISOString(),
                };
                set((state) => ({ matches: [...state.matches, newMatch] }));
                return newMatch;
            },
            getAllVenues: () => {
                const venues = new Set<string>();
                get().matches.forEach(m => {
                    if (m.venue) venues.add(m.venue);
                });
                return Array.from(venues);
            },
            getTournamentMatches: (tournamentId) => {
                return get().matches.filter(m => m.tournamentId === tournamentId);
            },
            deleteMatch: async (id) => {
                set((state) => ({
                    matches: state.matches.filter((m) => m.id !== id),
                }));
            },
            updateMatch: async (id, updates) => {
                set((state) => ({
                    matches: state.matches.map((m) => (m.id === id ? { ...m, ...updates } : m)),
                }));
            },
            updateMatchStatus: async (id, status) => {
                set((state) => ({
                    matches: state.matches.map((m) => (m.id === id ? { ...m, status } : m)),
                }));
            },
            updateMatchPlayers: async (id, teamAPlayerIds, teamBPlayerIds) => {
                set((state) => ({
                    matches: state.matches.map((m) => (m.id === id ? { ...m, teamAPlayerIds, teamBPlayerIds } : m)),
                }));
            },
            updateTossResult: async (id, tossWinnerId, battingFirstId) => {
                set((state) => ({
                    matches: state.matches.map((m) => (m.id === id ? { ...m, tossWinnerId, battingFirstId } : m)),
                }));
            },
            importMatches: (matches) => set({ matches }),
        }),
        {
            name: 'match-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
