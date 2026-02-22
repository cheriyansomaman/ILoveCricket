import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image } from 'react-native';
import { Button, Text, RadioButton, Card, Title, useTheme } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMatchStore } from '../../store/matchStore';
import { useTeamStore } from '../../store/teamStore';

export default function TossScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { matchId } = route.params;

    const theme = useTheme();

    const match = useMatchStore(state => state.matches.find(m => m.id === matchId));
    const updateTossResult = useMatchStore(state => state.updateTossResult);
    const updateMatchStatus = useMatchStore(state => state.updateMatchStatus);
    const teams = useTeamStore(state => state.teams);

    const matchTeamA = teams.find(t => t.id === match?.teamAId);
    const matchTeamB = teams.find(t => t.id === match?.teamBId);

    const [tossWinner, setTossWinner] = useState<string | null>(null);
    const [decision, setDecision] = useState<'BAT' | 'BOWL' | null>(null);
    const [loading, setLoading] = useState(false);

    if (!match || !matchTeamA || !matchTeamB) {
        return <View style={styles.center}><Text>Match Data Not Found</Text></View>;
    }

    const handleStartMatch = async () => {
        if (!tossWinner || !decision) {
            Alert.alert("Incomplete", "Please select toss winner and decision.");
            return;
        }

        setLoading(true);

        // Determine who bats first
        let battingFirstId = '';
        if (decision === 'BAT') {
            battingFirstId = tossWinner;
        } else {
            battingFirstId = tossWinner === matchTeamA.id ? matchTeamB.id : matchTeamA.id;
        }

        await updateTossResult(matchId, tossWinner, battingFirstId);
        await updateMatchStatus(matchId, 'LIVE');

        navigation.replace('LiveScore', { matchId });
    };

    return (
        <View style={styles.container}>
            <Title style={styles.mainTitle}>Toss</Title>

            <Card style={styles.card}>
                <Card.Content>
                    <Text style={styles.sectionTitle}>Who won the toss?</Text>
                    <View style={styles.row}>
                        <Button
                            mode={tossWinner === matchTeamA.id ? "contained" : "outlined"}
                            onPress={() => setTossWinner(matchTeamA.id)}
                            style={[styles.choiceBtn, { borderColor: matchTeamA.color?.toLowerCase() || '#6200ee' }]}
                            buttonColor={tossWinner === matchTeamA.id ? matchTeamA.color?.toLowerCase() : undefined}
                            textColor={tossWinner !== matchTeamA.id ? matchTeamA.color?.toLowerCase() : undefined}
                        >
                            {matchTeamA.name}
                        </Button>
                        <Button
                            mode={tossWinner === matchTeamB.id ? "contained" : "outlined"}
                            onPress={() => setTossWinner(matchTeamB.id)}
                            style={[styles.choiceBtn, { borderColor: matchTeamB.color?.toLowerCase() || '#6200ee' }]}
                            buttonColor={tossWinner === matchTeamB.id ? matchTeamB.color?.toLowerCase() : undefined}
                            textColor={tossWinner !== matchTeamB.id ? matchTeamB.color?.toLowerCase() : undefined}
                        >
                            {matchTeamB.name}
                        </Button>
                    </View>
                </Card.Content>
            </Card>

            <Card style={[styles.card, { opacity: tossWinner ? 1 : 0.5 }]}>
                <Card.Content>
                    <Text style={styles.sectionTitle}>Chose to?</Text>
                    <View style={styles.row}>
                        <Button
                            mode={decision === 'BAT' ? "contained" : "outlined"}
                            icon="cricket"
                            onPress={() => setDecision('BAT')}
                            disabled={!tossWinner}
                            style={styles.choiceBtn}
                        >
                            Bat
                        </Button>
                        <Button
                            mode={decision === 'BOWL' ? "contained" : "outlined"}
                            icon="bowling"
                            onPress={() => setDecision('BOWL')}
                            disabled={!tossWinner}
                            style={styles.choiceBtn}
                        >
                            Bowl
                        </Button>
                    </View>
                </Card.Content>
            </Card>

            <View style={styles.summaryContainer}>
                {tossWinner && decision && (
                    <Text style={styles.summaryText}>
                        {tossWinner === matchTeamA.id ? matchTeamA.name : matchTeamB.name} won the toss and elected to {decision === 'BAT' ? 'Bat' : 'Bowl'} first.
                    </Text>
                )}
            </View>

            <Button
                mode="contained"
                onPress={handleStartMatch}
                style={styles.startBtn}
                contentStyle={{ height: 50 }}
                disabled={loading || !tossWinner || !decision}
                loading={loading}
            >
                Start Match
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainTitle: {
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 15,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    choiceBtn: {
        minWidth: 120,
    },
    summaryContainer: {
        minHeight: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
    },
    summaryText: {
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '500',
        color: '#333',
    },
    startBtn: {
        marginTop: 20,
    }
});
