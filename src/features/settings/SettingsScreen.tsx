import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Button, Card, Text, List, Divider, Switch, Portal, Modal, ActivityIndicator, IconButton, SegmentedButtons } from 'react-native-paper';
import { DataMigrationService, ConflictItem, BackupData } from '../../services/DataMigrationService';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore, AppTheme } from '../../store/settingsStore';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const { theme, setTheme, primaryColor, setPrimaryColor } = useSettingsStore();
    const [loading, setLoading] = useState(false);
    const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
    const [importedData, setImportedData] = useState<BackupData | null>(null);
    const [resolutions, setResolutions] = useState<Record<string, 'KEEP_EXISTING' | 'OVERWRITE'>>({});
    const [showConflictModal, setShowConflictModal] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            await DataMigrationService.exportData();
            // Alert.alert("Success", "Data exported successfully!"); // Share sheet handles confirmation usually
        } catch (error) {
            Alert.alert("Error", "Failed to export data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        setLoading(true);
        try {
            const data = await DataMigrationService.importDataFromFile();
            if (!data) {
                setLoading(false);
                return; // Canceled
            }

            const detectedConflicts = DataMigrationService.detectConflicts(data);
            setImportedData(data);

            if (detectedConflicts.length > 0) {
                setConflicts(detectedConflicts);
                // Initialize resolutions to KEEP_EXISTING by default
                const initialRes: Record<string, 'KEEP_EXISTING' | 'OVERWRITE'> = {};
                detectedConflicts.forEach(c => initialRes[c.id] = 'KEEP_EXISTING');
                setResolutions(initialRes);
                setShowConflictModal(true);
            } else {
                // No conflicts, direct commit? Or ask confirmation?
                Alert.alert(
                    "Confirm Import",
                    `Found ${data.matches.length} matches, ${data.teams.length} teams. Proceed?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Import",
                            onPress: () => commitImport(data, {})
                        }
                    ]
                );
            }
        } catch (error) {
            Alert.alert("Error", "Failed to import data");
        } finally {
            setLoading(false);
        }
    };

    const commitImport = (data: BackupData, res: Record<string, 'KEEP_EXISTING' | 'OVERWRITE'>) => {
        try {
            DataMigrationService.commitImport(data, res);
            Alert.alert("Success", "Data imported successfully!");
            setShowConflictModal(false);
            setConflicts([]);
            setImportedData(null);
        } catch (e) {
            Alert.alert("Error", "Failed to commit data.");
        }
    };

    const toggleResolution = (id: string) => {
        setResolutions(prev => ({
            ...prev,
            [id]: prev[id] === 'KEEP_EXISTING' ? 'OVERWRITE' : 'KEEP_EXISTING'
        }));
    };

    const setAllResolutions = (type: 'KEEP_EXISTING' | 'OVERWRITE') => {
        const newRes = { ...resolutions };
        conflicts.forEach(c => newRes[c.id] = type);
        setResolutions(newRes);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={{ padding: 16 }}>
                <Text variant="headlineMedium" style={{ marginBottom: 20 }}>Settings</Text>

                <Card style={styles.card}>
                    <Card.Title title="Appearance" left={(props) => <List.Icon {...props} icon="palette" />} />
                    <Card.Content>
                        <Text style={styles.sectionHeader}>Theme</Text>
                        <View style={styles.segmentedButtonContainer}>
                            <SegmentedButtons
                                value={theme}
                                onValueChange={(val) => setTheme(val as AppTheme)}
                                buttons={[
                                    { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
                                    { value: 'dark', label: 'Dark', icon: 'weather-night' },
                                    { value: 'system', label: 'System', icon: 'theme-light-dark' },
                                ]}
                            />
                        </View>

                        <Text style={styles.sectionHeader}>Primary Color</Text>
                        <View style={styles.colorGrid}>
                            {['#6200ee', '#ef5350', '#4caf50', '#ff9800', '#03a9f4', '#e91e63'].map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: color },
                                        primaryColor === color && styles.selectedColor
                                    ]}
                                    onPress={() => setPrimaryColor(color)}
                                />
                            ))}
                        </View>
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Title title="Data Management" left={(props) => <List.Icon {...props} icon="database" />} />
                    <Card.Content>
                        <Text style={{ marginBottom: 10, color: 'gray' }}>
                            Backup your tournament data or restore from a previous backup.
                        </Text>

                        <Button
                            mode="contained"
                            onPress={handleExport}
                            loading={loading}
                            disabled={loading}
                            icon="export"
                            style={{ marginBottom: 10 }}
                        >
                            Export Data
                        </Button>

                        <Button
                            mode="outlined"
                            onPress={handleImport}
                            loading={loading}
                            disabled={loading}
                            icon="import"
                        >
                            Import Data
                        </Button>
                    </Card.Content>
                </Card>

                {/* Conflict Resolution Modal */}
                <Portal>
                    <Modal visible={showConflictModal} onDismiss={() => setShowConflictModal(false)} contentContainerStyle={styles.modalContent}>
                        <Text variant="headlineSmall" style={{ marginBottom: 10 }}>Resolve Conflicts</Text>
                        <Text style={{ marginBottom: 10, color: 'gray' }}>
                            {conflicts.length} duplicate items found. Choose how to handle them.
                        </Text>

                        <View style={styles.batchActions}>
                            <Button compact onPress={() => setAllResolutions('KEEP_EXISTING')}>Skip All</Button>
                            <Button compact onPress={() => setAllResolutions('OVERWRITE')}>Overwrite All</Button>
                        </View>
                        <Divider />

                        <ScrollView style={{ maxHeight: 400 }}>
                            {conflicts.map(item => (
                                <View key={item.id} style={styles.conflictItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: 'bold' }}>{item.type}: {item.name || item.id}</Text>
                                        <Text style={{ fontSize: 12, color: 'gray' }}>ID: {item.id.substring(0, 8)}...</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, marginRight: 5 }}>
                                            {resolutions[item.id] === 'OVERWRITE' ? 'Overwrite' : 'Skip'}
                                        </Text>
                                        <Switch
                                            value={resolutions[item.id] === 'OVERWRITE'}
                                            onValueChange={() => toggleResolution(item.id)}
                                        />
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <Divider style={{ marginVertical: 10 }} />
                        <View style={styles.modalActions}>
                            <Button onPress={() => setShowConflictModal(false)}>Cancel</Button>
                            <Button mode="contained" onPress={() => importedData && commitImport(importedData, resolutions)}>
                                Confirm Import
                            </Button>
                        </View>
                    </Modal>
                </Portal>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    card: { marginBottom: 16, backgroundColor: 'white' },
    modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8, maxHeight: '80%' },
    conflictItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
    batchActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 8 },
    segmentedButtonContainer: { marginBottom: 16 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    colorCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
    selectedColor: { borderColor: 'black', borderWidth: 3 },
});
