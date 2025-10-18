{
  description = "Zettlr markdown editor";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };
  outputs = inputs @ { flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];
      perSystem = { config, pkgs, ... }: {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            yarn
            python3
            pkg-config
            hunspell
            hunspellDicts.en-us
            electron
          ];
          shellHook = ''
            export ELECTRON_OVERRIDE_DIST_PATH=$(dirname $(which electron))
            echo "Electron override set to $ELECTRON_OVERRIDE_DIST_PATH"
          '';
        };
      };
    };
}
