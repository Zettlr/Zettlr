#!/usr/bin/env bash
yarn exec claude mcp add --transport stdio --env SCREENSHOT_ENCRYPTION_KEY=$(openssl rand -hex 32) --scope project electron $(asdf which npx) -- -y electron-mcp-server
yarn exec claude mcp add --transport stdio --scope project electron2 $(asdf which npm) -- -C $PWD/../electron-mcp-server run start