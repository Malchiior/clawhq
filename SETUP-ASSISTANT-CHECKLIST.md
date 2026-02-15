# ClawHQ Setup Assistant — Implementation Checklist

## Backend
- [ ] 1. POST `/api/setup/message` — Setup chat endpoint (accepts message, returns AI response)
- [ ] 2. Setup session model — track state per user (step, selections, message count)
- [ ] 3. System prompt for Setup Assistant — scripted flow, 3 deploy paths, redirects off-topic
- [ ] 4. Lightweight model integration — Haiku/Flash for setup conversations
- [ ] 5. Rate limiting — max 20 messages per session, 3 sessions/day per account
- [ ] 6. Deploy path handlers:
  - [ ] 6a. "Connect existing" — accept gateway URL, validate connection, link to user
  - [ ] 6b. "Cloud Docker" — trigger container creation, model selection, API credit setup
  - [ ] 6c. "Download OpenClaw" — generate download links (Win/Mac/Linux), provide install instructions
- [ ] 7. Setup completion endpoint — POST `/api/setup/complete` marks user as onboarded, creates agent record
- [ ] 8. Setup status middleware — check if user has completed setup, return `setupRequired: true` if not

## Frontend — Setup Chat Component
- [ ] 9. `SetupChat.tsx` — full-screen chat component for new users (replaces onboarding wizard)
- [ ] 10. Chat UI — message bubbles, typing indicator, auto-scroll
- [ ] 11. Quick-reply buttons — clickable options rendered inline (deploy path choices, model selection, yes/no)
- [ ] 12. Progress indicator — subtle top bar showing setup progress (step 1/5 etc)
- [ ] 13. Agent name/personality input — inline in chat flow
- [ ] 14. Model picker — rendered as card options in chat
- [ ] 15. API key input — secure masked input inline in chat (for BYOK/download path)
- [ ] 16. Download buttons — platform-specific exe/dmg/deb links in chat
- [ ] 17. Connection status indicator — live "checking connection..." with spinner during gateway link

## Frontend — Routing & Gating
- [ ] 18. Setup gate in AppLayout — if `user.setupComplete === false`, redirect to `/setup`
- [ ] 19. `/setup` route — renders SetupChat full-screen (no sidebar)
- [ ] 20. Skip button — small "skip setup" link for power users (goes to manual wizard)
- [ ] 21. Auto-open on first login — after signup, route straight to `/setup`

## Handoff & Transition
- [ ] 22. Handoff animation — "Your agent is ready!" celebration, then smooth transition
- [ ] 23. Chat history migration — setup messages stay visible briefly, then clear for agent chat
- [ ] 24. Floating chat switches to user's agent — after setup, floating chat connects to new agent
- [ ] 25. Dashboard unlock — sidebar and all pages become accessible after setup complete

## Polish
- [ ] 26. Mobile responsive — setup chat works on phone screens
- [ ] 27. Error handling — network errors, timeout recovery, retry buttons in chat
- [ ] 28. Loading states — skeleton messages while waiting for AI response
- [ ] 29. Persist setup progress — if user refreshes mid-setup, resume where they left off
- [ ] 30. Analytics events — track setup starts, path chosen, completion rate, drop-off points
