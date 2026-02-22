import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList, Platform, Switch } from 'react-native';
import { Text, Button, Card, Portal, Modal, List, Divider, Avatar, DataTable, SegmentedButtons, RadioButton, TextInput } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useMatchStore } from '../../store/matchStore';
import { useScoringStore } from '../../store/scoringStore';
import { useTeamStore } from '../../store/teamStore';
import MatchGraph from './components/MatchGraph';
import { Ball, Player, Inning, WicketType } from '../../types/models';

export default function LiveScoreScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const matchId = route.params?.matchId;

    const match = useMatchStore(state => state.matches.find(m => m.id === matchId));
    const teams = useTeamStore(state => state.teams);
    const allPlayers = useTeamStore(state => state.players);

    // Subscribe to entire scoring store for reactivity
    const { innings, balls, startInning, recordBall, updateInningPlayers, undoLastBall } = useScoringStore();
    const updateMatch = useMatchStore(state => state.updateMatch);

    const teamA = useMemo(() => teams.find(t => t.id === match?.teamAId), [teams, match?.teamAId]);
    const teamB = useMemo(() => teams.find(t => t.id === match?.teamBId), [teams, match?.teamBId]);
    const teamAName = teamA?.shortName || teamA?.name || 'Team A';
    const teamBName = teamB?.shortName || teamB?.name || 'Team B';

    // State for Collapsing History
    const [showPreviousOvers, setShowPreviousOvers] = useState(false);

    // Selection Modal State
    const [selectionMode, setSelectionMode] = useState<'STRIKER' | 'NON_STRIKER' | 'BOWLER' | 'FIELDER' | null>(null);
    const [activeScorecardTeamId, setActiveScorecardTeamId] = useState<string>('');

    // Wicket Modal State
    const [wicketModalVisible, setWicketModalVisible] = useState(false);
    const [selectedWicketType, setSelectedWicketType] = useState<WicketType>('BOWLED');
    const [whoIsOut, setWhoIsOut] = useState<'STRIKER' | 'NON_STRIKER'>('STRIKER');
    const [fielderId, setFielderId] = useState<string | null>(null);
    const [runOutRuns, setRunOutRuns] = useState(0);

    // Extras Modal State
    const [wideModalVisible, setWideModalVisible] = useState(false);
    const [nbModalVisible, setNbModalVisible] = useState(false);
    const [retireHurtModalVisible, setRetireHurtModalVisible] = useState(false);

    // Partnership Modal State
    const [partnershipModalVisible, setPartnershipModalVisible] = useState(false);
    const [partnershipData, setPartnershipData] = useState<any[]>([]);

    // Extras Modal State
    const [extrasModalVisible, setExtrasModalVisible] = useState(false);
    const [selectedExtraType, setSelectedExtraType] = useState<any>('BYE');

    // Wide Modal State
    const [wideRuns, setWideRuns] = useState(0);
    const [wideIsWicket, setWideIsWicket] = useState(false);
    const [wideWhoIsOut, setWideWhoIsOut] = useState<'STRIKER' | 'NON_STRIKER'>('STRIKER');
    const [wideWicketType, setWideWicketType] = useState<'RUN_OUT' | 'STUMPED'>('RUN_OUT');
    const [nbRunType, setNbRunType] = useState<'BAT' | 'BYE' | 'LEG_BYE' | 'PENALTY'>('BAT');

    // Graph Modal State
    const [graphModalVisible, setGraphModalVisible] = useState(false);

    // Derived State from Store
    const matchInnings = useMemo(() => innings.filter(i => i.matchId === matchId), [innings, matchId]);
    const currentInning = matchInnings.length > 0 ? matchInnings[matchInnings.length - 1] : null;

    // Set default tab on load
    useEffect(() => {
        if (!activeScorecardTeamId && currentInning) {
            setActiveScorecardTeamId(currentInning.battingTeamId);
        } else if (!activeScorecardTeamId && match) {
            setActiveScorecardTeamId(match.teamAId);
        }
    }, [currentInning, match, activeScorecardTeamId]);

    const allBalls = useMemo(() => currentInning ? balls.filter(b => b.inningId === currentInning.id) : [], [currentInning, balls]);
    const dismissedPlayerIds = useMemo(() => {
        return allBalls.filter(b => b.isWicket && b.dismissedPlayerId).map(b => b.dismissedPlayerId!);
    }, [allBalls]);

    // Active Players from Inning State
    const strikerId = currentInning?.currentStrikerId || null;
    const nonStrikerId = currentInning?.currentNonStrikerId || null;
    const bowlerId = currentInning?.currentBowlerId || null;

    // Current Over Logic
    const currentOverNumber = currentInning ? Math.floor(currentInning.oversBowled) : 0;

    // Filter balls for the current over
    const ballsInCurrentOver = useMemo(() => {
        return allBalls.filter(b => b.overNumber === currentOverNumber);
    }, [allBalls, currentOverNumber]);

    // Check if players have started scoring/bowling to freeze selection (MOVED UP)
    const strikerStarted = useMemo(() => allBalls.some(b => b.strikerId === strikerId || b.nonStrikerId === strikerId), [allBalls, strikerId]);
    const nonStrikerStarted = useMemo(() => allBalls.some(b => b.nonStrikerId === nonStrikerId || b.strikerId === nonStrikerId), [allBalls, nonStrikerId]);
    const bowlerStarted = useMemo(() => allBalls.some(b => b.bowlerId === bowlerId && b.overNumber === currentOverNumber), [allBalls, bowlerId, currentOverNumber]);

    // Target Logic (for 2nd Inning)
    const target = useMemo(() => {
        if (currentInning?.inningIndex === 2) {
            const firstInning = matchInnings.find(i => i.inningIndex === 1);
            return firstInning ? firstInning.totalRuns + 1 : 0;
        }
        return null;
    }, [currentInning, matchInnings]);

    const remainingRuns = useMemo(() => {
        if (target !== null && currentInning) {
            return Math.max(0, target - currentInning.totalRuns);
        }
        return null;
    }, [target, currentInning]);

    const ballsLeft = useMemo(() => {
        if (currentInning?.inningIndex === 2 && match) {
            const totalBallsAllowed = match.overs * 6;
            const ballsBowled = allBalls.filter(b => b.isValidBall).length;
            return Math.max(0, totalBallsAllowed - ballsBowled);
        }
        return null;
    }, [currentInning, match, allBalls]);

    // Match Result Logic
    const matchResult = useMemo(() => {
        if (!currentInning || currentInning.inningIndex !== 2 || !match || target === null) return null;

        const battingTeam = teams.find(t => t.id === currentInning.battingTeamId);
        const bowlingTeam = teams.find(t => t.id === currentInning.bowlingTeamId);

        // Batting Team Wins
        if (currentInning.totalRuns >= target) {
            const wicketsLeft = 10 - currentInning.wickets;
            return `${battingTeam?.shortName || battingTeam?.name} won by ${wicketsLeft} wickets`;
        }

        // Bowling Team Wins (Inning Over)
        const isInningOver = currentInning.wickets >= 10 || Math.floor(currentInning.oversBowled) >= match.overs;
        if (isInningOver) {
            const runsShort = (target - 1) - currentInning.totalRuns;
            if (runsShort > 0) {
                return `${bowlingTeam?.shortName || bowlingTeam?.name} won by ${runsShort} runs`;
            } else if (runsShort === 0) { // Scores level
                return "Match Tied";
            }
        }
        return null;
    }, [currentInning, match, target, teams]);

    const isMatchOver = !!matchResult;

    // Run Rate Calculations
    const currentRunRate = useMemo(() => {
        if (!currentInning) return "0.00";
        const validBalls = allBalls.filter(b => b.isValidBall).length;
        if (validBalls === 0) return "0.00";
        return ((currentInning.totalRuns / validBalls) * 6).toFixed(2);
    }, [currentInning, allBalls]);

    const requiredRunRate = useMemo(() => {
        if (currentInning?.inningIndex !== 2 || remainingRuns === null || ballsLeft === null) return null;
        if (ballsLeft <= 0) return null;
        return ((remainingRuns / ballsLeft) * 6).toFixed(2);
    }, [currentInning, remainingRuns, ballsLeft]);

    // --- Man of the Match Logic ---
    const calculateManOfTheMatch = () => {
        if (!match) return null;

        const matchBalls = balls.filter(b => b.inningId && matchInnings.find(i => i.id === b.inningId));
        const playerPoints = new Map<string, number>();

        allPlayers.forEach(p => {
            let points = 0;

            // Batting
            const runs = matchBalls.filter(b => b.strikerId === p.id).reduce((s, b) => s + b.runsScored, 0);
            const fours = matchBalls.filter(b => b.strikerId === p.id && b.runsScored === 4 && b.isBoundary).length;
            const sixes = matchBalls.filter(b => b.strikerId === p.id && b.runsScored === 6 && b.isBoundary).length;

            points += runs;
            points += (fours * 1);
            points += (sixes * 2);

            // Bowling
            const wickets = matchBalls.filter(b => b.bowlerId === p.id && b.isWicket && b.wicketType !== 'RUN_OUT').length;
            points += (wickets * 20);

            // Fielding
            const catches = matchBalls.filter(b => b.fielderId === p.id && b.wicketType === 'CAUGHT').length;
            const runouts = matchBalls.filter(b => b.fielderId === p.id && b.wicketType === 'RUN_OUT').length;

            points += (catches * 10);
            points += (runouts * 10);

            if (points > 0) playerPoints.set(p.id, points);
        });

        let maxPoints = -1;
        let momId = null;
        playerPoints.forEach((pts, id) => {
            if (pts > maxPoints) {
                maxPoints = pts;
                momId = id;
            }
            // Tie-breaker? runs? for now simple max.
        });
        return momId;
    };

    // --- PDF Export Logic ---
    const generatePDF = async () => {
        if (!match || !teamA || !teamB) return;

        const momId = match.manOfTheMatchId; // Use stored if available
        const momName = momId ? getPlayerName(momId) : 'N/A';

        const generateInningHTML = (inning: Inning) => {
            const battingTeam = teams.find(t => t.id === inning.battingTeamId);
            //  const bowlingTeam = teams.find(t => t.id === inning.bowlingTeamId);

            const inningBalls = balls.filter(b => b.inningId === inning.id);
            // Unique batters
            const batterIds = Array.from(new Set(inningBalls.map(b => b.strikerId)));

            const batterRows = batterIds.map(id => {
                const pName = getPlayerName(id);
                const pBalls = inningBalls.filter(b => b.strikerId === id);
                const runs = pBalls.reduce((s, b) => s + b.runsScored, 0);
                const ballCount = pBalls.filter(b => b.isValidBall).length;
                const fours = pBalls.filter(b => b.runsScored === 4 && b.isBoundary).length;
                const sixes = pBalls.filter(b => b.runsScored === 6 && b.isBoundary).length;
                const sr = ballCount > 0 ? ((runs / ballCount) * 100).toFixed(1) : '0.0';

                const wicketBall = inningBalls.find(b => b.isWicket && b.dismissedPlayerId === id);
                let howOut = 'not out';
                if (wicketBall) {
                    if (wicketBall.wicketType === 'BOWLED') howOut = `b ${getPlayerName(wicketBall.bowlerId) || 'Unknown'}`;
                    else if (wicketBall.wicketType === 'CAUGHT') howOut = `c ${getPlayerName(wicketBall.fielderId) || 'Unknown'} b ${getPlayerName(wicketBall.bowlerId) || 'Unknown'}`;
                    else if (wicketBall.wicketType === 'RUN_OUT') howOut = `run out (${getPlayerName(wicketBall.fielderId) || 'Unknown'})`;
                    else if (wicketBall.wicketType === 'RETIRED_HURT') howOut = 'retired hurt';
                    else howOut = wicketBall.wicketType.toLowerCase().replace('_', ' ');
                }

                return `
                    <tr>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${pName}</td>
                        <td style="padding: 5px; color: #666; border-bottom: 1px solid #eee;">${howOut}</td>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${runs} (${ballCount})</td>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${fours}</td>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${sixes}</td>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${sr}</td>
                    </tr>
                 `;
            }).join('');

            const extrasTotal = inningBalls.reduce((s, b) => s + b.extrasRuns, 0);
            const bowlerIds = Array.from(new Set(inningBalls.map(b => b.bowlerId)));

            const bowlerRows = bowlerIds.map(id => {
                const pName = getPlayerName(id);
                const pBalls = inningBalls.filter(b => b.bowlerId === id);
                const validBalls = pBalls.filter(b => b.isValidBall).length;
                const overs = Math.floor(validBalls / 6) + (validBalls % 6) / 10;
                const runs = pBalls.reduce((s, b) => s + b.runsScored + b.extrasRuns, 0);
                const wickets = pBalls.filter(b => b.isWicket && b.wicketType !== 'RUN_OUT').length;
                const econ = validBalls > 0 ? ((runs / validBalls) * 6).toFixed(1) : '0.0';

                return `
                    <tr>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${pName}</td>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${overs}</td>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${runs}</td>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${wickets}</td>
                        <td style="padding: 5px; border-bottom: 1px solid #eee;">${econ}</td>
                    </tr>
                 `;
            }).join('');

            return `
                <div style="margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f5f5f5; padding: 10px; font-weight: bold; border-bottom: 1px solid #ddd;">
                        ${battingTeam?.shortName || battingTeam?.name} Innings 
                        <span style="float: right;">${inning.totalRuns}/${inning.wickets} (${inning.oversBowled.toFixed(1)})</span>
                    </div>
                    
                    <h5 style="margin: 10px 10px 5px; color: #555; text-transform: uppercase; font-size: 10px;">Batting</h5>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px;">
                        <thead>
                            <tr style="text-align: left; color: #888;">
                                <th style="padding: 5px;">Batter</th>
                                <th style="padding: 5px;">R</th>
                                <th style="padding: 5px;">Runs</th>
                                <th style="padding: 5px;">4s</th>
                                <th style="padding: 5px;">6s</th>
                                <th style="padding: 5px;">SR</th>
                            </tr>
                        </thead>
                        <tbody>${batterRows}</tbody>
                    </table>
                    <div style="padding: 0 10px; font-size: 11px;"><strong>Extras:</strong> ${extrasTotal}</div>
                    
                    <h5 style="margin: 15px 10px 5px; color: #555; text-transform: uppercase; font-size: 10px;">Bowling</h5>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px;">
                        <thead>
                             <tr style="text-align: left; color: #888;">
                                <th style="padding: 5px;">Bowler</th>
                                <th style="padding: 5px;">O</th>
                                <th style="padding: 5px;">R</th>
                                <th style="padding: 5px;">W</th>
                                <th style="padding: 5px;">Eco</th>
                            </tr>
                        </thead>
                        <tbody>${bowlerRows}</tbody>
                    </table>
                </div>
             `;
        };

        const html = `
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
                    h1 { text-align: center; font-size: 24px; margin-bottom: 5px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .meta { color: #666; font-size: 12px; margin-bottom: 10px; }
                    .mom { font-weight: bold; color: #2e7d32; margin-top: 5px; font-size: 14px; }
                </style>
            </head>
            <body>
                 <h1>Match Scorecard</h1>
                 <div class="header">
                    <div class="meta">${new Date(match.matchDate || '').toDateString()} • ${match.venue || 'Venue N/A'}</div>
                    <h2 style="margin: 5px 0;">${teamAName} vs ${teamBName}</h2>
                    <div style="font-size: 16px; margin-top: 5px;">${match.resultDescription || ''}</div>
                    ${momName !== 'N/A' ? `<div class="mom">Man of the Match: ${momName}</div>` : ''}
                 </div>

                 ${matchInnings.map(generateInningHTML).join('')}
                 
                 <div style="text-align: center; font-size: 10px; color: #aaa; margin-top: 40px;">
                    Generated by ILoveCricket
                 </div>
            </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert("Error", "Could not generate or share PDF.");
            console.error(error);
        }
    };

    // Scorecard Data Calculation (Based on Active Tab)
    const scorecardData = useMemo(() => {
        if (!activeScorecardTeamId || !match) return { batting: [], bowling: [], extras: 0 };

        const targetInning = matchInnings.find(i => i.battingTeamId === activeScorecardTeamId);
        const teamPlayerIds = activeScorecardTeamId === match.teamAId ? (match.teamAPlayerIds || []) : (match.teamBPlayerIds || []);
        const targetBalls = targetInning ? balls.filter(b => b.inningId === targetInning.id) : [];

        // Extras Calc
        const totalExtras = targetBalls.reduce((sum, b) => sum + b.extrasRuns, 0);

        const batting = teamPlayerIds.map(id => {
            // ... (existing batting logic)
            const player = allPlayers.find(p => p.id === id);

            // Default stats
            let runs = 0;
            let ballsFaced = 0;
            let fours = 0;
            let sixes = 0;
            let sr = '0.00';
            let status = 'yet to bat';

            if (targetInning) {
                const playerBalls = targetBalls.filter(b => b.strikerId === id);
                runs = playerBalls.reduce((sum, b) => sum + b.runsScored, 0);
                ballsFaced = playerBalls.filter(b => b.isValidBall).length;
                fours = playerBalls.filter(b => b.runsScored === 4 && b.isBoundary).length;
                sixes = playerBalls.filter(b => b.runsScored === 6 && b.isBoundary).length;
                sr = ballsFaced > 0 ? ((runs / ballsFaced) * 100).toFixed(2) : '0.00';

                // Status Logic
                const dismissalBall = targetBalls.find(b => b.isWicket && b.dismissedPlayerId === id);
                const retiredHurtBall = targetBalls.find(b => b.wicketType === 'RETIRED_HURT' && b.dismissedPlayerId === id);

                if (dismissalBall) {
                    const type = dismissalBall.wicketType;
                    const ballBowler = allPlayers.find(p => p.id === dismissalBall.bowlerId)?.name || 'Unknown';
                    const fielder = dismissalBall.fielderId ? allPlayers.find(p => p.id === dismissalBall.fielderId)?.name : 'Unknown';

                    switch (type) {
                        case 'BOWLED':
                            status = `b ${ballBowler}`;
                            break;
                        case 'CAUGHT':
                            status = `c ${fielder} b ${ballBowler}`;
                            break;
                        case 'LBW':
                            status = `lbw b ${ballBowler}`;
                            break;
                        case 'RUN_OUT':
                            status = `runout ${fielder} b ${ballBowler}`;
                            break;
                        case 'STUMPED':
                            status = `stumped b ${ballBowler}`;
                            break;
                        case 'HIT_WICKET':
                            status = `hitw b ${ballBowler}`;
                            break;
                        case 'HIT_WICKET':
                            status = `hitw b ${ballBowler}`;
                            break;
                        case 'RETIRED_HURT':
                            status = 'retired hurt';
                            break;
                        default:
                            status = type.toLowerCase().replace('_', ' ');
                            break;
                    }

                } else if (targetInning.currentStrikerId === id || targetInning.currentNonStrikerId === id) {
                    status = 'not out';
                } else if (retiredHurtBall) {
                    status = 'retired hurt';
                }
            }

            return { id, name: player?.name || 'Unknown', runs, balls: ballsFaced, fours, sixes, sr, status };
        });

        // Bowling Stats (Only those who have bowled)
        const bowlerIds = Array.from(new Set([
            ...targetBalls.map(b => b.bowlerId),
            ...(targetInning?.currentBowlerId ? [targetInning.currentBowlerId] : [])
        ])).filter(Boolean) as string[];

        const bowling = bowlerIds.map(id => {
            const playerBalls = targetBalls.filter(b => b.bowlerId === id && b.isValidBall);
            const allPlayerBalls = targetBalls.filter(b => b.bowlerId === id);

            const runsConceded = allPlayerBalls.reduce((sum, b) => {
                const extras = (b.extrasType === 'WIDE' || b.extrasType === 'NO_BALL') ? b.extrasRuns : 0;
                return sum + b.runsScored + extras;
            }, 0);

            // Wickets - Exclude RUN OUT
            const wickets = allPlayerBalls.filter(b => b.isWicket && b.wicketType !== 'RUN_OUT').length;

            const validBallCount = playerBalls.length;
            const overs = Math.floor(validBallCount / 6) + (validBallCount % 6) / 10;
            const economy = validBallCount > 0 ? ((runsConceded / validBallCount) * 6).toFixed(2) : '0.00';
            const maidens = 0;

            const player = allPlayers.find(p => p.id === id);
            return { id, name: player?.name || 'Unknown', overs: overs.toFixed(1), maidens, runs: runsConceded, wickets, economy };
        });

        return { batting, bowling, extras: totalExtras };
    }, [balls, matchInnings, activeScorecardTeamId, allPlayers, match]);

    // Initialize Inning if needed - Only once
    useEffect(() => {
        if (!match) return;
        if (matchInnings.length === 0) {
            const initInning = async () => {
                const battingTeamId = match.tossWinnerId === match.battingFirstId ? match.tossWinnerId! : (match.teamAId === match.tossWinnerId ? match.teamBId : match.teamAId);
                const bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId;
                await startInning(match.id, battingTeamId, bowlingTeamId, 1);
            };
            initInning();
        }
    }, [matchId, match, matchInnings.length]);


    const validBallsInOver = ballsInCurrentOver.filter(b => b.isValidBall).length;

    const handleInningComplete = async () => {
        if (!currentInning || !match) return;

        if (currentInning.inningIndex === 1) {
            Alert.alert("Inning Complete", "First inning over. Starting second inning.");
            // Start 2nd Inning
            const nextBattingTeamId = currentInning.bowlingTeamId;
            const nextBowlingTeamId = currentInning.battingTeamId;
            await startInning(match.id, nextBattingTeamId, nextBowlingTeamId, 2);

            setSelectionMode(null);
            setActiveScorecardTeamId(nextBattingTeamId);
            setSelectionMode(null);
            setActiveScorecardTeamId(nextBattingTeamId);
        } else {
            // Match Complete
        }
    };

    // Effect to Mark Match as Completed and Calculate MoM
    useEffect(() => {
        if (matchResult && match && match.status !== 'COMPLETED') {
            const momId = calculateManOfTheMatch();
            updateMatch(match.id, {
                status: 'COMPLETED',
                resultDescription: matchResult,
                manOfTheMatchId: momId || undefined
            });
            Alert.alert("Match Finished", `${matchResult}\nMan of the Match: ${momId ? getPlayerName(momId) : 'N/A'}`);
        }
    }, [matchResult, match]);

    const handleRun = async (runs: number, isBoundary: boolean = false) => {
        if (isMatchOver) return;
        if (!currentInning || !match) return;
        if (!strikerId || !nonStrikerId || !bowlerId) {
            Alert.alert('Error', 'Please select Striker, Non-Striker and Bowler first!');
            return;
        }

        const ballData = {
            inningId: currentInning.id,
            overNumber: currentOverNumber,
            ballNumber: validBallsInOver + 1,
            strikerId,
            nonStrikerId,
            bowlerId,
            runsScored: runs,
            extrasType: 'NONE' as const,
            extrasRuns: 0,
            isWicket: false,
            wicketType: 'NONE' as const,
            isValidBall: true,
            isBoundary,
        };

        await recordBall(ballData);

        // Immediate check for potential win
        const newTotalRuns = currentInning.totalRuns + runs;
        if (currentInning.inningIndex === 2 && target !== null && newTotalRuns >= target) {
            return;
        }

        let nextStriker: string | null = strikerId;
        let nextNonStriker: string | null = nonStrikerId;
        let nextBowler: string | null = bowlerId;

        if (runs % 2 !== 0) {
            nextStriker = nonStrikerId;
            nextNonStriker = strikerId;
        }

        if (validBallsInOver + 1 >= 6) {
            const nextOverNumber = currentOverNumber + 1;

            if (nextOverNumber >= match.overs) {
                if (currentInning.inningIndex === 1) {
                    await handleInningComplete();
                    return;
                } else {
                    return; // Match Over
                }
            }

            Alert.alert("Over Complete", "Please select a new bowler.");
            nextBowler = null;
            let temp = nextStriker;
            nextStriker = nextNonStriker;
            nextNonStriker = temp;
        }

        updateInningPlayers(currentInning.id, nextStriker, nextNonStriker, nextBowler);
    };

    const handleWicketClick = () => {
        setWicketModalVisible(true);
        setSelectedWicketType('BOWLED');
        setWhoIsOut('STRIKER'); // Default
        setFielderId(null);
        setRunOutRuns(0);
    };

    const confirmWicket = async () => {
        if (!currentInning || !match || !strikerId || !nonStrikerId || !bowlerId) return;

        // Validation for Fielder
        if ((selectedWicketType === 'CAUGHT' || selectedWicketType === 'RUN_OUT') && !fielderId) {
            Alert.alert("Input Required", "Please select the fielder/thrower.");
            return;
        }

        // Determine dismissed player ID
        const dismissedId = whoIsOut === 'STRIKER' ? strikerId : nonStrikerId;

        const ballData = {
            inningId: currentInning.id,
            overNumber: currentOverNumber,
            ballNumber: validBallsInOver + 1,
            strikerId,
            nonStrikerId,
            bowlerId,
            runsScored: selectedWicketType === 'RUN_OUT' ? runOutRuns : 0,
            extrasType: 'NONE' as const,
            extrasRuns: 0,
            isWicket: true,
            wicketType: selectedWicketType,
            dismissedPlayerId: dismissedId,
            fielderId: fielderId || undefined,
            isValidBall: true,
        };

        await recordBall(ballData);
        setWicketModalVisible(false);

        // Check for All Out
        const currentWickets = currentInning.wickets + 1;
        if (currentWickets >= 10) {
            await handleInningComplete();
            return;
        }

        // Update Inning Players (Remove the dismissed player)
        let nextStriker: string | null = strikerId;
        let nextNonStriker: string | null = nonStrikerId;
        let nextBowler: string | null = bowlerId;

        if (whoIsOut === 'STRIKER') {
            nextStriker = null;
        } else {
            nextNonStriker = null;
        }

        // Rotate based on runs completed (for Run Out)
        if (selectedWicketType === 'RUN_OUT' && runOutRuns % 2 !== 0) {
            const temp = nextStriker;
            nextStriker = nextNonStriker;
            nextNonStriker = temp;
        }

        // Check if Over also complete 
        if (validBallsInOver + 1 >= 6) {
            const nextOverNumber = currentOverNumber + 1;

            if (nextOverNumber >= match.overs) {
                if (currentInning.inningIndex === 1) {
                    await handleInningComplete();
                    return;
                } else {
                    return; // Match Over result
                }
            }

            Alert.alert("Over Complete", "Please select a new bowler.");
            nextBowler = null;
            let temp = nextStriker;
            nextStriker = nextNonStriker;
            nextNonStriker = temp;
        }

        updateInningPlayers(currentInning.id, nextStriker, nextNonStriker, nextBowler);
    };

    const handleExtra = () => {
        setNbRunType('BAT');
        setNbModalVisible(true);
    };

    const confirmNoBall = async (runs: number, isBoundary: boolean = false) => {
        if (!currentInning || !strikerId || !nonStrikerId || !bowlerId) return;

        // NB = 1 run (Extra) + runs
        let runsScored = 0;
        let nbExtras = 1;

        if (nbRunType !== 'BAT') {
            nbExtras += runs;
        } else {
            runsScored = runs;
        }

        const ballData = {
            inningId: currentInning.id,
            overNumber: currentOverNumber,
            ballNumber: validBallsInOver,
            strikerId,
            nonStrikerId,
            bowlerId,
            runsScored,
            extrasType: 'NO_BALL' as const,
            extrasRuns: nbExtras,
            isWicket: false,
            wicketType: 'NONE' as const,
            isValidBall: false,
            isBoundary: isBoundary && nbRunType === 'BAT',
        };

        await recordBall(ballData);
        setNbModalVisible(false);

        // Immediate check for potential win
        const newTotalRuns = currentInning.totalRuns + 1 + runs;
        if (currentInning.inningIndex === 2 && target !== null && newTotalRuns >= target) {
            return;
        }

        // Swap batsmen if odd runs ran
        if (runs % 2 !== 0) {
            updateInningPlayers(currentInning.id, nonStrikerId, strikerId, bowlerId);
        }
    };

    const handleWideClick = () => {
        setWideModalVisible(true);
        setWideRuns(0);
        setWideIsWicket(false);
        setWideWhoIsOut('STRIKER');
        setWideWicketType('RUN_OUT');
        setFielderId(null);
    };

    const confirmWide = async () => {
        if (!currentInning || !match || !strikerId || !nonStrikerId || !bowlerId) return;

        // Wide = 1 run + wideRuns (input)
        const totalExtras = 1 + wideRuns;
        const dismissalType = wideWicketType;

        // Validation for fielder if Run Out/Stumped
        if ((dismissalType === 'RUN_OUT' || dismissalType === 'STUMPED') && wideIsWicket && !fielderId && dismissalType !== 'STUMPED') {
            if (dismissalType === 'RUN_OUT' && !fielderId) {
                Alert.alert("Input Required", "Please select the fielder/thrower.");
                return;
            }
        }

        const dismissedId = wideIsWicket ? (wideWhoIsOut === 'STRIKER' ? strikerId : nonStrikerId) : undefined;
        const isRunOut = wideIsWicket && dismissalType === 'RUN_OUT';

        const ballData = {
            inningId: currentInning.id,
            overNumber: currentOverNumber,
            ballNumber: validBallsInOver,
            strikerId,
            nonStrikerId,
            bowlerId,
            runsScored: isRunOut ? wideRuns : 0,
            extrasType: 'WIDE' as const,
            extrasRuns: isRunOut ? 1 : totalExtras,
            isWicket: wideIsWicket,
            wicketType: wideIsWicket ? dismissalType : 'NONE' as const,
            dismissedPlayerId: dismissedId,
            fielderId: fielderId || undefined,
            isValidBall: false,
        };

        await recordBall(ballData);
        setWideModalVisible(false);

        // Immediate check for potential win
        const newTotalRuns = currentInning.totalRuns + totalExtras;
        if (currentInning.inningIndex === 2 && target !== null && newTotalRuns >= target) {
            return;
        }

        // Handle Player Swap
        let nextStriker: string | null = strikerId;
        let nextNonStriker: string | null = nonStrikerId;
        let nextBowler: string | null = bowlerId;

        // Swap if odd runs
        if (wideRuns % 2 !== 0) {
            let temp = nextStriker;
            nextStriker = nextNonStriker;
            nextNonStriker = temp;
        }

        // Handle Dismissal (Remove the dismissed player from active)
        if (wideIsWicket) {
            if (nextStriker === dismissedId) nextStriker = null;
            if (nextNonStriker === dismissedId) nextNonStriker = null;
        }

        updateInningPlayers(currentInning.id, nextStriker, nextNonStriker, nextBowler);
    };

    const confirmRetireHurt = async () => {
        if (!currentInning || !match || !strikerId || !nonStrikerId || !bowlerId) return;

        const dismissedId = whoIsOut === 'STRIKER' ? strikerId : nonStrikerId;

        const ballData = {
            inningId: currentInning.id,
            overNumber: currentOverNumber,
            ballNumber: validBallsInOver + 1, // Unique event 
            // Better: Use same ball number if it happened "before" next ball, but it's an event. 
            // For data consistency, let's treat it like a ball with 0 runs and specific wicket type.
            // Note: validBallsInOver is count of VALID balls. Retire hurt is usually NOT a ball faced if it happens between balls.
            // If it happens on a ball, it's different. Assuming "Event" between balls here for simplicity of UI flow.
            // Let's increment ball count so it appears in list, but mark isValidBall=false so it doesn't add to over count?
            // Actually, if we use isValidBall=false, it won't increment over.


            strikerId,
            nonStrikerId,
            bowlerId,
            runsScored: 0,
            extrasType: 'NONE' as const,
            extrasRuns: 0,
            isWicket: false, // Retired hurt is NOT a wicket
            wicketType: 'RETIRED_HURT' as const,
            dismissedPlayerId: dismissedId,
            isValidBall: false, // Don't count as a ball in the over
        };

        await recordBall(ballData);
        setRetireHurtModalVisible(false);

        // Update active players logic
        let nextStriker: string | null = strikerId;
        let nextNonStriker: string | null = nonStrikerId;

        if (whoIsOut === 'STRIKER') nextStriker = null;
        else nextNonStriker = null;

        updateInningPlayers(currentInning.id, nextStriker, nextNonStriker, bowlerId);
    };

    const confirmExtraRun = async (runs: number) => {
        if (!currentInning || !match || !strikerId || !nonStrikerId || !bowlerId) return;

        const isByeOrLegBye = selectedExtraType === 'BYE' || selectedExtraType === 'LEG_BYE';
        const isPenalty = selectedExtraType === 'PENALTY';

        if (!isByeOrLegBye && !isPenalty) return;

        const ballData = {
            inningId: currentInning.id,
            overNumber: currentOverNumber,
            ballNumber: validBallsInOver + (isByeOrLegBye ? 1 : 0),
            strikerId,
            nonStrikerId,
            bowlerId,
            runsScored: 0,
            extrasType: selectedExtraType,
            extrasRuns: runs,
            isWicket: false,
            wicketType: 'NONE' as const,
            isValidBall: isByeOrLegBye,
        };

        await recordBall(ballData);
        setExtrasModalVisible(false);

        // Immediate check for potential win
        const newTotalRuns = currentInning.totalRuns + runs;
        if (currentInning.inningIndex === 2 && target !== null && newTotalRuns >= target) {
            return;
        }

        let nextStriker: string | null = strikerId;
        let nextNonStriker: string | null = nonStrikerId;
        let nextBowler: string | null = bowlerId;

        if (runs % 2 !== 0) {
            nextStriker = nonStrikerId;
            nextNonStriker = strikerId;
        }

        if (isByeOrLegBye && validBallsInOver + 1 >= 6) {
            const nextOverNumber = currentOverNumber + 1;

            if (nextOverNumber >= match.overs) {
                if (currentInning.inningIndex === 1) {
                    await handleInningComplete();
                    return;
                } else {
                    return;
                }
            }

            Alert.alert("Over Complete", "Please select a new bowler.");
            nextBowler = null;
            let temp = nextStriker;
            nextStriker = nextNonStriker;
            nextNonStriker = temp;
        }

        updateInningPlayers(currentInning.id, nextStriker, nextNonStriker, nextBowler);
    };

    // Stats Generators
    const getBatterStats = (playerId: string | null) => {
        if (!playerId) return null;
        if (!currentInning) return '';
        const playerBalls = allBalls.filter(b => b.strikerId === playerId);
        const runs = playerBalls.reduce((sum, b) => sum + b.runsScored, 0);
        const balls = playerBalls.filter(b => b.isValidBall).length;
        const fours = playerBalls.filter(b => b.runsScored === 4 && b.isBoundary).length;
        const sixes = playerBalls.filter(b => b.runsScored === 6 && b.isBoundary).length;
        return `${runs}(${balls})  4s: ${fours}  6s: ${sixes}`;
    };

    const getBowlerStats = (playerId: string | null) => {
        if (!playerId) return null;
        if (!currentInning) return '';

        const playerBalls = allBalls.filter(b => b.bowlerId === playerId && b.isValidBall);
        const allPlayerBalls = allBalls.filter(b => b.bowlerId === playerId);
        const runsConceded = allPlayerBalls.reduce((sum, b) => {
            const extras = (b.extrasType === 'WIDE' || b.extrasType === 'NO_BALL') ? b.extrasRuns : 0;
            return sum + b.runsScored + extras;
        }, 0);

        // Exclude Runouts from Live Stats View too
        const wickets = allPlayerBalls.filter(b => b.isWicket && b.wicketType !== 'RUN_OUT').length;

        const overs = Math.floor(playerBalls.length / 6) + (playerBalls.length % 6) / 10;
        return `${overs.toFixed(1)} - ${runsConceded} - ${wickets}`;
    };

    // Selection Handling
    const handleSelectPlayer = (playerId: string) => {
        // Handle Fielder Selection specially
        if (selectionMode === 'FIELDER') {
            setFielderId(playerId);
            setSelectionMode(null);
            return;
        }

        // Standard Player Selection
        if (!currentInning) return;
        let s = strikerId, ns = nonStrikerId, b = bowlerId;
        if (selectionMode === 'STRIKER') s = playerId;
        if (selectionMode === 'NON_STRIKER') ns = playerId;
        if (selectionMode === 'BOWLER') b = playerId;
        updateInningPlayers(currentInning.id, s, ns, b);
        setSelectionMode(null);
    };

    const getSelectablePlayers = () => {
        // Special case for Fielder Selection (Opponent Team)
        if (selectionMode === 'FIELDER' && match && currentInning) {
            // Fielder comes from Bowling Team
            const bowlingTeamId = currentInning.bowlingTeamId;
            const candidateIds = bowlingTeamId === match.teamAId ? (match.teamAPlayerIds || []) : (match.teamBPlayerIds || []);
            return allPlayers.filter(p => candidateIds.includes(p.id));
        }

        if (!match || !currentInning || !selectionMode) return [];
        const isBattingSelection = selectionMode === 'STRIKER' || selectionMode === 'NON_STRIKER';
        const targetTeamId = isBattingSelection ? currentInning.battingTeamId : currentInning.bowlingTeamId;

        let candidateIds: string[] = [];
        if (targetTeamId === match.teamAId) candidateIds = match.teamAPlayerIds || [];
        else candidateIds = match.teamBPlayerIds || [];

        // Filter valid players
        return allPlayers.filter(p => {
            if (!candidateIds.includes(p.id)) return false;
            if (dismissedPlayerIds.includes(p.id)) return false;

            if (isBattingSelection) {
                if (selectionMode === 'STRIKER' && p.id === nonStrikerId) return false;
                if (selectionMode === 'NON_STRIKER' && p.id === strikerId) return false;
            }

            // Bowler Constraint: Cannot bowl consecutive overs
            if (selectionMode === 'BOWLER') {
                // Check if this is the start of a new over (no balls yet in current over)
                if (ballsInCurrentOver.length === 0) {
                    const prevOverNumber = currentOverNumber - 1;
                    // Ensure there WAS a previous over in this inning
                    if (prevOverNumber >= 0) {
                        // Find the last ball of the previous over to see who bowled it
                        const lastBallPrevOver = allBalls.find(b => b.overNumber === prevOverNumber);
                        if (lastBallPrevOver && lastBallPrevOver.bowlerId === p.id) {
                            return false;
                        }
                    }
                }
            }

            return true;
        });
    };

    const showPartnerships = () => {
        if (!activeScorecardTeamId || !match) return;
        const targetInning = matchInnings.find(i => i.battingTeamId === activeScorecardTeamId);
        if (!targetInning) {
            Alert.alert("Partnerships", "No innings data available.");
            return;
        }

        const inningBalls = balls.filter(b => b.inningId === targetInning.id)
            .sort((a, b) => (a.overNumber * 6 + a.ballNumber) - (b.overNumber * 6 + b.ballNumber));

        if (inningBalls.length === 0) {
            Alert.alert("Partnerships", "No balls bowled yet.");
            return;
        }

        let partnerships: any[] = [];
        let currentRuns = 0;
        let currentBalls = 0;
        let bat1 = inningBalls[0].strikerId;
        let bat2 = inningBalls[0].nonStrikerId;

        // Iterate through balls to track partnerships
        inningBalls.forEach((b, i) => {
            // Add runs and balls
            currentRuns += (b.runsScored + b.extrasRuns);
            if (b.isValidBall) currentBalls++;

            // If Wicket or Retired Hurt, end partnership
            if (b.isWicket || b.wicketType === 'RETIRED_HURT') {
                partnerships.push({
                    p1: getPlayerName(bat1),
                    p2: getPlayerName(bat2),
                    runs: currentRuns,
                    balls: currentBalls
                });
                currentRuns = 0;
                currentBalls = 0;

                // If there's a next ball, set new batters
                if (i + 1 < inningBalls.length) {
                    bat1 = inningBalls[i + 1].strikerId;
                    bat2 = inningBalls[i + 1].nonStrikerId;
                }
            }
        });

        // Add current unfinished partnership if any
        const lastBall = inningBalls[inningBalls.length - 1];
        if (!lastBall.isWicket && lastBall.wicketType !== 'RETIRED_HURT') {
            partnerships.push({
                p1: getPlayerName(bat1),
                p2: getPlayerName(bat2),
                runs: currentRuns,
                balls: currentBalls,
                isUnfinished: true
            });
        }

        setPartnershipData(partnerships);
        setPartnershipModalVisible(true);
    };

    const getPlayerName = (id: string | null | undefined) => {
        if (!id) return null;
        return allPlayers.find(p => p.id === id)?.name || 'Unknown';
    };

    // Graph Data
    const graphData = useMemo(() => {
        const inn1 = matchInnings.find(i => i.inningIndex === 1);
        const inn2 = matchInnings.find(i => i.inningIndex === 2);

        const b1 = inn1 ? balls.filter(b => b.inningId === inn1.id) : [];
        const b2 = inn2 ? balls.filter(b => b.inningId === inn2.id) : [];

        const t1Name = inn1?.battingTeamId === teamA?.id ? teamAName : teamBName;
        const t2Name = inn2?.battingTeamId === teamA?.id ? teamAName : teamBName;

        return { balls1: b1, balls2: b2, team1Name: t1Name || 'Team 1', team2Name: t2Name || 'Team 2' };
    }, [balls, matchInnings, teamA, teamB, teamAName, teamBName]);

    if (!match || !currentInning) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading Match...</Text></View>;
    }

    const getTeamScoreText = (teamId: string) => {
        const inning = matchInnings.find(i => i.battingTeamId === teamId);
        if (!inning) return "Yet to bat";
        return `${inning.totalRuns}/${inning.wickets} (${inning.oversBowled.toFixed(1)})`;
    };

    const isTeamABatting = currentInning!.battingTeamId === match!.teamAId;

    // Recent Ball Text Formatter
    const getBallText = (b: Ball) => {
        if (b.extrasType === 'WIDE') {
            const runningRuns = b.extrasRuns - 1;
            return runningRuns === 0 ? 'wd' : `wd+${runningRuns}`;
        }
        if (b.extrasType === 'NO_BALL') {
            const runs = b.runsScored;
            return runs === 0 ? 'nb' : `nb+${runs}`;
        }
        if (b.extrasType === 'BYE') {
            return `b${b.extrasRuns}`;
        }
        if (b.extrasType === 'LEG_BYE') {
            return `lb${b.extrasRuns}`;
        }
        if (b.extrasType === 'PENALTY') {
            return `pen${b.extrasRuns}`;
        }
        if (b.isWicket) return 'W';
        return b.runsScored.toString();
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header / Summary Card */}
            <Card style={styles.scoreCard}>
                <Card.Content>
                    <View style={styles.headerRow}>
                        <Text variant="titleMedium">{teamAName} vs {teamBName}</Text>
                        <Text variant="bodySmall" style={{ color: isMatchOver ? 'green' : 'orange' }}>
                            {isMatchOver ? "Finished" : "Live"}
                        </Text>
                    </View>
                    <Divider style={{ marginVertical: 8 }} />

                    <View style={[styles.teamScoreRow, isTeamABatting && styles.activeTeamRow]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {teamA?.logoUri ? (
                                <Avatar.Image size={24} source={{ uri: teamA.logoUri }} style={{ marginRight: 8, backgroundColor: 'transparent' }} />
                            ) : (
                                <Avatar.Text size={24} label={teamAName.substring(0, 1)} style={{ marginRight: 8, backgroundColor: isTeamABatting ? '#2e7d32' : '#ddd' }} />
                            )}
                            <Text style={[isTeamABatting && styles.activeTeamText]}>{teamAName}</Text>
                        </View>
                        <Text style={[isTeamABatting && styles.activeTeamText]}>{getTeamScoreText(match.teamAId)}</Text>
                    </View>

                    <View style={[styles.teamScoreRow, !isTeamABatting && styles.activeTeamRow]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {teamB?.logoUri ? (
                                <Avatar.Image size={24} source={{ uri: teamB.logoUri }} style={{ marginRight: 8, backgroundColor: 'transparent' }} />
                            ) : (
                                <Avatar.Text size={24} label={teamBName.substring(0, 1)} style={{ marginRight: 8, backgroundColor: !isTeamABatting ? '#2e7d32' : '#ddd' }} />
                            )}
                            <Text style={[!isTeamABatting && styles.activeTeamText]}>{teamBName}</Text>
                        </View>
                        <Text style={[!isTeamABatting && styles.activeTeamText]}>{getTeamScoreText(match.teamBId)}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>CRR: {currentRunRate}</Text>
                        {requiredRunRate && <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>RRR: {requiredRunRate}</Text>}
                    </View>

                    {target && !isMatchOver && <Text style={styles.statsText}>Target: {target} ({remainingRuns} runs needed from {ballsLeft} balls)</Text>}
                    {isMatchOver && (
                        <View style={{ alignItems: 'center', marginTop: 8 }}>
                            <Text style={[styles.statsText, { color: 'green', fontWeight: 'bold', fontSize: 16 }]}>Result: {matchResult}</Text>
                            {match.manOfTheMatchId && (
                                <Text style={{ color: '#2e7d32', fontWeight: 'bold', marginTop: 4 }}>
                                    Man of the Match: {getPlayerName(match.manOfTheMatchId)}
                                </Text>
                            )}
                            <Button
                                mode="contained-tonal"
                                icon="file-pdf-box"
                                onPress={generatePDF}
                                style={{ marginTop: 12 }}
                                compact
                            >
                                Download Scorecard PDF
                            </Button>
                        </View>
                    )}
                </Card.Content>
            </Card>

            {/* Main Actions */}
            {!isMatchOver && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Controls</Text>

                    {/* Batter / Bowler Selector info */}
                    {/* Batter / Bowler Selector info */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                        {/* Batters (Left) */}
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: 'green', marginRight: 6, fontSize: 18 }}>●</Text>
                                <View>
                                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{getPlayerName(strikerId)}</Text>
                                    <Text style={{ fontSize: 12, color: '#666' }}>{getBatterStats(strikerId)}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                <Text style={{ color: 'transparent', marginRight: 6, fontSize: 18 }}>●</Text>
                                <View>
                                    <Text style={{ fontSize: 16 }}>{getPlayerName(nonStrikerId)}</Text>
                                    <Text style={{ fontSize: 12, color: '#666' }}>{getBatterStats(nonStrikerId)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Bowler (Right) */}
                        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>Bowling</Text>
                            <Text style={{ fontWeight: 'bold', fontSize: 16, textAlign: 'right' }}>{getPlayerName(bowlerId)}</Text>
                            <Text style={{ fontSize: 12, color: '#666', textAlign: 'right' }}>{getBowlerStats(bowlerId)}</Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <Button mode="outlined" onPress={() => setSelectionMode('STRIKER')} compact disabled={strikerStarted}>Set Striker</Button>
                        <Button mode="outlined" onPress={() => setSelectionMode('NON_STRIKER')} compact disabled={nonStrikerStarted}>Set Non-Strik</Button>
                        <Button mode="outlined" onPress={() => setSelectionMode('BOWLER')} compact disabled={bowlerStarted}>Set Bowler</Button>
                    </View>

                    <Button
                        mode="contained"
                        onPress={() => {
                            Alert.alert('Undo Last Ball', 'Are you sure you want to undo the last ball?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Undo', style: 'destructive', onPress: () => undoLastBall(match.id) }
                            ]);
                        }}
                        style={{ marginTop: 10, marginHorizontal: 4, backgroundColor: '#757575' }}
                        compact
                    >
                        Undo Last Ball
                    </Button>


                    <Divider style={{ marginVertical: 10 }} />

                    <Text style={styles.subTitle}>Runs (Running)</Text>
                    <View style={styles.controlsGrid}>
                        {[0, 1, 2, 3, 4, 5, 6].map(run => (
                            <Button key={run} mode="contained-tonal" onPress={() => handleRun(run, false)} style={styles.controlBtn}>
                                {run}
                            </Button>
                        ))}
                    </View>

                    <Text style={styles.subTitle}>Boundaries</Text>
                    <View style={styles.controlsGrid}>
                        <Button mode="contained" buttonColor="#4caf50" onPress={() => handleRun(4, true)} style={styles.controlBtn}>4</Button>
                        <Button mode="contained" buttonColor="#2e7d32" onPress={() => handleRun(6, true)} style={styles.controlBtn}>6</Button>
                    </View>

                    <Text style={styles.subTitle}>Events</Text>
                    <View style={styles.controlsGrid}>
                        <Button mode="contained" buttonColor="red" onPress={handleWicketClick} style={styles.controlBtn}>OUT</Button>
                        <Button mode="contained" buttonColor="orange" onPress={handleWideClick} style={styles.controlBtn}>WD</Button>
                        <Button mode="contained" buttonColor="orange" onPress={handleExtra} style={styles.controlBtn}>NB</Button>
                        <Button mode="contained" buttonColor="#795548" onPress={() => setRetireHurtModalVisible(true)} style={styles.controlBtn}>Ret Hurt</Button>
                        <Button mode="contained" buttonColor="#607d8b" onPress={() => setExtrasModalVisible(true)} style={styles.controlBtn}>Extras</Button>
                    </View>
                </View>
            )}

            {/* Recent Balls and History */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold' }}>Current Over ({currentOverNumber + 1})</Text>
                    <Button compact mode="text" onPress={() => setShowPreviousOvers(!showPreviousOvers)}>
                        {showPreviousOvers ? 'Hide History' : 'Show History'}
                    </Button>
                </View>

                <ScrollView horizontal contentContainerStyle={{ paddingVertical: 8 }}>
                    {ballsInCurrentOver.map((b, i) => (
                        <View key={i} style={styles.ballCircle}>
                            <Text style={{ fontSize: 11 }}>{getBallText(b)}</Text>
                        </View>
                    ))}
                </ScrollView>

                {showPreviousOvers && (
                    <View style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 12, color: 'gray', marginBottom: 4 }}>Previous Overs</Text>
                        {/* Group regular balls by over? Or just show a list of recent 2-3 overs? For now, let's show last 12 balls excluding current over */}
                        <ScrollView horizontal contentContainerStyle={{ paddingVertical: 4 }}>
                            {allBalls.filter(b => b.overNumber < currentOverNumber).reverse().slice(0, 18).map((b, i, arr) => {
                                const showDivider = i > 0 && b.overNumber !== arr[i - 1].overNumber;
                                return (
                                    <React.Fragment key={b.id}>
                                        {showDivider && (
                                            <View style={{ width: 1, height: '80%', backgroundColor: '#bbb', marginHorizontal: 6, alignSelf: 'center' }} />
                                        )}
                                        <View style={[styles.ballCircle, { backgroundColor: '#eee', width: 26, height: 26 }]}>
                                            <Text style={{ fontSize: 10, color: '#666' }}>{getBallText(b)}</Text>
                                        </View>
                                    </React.Fragment>
                                );
                            })}
                        </ScrollView>

                    </View>
                )}
            </View>

            {/* Graph Button */}
            <View style={{ marginHorizontal: 10, marginBottom: 5 }}>
                <Button mode="outlined" icon="chart-line" onPress={() => setGraphModalVisible(true)}>
                    View Match Graph
                </Button>
            </View>

            {/* SCORECARD SECTION */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Scorecard</Text>

                <SegmentedButtons
                    value={activeScorecardTeamId}
                    onValueChange={setActiveScorecardTeamId}
                    buttons={[
                        { value: match.teamAId, label: teamAName },
                        { value: match.teamBId, label: teamBName },
                    ]}
                    style={{ marginBottom: 10 }}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 5 }}>
                    <Button mode="text" onPress={showPartnerships} compact>
                        View Partnerships
                    </Button>
                </View>

                <Text style={styles.subTitle}>Batting</Text>
                <DataTable>
                    <DataTable.Header>
                        <DataTable.Title style={{ flex: 2 }}>Batter</DataTable.Title>
                        <DataTable.Title numeric>R</DataTable.Title>
                        <DataTable.Title numeric>B</DataTable.Title>
                        <DataTable.Title numeric>4s</DataTable.Title>
                        <DataTable.Title numeric>6s</DataTable.Title>
                        <DataTable.Title numeric>SR</DataTable.Title>
                    </DataTable.Header>

                    {scorecardData.batting.map((item) => (
                        <DataTable.Row key={item.id}>
                            <DataTable.Cell style={{ flex: 2 }}>
                                <View>
                                    <Text>{item.name}</Text>
                                    <Text style={{ fontSize: 10, color: '#666' }}>{item.status}</Text>
                                </View>
                            </DataTable.Cell>
                            <DataTable.Cell numeric>{item.runs}</DataTable.Cell>
                            <DataTable.Cell numeric>{item.balls}</DataTable.Cell>
                            <DataTable.Cell numeric>{item.fours}</DataTable.Cell>
                            <DataTable.Cell numeric>{item.sixes}</DataTable.Cell>
                            <DataTable.Cell numeric>{item.sr}</DataTable.Cell>
                        </DataTable.Row>
                    ))}
                    <DataTable.Row>
                        <DataTable.Cell style={{ flex: 2 }}><Text style={{ fontWeight: 'bold' }}>Extras</Text></DataTable.Cell>
                        <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}>{scorecardData.extras}</Text></DataTable.Cell>
                        <DataTable.Cell numeric><Text> </Text></DataTable.Cell>
                        <DataTable.Cell numeric><Text> </Text></DataTable.Cell>
                        <DataTable.Cell numeric><Text> </Text></DataTable.Cell>
                        <DataTable.Cell numeric><Text> </Text></DataTable.Cell>
                    </DataTable.Row>
                </DataTable>

                <Divider style={{ marginVertical: 10 }} />

                <Text style={styles.subTitle}>Bowling</Text>
                <DataTable>
                    <DataTable.Header>
                        <DataTable.Title style={{ flex: 2 }}>Bowler</DataTable.Title>
                        <DataTable.Title numeric>O</DataTable.Title>
                        <DataTable.Title numeric>M</DataTable.Title>
                        <DataTable.Title numeric>R</DataTable.Title>
                        <DataTable.Title numeric>W</DataTable.Title>
                        <DataTable.Title numeric>Eco</DataTable.Title>
                    </DataTable.Header>

                    {scorecardData.bowling.map((item) => (
                        <DataTable.Row key={item.id}>
                            <DataTable.Cell style={{ flex: 2 }}>{item.name}</DataTable.Cell>
                            <DataTable.Cell numeric>{item.overs}</DataTable.Cell>
                            <DataTable.Cell numeric>{item.maidens}</DataTable.Cell>
                            <DataTable.Cell numeric>{item.runs}</DataTable.Cell>
                            <DataTable.Cell numeric>{item.wickets}</DataTable.Cell>
                            <DataTable.Cell numeric>{item.economy}</DataTable.Cell>
                        </DataTable.Row>
                    ))}
                </DataTable>
            </View>

            {/* Wicket Modal - Now rendered BEFORE Player Selection so selection appears on top */}
            <Portal>
                <Modal visible={wicketModalVisible} onDismiss={() => setWicketModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>Wicket!</Text>
                    <Divider style={{ marginBottom: 10 }} />
                    <Text style={styles.subTitle}>Dismissal Type</Text>
                    <View style={styles.chipRow}>
                        {(['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET'] as WicketType[]).map(type => (
                            <Button
                                key={type}
                                mode={selectedWicketType === type ? 'contained' : 'outlined'}
                                onPress={() => {
                                    setSelectedWicketType(type);
                                    // Reset fielder unless caught/runout
                                    if (!['CAUGHT', 'RUN_OUT'].includes(type)) setFielderId(null);
                                    if (type !== 'RUN_OUT') setRunOutRuns(0);
                                }}
                                style={{ margin: 4 }}
                                compact
                            >
                                {type.replace('_', ' ')}
                            </Button>
                        ))}
                    </View>

                    {/* Fielder Selection - CAUGHT or RUN OUT */}
                    {['CAUGHT', 'RUN_OUT'].includes(selectedWicketType) && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.subTitle}>{selectedWicketType === 'CAUGHT' ? 'Caught By' : 'Thrown By'}</Text>
                            <Button
                                mode="outlined"
                                onPress={() => setSelectionMode('FIELDER')}
                            >
                                {fielderId ? getPlayerName(fielderId) : 'Select Fielder'}
                            </Button>
                        </View>
                    )}

                    {/* Run Out Runs Display */}
                    {selectedWicketType === 'RUN_OUT' && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.subTitle}>Runs Completed Before Out</Text>
                            <TextInput
                                mode="outlined"
                                keyboardType="numeric"
                                value={runOutRuns.toString()}
                                onChangeText={text => {
                                    const runs = parseInt(text) || 0;
                                    setRunOutRuns(runs);
                                }}
                                style={{ backgroundColor: 'white' }}
                            />
                        </View>
                    )}

                    {/* Who is out toggler - mainly for RUN OUT currently, but let's show for flexibility if user wants to override */}
                    <Text style={[styles.subTitle, { marginTop: 10 }]}>Who is Out?</Text>
                    <SegmentedButtons
                        value={whoIsOut}
                        onValueChange={val => setWhoIsOut(val as any)}
                        buttons={[
                            { value: 'STRIKER', label: 'Striker' },
                            { value: 'NON_STRIKER', label: 'Non-Striker' },
                        ]}
                    />

                    <Button mode="contained" onPress={confirmWicket} style={{ marginTop: 20, backgroundColor: 'red' }}>
                        Confirm OUT
                    </Button>
                </Modal>
            </Portal>

            {/* Wide Modal */}
            <Portal>
                <Modal visible={wideModalVisible} onDismiss={() => setWideModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>Wide Ball Details</Text>
                    <Divider style={{ marginBottom: 10 }} />

                    <Text style={styles.subTitle}>Runs Ran (Byes)?</Text>
                    <View style={styles.controlsGrid}>
                        {[0, 1, 2, 3, 4, 5].map(run => (
                            <Button
                                key={run}
                                mode={wideRuns === run ? 'contained' : 'outlined'}
                                onPress={() => setWideRuns(run)}
                                style={styles.controlBtn}
                            >
                                +{run}
                            </Button>
                        ))}
                    </View>

                    <Divider style={{ marginVertical: 10 }} />

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.subTitle}>Is Wicket (Run Out/Stumped)?</Text>
                        <Switch value={wideIsWicket} onValueChange={setWideIsWicket} />
                    </View>

                    {wideIsWicket && (
                        <View>
                            <Text style={[styles.subTitle, { marginTop: 10 }]}>Dismissal Type</Text>
                            <SegmentedButtons
                                value={wideWicketType}
                                onValueChange={val => setWideWicketType(val as any)}
                                buttons={[
                                    { value: 'RUN_OUT', label: 'Run Out' },
                                    { value: 'STUMPED', label: 'Stumped' },
                                ]}
                                style={{ marginBottom: 10 }}
                            />

                            {/* Fielder for Run Out */}
                            {wideWicketType === 'RUN_OUT' && (
                                <View style={{ marginBottom: 10 }}>
                                    <Button mode="outlined" onPress={() => setSelectionMode('FIELDER')}>
                                        {fielderId ? getPlayerName(fielderId) : 'Select Fielder (Run Out)'}
                                    </Button>
                                </View>
                            )}

                            <Text style={styles.subTitle}>Who is Out?</Text>
                            <SegmentedButtons
                                value={wideWhoIsOut}
                                onValueChange={val => setWideWhoIsOut(val as any)}
                                buttons={[
                                    { value: 'STRIKER', label: 'Striker' },
                                    { value: 'NON_STRIKER', label: 'Non-Striker' },
                                ]}
                            />
                        </View>
                    )}

                    <Button mode="contained" onPress={confirmWide} style={{ marginTop: 20 }}>
                        Confirm Wide
                    </Button>
                </Modal>
            </Portal>

            {/* No Ball Modal */}
            <Portal>
                <Modal visible={nbModalVisible} onDismiss={() => setNbModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>No Ball</Text>
                    <Divider style={{ marginBottom: 10 }} />

                    <View style={{ marginBottom: 15 }}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Runs from: {nbRunType}</Text>
                        <SegmentedButtons
                            value={nbRunType}
                            onValueChange={val => setNbRunType(val as any)}
                            density="medium"
                            buttons={[
                                { value: 'BAT', label: 'Bat' },
                                { value: 'BYE', label: 'Bye' },
                                { value: 'LEG_BYE', label: 'L.Bye' },
                                { value: 'PENALTY', label: 'Pen' },
                            ]}
                        />
                    </View>

                    <Text style={styles.subTitle}>Runs (Running)</Text>
                    <View style={styles.controlsGrid}>
                        {[0, 1, 2, 3, 4, 5, 6].map(run => (
                            <Button key={run} mode="contained-tonal" onPress={() => confirmNoBall(run)} style={styles.controlBtn}>
                                {run}
                            </Button>
                        ))}
                    </View>

                    <Text style={styles.subTitle}>Boundaries</Text>
                    <View style={styles.controlsGrid}>
                        <Button mode="contained" buttonColor="#4caf50" onPress={() => confirmNoBall(4, true)} style={styles.controlBtn}>4</Button>
                        <Button mode="contained" buttonColor="#2e7d32" onPress={() => confirmNoBall(6, true)} style={styles.controlBtn}>6</Button>
                    </View>
                </Modal>
            </Portal>

            {/* Retire Hurt Modal */}
            <Portal>
                <Modal visible={retireHurtModalVisible} onDismiss={() => setRetireHurtModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>Retire Hurt</Text>
                    <Divider style={{ marginBottom: 10 }} />
                    <Text style={styles.subTitle}>Who is Retiring?</Text>
                    <SegmentedButtons
                        value={whoIsOut}
                        onValueChange={val => setWhoIsOut(val as any)}
                        buttons={[
                            { value: 'STRIKER', label: `Striker (${getPlayerName(strikerId)})` },
                            { value: 'NON_STRIKER', label: `Non-Str (${getPlayerName(nonStrikerId)})` },
                        ]}
                    />
                    <Button
                        mode="contained"
                        onPress={confirmRetireHurt}
                        style={{ marginTop: 20, backgroundColor: '#795548' }}
                    >
                        Confirm Retire Hurt
                    </Button>
                </Modal>
            </Portal>

            {/* Partnerships Modal */}
            <Portal>
                <Modal visible={partnershipModalVisible} onDismiss={() => setPartnershipModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>Innings Partnerships</Text>
                    <Divider />
                    <DataTable>
                        <DataTable.Header>
                            <DataTable.Title style={{ flex: 2 }}>Batter 1</DataTable.Title>
                            <DataTable.Title numeric style={{ flex: 1 }}>Runs (B)</DataTable.Title>
                            <DataTable.Title numeric style={{ flex: 2 }}>Batter 2</DataTable.Title>
                        </DataTable.Header>

                        <ScrollView style={{ maxHeight: 300 }}>
                            {partnershipData.map((p, i) => (
                                <DataTable.Row key={i}>
                                    <DataTable.Cell style={{ flex: 2 }}><Text style={{ fontSize: 12 }}>{p.p1}</Text></DataTable.Cell>
                                    <DataTable.Cell numeric style={{ flex: 1 }}><Text style={{ fontWeight: 'bold' }}>{p.runs}</Text> <Text style={{ fontSize: 10, color: '#666' }}>({p.balls})</Text> <Text>{p.isUnfinished ? '*' : ''}</Text></DataTable.Cell>
                                    <DataTable.Cell numeric style={{ flex: 2 }}><Text style={{ fontSize: 12 }}>{p.p2}</Text></DataTable.Cell>
                                </DataTable.Row>
                            ))}
                        </ScrollView>
                    </DataTable>
                    <Button onPress={() => setPartnershipModalVisible(false)} style={{ marginTop: 10 }}>Close</Button>
                </Modal>
            </Portal>

            {/* Graph Modal */}
            <Portal>
                <Modal visible={graphModalVisible} onDismiss={() => setGraphModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>Innings Progression</Text>
                    <Divider style={{ marginBottom: 10 }} />
                    <MatchGraph
                        balls1={graphData.balls1}
                        balls2={graphData.balls2}
                        totalOvers={match?.overs || 20}
                        team1Name={graphData.team1Name}
                        team2Name={graphData.team2Name}
                    />
                    <Button onPress={() => setGraphModalVisible(false)} style={{ marginTop: 10 }}>Close</Button>
                </Modal>
            </Portal>

            {/* Extras Modal */}
            <Portal>
                <Modal visible={extrasModalVisible} onDismiss={() => setExtrasModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>Record Extras</Text>
                    <Divider style={{ marginBottom: 10 }} />
                    <Text style={styles.subTitle}>Type</Text>
                    <SegmentedButtons
                        value={selectedExtraType}
                        onValueChange={val => setSelectedExtraType(val as any)}
                        buttons={[
                            { value: 'BYE', label: 'Bye' },
                            { value: 'LEG_BYE', label: 'Leg Bye' },
                            { value: 'PENALTY', label: 'Penalty' },
                        ]}
                        style={{ marginBottom: 10 }}
                    />
                    <Text style={styles.subTitle}>Runs Added to Score</Text>
                    <View style={styles.controlsGrid}>
                        {[1, 2, 3, 4, 5].map(run => (
                            <Button
                                key={run}
                                mode="contained"
                                onPress={() => confirmExtraRun(run)}
                                style={styles.controlBtn}
                            >
                                +{run}
                            </Button>
                        ))}
                    </View>
                </Modal>
            </Portal>

            {/* Player Selection Modal - Rendered LAST to be on top */}
            <Portal>
                <Modal visible={!!selectionMode} onDismiss={() => setSelectionMode(null)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                        Select {selectionMode === 'FIELDER' ? 'Fielder' : (selectionMode === 'BOWLER' ? 'Bowler' : (selectionMode === 'STRIKER' ? 'Striker' : 'Non-Striker'))}
                    </Text>
                    <Divider />
                    <FlatList
                        data={getSelectablePlayers()}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <List.Item
                                title={item.name}
                                description={item.role.replace('_', ' ')}
                                onPress={() => handleSelectPlayer(item.id)}
                                left={props => <Avatar.Text size={32} label={item.name.substring(0, 2).toUpperCase()} style={{ marginRight: 10 }} />}
                            />
                        )}
                        style={{ maxHeight: 400 }}
                    />
                    <Button onPress={() => setSelectionMode(null)} style={{ marginTop: 10 }}>Cancel</Button>
                </Modal>
            </Portal>

        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0', padding: 10 },
    scoreCard: { marginBottom: 16, backgroundColor: '#fff' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    teamScoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    activeTeamRow: { backgroundColor: '#e8f5e9', borderRadius: 4, paddingHorizontal: 5 },
    activeTeamText: { fontWeight: 'bold', color: '#2e7d32' },
    section: { marginBottom: 16, padding: 10, backgroundColor: '#fff', borderRadius: 8 },
    sectionTitle: { marginBottom: 8, fontWeight: 'bold' },
    subTitle: { fontSize: 14, fontWeight: 'bold', marginVertical: 4, color: '#666' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    controlsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
    controlBtn: { minWidth: 60, margin: 4 },
    ballCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginRight: 5 },
    modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    statsText: { fontSize: 12, color: 'gray', marginTop: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap' }
});
