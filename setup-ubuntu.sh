#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Avci (Rzilient) — one-shot Ubuntu server setup
#
#  What it does:
#    1. Installs Node.js 22 + PostgreSQL (if missing)
#    2. Creates the database user + database
#    3. Creates .env from .env.example (keeps an existing .env untouched)
#    4. npm ci, prisma generate, migrations, seed (login accounts)
#    5. Builds the app and starts it under PM2 (auto-restarts on crash/reboot)
#    6. Opens the firewall for SSH + port 3000
#
#  Run it from inside the cloned project folder:
#      bash setup-ubuntu.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_NAME="avci"
APP_PORT="3000"
PG_USER="avci"
PG_DB="avci"

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
info()  { printf '  → %s\n' "$*"; }
ok()    { printf '  ✓ %s\n' "$*"; }
die()   { printf '  ✗ %s\n' "$*" >&2; exit 1; }

SUDO=""
if [[ $EUID -ne 0 ]]; then
  command -v sudo >/dev/null 2>&1 || die "This script needs sudo. Run it as a user with sudo rights."
  SUDO="sudo"
fi

# ── 0. Locate the project folder ────────────────────────────────────────────
if [[ ! -f package.json || ! -f prisma/schema.prisma ]]; then
  bold "This doesn't look like the project folder."
  read -rp "Path to your clone (e.g. /home/you/Rzilient): " REPO_DIR
  [[ -f "$REPO_DIR/package.json" ]] || die "No package.json in $REPO_DIR"
  cd "$REPO_DIR"
fi
REPO_DIR="$(pwd)"
bold "Project folder: $REPO_DIR"

# ── 1. System packages + Node.js 22 ─────────────────────────────────────────
bold "1/6  Installing system packages"
export DEBIAN_FRONTEND=noninteractive

NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
  if [[ "$NODE_MAJOR" -ge 20 ]]; then NEED_NODE=0; fi
fi

$SUDO apt-get update -qq
$SUDO apt-get install -y -qq curl ca-certificates gnupg ufw postgresql postgresql-contrib >/dev/null
ok "PostgreSQL + base packages installed"

if [[ "$NEED_NODE" -eq 1 ]]; then
  info "Installing Node.js 22 (Nodesource)…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash - >/dev/null 2>&1
  $SUDO apt-get install -y -qq nodejs >/dev/null
fi
ok "Node.js $(node -v), npm $(npm -v)"

# ── 2. Database ─────────────────────────────────────────────────────────────
bold "2/6  Creating PostgreSQL role + database"
read -rsp "Database password for user '${PG_USER}' (leave empty to generate one): " PG_PASSWORD; echo
if [[ -z "$PG_PASSWORD" ]]; then
  PG_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
  info "Generated database password."
fi

$SUDO -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${PG_USER}') THEN
    CREATE ROLE ${PG_USER} LOGIN PASSWORD '${PG_PASSWORD}';
  END IF;
END
\$\$;
SQL
$SUDO -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${PG_DB}'" | grep -q 1 \
  || $SUDO -u postgres createdb -O "$PG_USER" "$PG_DB"
ok "Database '${PG_DB}' ready"

# ── 3. .env ─────────────────────────────────────────────────────────────────
bold "3/6  Configuring .env"
if [[ -f .env ]]; then
  ok ".env already exists — keeping it as is"
  if ! grep -q "^SEED_ADMIN_PASSWORD=" .env; then
    read -rsp "Password for the admin login (admin@fia.sl): " ADMIN_PASSWORD; echo
    echo "SEED_ADMIN_PASSWORD=\"${ADMIN_PASSWORD}\"" >> .env
    ok "SEED_ADMIN_PASSWORD appended"
  fi
else
  read -rsp "Password for the admin login (admin@fia.sl): " ADMIN_PASSWORD; echo
  DEFAULT_URL="http://$(hostname -I | awk '{print $1}'):${APP_PORT}"
  read -rp "Address people will open [${DEFAULT_URL}]: " APP_URL
  APP_URL="${APP_URL:-$DEFAULT_URL}"

  AUTH_SECRET="$(openssl rand -base64 48)"
  cp .env.example .env
  cat >> .env <<EOF

# Values written by setup-ubuntu.sh
DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@localhost:5432/${PG_DB}?schema=public"
AUTH_SECRET="${AUTH_SECRET}"
NEXT_PUBLIC_APP_URL="${APP_URL}"
APP_TIMEZONE="Africa/Freetown"
SEED_ADMIN_PASSWORD="${ADMIN_PASSWORD}"
EOF
  ok ".env created (AUTH_SECRET generated)"
fi

# ── 4. Dependencies, Prisma client, migrations, seed ────────────────────────
bold "4/6  Installing dependencies + database schema"
info "npm ci (this can take a few minutes)…"
npm ci --no-audit --no-fund
ok "Dependencies installed"

npx prisma generate >/dev/null
ok "Prisma client generated"

npm run db:deploy
ok "Migrations applied"

npm run db:seed
ok "Seed complete — logins: admin@fia.sl, itstaff@fia.sl, viewer@fia.sl"

# ── 5. Build + PM2 ──────────────────────────────────────────────────────────
bold "5/6  Building the app"
npm run build
ok "Build complete"

if ! command -v pm2 >/dev/null 2>&1; then
  info "Installing PM2…"
  $SUDO npm i -g pm2 >/dev/null
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  cd "$REPO_DIR"
  pm2 start npm --name "$APP_NAME" -- start
fi
pm2 save >/dev/null

STARTUP_CMD="$(pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null | grep '^sudo' || true)"
if [[ -n "$STARTUP_CMD" ]]; then
  eval "$STARTUP_CMD" >/dev/null
  ok "PM2 will restart the app on reboot"
fi
ok "App is running under PM2 (logs: pm2 logs $APP_NAME)"

# ── 6. Firewall ─────────────────────────────────────────────────────────────
bold "6/6  Firewall"
$SUDO ufw allow OpenSSH >/dev/null 2>&1 || true
$SUDO ufw allow "$APP_PORT"/tcp >/dev/null 2>&1 || true
$SUDO ufw --force enable >/dev/null 2>&1 || true
ok "SSH + port $APP_PORT allowed"

# ── Done ────────────────────────────────────────────────────────────────────
APP_URL="$(grep '^NEXT_PUBLIC_APP_URL=' .env | cut -d= -f2- | tr -d '"')"
bold "────────────────────────────────────────"
bold "  Setup complete!"
bold "────────────────────────────────────────"
echo "  Open:            ${APP_URL}"
echo "  Log in:          admin@fia.sl   (the password you typed above)"
echo "                   itstaff@fia.sl / viewer@fia.sl — same password"
echo
echo "  Useful commands:"
echo "    pm2 logs $APP_NAME        follow logs"
echo "    pm2 restart $APP_NAME     restart after updates"
echo "    pm2 status                check it's online"
echo
echo "  To update later:"
echo "    git pull && npm ci && npx prisma generate && npm run db:deploy && npm run build && pm2 restart $APP_NAME"
