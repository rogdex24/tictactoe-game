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

- **Colors:** Use palette exports from `src/styles/colors.ts`. Do not hard-code hex values inside components; extend the palette instead. Notable tokens for the home screen include the `screenBackground`, `gradientStart`/`gradientEnd` blend, `textTealSoft` subtitle tint, and the translucent `glowCoral`/`glowTeal` fills used for the blurred backdrops.
- **Typography:** Always reference text styles or font families from `src/styles/typography.ts`. The landing screen uses `typography.displayHero` for the “Tic Tac Toe” title, `typography.bodyPrimary` for supporting copy, and `typography.buttonPrimary` for the CTA label. Heading scales leverage Montserrat Regular/Bold/ExtraBold.
- **Spacing & Radii:** Import values from `src/styles/dimensions.ts` for padding, gaps, rounded corners, and offsets. The start screen relies on `radius.xl` for the card shell, `radius.md` for the CTA button, and uses `layout.homeCard*` and `offsets.homeGraphicLift` to keep proportions consistent with the HTML reference.
- **Icons & Illustration:** SVG-based icons live in `src/components/home/GameIcons`. Reuse and compose SVG primitives instead of embedding raw XML strings. The X/O hero art should remain centered within a `192px` stage to preserve alignment with the provided reference.
- **Gradients:** Prefer `expo-linear-gradient` for decorative gradients. Keep start/end coordinates explicit so future tweaks remain predictable.

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

## Home Screen Reference

The `HomeScreen` component intentionally mirrors the provided Tailwind/HTML concept:

- A centered card constrained by `layout.homeCardMaxWidth` × `layout.homeCardMaxHeight` with a diagonal gradient, 40px radius, white border at 10% opacity, and deep drop shadow.
- Dual backdrop glows positioned via percentages and negative margins to reproduce the blurred coral and teal halos from the mock-up.
- The hero title splits across two lines using Montserrat ExtraBold at 96px, while the teal subtitle uses Montserrat Regular at 16px with 70% opacity.
- The O and X illustrations match the reference sizes (144px circle, 176px cross), rotations (±15°), and placement offsets (±24px) to achieve a pixel-faithful overlap.
- The “Start Game” button stretches full width, uses the coral brand color, casts a soft shadow (`colors.buttonShadow`), and nudges downward 2px on press to emulate the HTML active state.

## Testing Expectations

- Each reusable component should include at least one unit or snapshot test when logic is present.
- Validate cross-platform compatibility before merging: ensure styles do not rely on platform-specific behavior.

## Pull Request Notes

- Summaries should mention any new components, design tokens, or navigation routes added.
- Include screenshots of notable UI changes when feasible.
