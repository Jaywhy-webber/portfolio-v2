---
title: Daily Briefing
summary: Automated personal dashboard that aggregates weather, calendar, news, and tasks into a single morning-ready page.
stack:
  - Python
  - GitHub Actions
  - Astro
  - Groq / Llama
role: Solo build
status: Running daily
sortOrder: 3
preview:
  kind: video
  assetPath: /assets/previews/daily-briefing.webm
  posterPath: /assets/posters/daily-briefing.png
demo:
  kind: bundled
  localPath: /demos/daily-briefing/
repoUrl: https://github.com/Jaywhy-webber/daily-briefing
---

## Context

A personal tool, built to replace the habit of checking several news, market
and weather sources separately each morning.

## Problem
 
Checking multiple news sites, market data, and outlets every morning is fragmented and time consuming. Singapore news, global affairs, technology, financial markets, and The Economist all live in different places, with no single view to start the day.
 
## Approach
 
Built a self-hosted daily briefing dashboard that runs automatically each morning via GitHub Actions. The pipeline ingests and deduplicates RSS feeds across categories, pulls live market data via yfinance, and uses Llama to generate a morning briefing and category digests. The output is rendered into a static HTML site with no build step required.
 
## Hard Parts
 
Getting Llama to summarise into a consistent morning briefing tone and format, rather than generic bullet points, was the trickiest part. It took iteration on the prompting approach to get digests that read like an actual briefing, with a coherent voice across categories, instead of disconnected summaries strung together.
 
## Outcome
 
Deployed and used daily as a personal morning routine, replacing the fragmented habit of checking multiple sites and apps with a single automatically generated briefing each morning at 06:00 SGT.