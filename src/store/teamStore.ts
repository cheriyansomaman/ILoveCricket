import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Team, Player } from '../types/models';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface TeamState {
    teams: Team[];
    players: Player[];
    createTeam: (name: string, shortName: string, color: string, managerName?: string, sponsorName?: string, logoUri?: string) => Promise<Team>;
    addPlayer: (name: string, role: string, batStyle: string, bowlStyle: string, jerseyNumber?: string, photoUri?: string) => Promise<Player>;
    addPlayersBulk: (playersData: { name: string, role: string, batStyle: string, bowlStyle: string, jerseyNumber?: string }[]) => Promise<Player[]>;
    addPlayerToTeam: (teamId: string, playerId: string) => Promise<void>;
    getTeamPlayers: (teamId: string) => Player[];
    updateTeam: (teamId: string, name: string, shortName: string, color: string, managerName?: string, sponsorName?: string, logoUri?: string) => Promise<void>;
    updatePlayer: (playerId: string, updates: Partial<Player>) => Promise<void>;
    deletePlayer: (playerId: string) => Promise<void>;
    deletePlayersBulk: (playerIds: string[]) => Promise<void>;
    deleteTeam: (teamId: string) => Promise<void>;
    deleteTeamsBulk: (teamIds: string[]) => Promise<void>;
    removePlayerFromTeam: (teamId: string, playerId: string) => Promise<void>;
    teamsPlayers: Record<string, string[]>;
    importTeams: (teams: Team[], teamsPlayers: Record<string, string[]>) => void;
    importPlayers: (players: Player[]) => void;
}

export const useTeamStore = create<TeamState>()(
    persist(
        (set, get) => ({
            teams: [],
            players: [],
            teamsPlayers: {},
            createTeam: async (name, shortName, color, managerName, sponsorName, logoUri) => {
                const newTeam: Team = {
                    id: uuidv4(),
                    name,
                    shortName,
                    color,
                    managerName,
                    sponsorName,
                    logoUri,
                    createdAt: new Date().toISOString(),
                };
                set((state) => ({ teams: [...state.teams, newTeam] }));
                return newTeam;
            },
            updateTeam: async (teamId, name, shortName, color, managerName, sponsorName, logoUri) => {
                set((state) => ({
                    teams: state.teams.map((t) => (t.id === teamId ? { ...t, name, shortName, color, managerName, sponsorName, logoUri } : t)),
                }));
            },
            addPlayer: async (name, role, batStyle, bowlStyle, jerseyNumber, photoUri) => {
                const newPlayer: Player = {
                    id: uuidv4(),
                    name,
                    role: role as any,
                    batStyle: batStyle as any,
                    bowlStyle: bowlStyle as any,
                    jerseyNumber,
                    photoUri,
                    createdAt: new Date().toISOString(),
                };
                set((state) => ({ players: [...state.players, newPlayer] }));
                return newPlayer;
            },
            addPlayersBulk: async (playersData) => {
                const newPlayers: Player[] = playersData.map(p => ({
                    id: uuidv4(),
                    name: p.name,
                    role: p.role as any,
                    batStyle: p.batStyle as any,
                    bowlStyle: p.bowlStyle as any,
                    jerseyNumber: p.jerseyNumber,
                    createdAt: new Date().toISOString(),
                }));
                // Persist updates
                set((state) => ({ players: [...state.players, ...newPlayers] }));
                return newPlayers;
            },
            addPlayerToTeam: async (teamId, playerId) => {
                set((state) => {
                    const currentPlayers = state.teamsPlayers[teamId] || [];
                    if (currentPlayers.includes(playerId)) return state;
                    return {
                        teamsPlayers: {
                            ...state.teamsPlayers,
                            [teamId]: [...currentPlayers, playerId],
                        },
                    };
                });
            },
            getTeamPlayers: (teamId) => {
                const playerIds = get().teamsPlayers[teamId] || [];
                return get().players.filter(p => playerIds.includes(p.id));
            },
            updatePlayer: async (playerId, updates) => {
                set((state) => ({
                    players: state.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p)),
                }));
            },
            deletePlayer: async (playerId) => {
                set((state) => {
                    // Remove from all teams
                    const newTeamsPlayers = { ...state.teamsPlayers };
                    Object.keys(newTeamsPlayers).forEach(teamId => {
                        newTeamsPlayers[teamId] = newTeamsPlayers[teamId].filter(id => id !== playerId);
                    });

                    return {
                        players: state.players.filter(p => p.id !== playerId),
                        teamsPlayers: newTeamsPlayers
                    };
                });
            },
            deletePlayersBulk: async (playerIds) => {
                const idsSet = new Set(playerIds);
                set((state) => {
                    // Remove from all teams
                    const newTeamsPlayers = { ...state.teamsPlayers };
                    Object.keys(newTeamsPlayers).forEach(teamId => {
                        newTeamsPlayers[teamId] = newTeamsPlayers[teamId].filter(id => !idsSet.has(id));
                    });

                    return {
                        players: state.players.filter(p => !idsSet.has(p.id)),
                        teamsPlayers: newTeamsPlayers
                    };
                });
            },
            deleteTeam: async (teamId) => {
                set((state) => {
                    const newTeamsPlayers = { ...state.teamsPlayers };
                    delete newTeamsPlayers[teamId];
                    return {
                        teams: state.teams.filter(t => t.id !== teamId),
                        teamsPlayers: newTeamsPlayers
                    };
                });
            },
            deleteTeamsBulk: async (teamIds) => {
                const idsSet = new Set(teamIds);
                set((state) => {
                    const newTeamsPlayers = { ...state.teamsPlayers };
                    teamIds.forEach(id => delete newTeamsPlayers[id]);
                    return {
                        teams: state.teams.filter(t => !idsSet.has(t.id)),
                        teamsPlayers: newTeamsPlayers
                    };
                });
            },
            removePlayerFromTeam: async (teamId, playerId) => {
                set((state) => {
                    const currentPlayers = state.teamsPlayers[teamId] || [];
                    const updatedPlayers = currentPlayers.filter(id => id !== playerId);
                    return {
                        teamsPlayers: {
                            ...state.teamsPlayers,
                            [teamId]: updatedPlayers,
                        },
                    };
                });
            },
            importTeams: (teams, teamsPlayers) => set({ teams, teamsPlayers }),
            importPlayers: (players) => set({ players }),
        }),
        {
            name: 'team-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
