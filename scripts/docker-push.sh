#!/usr/bin/env bash
#
# Fast, safe push of the locally-built app image to Docker Hub (khoa16612/app).
#
# "Fast" here means:
#   - no rebuild: re-tags the image you already built and pushes it
#   - docker push already uploads layers in parallel and skips any layer the
#     registry already has, so repeat pushes only send what actually changed
#   - the optional --turbo flag bumps the daemon's concurrent-upload limit
#
# Safety gate (do not remove): the Dockerfile does `COPY . .`, so a stale build
# could have baked the secret-laden docker-compose.yml / .env into /app. We
# verify the image is secret-free before pushing, because the push IS the leak.
#
# Usage:
#   scripts/docker-push.sh                 # tag shopnex-app:latest -> khoa16612/app:latest, push
#   scripts/docker-push.sh -t v0.2.0       # also push an extra immutable tag
#   scripts/docker-push.sh -s myimage:dev  # push a different source image
#   scripts/docker-push.sh --turbo         # raise max-concurrent-uploads to 10 first
#
set -euo pipefail

SRC="shopnex-app:latest"
REPO="khoa16612/app"
EXTRA_TAG=""
TURBO=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--source) SRC="$2"; shift 2 ;;
    -t|--tag)    EXTRA_TAG="$2"; shift 2 ;;
    -r|--repo)   REPO="$2"; shift 2 ;;
    --turbo)     TURBO=1; shift ;;
    -h|--help)   grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# --- 0. preflight ----------------------------------------------------------
command -v docker >/dev/null || die "docker not found"
docker image inspect "$SRC" >/dev/null 2>&1 || die "source image '$SRC' not found locally (build it first)"

if ! docker info 2>/dev/null | grep -q "Username:"; then
  log "Not logged in to Docker Hub — running 'docker login'"
  docker login
fi

# --- 1. secret-free verification (mandatory) -------------------------------
log "Verifying '$SRC' contains no baked secrets…"
CID="$(docker create "$SRC")"
trap 'docker rm -f "$CID" >/dev/null 2>&1 || true' EXIT
leak=0
for f in /app/docker-compose.yml /app/.env /app/.env.local; do
  if docker cp "$CID:$f" - >/dev/null 2>&1; then
    printf '\033[1;31m  ✗ %s is present in the image\033[0m\n' "$f"
    leak=1
  fi
done
[[ "$leak" -eq 0 ]] || die "image contains secret files — rebuild with a correct .dockerignore before pushing"
docker rm -f "$CID" >/dev/null 2>&1 || true
trap - EXIT
log "Clean — no secret files baked in."

# --- 2. optional upload-concurrency bump -----------------------------------
if [[ "$TURBO" -eq 1 ]]; then
  log "Turbo: raising max-concurrent-uploads to 10 (needs sudo + daemon reload)"
  cfg=/etc/docker/daemon.json
  sudo mkdir -p /etc/docker
  if [[ -f "$cfg" ]] && command -v jq >/dev/null; then
    sudo sh -c "jq '. + {\"max-concurrent-uploads\": 10}' '$cfg' > '$cfg.tmp' && mv '$cfg.tmp' '$cfg'"
  else
    echo '{ "max-concurrent-uploads": 10 }' | sudo tee "$cfg" >/dev/null
  fi
  sudo systemctl reload docker || sudo systemctl restart docker
fi

# --- 3. tag + push ---------------------------------------------------------
TAGS=("$REPO:latest")
[[ -n "$EXTRA_TAG" ]] && TAGS+=("$REPO:$EXTRA_TAG")

for t in "${TAGS[@]}"; do
  log "Tagging $SRC -> $t"
  docker tag "$SRC" "$t"
done

start=$(date +%s)
for t in "${TAGS[@]}"; do
  log "Pushing $t"
  docker push "$t"
done
log "Done in $(( $(date +%s) - start ))s."
