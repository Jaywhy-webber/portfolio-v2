---
title: Kart Telemetry Dashboard
summary: Interactive data dashboard that turns raw go-kart sensor logs into lap-by-lap performance insights.
stack:
  - Python
  - Pandas
  - Plotly
  - HTML
flagship: true
sortOrder: 2
preview:
  kind: video
  assetPath: /assets/previews/kart-telemetry.webm
  posterPath: /assets/posters/kart-telemetry.png
demo:
  kind: bundled
  localPath: /demos/kart-telemetry/
repoUrl: https://github.com/Jaywhy-webber/kart-telemetry
---

## Problem
Go-kart drivers leave a kart session with no immediate, usable feedback. Existing analysis software is dated and technically demanding, requiring time and expertise to extract usable insight from raw telemetry data, which drivers do not have. Often it is only after the practise where usable insights are extracted, losing the opportunity to adjust and fix mistakes on the go.

## Approach

I built a Python pipeline that ingests AiM sensor CSVs, cleans and aligns streams by timestamp, segments data into laps via GPS beacon detection, and computes derived metrics: sector splits, cornering speed, braking and throttle zones. Output consists of a self-contained Plotly HTML dashboard, requiring no server, opening instantly from a phone or tablet trackside.

## Hard parts
Lap segmentation was the trickiest feature, as consumer GPS drifts, so a simple geofence triggered false crossings. Solved with a two-pass approach: a spatial filter followed by a temporal debounce rejecting crossings below a minimum lap duration. Track map projection required Web Mercator coordinate conversion; small errors compounded into visibly misaligned heatmap overlays until the transform was anchored to known corner apexes.

## Outcome

A ~1.5 MB self-contained HTML file handling up to 50 laps with sub-second interactivity: no install, no login, no internet connection required after build. Used it to identify habitual techniques slowing laptime, which was visible in the sector split chart, but invisible in raw numbers.
