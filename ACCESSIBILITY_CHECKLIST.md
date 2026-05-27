# Accessibility Checklist

Run these checks and fixes before publishing:

- [ ] Use keyboard to navigate the app: ensure all interactive elements are reachable and have visible focus.
- [ ] Add aria-labels where icons/buttons lack text.
- [ ] Ensure color contrast meets WCAG AA (especially amber on navy backgrounds).
- [ ] Use semantic HTML for headings, lists, buttons, and forms.
- [ ] Verify modals and sheet dialogs trap focus and return focus on close.
- [ ] Provide skip-links for keyboard users if there is a long navigation.
- [ ] Use `role` and `aria-live` for dynamic updates when appropriate (move list, captured pieces).
- [ ] Run the axe browser extension or `@axe-core/react` integration for automated checks.

## Quick commands and tools

- Automated a11y checks (local):

```bash
# run in the frontend package after install
pnpm --filter ./artifacts/chess-game run test -- --coverage
# or integrate axe checks in unit tests
```

- Manual checks:
  - Chrome Lighthouse > Accessibility
  - axe DevTools

## Notes

- I can open PRs to add aria attributes and focus traps for modals/sheets if you want me to proceed file-by-file.
