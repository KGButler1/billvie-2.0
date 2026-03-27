
Issue identified: the blank white screen is most likely a top-level runtime crash, not a CSS problem. The strongest code-level cause is `src/components/ui/sonner.tsx` calling `useTheme()` from `next-themes` while the app does not mount a `ThemeProvider` anywhere in `src/App.tsx`. Because `<Sonner />` is rendered at the top of the app, that crash can blank the entire page after refresh.

Plan

1. Fix the actual crash source
- Update `src/components/ui/sonner.tsx` so it no longer depends on `next-themes`.
- Use the app’s existing theme system instead:
  - derive theme from `document.documentElement.classList.contains('dark')`, or
  - default Sonner to a stable theme value without hooks.
- This is the safest fix because the project already uses `UserService.initializeTheme()` and not `next-themes`.

2. Keep theme behavior consistent
- Do not introduce a new global `ThemeProvider` unless necessary.
- Preserve the current dark/light behavior controlled by `UserService`.
- This avoids changing app architecture and reduces the chance of breaking working pages.

3. Verify top-level rendering path
- Recheck `src/App.tsx`, `src/main.tsx`, and `src/pages/LandingPage.tsx` to make sure nothing else at the root can throw during first paint.
- Specifically confirm the landing page route `/` remains a simple render path after the Sonner fix.

4. Quick safety pass on recent changes
- Review recently edited header/dashboard components only for anything that could throw on initial render.
- Focus on optional props and conditional rendering, not broad redesign changes.

5. Expected outcome
- Refreshing `/` should render the landing page again instead of a blank white canvas.
- Existing toasts should still work.
- Existing theme behavior should remain intact.
- No functional rollback should be needed.

Technical notes
- Likely failing file: `src/components/ui/sonner.tsx`
- Supporting file to keep aligned: `src/App.tsx`
- Reason this is more likely than CSS: a CSS issue would usually still show DOM/content; a full blank white preview after refresh is more consistent with an app-level render crash.
