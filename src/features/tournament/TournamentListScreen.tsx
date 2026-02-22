import React, { useState, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Paragraph, FAB, Button, Text, Portal, IconButton } from 'react-native-paper';
import { useTournamentStore } from '../../store/tournamentStore';
import { useTeamStore } from '../../store/teamStore';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
// Using legacy API as recommended by deprecation warning for readAsStringAsync
import * as FileSystem from 'expo-file-system/legacy';

export default function TournamentListScreen() {
    const tournaments = useTournamentStore((state) => state.tournaments);
    const addPlayersBulk = useTeamStore((state) => state.addPlayersBulk);
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const theme = useTheme();
    const [state, setState] = useState({ open: false });
    const onStateChange = ({ open }: { open: boolean }) => setState({ open });
    const { open } = state;

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ justifyContent: 'center' }}>
                    <IconButton
                        icon="cog"
                        onPress={() => navigation.navigate('Settings')}
                    />
                </View>
            ),
        });
    }, [navigation]);

    const handleImportCSV = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'], // Broaden to '*/*' if needed
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const uri = result.assets[0].uri;
            const content = await FileSystem.readAsStringAsync(uri);
            const lines = content.split('\n');
            const playersData: any[] = [];

            // Simple Parse
            const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Assuming Name,Jersey,Role,BatStyle,BowlStyle
                const parts = line.split(',');
                if (parts.length < 3) continue; // Basic check

                const [name, jerseyNumber, role, batStyle, bowlStyle] = parts;

                playersData.push({
                    name: name.trim(),
                    jerseyNumber: jerseyNumber?.trim() || '0',
                    role: role?.trim().toUpperCase() || 'BATTER',
                    batStyle: batStyle?.trim().toUpperCase() || 'RIGHT_HAND',
                    bowlStyle: bowlStyle?.trim().toUpperCase() || 'NONE',
                });
            }

            if (playersData.length > 0) {
                await addPlayersBulk(playersData);
                Alert.alert('Success', `Imported ${playersData.length} players successfully!`);
            } else {
                Alert.alert('Error', 'No valid player data found in CSV.');
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to import CSV.');
        }
    };

    return (
        <View style={styles.container}>
            {tournaments.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={{ textAlign: 'center', marginBottom: 20 }}>
                        No tournaments yet. Create one to get started!
                    </Text>
                    <Button mode="contained" onPress={() => navigation.navigate('CreateTournament')}>
                        Create Tournament
                    </Button>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent}>
                    {tournaments.map((tournament) => (
                        <Card
                            key={tournament.id}
                            style={styles.card}
                            onPress={() => navigation.navigate('TournamentDetail', { tournamentId: tournament.id })}
                        >
                            <Card.Content>
                                <Title>{tournament.name}</Title>
                                <Paragraph>{tournament.location || 'Location Not Set'}</Paragraph>
                                <Paragraph>Overs Limit: {tournament.oversLimit}</Paragraph>
                                <Paragraph style={{ fontSize: 12, color: 'gray' }}>
                                    Created on: {new Date(tournament.createdAt).toLocaleDateString()}
                                </Paragraph>
                            </Card.Content>
                        </Card>
                    ))}
                </ScrollView>
            )}
            {isFocused && (
                <Portal>
                    <FAB.Group
                        open={open}
                        visible
                        icon={open ? 'close' : 'plus'}
                        actions={[
                            {
                                icon: 'trophy',
                                label: 'Create Tournament',
                                onPress: () => navigation.navigate('CreateTournament'),
                            },
                            {
                                icon: 'account-group',
                                label: 'Create Team',
                                onPress: () => navigation.navigate('CreateTeam'),
                            },
                            {
                                icon: 'shield-account',
                                label: 'All Teams',
                                onPress: () => navigation.navigate('Teams'),
                            },
                            {
                                icon: 'account',
                                label: 'Create Player',
                                onPress: () => navigation.navigate('CreatePlayer'),
                            },
                            {
                                icon: 'account-multiple',
                                label: 'All Players',
                                onPress: () => navigation.navigate('Players'),
                            },
                            {
                                icon: 'file-import',
                                label: 'Import Players (CSV)',
                                onPress: handleImportCSV,
                            },
                            {
                                icon: 'cog',
                                label: 'Settings',
                                onPress: () => navigation.navigate('Settings'),
                            },
                        ]}
                        onStateChange={onStateChange}
                        onPress={() => {
                            if (open) {
                                // do something if the speed dial is open
                            }
                        }}
                    />
                </Portal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 16,
        elevation: 2,
    },
});
