{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  packages = [
    pkgs.nodejs_24
    pkgs.yarn-berry
    pkgs.postgresql_17
    pkgs.docker-client
  ];

  shellHook = ''
    export YARN_ENABLE_TELEMETRY=0
  '';
}
