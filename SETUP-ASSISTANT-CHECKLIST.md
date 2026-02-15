# ClawHQ Setup Assistant — Implementation Checklist

## Backend
- [x] 1. POST `/api/setup/message` — Setup chat endpoint (accepts message, returns AI response)
- [x] 2. Setup session model — track state per user (step, selections, message count)
- [x] 3. System prompt for Setup Assistant — scripted flow, 3 deploy paths, redirects off-topic
- [x] 4. Lightweight model integration — Haiku/Flash for setup conversations
- [x] 5. Rate limiting — max 20 messages per session, 3 sessions/day per account
- [x] 6. Deploy path handlers:
  - [x] 6a. "Connect existing" — accept gateway URL, validate connection, link to user
  - [x] 6b. "Cloud Docker" — trigger container creation, model selection, API credit setup
  - [x] 6c. "Download OpenClaw" — generate download links (Win/Mac/Linux), provide install instructions
- [x] 7. Setup completion endpoint — POST `/api/setup/complete` marks user as onboarded, creates agent record
- [x] 8. Setup status middleware — check if user has completed setup, return `setupRequired: true` if not

## Frontend — Setup Chat Component
- [x] 9. `SetupPage.tsx` — full-screen chat component for new users (replaces onboarding wizard)
- [x] 10. Chat UI — message bubbles, typing indicator, auto-scroll
- [x] 11. Quick-reply buttons — clickable options rendered inline (deploy path choices)
- [x] 12. Progress indicator — subtle top bar showing setup progress
- [ ] 13. Agent name/personality input — inline in chat flow (handled by AI prompt)
- [ ] 14. Model picker — rendered as card options in chat (TODO: inline card UI)
- [ ] 15. API key input — secure masked input inline in chat (for BYOK/download path)
- [ ] 16. Download buttons — platform-specific exe/dmg/deb links in chat
- [ ] 17. Connection status indicator — live "checking connection..." with spinner during gateway link

## Frontend — Routing & Gating
- [x] 18. Setup gate in AppLayout — if `user.setupComplete === false`, redirect to `/setup`
- [x] 19. `/setup` route — renders SetupChat full-screen (no sidebar)
- [x] 20. Skip button — small "skip setup" link for power users (goes to manual wizard)
- [x] 21. Auto-open on first login — after signup, route straight to `/setup` (via setupComplete gate)

## Handoff & Transition
- [x] 22. Handoff animation — "Your agent is ready!" celebration with sparkle icon, then spinner transition
- [x] 23. Chat history migration — localStorage cleared on completion, clean slate for dashboard
- [x] 24. Floating chat switches to user's agent — FloatingChat auto-loads agents list, connects to first agent
- [x] 25. Dashboard unlock — setupComplete gate in AppLayout, redirects to /dashboard after handoff

## Polish
- [x] 26. Mobile responsive — responsive padding, font sizes, quick-reply layout (column on mobile)
- [x] 27. Error handling — connection error messages, retry button with RotateCcw icon
- [x] 28. Loading states — bouncing dots indicator while AI responds
- [x] 29. Persist setup progress — localStorage session saves messages + progress, resumes on refresh
- [ ] 30. Analytics events — track setup starts, path chosen, completion rate, drop-off points
