# Baked image for the coding sandbox: deterministic, network-heavy installs that used
# to run per-create in post-create.sh bake in once and ride the layer cache; runtime
# and volume steps (chowns, plugin installs, direnv trust) stay in post-create.sh.
# Features layer on AFTER this image, so nothing here can depend on one: Bun is baked,
# not a feature, which keeps the omp binary in this layer. Versions float (bun/omp
# fetch latest); pin BUN_VERSION / the omp specifier for reproducible rebuilds.

# Base image hook: override with a CUDA-capable base (e.g. nvidia/cuda:12.6.0-devel-ubuntu24.04)
# via a build arg in devcontainer.json if the project needs the CUDA toolkit. The
# default image runs CUDA against the host driver; --gpus=all brings the driver libs in.
ARG BASE_IMAGE=mcr.microsoft.com/devcontainers/base:ubuntu
FROM ${BASE_IMAGE}

# unzip is required by the Bun install script below.
RUN apt-get update \
 && apt-get install -y --no-install-recommends direnv unzip \
 && rm -rf /var/lib/apt/lists/*

# Base image leaves the passwd entry on bash and the CLI derives SHELL from it, so
# VS Code and herdr would read bash. post-create.sh writes the Ctrl+Backspace
# bindings into .zshrc (mirrored by the NixOS-WSL host), which expect zsh.
# See docs/wsl-setup.md, "Ctrl+Backspace word delete".
RUN usermod -s /usr/bin/zsh vscode

# .DS_Store out of git for every user: the system gitconfig covers root (docker exec /
# OrbStack attach) and every repo from the container's first second. No per-user
# core.excludesFile, it would shadow this one. See docs/devcontainer.md.
RUN printf '.DS_Store\n' >/etc/gitignore_global \
 && git config --system core.excludesFile /etc/gitignore_global

# Bun + omp (the second coding agent), installed as vscode so the omp binary lands in
# /home/vscode/.bun, not shadowed by the ~/.omp volume mounted at runtime. Symlinked
# into /usr/local/bin so every shell, docker exec/OrbStack attach (root) and plugin
# hooks resolve them by absolute path: context-mode writes "/usr/local/bin/bun" into
# its hooks.json, run with a bare /bin/sh that never sees ~/.bun/bin. omp PLUGINS are
# not baked; they live in the ~/.omp volume, installed by post-create.sh.
USER vscode
ENV BUN_INSTALL=/home/vscode/.bun
ENV PATH=${BUN_INSTALL}/bin:${PATH}
RUN curl -fsSL https://bun.sh/install | bash \
 && bun install -g @oh-my-pi/pi-coding-agent \
 && sudo ln -sf "${BUN_INSTALL}/bin/bun" /usr/local/bin/bun \
 && sudo ln -sf "$(bun pm bin -g)/omp" /usr/local/bin/omp
USER root

# Herdr, a tmux-style multiplexer: omp and Claude Code each get a pane, tracking
# blocked/working/done. Runs INSIDE the container and does not provision containers,
# so it composes with the devcontainer (cmux, host-side, did not fit). One static
# binary in /usr/local/bin so every shell and docker exec/OrbStack attach resolves it.
#
# Pinned release, sha256-verified (no curl|sh). To upgrade, bump HERDR_VERSION and
# refresh both digests from the GitHub release assets:
#   curl -fsSL https://api.github.com/repos/herdrdev/herdr/releases/latest \
#     | grep -E '"(tag_name|name|digest)"'
ARG HERDR_VERSION=0.8.0
ARG TARGETARCH
RUN case "${TARGETARCH}" in \
      arm64) asset=herdr-linux-aarch64; sha=f647ac66468d9efbc642fe534fb284468f0aea60641606fc008dfc0d82a3ca87 ;; \
      amd64) asset=herdr-linux-x86_64;  sha=b872ea7e40fa2cb17e857ac9b62b1bf26db7b403c622f5d2f3f5b35f6e9acd28 ;; \
      *) echo "herdr: unsupported TARGETARCH '${TARGETARCH}'" >&2; exit 1 ;; \
    esac \
 && curl -fsSL -o /usr/local/bin/herdr \
      "https://github.com/herdrdev/herdr/releases/download/v${HERDR_VERSION}/${asset}" \
 && echo "${sha}  /usr/local/bin/herdr" | sha256sum -c - \
 && chmod +x /usr/local/bin/herdr \
 && herdr --version
