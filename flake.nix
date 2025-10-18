{
  description = "Zettlr markdown editor";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };
  outputs = inputs @ { nixpkgs, ... }: 
  let  
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
  in {
    devShells.${system}.default = pkgs.mkShell {
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
}
