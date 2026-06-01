# Official vs Open-Source Version Differences

This document tracks the differences between the official Halo app (distributed via asar) and this open-source development version.

---

## 1. Provider Modules

### Synchronized (Available in Both)

| Provider | Files | Official | Local | Status |
|----------|-------|----------|-------|--------|
| tencent | index.js, tencent.provider.js, types.js | ✅ 25KB | ✅ | Synchronized |
| kiro | index.js | ✅ 45KB | ✅ | Synchronized |

### Not Applicable (Enterprise-Only)

| Provider | API Endpoint | Reason | Status |
|----------|--------------|--------|--------|
| webank | `http://10.107.118.2:3004` (internal) | 微众银行 internal AI models (GLM, DeepSeek, Kimi, MiniMax) | Not needed - internal network only |
| qwen | 阿里 DashScope internal API | 阿里通义千问 Code 助手，内部员工专用 | Not needed - internal network only |

### Provider File Locations

**Official asar:**
```
halo-local/dist/providers/
├── webank/index.js         (14,592 bytes)
├── tencent/
│   ├── index.js            (25,445 bytes)
│   ├── tencent.provider.js (14,167 bytes)
│   └── types.js            (396 bytes)
├── qwen/index.js           (28,452 bytes)
└── kiro/index.js          (44,892 bytes)
```

**Local project:**
```
halo-local/dist/providers/
├── tencent/
│   ├── index.js
│   ├── tencent.provider.js
│   └── types.js
└── kiro/
    └── index.js
```

---

## 2. product.json Differences

### Official `product.json` Contains

```json
{
  "authProviders": [...],
  "registryOverrides": {
    "official": {
      "publish": {
        "target": "github-pr",
        "github": {
          "owner": "openkursar",
          "repo": "digital-human-protocol"
        }
      }
    }
  }
}
```

### Local `product.json` Contains

- `authProviders`: ✅ Synchronized (tencent, kiro, claude, github-copilot, custom)
- `registryOverrides`: ⚠️ Missing `publish` configuration

### Missing Schema Definition

The `product.schema.json` does **not** define the `publish` field for `registryOverrides`:

**Schema supports:**
- `url` - Replace registry endpoint
- `name` - Replace display name
- `enabled` - Force enable/disable
- `hidden` - Remove from Store UI

**Missing (enterprise-only):**
- `publish.target` - Publish target type (e.g. "github-pr")
- `publish.github.owner` - GitHub owner
- `publish.github.repo` - GitHub repository

---

## 3. Auto-Update Configuration

| File | Official | Local |
|------|----------|-------|
| `app-update.yml` | ✅ Present | ❌ Missing |

**Official content:**
```yaml
owner: openkursar
repo: hello-halo
provider: github
releaseType: prerelease
updaterCacheDirName: halo-updater
```

---

## 4. Enterprise Features (Not Applicable to Open-Source)

Based on `product.schema.json`, the following features are enterprise/custom build only and not needed for open-source:

| Feature | Schema Description |
|---------|-------------------|
| `telemetry` | Telemetry configuration (enterprise only). Controls which user-identifiable fields may be forwarded to self-hosted telemetry backend. Open-source builds omit this entirely. |
| `security` | Security policy for enterprise builds. Each flag is `<surface>Safe: boolean` - true enables restrictions, omitted/false keeps permissive default. |
| `builtinApps` | Built-in digital humans bundled with the build. Enterprise builds (e.g. `product.webank.json`) declare their own list pointing to a private SSOT repository. |
| `serviceDefaults` | Email/CalDAV/TLS defaults for enterprise builds. |
| `imChannels` | IM channel defaults for enterprise builds. |

---

## 5. Summary

### Already Synchronized
- ✅ tencent provider (3 files)
- ✅ kiro provider (1 file)
- ✅ product.json authProviders configuration
- ✅ All built-in OAuth providers (claude, github-copilot, custom)

### Not Needed for Open-Source
- ❌ webank provider - Internal network only (微众银行)
- ❌ qwen provider - Internal network only (阿里)

### Optional / Future Consideration
- ⚠️ `registryOverrides.publish` - Enterprise Registry publish target (requires schema update + implementation)
- ⚠️ `app-update.yml` - Auto-update configuration (if you want GitHub releases)

---

## 6. How to Sync New Providers from Official App

If you need to extract new providers from the official app.asar:

```javascript
// Using @electron/asar
const { getRawHeader } = require('@electron/asar');
const fs = require('fs');

const asarPath = '/Applications/Halo.app/Contents/Resources/app.asar';
const { header, headerSize } = getRawHeader(asarPath);

function extractFile(filePath, destPath) {
  const parts = filePath.split('/');
  let current = header.files;
  for (const part of parts) {
    if (current[part]) current = current[part];
    else if (current.files?.[part]) current = current.files[part];
    else return false;
  }
  if (current.offset === undefined) return false;

  const fd = fs.openSync(asarPath, 'r');
  const buf = Buffer.alloc(current.size);
  fs.readSync(fd, buf, 0, current.size, headerSize + parseInt(current.offset, 10));
  fs.closeSync(fd);
  fs.writeFileSync(destPath, buf);
  return true;
}

// Example
extractFile(
  'halo-local/dist/providers/tencent/index.js',
  './halo-local/dist/providers/tencent/index.js'
);
```
