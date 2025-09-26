# Frontend Agent Guide

## Scope

These conventions apply to all files within the `frontend/` directory. Follow them when modifying existing code or adding new modules.

## Project Overview

The Expo React Native client renders the multiplayer Tic-Tac-Toe experience. Screens should follow the design system defined in `src/styles` and remain compatible with iOS, Android, and web builds.

## Tooling & Commands

- Install dependencies: `pnpm install`
- Start the Expo development server: `pnpm --filter frontend start`
- Run unit tests: `pnpm --filter frontend test`
- Type-check: `pnpm --filter frontend typecheck`
- Lint: `pnpm --filter frontend lint`
- Format check: `pnpm --filter frontend format`

## Design System

- **Colors:** Use palette exports from `src/styles/colors.ts`. Do not hard-code hex values inside components; extend the palette instead.
- **Typography:** Always reference text styles or font families from `src/styles/typography.ts`. Heading scales leverage Montserrat Regular/Bold/ExtraBold.
- **Spacing & Radii:** Import values from `src/styles/dimensions.ts` for padding, gaps, and rounded corners. Extend these tokens when new values are required.
- **Icons & Illustration:** SVG-based icons live in `src/components/home/GameIcons`. Reuse and compose SVG primitives instead of embedding raw XML strings.
- **Gradients:** Prefer `react-native-linear-gradient` for decorative gradients. Keep start/end coordinates explicit so future tweaks remain predictable.

## Component Patterns

- Organize UI into small, focused components. Shared primitives belong under `src/components/common` while feature-specific pieces sit within their feature folder.
- Export each component through an `index.ts` barrel to maintain clean import paths.
- Favor functional components with React hooks. Avoid class components unless absolutely necessary.
- Keep layout logic close to the view. State and side-effects should move upward toward screen-level containers.
- Navigation types should extend the central `RootStackParamList` (`src/types/components.ts`).

## Styling Practices

- Use `StyleSheet.create` for static styles. Inline styles are acceptable only for dynamic values that depend on props/state.
- Translate transforms and shadows from design specs into React Native-friendly properties (e.g., `transform: [{ rotate: '15deg' }]`).
- Maintain accessibility by ensuring touch targets are at least 48px tall and text has sufficient contrast.

## Assets & Fonts

- Custom fonts reside in `assets/fonts`. Register new families in `react-native.config.js` and load them via `expo-font` in `App.tsx`.
- Keep SVG illustrations as code—avoid bundling massive binary assets unless essential.

## Testing Expectations

- Each reusable component should include at least one unit or snapshot test when logic is present.
- Validate cross-platform compatibility before merging: ensure styles do not rely on platform-specific behavior.

## Pull Request Notes

- Summaries should mention any new components, design tokens, or navigation routes added.
- Include screenshots of notable UI changes when feasible.
