# Social Poster

A CLI tool and Node.js library for automating social media posts across multiple platforms using browser automation (Puppeteer). Avoids restrictive API limitations by simulating human interactions and managing browser sessions locally.

## Features

- Post text, links, and media to multiple platforms simultaneously
- Platforms: X (Twitter), LinkedIn, Reddit, Facebook, Hacker News, Stacker News, Primal (Nostr)
- AI-powered content generation via OpenAI
- Session management (cookies/localStorage) to maintain logins
- Dry-run mode for post previews
- Auto-recording system to capture and validate CSS selectors

## Setup

```bash
# Install dependencies
pnpm install

# Configure OpenAI API key
pnpm run setup

# Login to a platform
node bin/social-poster.js login x

# Post content
node bin/social-poster.js post "Hello World" --platforms x,linkedin

# Check status
node bin/social-poster.js status
```

## CLI Commands

- `sp post [text]` — Post content to social media platforms
- `sp login [platform]` — Login to social media platforms
- `sp status` — Show authentication status for all platforms
- `sp platforms` — List available platforms
- `sp setup` — Configure OpenAI API key and other settings
- `sp config` — Show current configuration

## Development

```bash
pnpm test           # Run all tests
pnpm run lint       # Lint source files
pnpm run format     # Format source files
```

## Notes

- Sessions/config stored in `~/.config/social-poster/`
- Requires Node.js >= 20.0.0
- Uses pnpm as package manager
- `form-data` and `basic-ftp` packages use local overrides (Replit package firewall workaround)

## User Preferences
