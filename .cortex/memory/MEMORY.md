# MEMORY.md

- nix-develop-c-quoted-command-gotcha.md - nix develop -c 'a && b' execs the quoted string as one binary (exit 127); use unquoted args or -c bash -lc '...'
