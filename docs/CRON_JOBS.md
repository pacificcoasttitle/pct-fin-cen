# Cron Jobs — Render Configuration

This document describes the scheduled cron jobs for the FinClear platform. Each job runs on Render's Cron Job service.

---

## 1. Filing Deadline Reminders

| Setting | Value |
|---------|-------|
| **Name** | `check-filing-deadlines` |
| **Schedule** | `0 9 * * *` (daily at 9 AM UTC) |
| **Runtime** | Python 3.11 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python -m app.scripts.check_filing_deadlines` |
| **Region** | Oregon (same as API) |

### What It Does
- Queries all reports with filing deadlines approaching in 7, 3, or 1 day(s).
- Sends reminder emails to the report initiator (escrow officer) or company admin.
- Skips reports already filed or exempt.
- Logs each reminder to `NotificationEvent` to prevent duplicate sends.

### Source
`api/app/scripts/check_filing_deadlines.py`

---

## 2. Nudge Unresponsive Parties

| Setting | Value |
|---------|-------|
| **Name** | `nudge-unresponsive-parties` |
| **Schedule** | `0 9 * * *` (daily at 9 AM UTC) |
| **Runtime** | Python 3.11 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python -m app.scripts.nudge_unresponsive_parties` |
| **Region** | Oregon (same as API) |

### What It Does
- Finds parties with status `pending` or `in_progress` whose link was created over 7 days ago.
- Only nudges parties on reports still in `collecting` status.
- Sends a friendly reminder email with their portal link.
- Logs each nudge to `NotificationEvent` — will not re-nudge the same party.
- Includes company logo branding in the email if available.

### Source
`api/app/scripts/nudge_unresponsive_parties.py`

---

## 3. Poll FinCEN SDTM Responses

| Setting | Value |
|---------|-------|
| **Name** | `poll-fincen-sdtm` |
| **Schedule** | `*/15 9-17 * * 1-5` (every 15 min, Mon–Fri 9 AM – 5 PM UTC) |
| **Runtime** | Python 3.11 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python -m app.scripts.poll_fincen_sdtm` |
| **Region** | Oregon (same as API) |

### What It Does
- Connects to FinCEN's SDTM SFTP server.
- Polls for `MESSAGES.XML` and `ACKED` response files for submitted filings.
- Updates filing status to `accepted` or `rejected` based on FinCEN response.
- Triggers filing status notification emails (accepted/rejected) to stakeholders.

### Environment Variables Required
- `SDTM_HOST`, `SDTM_PORT`, `SDTM_USERNAME`, `SDTM_PASSWORD` — SFTP credentials
- `DATABASE_URL` — PostgreSQL connection string
- `SENDGRID_API_KEY`, `SENDGRID_ENABLED` — for email notifications

### Source
`api/app/scripts/poll_fincen_sdtm.py`

---

## Environment Variables (All Cron Jobs)

All cron jobs share the same environment as the API web service. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SENDGRID_API_KEY` | SendGrid API key for email delivery |
| `SENDGRID_ENABLED` | `true` to enable email sending |
| `SENDGRID_FROM_EMAIL` | Sender email address |
| `FRONTEND_URL` | Base URL for links in emails |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key (for company logos) |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ENDPOINT_URL` | R2 endpoint URL |

---

## Render Dashboard Setup

1. Go to **Render Dashboard** → **New** → **Cron Job**
2. Connect the same repo/branch as the API service
3. Set **Root Directory** to `api`
4. Enter the schedule, build command, and start command from tables above
5. Copy environment variables from the API service (or use an environment group)
6. Deploy

> **Tip:** Use Render's Environment Groups to share env vars between the API service and cron jobs.
