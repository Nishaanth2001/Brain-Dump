# Configure Model to Load from Your GitHub

After downloading model files (see DOWNLOAD_MODEL.md), update the code to load from your GitHub repository.

---

## Update llmChatEngine.js

You need to configure Web LLM to use a custom model URL pointing to your GitHub Pages or release assets.

### Current Code (loads from CDN):
```javascript
const engine = await webllm.CreateMLCEngine(
  "Phi-3.5-mini-instruct-q4f16_1-MLC", // Loads from MLC AI CDN
  { initProgressCallback: ... }
);
```

### Updated Code (loads from your GitHub):
```javascript
const engine = await webllm.CreateMLCEngine(
  {
    model: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    model_lib: "https://YOUR-USERNAME.github.io/Brain-Dump/wasm/tvmjs.bundle.js",
    vfs_url: "https://YOUR-USERNAME.github.io/Brain-Dump/models/Phi-3.5-mini-instruct-q4f16_1-MLC/",
    cache_url: "https://YOUR-USERNAME.github.io/Brain-Dump/models/Phi-3.5-mini-instruct-q4f16_1-MLC/"
  },
  { initProgressCallback: ... }
);
```

Replace `YOUR-USERNAME` with your GitHub username.

---

## Full Updated Code

Replace the `initLLMEngine` function in `src/utils/llmChatEngine.js`:

```javascript
export async function initLLMEngine(onProgress = null) {
  if (engineInstance) return engineInstance;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return engineInstance;
  }

  isInitializing = true;
  initError = null;

  try {
    // Configure to load from your GitHub
    const modelConfig = {
      model_id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
      model_lib_url: `${window.location.origin}/Brain-Dump/wasm/tvmjs.bundle.js`,
      vfs_url: `${window.location.origin}/Brain-Dump/models/Phi-3.5-mini-instruct-q4f16_1-MLC/`,
    };

    // Create engine with custom config
    const engine = await webllm.CreateMLCEngine(
      modelConfig,
      {
        initProgressCallback: (progress) => {
          if (onProgress) {
            onProgress({
              progress: progress.progress || 0,
              text: progress.text || "Loading AI model...",
            });
          }
        },
      }
    );

    engineInstance = engine;
    isInitializing = false;
    return engine;
  } catch (error) {
    isInitializing = false;
    initError = error;
    console.error("Failed to initialize LLM:", error);
    throw error;
  }
}
```

---

## Alternative: Use Environment Variable

For easier configuration across environments:

### 1. Create `.env` file:
```bash
VITE_MODEL_BASE_URL=https://yourname.github.io/Brain-Dump
```

### 2. Update code:
```javascript
const MODEL_BASE_URL = import.meta.env.VITE_MODEL_BASE_URL || window.location.origin;

const modelConfig = {
  model_id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
  model_lib_url: `${MODEL_BASE_URL}/wasm/tvmjs.bundle.js`,
  vfs_url: `${MODEL_BASE_URL}/models/Phi-3.5-mini-instruct-q4f16_1-MLC/`,
};
```

---

## Testing Locally

### 1. Start dev server:
```bash
npm run dev
```

### 2. Model files must be in `public/` folder:
```
public/
├── models/Phi-3.5-mini-instruct-q4f16_1-MLC/
└── wasm/
```

Vite serves `public/` at root: `http://localhost:5173/models/...`

---

## Deploy to GitHub Pages

### 1. Update `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  base: "/Brain-Dump/", // Your repo name
});
```

### 2. Build:
```bash
npm run build
```

### 3. Deploy:
```bash
npx gh-pages -d dist
```

### 4. Enable GitHub Pages:
- Go to repo Settings → Pages
- Source: `gh-pages` branch
- Your app will be at: `https://yourname.github.io/Brain-Dump/`

---

## Verify Model Loading

Open browser console and check:

```javascript
// Model should load from your GitHub
// Look for requests to:
// https://yourname.github.io/Brain-Dump/models/...
```

If you see 404 errors, check:
1. Files are in `public/models/` folder
2. `vite.config.js` has correct `base` path
3. GitHub Pages is enabled
4. Model files are committed to repo (or Git LFS)

---

## File Size Warning

⚠️ **Total model size: ~2.7GB**

GitHub repository limits:
- **Recommended:** <1GB per repo
- **Hard limit:** 100MB per file (without Git LFS)

**Solutions:**
1. Use **Git LFS** (Large File Storage) - up to 2GB per file
2. Use **GitHub Releases** - upload as release assets
3. Use **external CDN** - CloudFlare R2, AWS S3, etc.

---

## Recommended Approach

**For production**: Use a CDN or cloud storage (free tier available):

1. **Cloudflare R2** (Free 10GB storage)
2. **Vercel Blob Storage** (Free tier)
3. **AWS S3** (Free tier: 5GB)
4. **GitHub Releases** (Easiest, free)

Then update `MODEL_BASE_URL` to point to your CDN.

---

## Need Help?

If you want me to update the code once you have:
1. Downloaded the model files
2. Decided on hosting method (GitHub Pages / Releases / CDN)
3. Know your final URL

Just tell me the base URL and I'll update `llmChatEngine.js`!
