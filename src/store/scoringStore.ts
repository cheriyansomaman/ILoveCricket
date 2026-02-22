import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Inning, Ball, Match, Player } from '../types/models';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface ScoringState {
    innings: Inning[];
    balls: Ball[];

    // Actions
    startInning: (matchId: string, battingTeamId: string, bowlingTeamId: string, inningIndex: number) => Promise<Inning>;
    recordBall: (ballData: Omit<Ball, 'id' | 'createdAt'>) => Promise<Ball>;
    getMatchInnings: (matchId: string) => Inning[];
    getInningBalls: (inningId: string) => Ball[];
    getInningScore: (inningId: string) => { runs: number; wickets: number; overs: string };
    updateInningPlayers: (inningId: string, strikerId: string | null, nonStrikerId: string | null, bowlerId: string | null) => void;

    importScoringData: (innings: Inning[], balls: Ball[]) => void;
    undoLastBall: (matchId: string) => Promise<void>;
}

export const useScoringStore = create<ScoringState>()(
    persist(
        (set, get) => ({
            innings: [],
            balls: [],

            startInning: async (matchId, battingTeamId, bowlingTeamId, inningIndex) => {
                const newInning: Inning = {
                    id: uuidv4(),
                    matchId,
                    battingTeamId,
                    bowlingTeamId,
                    inningIndex,
                    totalRuns: 0,
                    wickets: 0,
                    oversBowled: 0,
                    isDeclared: false,
                    isCompleted: false,
                    createdAt: new Date().toISOString(),
                };
                set(state => ({ innings: [...state.innings, newInning] }));
                return newInning;
            },

            recordBall: async (ballData) => {
                const newBall: Ball = {
                    id: uuidv4(),
                    ...ballData,
                    createdAt: new Date().toISOString(),
                };

                set(state => {
                    const balls = [...state.balls, newBall];

                    // Update Inning Totals
                    const innings = state.innings.map(ing => {
                        if (ing.id === ballData.inningId) {
                            let runs = ing.totalRuns + ballData.runsScored + ballData.extrasRuns;
                            let wickets = ing.wickets + (ballData.isWicket ? 1 : 0);

                            // Calculate overs
                            // Simple calculation: valid balls / 6
                            const inningBalls = balls.filter(b => b.inningId === ing.id && b.isValidBall);
                            const overs = Math.floor(inningBalls.length / 6) + (inningBalls.length % 6) / 10;

                            return { ...ing, totalRuns: runs, wickets, oversBowled: overs };
                        }
                        return ing;
                    });

                    return { balls, innings };
                });
                return newBall;
            },

            updateInningPlayers: (inningId, strikerId, nonStrikerId, bowlerId) => {
                set((state) => ({
                    innings: state.innings.map(ing =>
                        ing.id === inningId
                            ? {
                                ...ing,
                                currentStrikerId: strikerId ?? undefined,
                                currentNonStrikerId: nonStrikerId ?? undefined,
                                currentBowlerId: bowlerId ?? undefined
                            }
                            : ing
                    )
                }));
            },

            getMatchInnings: (matchId) => get().innings.filter(i => i.matchId === matchId),
            getInningBalls: (inningId) => get().balls.filter(b => b.inningId === inningId),
            getInningScore: (inningId) => {
                const inning = get().innings.find(i => i.id === inningId);
                if (!inning) return { runs: 0, wickets: 0, overs: '0.0' };
                return { runs: inning.totalRuns, wickets: inning.wickets, overs: inning.oversBowled.toFixed(1) };
            },

            importScoringData: (innings, balls) => set({ innings, balls }),

            undoLastBall: async (matchId) => {
                const state = get();
                const matchInnings = state.innings.filter(i => i.matchId === matchId);
                const currentInning = matchInnings[matchInnings.length - 1]; // Active inning

                if (!currentInning) return;

                const inningBalls = state.balls.filter(b => b.inningId === currentInning.id);
                if (inningBalls.length === 0) return;

                // Sort properly to ensure we get the absolute last created ball
                const sortedBalls = [...inningBalls].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                const lastBall = sortedBalls[sortedBalls.length - 1];

                const newBalls = state.balls.filter(b => b.id !== lastBall.id);

                set(state => {
                    const updatedInnings = state.innings.map(ing => {
                        if (ing.id === currentInning.id) {
                            return {
                                ...ing,
                                totalRuns: ing.totalRuns - (lastBall.runsScored + lastBall.extrasRuns),
                                wickets: ing.wickets - (lastBall.isWicket ? 1 : 0),
                                oversBowled: (sortedBalls.length - 1) === 0 ? 0 : (Math.floor((sortedBalls.length - 1) / 6) + ((sortedBalls.length - 1) % 6) / 10), // Approx recalculation, better to rely on valid balls

                                // Restore Player State to what it was at the START of that ball
                                currentStrikerId: lastBall.strikerId,
                                currentNonStrikerId: lastBall.nonStrikerId,
                                currentBowlerId: lastBall.bowlerId,
                            };
                        }
                        return ing;
                    });

                    // Recalculate precise overs for accuracy
                    const finalInnings = updatedInnings.map(ing => {
                        if (ing.id === currentInning.id) {
                            const validBalls = newBalls.filter(b => b.inningId === ing.id && b.isValidBall).length;
                            const correctOvers = Math.floor(validBalls / 6) + (validBalls % 6) / 10;
                            return { ...ing, oversBowled: correctOvers };
                        }
                        return ing;
                    });

                    return {
                        balls: newBalls,
                        innings: finalInnings
                    };
                });
            },
        }),
        {
            name: 'scoring-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
