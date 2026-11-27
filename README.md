# BML Refresher 2026 — live event app

Three views, kept in sync in real time through Supabase:

| View | URL | Who |
|---|---|---|
| Team Leader | `/team` | 5 team leaders on their phones (pick team + PIN) |
| Trainer | `/trainer` | Trainer laptop: runs the agenda, opens/locks activities, reveals answers, awards points |
| Screen | `/screen` | Projector. Press **F** (or double-click) for full screen |

## Running the day
1. Trainer signs in (default PIN `bml2026`), opens **Teams & PINs**, sets team names, leaders and new team PINs.
2. Open `/screen` on the projector. The Welcome scene shows a QR code for leaders to join.
3. Use **Next →** / arrow keys / a presenter clicker to move through scenes. Deck scenes step through slides first.
4. Word clouds: **Open** → teams submit → **Close**. Quizzes: **Start timer** → auto-locks → **Reveal**. Team challenges: **Open** → **Close** → **Reveal** one by one → award +50/+100.
5. After rehearsal, use **Reset → Clear everything**.

Content (questions, scenes, order) lives in `lib/content.ts`.

## Data
Supabase tables `refresher_*` (read-only to clients). All writes go through PIN-checked `SECURITY DEFINER` functions.
Change the trainer PIN with SQL: `update refresher_secrets set pin = '...' where key = 'trainer';`
