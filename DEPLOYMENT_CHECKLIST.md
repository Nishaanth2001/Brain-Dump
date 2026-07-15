# Deployment Checklist - GitHub-Hosted Model

✅ You've cloned the model from HuggingFace  
✅ Code updated to load from your GitHub

---

## Verify Your Folder Structure

Check that your `public/` folder looks like this:

```
public/
├── 404.html
├── favicon.svg
├── icons.svg
└── Phi-3.5-mini-instruct-q4f16_1-MLC/         ← Model folder
    ├── mlc-chat-config.json
    ├── ndarray-cache.json
    ├── params_shard_0.bin                      ← ~1.2GB
    ├── params_shard_1.bin                      ← ~1.2GB (or more shards)
    ├── tokenizer.json
    ├── tokenizer_config.json
    └── Phi-3.5-mini-instruct-q4f16_1-MLC-ctx4k_cs1k-webgpu.wasm
```

**Important Files:**
- `*.bin` files = Model weights (~2.5GB total)
- `*.wasm` file = WebAssembly runtime
- `mlc-chat-config.json` = Model configuration
- `tokenizer.json` = Tokenizer data

---

## Test Locally First

### 1. Start Dev Server:
```bash
npm run dev
```

### 2. Open Browser:
```
http://localhost:5173/Brain-Dump/
```

### 3. Open Chat (🤖 button)
- Should show "Loading AI model from GitHub..."
- Progress bar should show model loading
- Files load from: `http://localhost:5173/Brain-Dump/Phi-3.5-mini-instruct-q4f16_1-MLC/`

### 4. Check Browser Console
Look for:
- ✅ Model loading progress
- ✅ WASM initialization
- ❌ No 404 errors for model files

---

## Commit to GitHub

### Option A: With Git LFS (Recommended for large files)

```bash
# Install Git LFS
git lfs install

# Track model binary files
git lfs track "public/Phi-3.5-mini-instruct-q4f16_1-MLC/*.bin"
git lfs track "public/Phi-3.5-mini-instruct-q4f16_1-MLC/*.wasm"

# Commit .gitattributes
git add .gitattributes

# Commit model files
git add public/Phi-3.5-mini-instruct-q4f16_1-MLC/
git commit -m "Add Phi-3.5 model files via Git LFS"

# Push to GitHub
git push origin main
```

### Option B: Without Git LFS (Will take longer)

```bash
# Commit everything
git add public/Phi-3.5-mini-instruct-q4f16_1-MLC/
git commit -m "Add Phi-3.5 model files"

# Push to GitHub (this will be slow due to 2.5GB files)
git push origin main
```

**Note:** GitHub has a 100MB file size limit. If you get errors, you MUST use Git LFS (Option A).

---

## Deploy to GitHub Pages

### 1. Build Production Version:
```bash
npm run build
```

### 2. Deploy to GitHub Pages:
```bash
npx gh-pages -d dist
```

### 3. Enable GitHub Pages:
- Go to: `https://github.com/YOUR-USERNAME/Brain-Dump/settings/pages`
- Source: Select `gh-pages` branch
- Click Save

### 4. Wait 1-2 Minutes
GitHub Pages will build and deploy your site.

---

## Access Your App

Your app will be live at:
```
https://YOUR-USERNAME.github.io/Brain-Dump/
```

Model files will load from:
```
https://YOUR-USERNAME.github.io/Brain-Dump/Phi-3.5-mini-instruct-q4f16_1-MLC/
```

---

## Troubleshooting

### ❌ "Failed to load model"
- Check browser console for 404 errors
- Verify files exist in `public/` folder
- Check GitHub Pages is enabled
- Wait a few minutes after deployment

### ❌ "File too large" error
- Use Git LFS (see Option A above)
- Or use GitHub Releases instead

### ❌ Model loads but errors
- Check `mlc-chat-config.json` is present
- Check WASM file is present
- Try clearing browser cache

### ❌ Slow loading
- Model is 2.5GB, first load takes 1-2 minutes
- After first load, it's cached in browser (IndexedDB)
- Subsequent loads: <5 seconds

---

## Verify It's Working

1. Open your GitHub Pages URL
2. Click chat button (🤖)
3. Wait for model to load (progress bar)
4. Type: "add a task to buy groceries tomorrow"
5. AI should respond and create the task!

**No keywords, no hardcoding — pure AI understanding!** 🎉

---

## Git LFS Bandwidth Limits

- **Free:** 1GB/month
- **Pro:** 50GB/month

If you exceed limits, users will see slower loading (falls back to regular git).

**Tip:** Once deployed, most users will cache the model, so bandwidth usage will be minimal.

---

## Next Steps

✅ Test locally  
✅ Commit to GitHub  
✅ Deploy to GitHub Pages  
✅ Share your AI-powered task manager!

Need help? Ask me! 🚀
