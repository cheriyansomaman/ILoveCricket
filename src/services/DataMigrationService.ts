import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useTournamentStore } from '../store/tournamentStore';
import { useTeamStore } from '../store/teamStore';
import { useMatchStore } from '../store/matchStore';
import { useScoringStore } from '../store/scoringStore';
import { Tournament, Team, Player, Match, Inning, Ball } from '../types/models';

export interface BackupData {
    tournaments: Tournament[];
    teams: Team[];
    players: Player[];
    matches: Match[];
    innings: Inning[];
    balls: Ball[];
    teamsPlayers: Record<string, string[]>;
    stats?: any; // Future proofing
    version: number;
}

export interface ConflictItem {
    type: 'TOURNAMENT' | 'TEAM' | 'PLAYER' | 'MATCH';
    id: string;
    name?: string; // For display
    existing: any;
    incoming: any;
}

export const DataMigrationService = {
    exportData: async () => {
        const data: BackupData = {
            version: 1,
            tournaments: useTournamentStore.getState().tournaments,
            teams: useTeamStore.getState().teams,
            players: useTeamStore.getState().players,
            teamsPlayers: useTeamStore.getState().teamsPlayers,
            matches: useMatchStore.getState().matches,
            innings: useScoringStore.getState().innings,
            balls: useScoringStore.getState().balls,
        };

        const json = JSON.stringify(data, null, 2);
        const fileName = `cricket_scorer_backup_${new Date().toISOString().split('T')[0]}.json`;
        const filePath = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(filePath, json);
        await Sharing.shareAsync(filePath);
    },

    importDataFromFile: async (): Promise<BackupData | null> => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true
            });

            if (result.canceled) return null;

            const file = result.assets[0];
            const content = await FileSystem.readAsStringAsync(file.uri);
            const data = JSON.parse(content) as BackupData;

            // Basic validation
            if (!data.version || !data.tournaments) {
                throw new Error("Invalid backup file format");
            }
            return data;
        } catch (error) {
            console.error("Import Error", error);
            throw error;
        }
    },

    detectConflicts: (incoming: BackupData): ConflictItem[] => {
        const conflicts: ConflictItem[] = [];

        // Check Tournaments
        const existingTournaments = useTournamentStore.getState().tournaments;
        incoming.tournaments.forEach(t => {
            const existing = existingTournaments.find(e => e.id === t.id);
            if (existing) {
                conflicts.push({ type: 'TOURNAMENT', id: t.id, name: t.name, existing, incoming: t });
            }
        });

        // Check Teams
        const existingTeams = useTeamStore.getState().teams;
        incoming.teams.forEach(t => {
            const existing = existingTeams.find(e => e.id === t.id);
            if (existing) {
                conflicts.push({ type: 'TEAM', id: t.id, name: t.name, existing, incoming: t });
            }
        });

        // Check Players
        const existingPlayers = useTeamStore.getState().players;
        incoming.players.forEach(p => {
            const existing = existingPlayers.find(e => e.id === p.id);
            if (existing) {
                conflicts.push({ type: 'PLAYER', id: p.id, name: p.name, existing, incoming: p });
            }
        });

        // Check Matches
        const existingMatches = useMatchStore.getState().matches;
        const tournamentMap = new Map(incoming.tournaments.map(t => [t.id, t.name]));

        incoming.matches.forEach(m => {
            const existing = existingMatches.find(e => e.id === m.id);
            if (existing && m.tournamentId) {
                const tName = tournamentMap.get(m.tournamentId) || 'Unknown Tournament';
                conflicts.push({ type: 'MATCH', id: m.id, name: `${tName} Match`, existing, incoming: m });
            }
        });

        return conflicts;
    },

    commitImport: (data: BackupData, resolutions: Record<string, 'KEEP_EXISTING' | 'OVERWRITE'>) => {
        // 1. Filter Data based on Resolutions
        const existingTournaments = useTournamentStore.getState().tournaments;
        const finalTournaments = [...existingTournaments];

        data.tournaments.forEach(t => {
            const conflict = existingTournaments.some(e => e.id === t.id);
            if (!conflict) {
                finalTournaments.push(t);
            } else if (resolutions[t.id] === 'OVERWRITE') {
                const idx = finalTournaments.findIndex(e => e.id === t.id);
                if (idx !== -1) finalTournaments[idx] = t;
            }
        });

        // Teams
        const existingTeams = useTeamStore.getState().teams;
        const finalTeams = [...existingTeams];
        data.teams.forEach(t => {
            const conflict = existingTeams.some(e => e.id === t.id);
            if (!conflict) {
                finalTeams.push(t);
            } else if (resolutions[t.id] === 'OVERWRITE') {
                const idx = finalTeams.findIndex(e => e.id === t.id);
                if (idx !== -1) finalTeams[idx] = t;
            }
        });

        // Players
        const existingPlayers = useTeamStore.getState().players;
        const finalPlayers = [...existingPlayers];
        data.players.forEach(p => {
            const conflict = existingPlayers.some(e => e.id === p.id);
            if (!conflict) {
                finalPlayers.push(p);
            } else if (resolutions[p.id] === 'OVERWRITE') {
                const idx = finalPlayers.findIndex(e => e.id === p.id);
                if (idx !== -1) finalPlayers[idx] = p;
            }
        });

        // Matches
        const existingMatches = useMatchStore.getState().matches;
        const finalMatches = [...existingMatches];
        data.matches.forEach(m => {
            const conflict = existingMatches.some(e => e.id === m.id);
            if (!conflict) {
                finalMatches.push(m);
            } else if (resolutions[m.id] === 'OVERWRITE') {
                const idx = finalMatches.findIndex(e => e.id === m.id);
                if (idx !== -1) finalMatches[idx] = m;
            }
        });

        // TeamsPlayers (Merging strategy: usually simplistic overwrite or union)
        // For simplicity, we just merge incoming keys. 
        // If a Team is overwritten, its player list might update.
        const finalTeamsPlayers = { ...useTeamStore.getState().teamsPlayers, ...data.teamsPlayers };

        // Scoring Data - Additive only for now, unless Match ID matches?
        // If we overwrite a match, we should probably overwrite its scoring data too.
        // Or if we Keep Existing match, we keep existing scoring.
        // Let's assume if Match is Overwritten, we accept incoming scoring for that match.
        // If Match is New, we accept incoming scoring.

        const existingInnings = useScoringStore.getState().innings;
        const existingBalls = useScoringStore.getState().balls;

        // Filter incoming scoring data for accepted matches
        const acceptedMatchIds = finalMatches.map(m => m.id);
        const incomingInnings = data.innings.filter(i => acceptedMatchIds.includes(i.matchId));
        const incomingBalls = data.balls.filter(b => acceptedMatchIds.includes(b.inningId)); // Need inning IDs logic too ideally, but ball->inning->match link

        // Actually, balls link to inningId. We need to know which innings are relevant.
        // Let's create a Set of resulting Inning IDs.

        // Logic: For every incoming inning/ball, if it belongs to a match we just Updated/Added, we take it.
        // If we kept existing match, we ignore incoming scoring (assuming existing is source of truth).

        let finalInnings = [...existingInnings];
        let finalBalls = [...existingBalls];

        // This requires careful diffing. 
        // Simple approach: For every MatchID in 'resolutions' that is OVERWRITE, we remove old innings/balls and add new.
        // For new Matches (not in resolutions but in data), we add new innings/balls.

        const validIncomingMatchIds = data.matches.map(m => m.id);

        validIncomingMatchIds.forEach(mId => {
            const conflict = existingMatches.some(e => e.id === mId);
            const resolution = resolutions[mId];

            if (!conflict || resolution === 'OVERWRITE') {
                // If overwrite, remove old data first
                finalInnings = finalInnings.filter(i => i.matchId !== mId);
                // Remove balls for those removed innings? 
                // Actually easier: rebuild the list.

                // Get new innings for this match
                const newSwitchInnings = data.innings.filter(i => i.matchId === mId);
                finalInnings.push(...newSwitchInnings);

                const newInningIds = newSwitchInnings.map(i => i.id);
                // Filter out old balls for this match (tricky without inning map, but feasible)
                // Or just filter all balls where inningId is in (OLD innings of this match).
                const oldInnings = existingInnings.filter(i => i.matchId === mId);
                const oldInningIds = oldInnings.map(i => i.id);

                finalBalls = finalBalls.filter(b => !oldInningIds.includes(b.inningId));

                const newSwitchBalls = data.balls.filter(b => newInningIds.includes(b.inningId));
                finalBalls.push(...newSwitchBalls);
            }
        });


        // 2. Commit to Stores
        useTournamentStore.getState().importTournaments(finalTournaments);
        useTeamStore.getState().importTeams(finalTeams, finalTeamsPlayers);
        useTeamStore.getState().importPlayers(finalPlayers);
        useMatchStore.getState().importMatches(finalMatches);
        useScoringStore.getState().importScoringData(finalInnings, finalBalls);
    }
};
