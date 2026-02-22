# 🏏 Live Cricket Scorer App

An offline-first Cricket Scorer built with React Native (Expo) and Zustand for local state management.

## 🚀 How to Run the App

### Prerequisites
- **Node.js** installed on your computer.
- **Expo Go** app installed on your Android or iOS device.

### Steps to Run

1.  **Open Terminal** in the project directory:
    ```bash
    cd /Users/cheriyan/.gemini/antigravity/scratch/ILoveCricket
    ```

2.  **Install Dependencies** (if you haven't already):
    ```bash
    npm install
    ```

3.  **Start the Development Server**:
    ```bash
    npx expo start
    ```

4.  **Launch on Device**:
    -   **Android**: Scan the QR code shown in the terminal using the Expo Go app.
    -   **iOS**: Scan the QR code using the Camera app (requires Expo Go).
    -   **Emulator**: Press `a` (Android) or `i` (iOS) in the terminal to launch on a running emulator/simulator.

### Troubleshooting
-   If you see connection issues, ensure your phone and computer are on the same Wi-Fi network.
-   Run `npx expo start --tunnel` if regular connection fails.

## 📂 Project Structure
-   `src/features`: Contains screens like Tournament List, Create Tournament.
-   `src/store`: Manages app data (Teams, Players, Matches) using Zustand.
-   `src/services`: Handles persistence and logic.

## 🛠 Features Implemented
-   ✅ **Local Storage**: Data persists even after closing the app.
-   ✅ **Tournament Management**: Create and view tournaments.
-   🚧 **Next Up**: Team & Player Management, Live Scoring Interface.
