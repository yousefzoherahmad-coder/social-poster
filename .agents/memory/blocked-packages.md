---
name: Blocked packages workaround
description: form-data and basic-ftp are blocked by Replit package firewall; must be downloaded to /tmp manually
---

Replit blocks direct npm install of `form-data` and `basic-ftp`. The workaround uses pnpm overrides pointing to /tmp local copies.

**Why:** These packages are transitive deps of puppeteer/social-poster internals. Without them pnpm install fails entirely.

**How to apply:** Run this before any `pnpm install` in a fresh environment (e.g. after restart):

```bash
curl -sL "https://registry.npmjs.org/form-data/-/form-data-4.0.3.tgz" -o /tmp/form-data-4.0.3.tgz \
  && mkdir -p /tmp/local-form-data \
  && tar -xzf /tmp/form-data-4.0.3.tgz -C /tmp/local-form-data --strip-components=1

curl -sL "https://registry.npmjs.org/basic-ftp/-/basic-ftp-5.0.5.tgz" -o /tmp/basic-ftp-5.0.5.tgz \
  && mkdir -p /tmp/local-basic-ftp/package \
  && tar -xzf /tmp/basic-ftp-5.0.5.tgz -C /tmp/local-basic-ftp/package --strip-components=1
```

The `package.json` pnpm.overrides section already points to these paths:
```json
"pnpm": {
  "overrides": {
    "form-data": "file:/tmp/local-form-data",
    "basic-ftp": "file:/tmp/local-basic-ftp/package"
  }
}
```

/tmp is ephemeral — must redo this on every container restart.
