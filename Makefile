.PHONY: help deps clean build

GIT_CMD := git
NODE_BIN := node
SHASUM_BIN := shasum
YARN_BIN := yarn

GET_PKG_VERSION_CMD := $(NODE_BIN) ./scripts/get-pkg-version.js
SHASUM_CMD := $(SHASUM_BIN) -a 256
YARN_BUILD_CMD := $(YARN_BIN) --frozen-lockfile --non-interactive

SHASUM_FILE := SHA256SUMS.txt

NO_SIGNING :=
PKG_VERSION :=

help: ## Show help information
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

	@echo ""
	@echo "This Makefile also supports variables which modify its behavior, which are set via \`make VAR=VALUE <target>\`:"
	@echo ""
	@echo "    NO_SIGNING    If set to any value, disables code signing when building a release artifact (currently only supports macOS)"
	@echo "                  Example: make NO_SIGNING=1 release-mac"
	@echo ""

deps:
	@if [ -z "$$(command -v $(NODE_BIN))" ]; then  \
		echo "$(NODE_BIN) is required to build Zettlr. Please install it."; \
		exit 1; \
	fi; \
	if [ -z "$$(command -v $(YARN_BIN))" ]; then  \
		echo "$(YARN_BIN) is required to build Zettlr. Please install it."; \
		exit 1; \
	fi

clean: ## Removes generated/downloaded assets.  If Git is installed, additionally performs a `git clean`.
	rm -rf node_modules || true
	rm -rf release || true
	if [ -n "$$(command -v $(GIT_CMD))" ]; then \
	  	$(GIT_CMD) clean -fxd; \
	fi

###########
### BUILD
###########

build: setup stylesheets templates reveal webpack lang ## Build Zettlr components

setup: ## Install dependencies
	$(YARN_BUILD_CMD) --ignore-scripts

stylesheets: ## Rebuild stylesheets (using Less)
	$(YARN_BUILD_CMD) less

templates: ## Rebuild templates (using Handlebars)
	$(YARN_BUILD_CMD) handlebars

reveal: ## Rebuild revealJS components
	$(YARN_BUILD_CMD) reveal:build

webpack: ## Rebuild production-ready components (including Vue.js components)
	$(YARN_BUILD_CMD) wp:prod

lang: ## Fetch most recent translations
	$(YARN_BUILD_CMD) lang:refresh

###########
### RELEASE
###########

release-all: build pre-release release-win release-mac release-linux ## Build releases for every supported OS
	cd ./release && \
	$(SHASUM_CMD) -c $(SHASUM_FILE)

pre-release:
	# Truncate the checksum file
	cd ./release && echo '' > $(SHASUM_FILE)

release-win:  ## Build a Windows release using the NSIS EXE installer
	# TODO: disable code signing for Windows when NO_SIGNING is set
	export PKGVER=$$( $(GET_PKG_VERSION_CMD) ) && \
	$(YARN_BUILD_CMD) release:win && \
	cd ./release && \
	$(SHASUM_CMD) Zettlr-$$PKGVER.exe >> $(SHASUM_FILE)

release-mac:  ## Build a macOS release as a DMG installer
	# Disable code signing if NO_SIGNING is set to any value
	$(eval PRE_CMD := $(if $(NO_SIGNING), CSC_IDENTITY_AUTO_DISCOVERY=false, ))

	export PKGVER=$$( $(GET_PKG_VERSION_CMD) ) && \
	$(PRE_CMD) $(YARN_BUILD_CMD) release:mac && \
	cd ./release && \
	$(SHASUM_CMD) Zettlr-$$PKGVER.dmg >> $(SHASUM_FILE)

release-linux:  ## Build a Linux release as a .deb & .rpm
	export PKGVER=$$( $(GET_PKG_VERSION_CMD) ) && \
	$(YARN_BUILD_CMD) release:linux && \
	cd ./release && \
	$(SHASUM_CMD) Zettlr-$$PKGVER-amd64.deb >> $(SHASUM_FILE) && \
	$(SHASUM_CMD) Zettlr-$$PKGVER-x86_64.rpm >> $(SHASUM_FILE)
