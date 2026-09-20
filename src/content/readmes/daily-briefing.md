# Morning Briefing · Daily News Dashboard

A self-hosted daily briefing dashboard covering Singapore news, US and Asia-Pacific
politics, global affairs, technology, financial markets, and The Economist —
generated automatically each morning at 06:00 SGT via GitHub Actions and hosted
as a static site.

AI summaries are generated via **Ollama** (local) or **Groq** (hosted). The
pipeline auto-selects a provider: if `GROQ_API_KEY` is set, it uses Groq;
otherwise it falls back to a local Ollama server. The dashboard works
without either (news feeds and markets still render); AI briefings are
skipped gracefully when no provider is available.

## Architecture

```
pipeline/
├── run_pipeline.py     # Orchestrator — runs steps 1→3, renders HTML
├── sources.py          # RSS feed URLs + market ticker config
├── news_fetcher.py     # Ingests & deduplicates RSS feeds
├── market_fetcher.py   # Pulls live market data via Yahoo Finance API
├── summariser.py       # Ollama or Groq — morning briefing + category digests
├── template.html       # Jinja2 HTML template (self-contained, no build step)
└── requirements.txt

output/
├── index.html          # Generated dashboard (committed by CI)
├── YYYY-MM-DD.html     # Dated archive copy
└── snapshot.json       # Raw data snapshot for debugging

.github/workflows/
└── daily-briefing.yml  # Cron job: daily at 06:00 SGT (22:00 UTC)
```

## Quick start (local)

```bash
# 1. Clone and enter the repo
git clone https://github.com/your-org/daily-briefing
cd daily-briefing

# 2. Create a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r pipeline/requirements.txt

# 4. Configure environment (optional — defaults shown)
cp .env.example .env
# Edit .env if you want to point at a non-default Ollama instance:
#   OLLAMA_URL=http://localhost:11434
#   OLLAMA_MODEL=llama3.2
# ...or use Groq instead (no local server needed):
#   GROQ_API_KEY=your-key-here
#   GROQ_MODEL=llama-3.3-70b-versatile

# 5. Start Ollama (skip if using Groq, or if you don't need AI summaries)
ollama serve
ollama pull llama3.2

# 6. Run the pipeline
cd pipeline
python run_pipeline.py

# Run without AI summaries (no Ollama/Groq needed)
python run_pipeline.py --skip-ai --debug

# 7. Open the result
open ../output/index.html      # macOS
start ../output/index.html     # Windows
```

## Deployment options

### Option A — GitHub Pages (free, recommended)

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source** and set it to the `output/` folder on `main`
3. The workflow runs daily at 22:00 UTC (06:00 SGT), commits `output/index.html`,
   and GitHub Pages auto-deploys it
4. AI summaries run in CI via **Groq**: add a `GROQ_API_KEY` repo secret
   under **Settings → Secrets and variables → Actions**. Without it, AI
   summaries are skipped in CI (Ollama requires a local server, which isn't
   available on the runner) and the dashboard still renders fully with news
   feeds and market data.

### Option B — Vercel

1. Connect the repo to Vercel
2. Set the **Output Directory** to `output`
3. Trigger a redeploy webhook from the GitHub Actions workflow instead of committing

### Option C — Self-hosted cron

```bash
# Add to crontab (runs at 06:00 SGT = 22:00 UTC)
0 22 * * * cd /path/to/daily-briefing/pipeline && python run_pipeline.py
```

## Customising news sources

Edit `pipeline/sources.py` to add or remove RSS feeds per category:

```python
FEEDS = {
    "singapore": [...],   # CNA, Straits Times, Today Online
    "us":        [...],   # NPR, AP, Reuters, The Hill
    "asia":      [...],   # CNA Asia, SCMP, The Hindu, Bangkok Post
    "others":    [...],   # BBC, Al Jazeera, The Guardian, DW
    "tech":      [...],   # Ars Technica, The Verge, HN, MIT Tech Review
    "economist": [...],   # Leaders, Briefing, Finance, Business, Asia, International
}
```

Most major outlets publish official RSS feeds — always prefer these over scraping.

## Customising market tickers

Edit `MARKET_TICKERS` in `pipeline/sources.py`. Any Yahoo Finance symbol works:

```python
MARKET_TICKERS = {
    "indices":    [...],   # ^STI, ^GSPC, ^N225, ^HSI, ^FTSE, ^AXJO
    "fx":         [...],   # USDSGD=X, EURSGD=X, GBPSGD=X ...
    "commodities":[...],   # BZ=F (Brent), GC=F (Gold), NG=F (Nat. Gas)
    "crypto":     [...],   # BTC-USD, ETH-USD
}
```

Market data is fetched directly from the Yahoo Finance chart API — no API key required.

## Costs

| Service | Free tier | Notes |
|---|---|---|
| GitHub Actions | 2,000 min/month | Pipeline runs in ~2 min → ~60 min/month |
| GitHub Pages | Unlimited | Static hosting |
| Yahoo Finance API | Free | Unofficial — no key required |
| Ollama | Free | Local inference — runs on your own hardware |
| Groq | Free tier | Hosted inference — used automatically in CI when `GROQ_API_KEY` is set |

## CLI flags

```
python run_pipeline.py --help

  --output-dir PATH   Where to write index.html (default: output)
  --skip-ai           Skip AI calls (Groq or Ollama) — useful for testing feeds/markets
  --debug             Verbose logging
```
