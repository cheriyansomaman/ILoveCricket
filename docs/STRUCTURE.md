# 📂 React Native Project Structure

The project follows a feature-based architecture for scalability and maintainability.

```
src/
├── assets/                 # Images, fonts, and static resources
│   ├── images/
│   └── fonts/
├── components/             # Shared UI components
│   ├── common/             # Buttons, Inputs, Cards
│   ├── layout/             # Screen wrappers, safe areas
│   └── cricket/            # Specific cricket UI (Scorecard, BallIndicator)
├── constants/              # App-wide constants
│   ├── colors.ts           # Theme colors
│   ├── layout.ts           # Screen dimensions
│   └── routes.ts           # Navigation route names
├── features/               # Feature-specific modules
│   ├── tournament/         # Tournament list, create, edit
│   ├── team/               # Team & Player management
│   ├── match/              # Match setup, live scoring logic
│   ├── stats/              # Statistics & Charts
│   └── settings/           # App settings & JSON Export/Import
├── hooks/                  # Custom React hooks
│   └── useTheme.ts
├── navigation/             # React Navigation setup
│   ├── AppNavigator.tsx    # Main stack navigator
│   ├── TabNavigator.tsx    # (Optional) bottom tabs
│   └── types.ts            # Route params types
├── services/               # External services integration
│   ├── db/                 # SQLite database service
│   │   ├── index.ts        # DB connection
│   │   └── queries.ts      # Raw SQL queries
│   ├── storage/            # AsyncStorage wrapper
│   └── export/             # JSON export/import logic
├── store/                  # State management (Zustand)
│   ├── useMatchStore.ts    # Live match state
│   └── useAppStore.ts      # Global app state (theme, user prefs)
├── types/                  # TypeScript definitions
│   ├── models.ts           # DB models (User, Match, etc.)
│   └── api.ts              # (If needed later) API types
└── utils/                  # Helper functions
    ├── date.ts             # Date formatting
    ├── validation.ts       # Form validation
    └── cricket.ts          # Cricket rules logic (Run rate, etc.)
```

## Key Files
- `App.tsx`: Entry point.
- `babel.config.js`: Babel configuration.
- `app.json`: Expo configuration.
