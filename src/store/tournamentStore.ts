import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tournament } from '../types/models';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface TournamentState {
    tournaments: Tournament[];
    createTournament: (name: string, location: string, oversLimit: number, format: Tournament['format']) => Promise<void>;
    updateTournament: (id: string, updates: Partial<Tournament>) => Promise<void>;
    deleteTournament: (id: string) => Promise<void>;
    getTournament: (id: string) => Tournament | undefined;
    importTournaments: (data: Tournament[]) => void;
    addTeamsToTournament: (tournamentId: string, teamIds: string[]) => Promise<void>;
    removeTeamFromTournament: (tournamentId: string, teamId: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentState>()(
    persist(
        (set, get) => ({
            tournaments: [],
            createTournament: async (name, location, oversLimit, format) => {
                const newTournament: Tournament = {
                    id: uuidv4(),
                    name,
                    location,
                    oversLimit,
                    format,
                    teamIds: [],
                    createdAt: new Date().toISOString(),
                    status: 'UPCOMING', // Or other default handling
                };
                set((state) => ({ tournaments: [...state.tournaments, newTournament] }));
            },
            updateTournament: async (id, updates) => {
                set((state) => ({
                    tournaments: state.tournaments.map((t) => (t.id === id ? { ...t, ...updates } : t)),
                }));
            },
            deleteTournament: async (id) => {
                set((state) => ({
                    tournaments: state.tournaments.filter((t) => t.id !== id),
                }));
            },
            getTournament: (id) => get().tournaments.find((t) => t.id === id),
            importTournaments: (data) => set({ tournaments: data }),
            addTeamsToTournament: async (tournamentId, teamIds) => {
                set((state) => ({
                    tournaments: state.tournaments.map((t) => {
                        if (t.id === tournamentId) {
                            const currentTeams = t.teamIds || [];
                            const newTeams = [...new Set([...currentTeams, ...teamIds])];
                            return { ...t, teamIds: newTeams };
                        }
                        return t;
                    }),
                }));
            },
            removeTeamFromTournament: async (tournamentId, teamId) => {
                set((state) => ({
                    tournaments: state.tournaments.map((t) => {
                        if (t.id === tournamentId) {
                            return { ...t, teamIds: (t.teamIds || []).filter(id => id !== teamId) };
                        }
                        return t;
                    }),
                }));
            },
        }),
        {
            name: 'tournament-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
