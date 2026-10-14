# Kanban

A Kanban board for managing tasks across three stages: **To Do**, **In Progress**, and **Done**. Built with the MEAN stack (MongoDB, Express, Angular 19, Node.js).

## Features

- **User accounts** - sign up with email verification; each user has their own private board
- **Account management** - show/hide passwords, email password reset, change password, and permanently close your account and delete its tasks
- **Add tasks** - click *+ Add task* to create a new card in To Do, then type and hit Save
- **Edit tasks** - click the pencil icon on a card to edit inline, then Save or Cancel
- **Markdown support** - task content is rendered as Markdown (bold, lists, code, headings, and more)
- **Sub-task checklists** - use `- []` (or `- [ ]`) and `- [x]` to add toggleable sub-tasks; click the checkbox on a card to flip its state
- **Drag and drop** - drag cards between columns or reorder within a column
- **Delete tasks** - hover a card and click the X, then confirm
- **Light and dark mode** - toggle in the header; preference is saved across sessions

## Running with Docker

Set up email first using the instructions below, then copy `.env.example` to `.env` and fill in the settings.

```bash
docker compose up --build
```

The app is served at [http://localhost](http://localhost). MongoDB data is persisted in the `mongo_data` Docker volume.

For local testing without an email provider, explicitly select the development console mailbox:

```bash
EMAIL_PROVIDER=console docker compose up --build
```

Verification and reset links appear in `docker compose logs server`. Console email is rejected in production.

## Account email setup (free)

Recommended provider: **[Brevo Free](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans)**, currently $0 with **300 emails per day**, including transactional emails. It is a free plan, not an unlimited service; remain on Free to avoid paying. When its quota is exhausted, email-dependent actions may be unavailable until the quota renews. Provider terms can change.

1. Create a Brevo Free account and enable transactional email if approval is requested.
2. [Configure and verify a sender](https://developers.brevo.com/docs/send-a-transactional-email). Authenticate your existing sending domain with Brevo's DNS records for reliable delivery. Domain registration itself is separate from the free email service.
3. Create a Brevo API key. Set `BREVO_API_KEY`, `EMAIL_FROM` (the verified sender), and optionally `EMAIL_FROM_NAME` on the **server**.
4. Set `APP_URL` to the frontend's public origin: `http://localhost` with Docker, `http://localhost:4200` with Angular development, or your HTTPS origin in production. Email links use this configured origin, never the incoming Host header.
5. Set a random `JWT_SECRET` of at least 32 characters. Do not commit `.env` or API keys.

Docker Compose automatically loads the root `.env`. For standalone Node development, pass the variables to `npm start`; Node does not automatically read the root `.env`.

Check your settings with Python 3.10+ (no packages required):

```bash
python3 verify_env.py                         # Offline format, required-value, and placeholder checks
python3 verify_env.py --production            # Also require HTTPS and production settings
python3 verify_env.py --check-brevo            # Read-only API-key, transactional-email, and sender-activation checks
python3 verify_env.py --production --check-brevo
```

Use `--env path/to/.env` to check another file. The script never prints setting values or API responses, sends no emails, and exits with status 1 when checks fail. It checks the file itself; shell overrides and running-container settings may differ. It accepts single-line unquoted or quoted values, comments, and `export KEY=value`. It flags duplicate keys and interpolation instead of guessing expanded values; single-quote a value containing a literal `$`. Online checks use Brevo's read-only [account API](https://developers.brevo.com/reference/get-account) and [sender API](https://www.postman.com/getbrevo/brevo/request/5io2e4g/get-the-list-of-all-your-senders); test a real signup afterward to confirm delivery and domain authentication.

If Brevo rejects a check, the verifier reports the HTTP status and failing endpoint, and classifies known key/IP errors without exposing the raw response. First confirm `BREVO_API_KEY` contains the complete active **API key**, rather than an SMTP key or the masked suffix shown on the dashboard. Check expiry or generate a replacement under [Settings > SMTP & API > API Keys & MCP](https://help.brevo.com/hc/en-us/articles/209467485-Create-and-manage-your-API-keys). For an IP restriction, review [Settings > Security > Authorized IPs](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security) and approve the trusted public outbound IP seen by Brevo, or use its security notification email. A laptop, VPN, and deployed server can use different outbound addresses; approve the environments you actually use. Re-run `python3 verify_env.py --env .env --check-brevo` after correcting the settings. If you change the key used by Docker, recreate the server with `docker compose up -d --force-recreate server`; a restart alone does not reload Compose's environment values.

If `/v3/account` succeeds but `/v3/senders` returns 403, the key authenticated but sender listing was forbidden; that result alone does not establish whether the application's `/v3/smtp/email` endpoint can send. Review the sender and its verification status in Brevo's dashboard and check for an IP-block notification. For an explicit partial validation, run `python3 verify_env.py --env .env --check-brevo --skip-sender-check`. It checks account authentication and relay status and warns that sender activation remains unverified. It does not change the application's authentication or sending behavior. Finish by testing an actual signup; if sending is also denied, ask Brevo support to investigate the forbidden endpoint and account restrictions.

New registrations receive a verification link valid for 24 hours and cannot sign in before confirming it. Verification and password-reset emails include a clickable action button and a clickable fallback URL, plus a plain-text version. The link opens a confirmation page, so merely fetching it with an email scanner does not activate the account. Verification can be resent from the sign-in page. Existing accounts are preserved and grandfathered as verified on the first startup after this upgrade.

Password reset links expire after 1 hour. Verification and reset tokens are random, stored only as hashes, and consumed once. Sending a new link replaces the previous one. Tokens are read from URL fragments and removed from the address bar; reloading a link page requires reopening the original email. New passwords require at least 8 characters and at most 72 UTF-8 bytes (bcrypt's limit); existing shorter passwords still work for sign-in.

Use **Account** in the desktop navigation or mobile menu to change your password or close your account. Password changes revoke other sessions, and resets revoke all existing sessions. Closing requires the current password, typing `DELETE`, and acknowledging permanent deletion; it deletes only that user's account and tasks from the active database. Historical backups, if any, follow your backup retention policy.

Auth requests are limited to 50 per IP per 15-minute window. Account emails have a 60-second cooldown and a limit of 5 attempts per address per hour. Limits are stored in MongoDB and work across restarts and server instances. Configure `TRUST_PROXY_HOPS` to your actual trusted proxy count (local Node: unset; Docker nginx: 1; the included production setup with an outer nginx proxy: 2). Prevent direct public access to the API when trusting proxy headers.

Production requires `NODE_ENV=production`, an HTTPS `APP_URL`, Brevo credentials, and a sufficiently long JWT secret; the server fails startup if these are missing. The local ignored `docker-compose-prod.yml` has these settings too; transfer those changes separately if your deployment uses that file.

## Local Development

Requires MongoDB running locally on port 27017.

**Server** (from `server/`):
```bash
npm install
EMAIL_PROVIDER=console npm start  # API server on http://localhost:3000; email links in logs
```

**Client** (from `client/`):
```bash
npm install
npm start        # Dev server on http://localhost:4200 (proxies /api to localhost:3000)
```

## Stack

- [MongoDB](https://www.mongodb.com/) - document storage for tasks and users
- [Express.js](https://expressjs.com/) - REST API server
- [Angular 19](https://angular.io/) - frontend framework
- [Node.js](https://nodejs.org/) - server runtime
- [Angular CDK](https://material.angular.io/cdk/drag-drop/overview) - drag and drop
- [marked](https://marked.js.org/) - Markdown parsing
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) - password hashing
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - JWT authentication

## Verification

The account integration tests require a **disposable** MongoDB instance. They create a temporary, randomly named database, use a mocked Brevo API, and never send real emails:

```bash
docker run -d --name kanban-auth-test-mongo -p 127.0.0.1:27018:27017 mongo:7
cd server
npm install
TEST_MONGODB_URI=mongodb://127.0.0.1:27018 npm test
```

Build the frontend with `cd client && npm run build`. Node 22 is recommended (also used by the server Docker image).
