#!/usr/bin/env bash
# =============================================================================
# dev.sh  —  InstantSearch for WP local development entry point
# =============================================================================
# Usage:
#   ./dev.sh up         Start everything (Docker + WordPress + demo content)
#   ./dev.sh down       Stop all containers
#   ./dev.sh test       Run Playwright E2E tests
#   ./dev.sh phpunit    Run PHPUnit tests inside Docker
#   ./dev.sh screenshot Capture key plugin state screenshots → docs/media/
#   ./dev.sh gif        Record interaction GIFs → docs/media/
#   ./dev.sh reset      Wipe volumes and reimport fresh content
#   ./dev.sh logs       Tail WordPress + MySQL logs
#   ./dev.sh wpcli ...  Run any WP-CLI command (e.g. ./dev.sh wpcli post list)
#   ./dev.sh shell      Open a bash shell inside the WordPress container
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DC_FILE="$REPO_ROOT/dev/docker-compose.yml"
DC=(docker-compose -f "$DC_FILE")
E2E_DIR="$REPO_ROOT/tests/e2e"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[dev.sh]${NC} $*"; }
success() { echo -e "${GREEN}[dev.sh]${NC} $*"; }
warn()    { echo -e "${YELLOW}[dev.sh]${NC} $*"; }
error()   { echo -e "${RED}[dev.sh] ERROR:${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ── Load .env ─────────────────────────────────────────────────────────────────
load_env() {
  if [ -f "$REPO_ROOT/.env" ]; then
    set -a; source "$REPO_ROOT/.env"; set +a
  else
    warn ".env not found — using defaults. Copy .env.example to .env to customise."
  fi
}

# ── Check dependencies ────────────────────────────────────────────────────────
check_deps() {
  local missing=()

  command -v docker   &>/dev/null || missing+=("docker")
  command -v node     &>/dev/null || missing+=("node")
  command -v npm      &>/dev/null || missing+=("npm")

  # Prefer 'docker compose' (v2 plugin) over 'docker-compose' (v1 standalone)
  if docker compose version &>/dev/null 2>&1; then
    DC=(docker compose -f "$DC_FILE")
  elif command -v docker-compose &>/dev/null; then
    DC=(docker-compose -f "$DC_FILE")
  else
    missing+=("docker-compose (or Docker Compose v2 plugin)")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    error "Missing required tools:"
    for t in "${missing[@]}"; do
      echo -e "  ${RED}✗${NC} $t"
    done
    die "Please install the above tools and try again."
  fi
}

# ── /etc/hosts entry ──────────────────────────────────────────────────────────
ensure_hosts_entry() {
  local domain="instantsearch-dev.local"
  if grep -q "$domain" /etc/hosts 2>/dev/null; then
    return 0
  fi
  warn "Adding '$domain' to /etc/hosts (requires sudo password)..."
  echo "127.0.0.1 $domain" | sudo tee -a /etc/hosts > /dev/null \
    && success "Added: 127.0.0.1 $domain to /etc/hosts" \
    || warn "Could not update /etc/hosts. Access the site at http://localhost:8080 instead."
}

# ── Wait for a service to be healthy ─────────────────────────────────────────
wait_healthy() {
  local service="$1"
  local label="${2:-$service}"
  local retries=60

  info "Waiting for $label to be healthy..."
  until "${DC[@]}" ps "$service" 2>/dev/null | grep -E "(healthy|running)" &>/dev/null; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && die "$label did not become healthy in time. Run './dev.sh logs' to diagnose."
    sleep 2
  done
  success "$label is ready."
}

# ── Print banner ──────────────────────────────────────────────────────────────
banner() {
  echo ""
  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║        InstantSearch for WP — Dev Environment        ║${NC}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# =============================================================================
# Commands
# =============================================================================

cmd_up() {
  banner
  load_env
  check_deps
  ensure_hosts_entry

  info "Starting Docker services..."
  "${DC[@]}" up -d --remove-orphans

  # Wait for critical services
  wait_healthy db        "MySQL"
  wait_healthy wordpress "WordPress"

  # Run WordPress setup (install core, import content, configure plugin)
  info "Running WordPress setup..."
  SKIP_HOSTS=true bash "$REPO_ROOT/dev/setup.sh"
}

cmd_down() {
  load_env
  check_deps
  info "Stopping Docker services..."
  "${DC[@]}" down
  success "All services stopped."
}

cmd_test() {
  load_env
  check_deps
  ensure_hosts_entry

  # If docker services are not running, start them first.
  if ! "${DC[@]}" ps wordpress 2>/dev/null | grep -E "(healthy|running)" &>/dev/null; then
    info "Docker services are not running. Booting test environment..."
    cmd_up
  fi

  # Fall back to localhost when the custom dev hostname does not resolve.
  if ! curl -sSfI "${WP_SITE_URL:-http://instantsearch-dev.local:8080}" >/dev/null 2>&1; then
    warn "Configured WP_SITE_URL is not reachable; falling back to http://localhost:8080 for tests."
    export WP_SITE_URL="http://localhost:8080"
  fi

  info "Syncing WordPress URL settings for test run..."
  "${DC[@]}" run --rm wpcli option update home "$WP_SITE_URL" >/dev/null 2>&1 || true
  "${DC[@]}" run --rm wpcli option update siteurl "$WP_SITE_URL" >/dev/null 2>&1 || true

  info "Applying e2e plugin settings..."

  local e2e_algolia_app_id="${ALGOLIA_APP_ID:-demo-app}"
  local e2e_algolia_search_key="${ALGOLIA_SEARCH_ONLY_API_KEY:-demo-key}"
  local e2e_algolia_admin_key="${ALGOLIA_ADMIN_API_KEY:-demo-admin-key}"

  "${DC[@]}" run --rm wpcli option update instantsearch_for_wp_settings \
    "{\"provider\":\"algolia\",\"algolia\":{\"app_id\":\"${e2e_algolia_app_id}\",\"search_only_api_key\":\"${e2e_algolia_search_key}\",\"admin_api_key\":\"${e2e_algolia_admin_key}\"},\"use_as_sitesearch\":true,\"sitesearch_settings\":{\"placeholder_text\":\"Search...\",\"sidebar_position\":\"left\",\"snippet_length\":50,\"css_selector_triggers\":\".isfwp-search-trigger\",\"debounce_delay\":0}}" \
    --format=json >/dev/null 2>&1 || true

  info "Setting up Playwright..."
  cd "$REPO_ROOT"

  # Use root-level tooling so tests do not require optional gif dependencies (canvas).
  if [ ! -d "node_modules/@playwright/test" ] || [ ! -d "node_modules/dotenv" ]; then
    npm install --no-save @playwright/test dotenv
  fi

  # Install browser binaries
  npx playwright install chromium 2>/dev/null || true

  # Create test-results dir
  mkdir -p "$E2E_DIR/test-results"

  info "Running E2E tests..."
  npx playwright test --config "$E2E_DIR/playwright.config.js" "$@"
  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
    success "All tests passed."
  else
    warn "Some tests failed. Run 'cd tests/e2e && npm run test:report' to view details."
  fi
  return $exit_code
}

cmd_phpunit() {
  load_env
  check_deps

  # If docker services are not running, start them first.
  if ! "${DC[@]}" ps wordpress 2>/dev/null | grep -E "(healthy|running)" &>/dev/null; then
    info "Docker services are not running. Booting test environment..."
    cmd_up
  fi

  info "Preparing PHPUnit runner inside Docker..."
  "${DC[@]}" run --rm --entrypoint bash wpcli -lc '
    set -euo pipefail
    cd /var/www/html/wp-content/plugins/instantsearch-for-wp
    export COMPOSER_HOME="$(pwd)/.dev-tools/.composer"

    mkdir -p .dev-tools

    if [ ! -f .dev-tools/phpunit.phar ]; then
      curl -fsSL https://phar.phpunit.de/phpunit-9.phar -o .dev-tools/phpunit.phar
      chmod +x .dev-tools/phpunit.phar
    fi

    if [ ! -f .dev-tools/polyfills/vendor/autoload.php ]; then
      mkdir -p .dev-tools/polyfills
      mkdir -p "$COMPOSER_HOME"
      curl -fsSL https://getcomposer.org/installer -o /tmp/composer-setup.php
      php /tmp/composer-setup.php --install-dir=/tmp --filename=composer
      /tmp/composer --working-dir=.dev-tools/polyfills init --name=isfwp/polyfills --require=yoast/phpunit-polyfills:^2.0 --no-interaction
      /tmp/composer --working-dir=.dev-tools/polyfills install --no-interaction --prefer-dist
    fi

    if [ ! -f .dev-tools/wordpress-tests-lib/includes/functions.php ]; then
      mkdir -p .dev-tools/wordpress-tests-lib
      curl -fsSL https://github.com/WordPress/wordpress-develop/archive/refs/heads/trunk.tar.gz -o /tmp/wordpress-develop.tar.gz
      rm -rf /tmp/wordpress-develop
      mkdir -p /tmp/wordpress-develop
      tar -xzf /tmp/wordpress-develop.tar.gz -C /tmp/wordpress-develop --strip-components=1

      cp -R /tmp/wordpress-develop/tests/phpunit/includes .dev-tools/wordpress-tests-lib/
      cp -R /tmp/wordpress-develop/tests/phpunit/data .dev-tools/wordpress-tests-lib/
      cp /tmp/wordpress-develop/wp-tests-config-sample.php .dev-tools/wordpress-tests-lib/wp-tests-config.php

      sed -i "s:dirname( __FILE__ ) . '/src/':'/var/www/html/':" .dev-tools/wordpress-tests-lib/wp-tests-config.php
      sed -i "s:__DIR__ . '/src/':'/var/www/html/':" .dev-tools/wordpress-tests-lib/wp-tests-config.php
      sed -i "s/youremptytestdbnamehere/wordpress/" .dev-tools/wordpress-tests-lib/wp-tests-config.php
      sed -i "s/yourusernamehere/root/" .dev-tools/wordpress-tests-lib/wp-tests-config.php
      sed -i "s/yourpasswordhere/rootpassword/" .dev-tools/wordpress-tests-lib/wp-tests-config.php
      sed -i "s|localhost|db|" .dev-tools/wordpress-tests-lib/wp-tests-config.php
    fi

    printf "%s\n" \
      "<?php" \
      "define( \"ABSPATH\", \"/var/www/html/\" );" \
      "define( \"DB_NAME\", \"wordpress\" );" \
      "define( \"DB_USER\", \"root\" );" \
      "define( \"DB_PASSWORD\", \"rootpassword\" );" \
      "define( \"DB_HOST\", \"db\" );" \
      "define( \"DB_CHARSET\", \"utf8\" );" \
      "define( \"DB_COLLATE\", \"\" );" \
      "\$table_prefix = \"wptests_\";" \
      "define( \"WP_TESTS_DOMAIN\", \"example.org\" );" \
      "define( \"WP_TESTS_EMAIL\", \"admin@example.org\" );" \
      "define( \"WP_TESTS_TITLE\", \"Test Blog\" );" \
      "define( \"WP_PHP_BINARY\", \"php\" );" \
      > .dev-tools/wp-tests-config.php
  '

  info "Running PHPUnit tests in Docker..."
  "${DC[@]}" run --rm --entrypoint bash wpcli -lc "
    set -euo pipefail
    cd /var/www/html/wp-content/plugins/instantsearch-for-wp
    export WP_TESTS_DIR=\"\$(pwd)/.dev-tools/wordpress-tests-lib\"
    export WP_TESTS_PHPUNIT_POLYFILLS_PATH=\"\$(pwd)/.dev-tools/polyfills/vendor/yoast/phpunit-polyfills\"
    export WP_TESTS_CONFIG_FILE_PATH=\"\$(pwd)/.dev-tools/wp-tests-config.php\"
    php .dev-tools/phpunit.phar --configuration phpunit.xml.dist $*
  "

  success "PHPUnit run complete."
}

cmd_screenshot() {
  load_env
  check_deps

  info "Installing E2E dependencies..."
  cd "$E2E_DIR"
  [ ! -d "node_modules" ] && npm install
  npx playwright install chromium 2>/dev/null || true

  info "Capturing screenshots → docs/media/"
  node helpers/screenshots.js

  cd "$REPO_ROOT"
  success "Screenshots saved to docs/media/"
}

cmd_gif() {
  load_env
  check_deps

  info "Installing E2E dependencies..."
  cd "$E2E_DIR"
  [ ! -d "node_modules" ] && npm install
  npx playwright install chromium 2>/dev/null || true

  info "Recording interaction GIFs → docs/media/"
  node helpers/gif-recorder.js

  cd "$REPO_ROOT"
  success "GIFs saved to docs/media/"
}

cmd_reset() {
  load_env
  check_deps

  warn "This will WIPE all Docker volumes (database, WordPress files) and reimport content."
  read -r -p "Are you sure? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    info "Reset cancelled."
    return 0
  fi

  info "Stopping containers and removing volumes..."
  "${DC[@]}" down -v

  info "Restarting fresh..."
  cmd_up
}

cmd_logs() {
  load_env
  check_deps
  info "Tailing WordPress and MySQL logs (Ctrl+C to stop)..."
  "${DC[@]}" logs -f wordpress db
}

cmd_wpcli() {
  load_env
  check_deps
  "${DC[@]}" run --rm wpcli "$@"
}

cmd_shell() {
  load_env
  check_deps
  info "Opening bash shell in WordPress container..."
  "${DC[@]}" exec wordpress bash
}

cmd_build() {
  info "Building plugin JS/CSS assets..."
  cd "$REPO_ROOT"
  npm run build
  success "Build complete. Hard-refresh your browser to see changes."
}

cmd_status() {
  load_env
  check_deps
  echo ""
  echo -e "${BOLD}Service Status:${NC}"
  "${DC[@]}" ps 2>/dev/null || true
  echo ""
  echo -e "${BOLD}URLs:${NC}"
  echo -e "  Site:   ${CYAN}http://instantsearch-dev.local:8080${NC}"
  echo -e "  Admin:  ${CYAN}http://instantsearch-dev.local:8080/wp-admin${NC}"
  echo -e "  Search: ${CYAN}http://instantsearch-dev.local:8080/search${NC}"
  echo -e "  Typesense: ${CYAN}http://localhost:8108/health${NC}"
  echo ""
}

cmd_help() {
  banner
  echo -e "${BOLD}Usage:${NC}  ./dev.sh <command> [args]"
  echo ""
  echo -e "${BOLD}Commands:${NC}"
  echo -e "  ${GREEN}up${NC}           Start everything (Docker + WordPress + demo content)"
  echo -e "  ${GREEN}down${NC}         Stop all containers"
  echo -e "  ${GREEN}test${NC}         Run Playwright E2E tests"
  echo -e "  ${GREEN}phpunit${NC}      Run PHPUnit tests inside Docker"
  echo -e "  ${GREEN}screenshot${NC}   Capture key plugin state screenshots → docs/media/"
  echo -e "  ${GREEN}gif${NC}          Record interaction GIFs → docs/media/"
  echo -e "  ${GREEN}reset${NC}        Wipe volumes and reimport fresh demo content"
  echo -e "  ${GREEN}logs${NC}         Tail WordPress + MySQL logs"
  echo -e "  ${GREEN}build${NC}        Build plugin JS/CSS assets (npm run build)"
  echo -e "  ${GREEN}status${NC}       Show running services and URLs"
  echo -e "  ${GREEN}wpcli${NC} ...    Run any WP-CLI command"
  echo -e "             ${CYAN}Example: ./dev.sh wpcli post list${NC}"
  echo -e "  ${GREEN}shell${NC}        Open bash shell inside WordPress container"
  echo -e "  ${GREEN}help${NC}         Show this help message"
  echo ""
  echo -e "${BOLD}Examples:${NC}"
  echo -e "  ./dev.sh up"
  echo -e "  ./dev.sh test"
  echo -e "  ./dev.sh phpunit --filter PostExclusionAttachmentTest"
  echo -e "  ./dev.sh screenshot && ./dev.sh gif"
  echo -e "  ./dev.sh wpcli option get instantsearch_for_wp_settings"
  echo -e "  ./dev.sh reset"
  echo ""
  echo -e "See ${CYAN}docs/AI_AGENT_GUIDE.md${NC} for full documentation."
  echo ""
}

# =============================================================================
# Main dispatcher
# =============================================================================

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  up)         cmd_up "$@" ;;
  down)       cmd_down "$@" ;;
  test)       cmd_test "$@" ;;
  phpunit)    cmd_phpunit "$@" ;;
  screenshot) cmd_screenshot "$@" ;;
  gif)        cmd_gif "$@" ;;
  reset)      cmd_reset "$@" ;;
  logs)       cmd_logs "$@" ;;
  build)      cmd_build "$@" ;;
  status)     cmd_status "$@" ;;
  wpcli)      cmd_wpcli "$@" ;;
  shell)      cmd_shell "$@" ;;
  help|--help|-h) cmd_help ;;
  *)
    error "Unknown command: '$COMMAND'"
    echo ""
    cmd_help
    exit 1
    ;;
esac
