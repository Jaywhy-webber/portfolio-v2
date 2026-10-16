---
title: Routlette
summary: Mobile app that generates random walking routes of a chosen distance, with AI-written clues leading to each stop.
stack:
  - React Native
  - FastAPI
  - Supabase
  - Llama
  - Google Maps API
role: Co-built with a partner
timeline: NUS Orbital 2026
status: Built and field-tested
sortOrder: 1
preview:
  kind: video
  assetPath: /assets/previews/routlette.webm
  posterPath: /assets/posters/routlette.png
demo:
  kind: none
repoUrl: https://github.com/Jaywhy-webber/routlette
---

## Context

Built with a partner for NUS Orbital 2026, NUS's undergraduate software
engineering programme.

## Problem
 
Choosing where to go is its own source of friction. Decision fatigue means most people default to the same familiar handful of spots, never discovering what's actually around them. Singapore has no shortage of hidden gems, but no easy way to surface them without hours of scrolling through reviews.
 
## Approach
 
Built a React Native app backed by a FastAPI service that generates randomised 3-stop routes (food stop, activity, food stop) from a curated dataset of venues around NUS sourced from the Google Places API. Each venue is scored on a custom "gem score" blending rating quality with obscurity, then mixed with controlled randomness depending on the user's chosen adventure mode (safe, balanced, chaotic). A Llama model generates the clue hints between stops, integrated end to end from prompt design through to output parsing, and a pytest and Jest suite of 137 tests covers authentication, filtering, scoring and API logic across both halves of the stack.
 
## Hard Parts
 
Tuning the gem score was the trickiest part. Early versions overweighted either rating quality or obscurity, pulling routes toward generically high-rated chains, or toward obscure venues that turned out low-quality rather than hidden gems. Landing on the final split (60% rating performance above a 4.0 threshold, 40% inverse review count) took repeated manual testing against real venues until the routes consistently surfaced places that were both good and genuinely under-the-radar.
 
## Outcome
 
Tested the app on ourselves around NUS and found genuinely good hidden-gem spots we wouldn't have discovered otherwise, validating that the scoring approach actually works in practice, not just on paper.
