nix CLI gotcha: nix develop -c 'cmd && cmd' execs the quoted string as ONE executable (EXIT 127, not found). Use unquoted form (nix develop -c cargo check) or nix develop -c bash -lc '...'.
