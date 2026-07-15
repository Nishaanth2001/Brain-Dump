# Download Model for GitHub Hosting

## Option 1: Download Pre-built Model (Recommended)

### Using Git LFS (if available):
```bash
# Install Git LFS first
git lfs install

# Clone the model repository
cd public
git clone https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC

# This will download ~2.5GB of model files
```

### Using wget/curl (Manual Download):
```bash
cd public
mkdir -p Phi-3.5-mini-instruct-q4f16_1-MLC

# Download model files from HuggingFace
wget https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC/resolve/main/ndarray-cache.json
wget https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC/resolve/main/params_shard_0.bin
wget https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC/resolve/main/params_shard_1.bin
wget https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC/resolve/main/mlc-chat-config.json
wget https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC/resolve/main/tokenizer.json
wget https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC/resolve/main/tokenizer_config.json

# Also download the WASM runtime
cd ../
mkdir -p wasm
wget https://raw.githubusercontent.com/mlc-ai/web-llm/main/examples/get-started/public/tvmjs_runtime.wasm -O wasm/tvmjs_runtime.wasm
wget https://raw.githubusercontent.com/mlc-ai/web-llm/main/examples/get-started/public/tvmjs.bundle.js -O wasm/tvmjs.bundle.js
```

---

## Option 2: Use GitHub Releases (For Large Files)

GitHub has a 100MB file limit. Model files are larger, so use **GitHub Releases**:

### Steps:
1. Download model files to your local machine (see wget commands above)
2. Create a GitHub Release in your repo
3. Upload model files as release assets
4. Update code to download from release URLs

---

## Option 3: Use Git LFS (GitHub Large File Storage)

GitHub LFS allows files up to 2GB per file:

### Setup:
```bash
# Install Git LFS
git lfs install

# Track model files
git lfs track "public/Phi-3.5-mini-instruct-q4f16_1-MLC/*.bin"
git lfs track "public/wasm/*.wasm"

# Add .gitattributes
git add .gitattributes

# Commit model files
git add public/
git commit -m "Add Phi-3.5 model files"
git push
```

**Note:** Git LFS has bandwidth limits:
- Free: 1GB/month
- Pro: 50GB/month

---

## Option 4: Self-Host Model Files (Easiest)

Use **GitHub Pages** to serve model files:

### Steps:
1. Download model files to `public/models/` folder
2. Deploy to GitHub Pages
3. Model loads from `https://yourname.github.io/Brain-Dump/models/`

---

## File Structure After Download

```
Brain-Dump-main/
├── public/
│   ├── models/
│   │   └── Phi-3.5-mini-instruct-q4f16_1-MLC/
│   │       ├── ndarray-cache.json           (~10KB)
│   │       ├── params_shard_0.bin           (~1.2GB)
│   │       ├── params_shard_1.bin           (~1.2GB)
│   │       ├── mlc-chat-config.json         (~2KB)
│   │       ├── tokenizer.json               (~500KB)
│   │       └── tokenizer_config.json        (~1KB)
│   └── wasm/
│       ├── tvmjs_runtime.wasm               (~20MB)
│       └── tvmjs.bundle.js                  (~500KB)
```

---

## Next Step

After downloading, update `llmChatEngine.js` to point to your GitHub-hosted model.

See: UPDATE_MODEL_CONFIG.md
