export type PlayerRole = 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
export type BatStyle = 'RIGHT_HAND' | 'LEFT_HAND';
export type BowlStyle = 'RIGHT_ARM_FAST' | 'RIGHT_ARM_SPIN' | 'LEFT_ARM_FAST' | 'LEFT_ARM_SPIN' | 'NONE';

export type CricketFormat = 'ODI' | 'T20' | 'T10' | 'CUSTOM';

export interface Tournament {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    oversLimit: number;
    format: CricketFormat;
    teamIds?: string[];
    createdAt: string;
    status?: string;
}

export interface Team {
    id: string;
    name: string;
    shortName?: string;
    color?: string;
    logoUri?: string; // local file path
    managerName?: string;
    sponsorName?: string;
    createdAt: string;
}

export interface Player {
    id: string;
    name: string;
    role: PlayerRole;
    batStyle: BatStyle;
    bowlStyle: BowlStyle;
    jerseyNumber?: string;
    photoUri?: string;
    createdAt: string;
}

export interface Match {
    id: string;
    tournamentId?: string;
    teamAId: string;
    teamBId: string;
    teamAPlayerIds?: string[];
    teamBPlayerIds?: string[];
    tossWinnerId?: string;
    battingFirstId?: string;
    overs: number;
    status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'ABANDONED';
    winnerId?: string;
    manOfTheMatchId?: string;
    resultDescription?: string;
    matchDate?: string;
    venue?: string;
    createdAt: string;
}

export interface Inning {
    id: string;
    matchId: string;
    battingTeamId: string;
    bowlingTeamId: string;
    inningIndex: number; // 0 or 1
    totalRuns: number;
    wickets: number;
    oversBowled: number;
    isDeclared: boolean;
    isCompleted: boolean;
    currentStrikerId?: string;
    currentNonStrikerId?: string;
    currentBowlerId?: string;
    createdAt: string;
}

export type ExtrasType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY' | 'NONE';
export type WicketType = 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'RETIRED' | 'RETIRED_HURT' | 'TIMED_OUT' | 'OBSTRUCTING' | 'NONE';

export interface Ball {
    id: string;
    inningId: string;
    overNumber: number;
    ballNumber: number;
    strikerId: string;
    nonStrikerId: string;
    bowlerId: string;
    runsScored: number;
    extrasType: ExtrasType;
    extrasRuns: number;
    isWicket: boolean;
    wicketType: WicketType;
    dismissedPlayerId?: string;
    fielderId?: string;
    shotX?: number;
    shotY?: number;
    shotZone?: string;
    isValidBall: boolean;
    isBoundary?: boolean;
    createdAt: string;
}
