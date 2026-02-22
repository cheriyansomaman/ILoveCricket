import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppTheme = 'light' | 'dark' | 'system';

interface SettingsState {
    theme: AppTheme;
    primaryColor: string;
    setTheme: (theme: AppTheme) => void;
    setPrimaryColor: (color: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'light',
            primaryColor: '#6200ee',
            setTheme: (theme) => set({ theme }),
            setPrimaryColor: (color) => set({ primaryColor: color }),
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
