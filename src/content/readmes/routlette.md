# Routlette

*A mystery adventure app that picks where you're going, so you don't have to.*

NUS Orbital 2026 · Team Apollo 11 · Milestone 2

---

## Table of contents

- [Team & product](#team--product)
- [Motivation](#motivation)
- [Target audience](#target-audience)
- [User stories](#user-stories)
- [Tech stack](#tech-stack)
- [Data model](#data-model)
- [Quick start](#quick-start)
- [Running the app (no dev setup)](#running-the-app-no-dev-setup)
- [API reference](#api-reference)
- [App features](#app-features)
- [Design system](#design-system)
- [Development plan](#development-plan)
- [Software engineering practices](#software-engineering-practices)
- [Testing](#testing)

---

## Team & product

| Field | Detail |
|-------|--------|
| Team name | Apollo 11 |
| Product name | Routlette (mobile application) |
| Team size | 2 (JY on backend, YC on frontend) |
| Programme | NUS Orbital 2026 |

---

## Motivation

Planning a night out in Singapore tends to collapse into the same handful of choices. Despite the sheer range of food, activities, and neighbourhoods on offer, decision fatigue pushes people back to whatever is familiar and convenient.

The tools that exist to help (blog posts, Google Maps, review aggregators) lean almost entirely on ratings and reviews. That makes them good at surfacing what's already popular, but bad at surfacing the hidden gems sitting just outside the usual radius, and it adds its own kind of noise from social media hype.

Routlette takes the opposite approach: it removes the decision rather than trying to optimise it. Set a few preferences, and the app builds a short, randomised route and reveals it one clue at a time, so the destination stays a surprise until you arrive.

---

## Target audience

Routlette is built for Singaporeans stuck in the rut of routine weekends, who want a low-effort way to inject some spontaneity and exploration into their lives without having to do the planning themselves.

---

## User stories

1. As a user looking to explore Singapore, I want to input my starting location, budget, and preferences so that I can generate a personalised exploration journey.
2. As a user who wants to avoid decision fatigue, I want the system to automatically decide destinations for me so that I do not have to plan my outing.
3. As a user seeking new experiences, I want to be guided to multiple locations in a single journey so that I can explore different neighbourhoods and activities.
4. As a user who enjoys spontaneity, I want to receive step-by-step navigation instructions without knowing the destination so that the experience feels exciting and unpredictable.
5. As a user navigating the journey, I want clear text-based directions so that I can easily follow the route without relying on a map.
6. As a user with different risk preferences, I want to choose between exploration modes (Safe, Balanced, Chaotic) so that I can control how adventurous my journey is.
7. As a frequent user, I want the system to learn from my past ratings and preferences so that future journeys are more personalised.
8. As a user who enjoys good experiences, I want to save and revisit highly-rated routes so that I can reuse or share them with others.
9. As a user who enjoys exploration, I want to be given optional side quests between main stops so that I can discover more places along the journey.
10. As a user who enjoys immersive experiences, I want to receive clue-based navigation instead of direct instructions so that the journey feels more engaging.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo 52), TypeScript, React Navigation (native stack), expo-location and react-native-maps for live GPS and map display, react-native-google-places-autocomplete for the address search bar |
| Backend | Python, FastAPI, Uvicorn |
| Data | Pandas, static CSV dataset of 135 venues around NUS (sourced from Google Places API) |
| Scoring | Custom weighted gem scoring, plus a VADER sentiment pipeline that runs offline for now |
| AI / clues | Groq API (llama-3.3-70b-versatile) generates a short, atmospheric clue for each stop at route time; falls back to a static clue bank per category/vibe if the request fails |
| Planned | Supabase (Postgres) for saved routes and user preferences |

---

## Data model

There's no database yet. The live route endpoint reads directly from `venues.csv`, a static, one-time export of 135 venues around the NUS area pulled from the Google Places API. The columns below are what the filter and scoring pipeline actually consume; this is the schema that will need to carry over once Supabase is wired in.

| Column | Type | Description |
|--------|------|-------------|
| place_id | string | Google Places unique identifier for the venue |
| name | string | Display name shown on the Navigation and Completion screens |
| category | string | `food` or `activity`; the top-level split used before vibe bucketing |
| primary_type | string | Raw Google Places type (e.g. cafe, museum); mapped to a vibe bucket via `VIBE_MAPPING` in `main.py` |
| address | string | Full street address, shown only after a stop is revealed |
| lat, lng | float | Coordinates used for haversine distance filtering and for live bearing/distance in Navigation |
| price_level | int 1–4 | Google Places price level; rows with a null value are dropped during filtering |
| rating | float | Google average rating; rows missing it are dropped, since `score_venue()` requires it |
| rating_count | int | Number of Google reviews; feeds the mystery_score half of the gem score |
| neighbourhood | string | Static label; every row currently reads NUS since the dataset only covers one area |

All 135 rows share the same neighbourhood value for now, which is fine while the app is scoped to one area, but it's a column that'll matter once the dataset expands past NUS.

---

## Quick start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0
# Runs at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npx expo start --clear
# Press w to open in browser
# Scan the QR code with Expo Go on a phone
```

### Testing on a physical device

Find your machine's local IP with `ipconfig`, update `BASE_URL` in `frontend/services/api.ts` to `http://<your-ip>:8000`, and start the backend with `--host 0.0.0.0` so it's reachable on the local network. Windows Firewall sometimes blocks port 8000 on the first attempt; add an inbound rule if the phone can't connect.

---

## Running the app (no dev setup)

There's no published TestFlight or APK build yet, since Routlette hasn't been deployed anywhere outside the team's own machines. The only way to try it right now is through the Expo development server, which means someone on the team has to be running both the backend and frontend locally first.

1. Whoever is hosting starts the backend with `--host 0.0.0.0` and the frontend with `npx expo start`, as described in Quick start above.
2. Install Expo Go from the App Store or Play Store on the device you want to test from.
3. Make sure that device is on the same Wi-Fi network as the host machine, then scan the QR code printed in the terminal after `npx expo start`.
4. The app opens inside Expo Go. Generate a route as normal; it talks to the host's backend over the local network.

This only works on the same local network as the host, there's no public URL to share yet. A standalone build (TestFlight for iOS, an APK for Android) is on the roadmap once the core feature set is locked.

---

## API reference

### `GET /`

Health check. Returns `{"status": "Routlette backend is running"}`.

### `GET /generate-route`

Runs the full pipeline (filter, vibe assignment, scoring, sequencing, then clue generation) and returns a 3-stop route.

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| lat, lng | float | 1.2966, 103.7764 | User's starting coordinates (NUS area by default) |
| budget | int 1–4 | 2 | Maximum price level |
| walking | int 1–5 | 5 | Walking radius preset, 300m–2000m |
| mode | string | balanced | `safe` / `balanced` / `chaotic` |
| food_vibes | list[str] | all three | Repeated query param |
| activity_vibes | list[str] | all three | Repeated query param |

**Response shape:**

```json
{
  "stops": [
    {
      "name": "...",
      "category": "food",
      "vibe": "Fuel Stop",
      "address": "...",
      "lat": 1.29,
      "lng": 103.77,
      "price_level": 2,
      "score": 0.712,
      "clue": "..."
    }
  ],
  "mode": "balanced"
}
```

### Scoring logic

```
rating_perf_score = max(0, rating - 4.0)
mystery_score     = max(0, min(1, 1 - ((rating_count - 10) / 290)))
gem_score         = (rating_perf_score × 0.6) + (mystery_score × 0.4)
final_score       = gem_score × (1 - rand_weight) + random() × rand_weight
```

The mystery score rewards venues with fewer reviews: a 4.6-star place with 12 reviews is a better candidate for a "hidden gem" than a 4.6-star place with 3,000. `rand_weight` is set by mode: 0.2 for Safe, 0.5 for Balanced, 0.9 for Chaotic. Chaotic mode leans almost entirely on the dice roll rather than the rating.

### Vibe buckets

Each venue is mapped from its Google Places `primary_type` into one bucket. A route always pulls two food stops from different buckets, plus one activity stop, so you never end up with two cafes back to back.

| Category | Bucket | Maps to |
|----------|--------|---------|
| Food | Fuel Stop | Cafes, dessert spots |
| Food | Quick & Local | Fast food, noodle stalls, hawker-style |
| Food | Main Event | Sit-down restaurants |
| Food | Social Hour | Bars |
| Activity | Culture | Museums, galleries |
| Activity | Outdoors | Parks, nature spots |
| Activity | Urban Adventure | Landmarks, entertainment |

### Clue generation

Once the three stops are sequenced, the backend fires off one Groq call per stop concurrently (`asyncio.gather`) and attaches the result to each stop as a `clue` field. Each prompt gets the stop's category, vibe, price level, and the venue's real name (marked as hidden context the model is told never to repeat). The call runs against `llama-3.3-70b-versatile` with `max_tokens=120` and `temperature=0.85`, high enough that the same stop rarely gets the same clue twice. If the call throws (timeout, rate limit, missing key) the stop falls back to a static clue keyed by its `(category, vibe)` pair, pulled from a small hand-written bank, so a route never ships without a hint.

---

## App features

The build covers five screens, plus two backend-only steps that sit between Filters and Navigation: Dashboard → Location → Filters → Route Generation → Clue Generation → Navigation → Completion.

### 1. Dashboard

#### Overview

The landing screen leads with "Tired of repetitive nights out?", speaking directly to the decision-fatigue problem the app is solving.

#### Architecture

Component: `Dashboard.tsx`. Composed from three shared components: `LogoHeader`, `TextContentTitle` (the "How it works" card), and `ArrowForward` (the primary CTA button). No local state.

#### Backend

None. `Dashboard.tsx` never calls the API or touches `venues.csv`. The first network request in the whole flow fires when Filters submits to `/generate-route`.

#### Key features

- A "How it works" card gives a plain-language summary of the flow before the user commits to anything.
- A single prominent "Start Adventure" button is the only call to action on the screen.

#### Design & UX considerations

There's nothing else competing for attention on the screen. One headline, one explainer, one button, so the very first thing a new user does is make a forward move rather than navigate a menu.

---

### 2. Location

#### Overview

Asks where the user is starting from, and this is now fully live rather than a UI-only placeholder.

#### Architecture

Component: `LocationScreen.tsx`. Requests GPS permission and the device's current position via `expo-location`, renders a `react-native-maps` MapView centred on that position, and overlays a Google Places autocomplete bar via `react-native-google-places-autocomplete`. A static centre pin sits over the map; the underlying Region updates as the user pans, and that Region is what gets passed forward to FilterScreen on confirm.

#### Backend

None directly, but what happens here sets up everything downstream. The lat and lng captured on this screen become the lat and lng query parameters on `/generate-route`, and the exact origin point `filter.py`'s `haversine()` function measures every venue against.

#### Key features

- Centres the map on the user's actual GPS position on load, rather than a fixed default.
- A draggable map under a fixed centre pin, so the user can fine-tune their starting point without a separate "drop a pin" mode.
- An address autocomplete bar for typing a starting point instead of panning to it.

#### Design & UX considerations

Defaulting to the user's real position rather than a fixed map centre removes a step most location pickers force on you. The autocomplete bar exists for the case where someone wants to set a future meetup point rather than their live location.

---

### 3. Filters

#### Overview

The main point of user input, deliberately kept to a single scrollable screen rather than a multi-step wizard, so all the choices are visible and adjustable at once before committing.

#### Architecture

Component: `FilterScreen.tsx`. Built from two small reusable pickers: `OptionRow` for single-select chips (budget, walking distance, mode) and `MultiSelectRow` for the two vibe pickers. Every option ships with a sensible default already selected.

#### Backend

`filter.py`'s `apply_filters()`. Every selection on this screen runs through an eight-step pipeline before scoring ever sees a venue.

1. Drop venue types that aren't adventure stops: `shopping_mall`, `barbecue_area`, and `educational_institution` are excluded outright.
2. Coerce `price_level`, `rating`, and `rating_count` to numeric types, since the CSV pulled from Google Places mixes types across rows.
3. Apply the budget filter. Keep `price_level` at or below the selected budget, and drop any row where `price_level` is missing, since there's no way to confirm it fits.
4. Apply the category filter. The live route always passes "both" here, so this step mostly exists because `apply_filters()` is written to be reused for a single-category shortlist elsewhere.
5. Calculate haversine distance from the submitted coordinates to every remaining venue.
6. Apply the walking radius, mapped from the slider's 1–5 scale to 300–2000 metres through a fixed lookup table.
7. Drop any row still missing a name, coordinates, or rating, since the app can't display or navigate to a stop without them.
8. Sort what's left by distance, so the closest venues are first when scoring runs.

Mode doesn't touch this pipeline. Safe, Balanced, and Chaotic get read later, by `score_venue()` in `main.py`, to decide how much randomness gets blended into the final score.

#### Key features

- Budget: single-select chip from $ to $$$$
- Walking distance: single-select chip, presented as time (~3 to ~25 min) rather than metres, mapped internally to 300m–2000m
- Food vibes: multi-select; the user is nudged to pick at least two for variety across food stops
- Activity vibes: multi-select
- Adventure mode: Safe, Balanced, or Chaotic, controlling how much the route leans on rating vs. randomness

#### Design & UX considerations

Every option ships with a sensible default already selected, so a user who just wants to mash the generate button can do that without configuring anything. The vibe pickers are multi-select because picking only one food vibe would break the two-different-buckets guarantee the route sequencer relies on.

---

### 4. Route generation

#### Overview

There's no screen for this one. It's the gap between submitting Filters and landing on Navigation: a single `/generate-route` call that scores and sequences the three stops before anything is shown.

#### Backend

`score_venue()` and the sequencing logic inside `/generate-route`, both in `main.py`. Once `filter.py` hands back a shortlist, two things happen before a route is returned.

Gem scoring first. Each venue gets a `rating_perf_score` of `max(0, rating - 4.0)`, which only starts counting once a venue clears a 4.0 baseline, and a `mystery_score` of `max(0, min(1, 1 - ((rating_count - 10) / 290)))`, which rewards venues with fewer reviews. Those combine as `gem_score = (rating_perf_score * 0.6) + (mystery_score * 0.4)`.

Mode randomness next. `final_score = gem_score * (1 - rand_weight) + random.random() * rand_weight`, with `rand_weight` set to 0.2 for Safe, 0.5 for Balanced, 0.9 for Chaotic. On Chaotic, 90% of the score is a random roll, so the gem quality barely matters.

Sequencing last. A route always runs food, then activity, then food, with the two food stops pulled from different vibe buckets so it never doubles up. Each stop is chosen by sampling one venue at random from that category's top five scorers, not always the top scorer, so identical filters still produce different routes.

#### Key features

- Gem score blends rating quality, capped below a 4.0 floor, with a review-count-based mystery score, so an unreviewed but mediocre venue still loses to a well-reviewed hidden gem.
- Mode sets how much of the final score comes from `gem_score` versus a random roll: 20% random on Safe, 50% on Balanced, 90% on Chaotic.
- Stops are sequenced food, then activity, then food, with the two food stops pulled from different vibe buckets.
- Each stop is chosen by sampling one venue at random from that category's top five scorers rather than always taking the top scorer, so identical filters still produce different routes.

#### Design & UX considerations

There's nothing to show here since there's no screen, but the choices made in this step shape everything Navigation displays. Sampling from the top five rather than always picking rank one was a deliberate call to keep routes from feeling predictable on repeat use.

---

### 5. Clue generation

#### Overview

Another step with no screen of its own. Once Route Generation has picked and sequenced the three stops, one Groq call goes out per stop, all fired at once, and the results come back as a `clue` field on each stop object before the response is returned.

#### Backend

`generate_clue()` in `main.py`. Every call sends the same fixed system message plus a per-stop user message. The user message is built from the venue's category, vibe, price level, and real name (flagged as hidden context):

System message:

```
You are a mystery guide for a surprise adventure in Singapore. Your job is to write
short, evocative clues (2-3 sentences) that hint at a destination without revealing
its name, street, or address. Use any visitor impressions provided as raw material
for atmosphere and sensory detail — extract the feeling, not the facts. Never mention
the venue name or any navigational directions.
```

User message, filled in per stop:

```
Write a clue for this stop:

Venue name (hidden context only — do NOT reveal this in the clue): {name}
Category: {category}
Vibe: {vibe}
Price level: {'$' * price_level}
[review block, see below — only present on the live API path]

Keep it to 2-3 sentences. Be mysterious and enticing. Do not name the venue, its street, or quote reviews verbatim.
```

When review snippets were fetched, this line is inserted ahead of the closing instruction:

```
Real visitor impressions (use these for atmosphere and sensory detail — do NOT quote directly or name the venue): {review_snippets}
```

The call runs against `llama-3.3-70b-versatile` with `max_tokens=120` and `temperature=0.85`, high enough that the same stop rarely gets the same clue twice. If the call throws (timeout, rate limit, missing key) the stop falls back to a static clue keyed by its `(category, vibe)` pair, pulled from a small hand-written bank, so a route never ships without a hint.

#### Key features

- A fixed system message sets the mystery-guide persona once; the user message changes by category, vibe, price level, and now the venue's real name, always flagged as hidden context the model is told not to repeat.
- On the live API path, up to three real review snippets per venue are fetched first (`fetch_stop_reviews()`) and woven into the prompt as raw atmosphere, with an explicit instruction never to quote them back.
- All three calls fire concurrently (`asyncio.gather`) rather than one after another, so clue generation doesn't add three separate round trips to route latency.
- A hand-written fallback clue per `(category, vibe)` pair covers any failed call, so the feature degrades quietly instead of breaking the route.

#### Design & UX considerations

Including the venue's real name as hidden context, rather than withholding it from the model entirely, gives it a sharper anchor for tone and detail; leak prevention rests on the explicit instruction never to repeat the name, not on the model simply not knowing it. Folding in real review snippets on the live path pushes the same trade further: richer, more specific clues, at the cost of needing an equally explicit instruction not to quote them verbatim. The same per-stop shape (category, vibe, price level, plus whatever extra context is available) also keeps the fallback bank simple, since a fallback only ever has to match a `(category, vibe)` pair.

---

### 6. Navigation

#### Overview

Replaces the old static Results screen with a live, clue-by-clue reveal loop.

#### Architecture

Component: `NavigationScreen.tsx`. Two pure helper functions, `haversineMetres()` and `bearingDegrees()`, compute live distance and direction from the user's current coordinates to the active stop; a `REVEAL_RADIUS_METRES` constant (50) decides when a stop counts as "arrived". Heading comes from `Location.watchHeadingAsync`, and the arrow's screen angle is derived as `arrowAngle = (bearing - heading + 360) % 360` so it always points at the destination regardless of which way the phone is facing. Local state tracks the current stop index, live coordinates, heading, distance, whether the stop has been revealed, whether the hint is visible, and cumulative distance walked.

#### Backend

None beyond what `/generate-route` already returned. The scoring and sequencing that produced these stops, and the clue written for each one, already happened, covered under Route Generation and Clue Generation; this screen's job is to track the user's live position against coordinates it already has, not to call the API again.

#### Key features

- A compass arrow that rotates in real time to point at the next stop, with the live haversine distance shown underneath in kilometres.
- The destination's name stays hidden until the user is within the 50m reveal radius.
- A "Show hint" toggle lets the user peek at the stop's AI-generated clue beforehand without giving away what it is.
- Arriving inside the radius swaps the arrow for a "You made it!" card with the stop's name, vibe, and category, plus an "I'm here — next stop!" button to advance.
- A "Skip" button is available for testing the flow without actually walking the full distance.

#### Design & UX considerations

Hiding the name until arrival is the whole point of the app, so the compass-and-distance pairing had to give the user enough to navigate by without accidentally leaking the destination through, say, a map pin or street name. The hint toggle is opt-in rather than shown by default, so the surprise stays intact for anyone who doesn't want a preview.

---

### 7. Completion

#### Overview

Once all 3 stops are cleared, the journey closes on a summary screen.

#### Architecture

Component: `CompletionScreen.tsx`. Receives the full stop list plus the journey's total time and cumulative distance via navigation params from `NavigationScreen`, and renders each stop as a tap-to-expand card.

#### Backend

None beyond what `/generate-route` already returned. `CompletionScreen` doesn't make its own request; it renders the stop list, total time, and total distance that `NavigationScreen` already received and passes forward through navigation params.

#### Key features

- Total time and total distance walked across the route.
- A tap-to-expand card per stop showing address and price level.
- The activity and second food stop start collapsed, so the screen doesn't dump every address at once.
- "Start a New Adventure" returns to the Dashboard to begin again.

#### Design & UX considerations

Collapsing two of the three stop cards by default keeps the summary scannable; the first stop stays expanded since it's the one most likely to be looked back on immediately after the walk.

---

### In-journey flow

The loop described in the user stories is now implemented end to end:

1. Route is generated and sequenced; final destinations are not revealed
2. A clue for the next stop is available behind a hint toggle
3. User follows the compass arrow; the app checks live GPS against a 50m reveal radius
4. On arrival, the stop's name and details are revealed
5. Repeat for the remaining stops, then show the Completion summary

Two pieces from the original user stories are still open: rating a stop after visiting it, and saving a completed route for later. Both remain scoped as extension features (see Development plan).

---

## Design system

### Brand

The wordmark replaces the diagonal stroke of the capital R with a dotted arrow, nodding to the navigation path users take through the app. The hand-drawn brushstroke style sets it apart from navigation apps, which tend toward clean vector marks.

The name is a portmanteau of "route" and "roulette": route for the wayfinding, roulette for the luck-based trust the user has to place in it, since any given stop might turn out to be a flop or a genuine hidden gem.

### Colour & typography

| Role | Value | Why |
|------|-------|-----|
| Primary | Deep slate blue `#1a2b8a` | Used for buttons, badges, links, and active states. Chosen over a brighter accent because navy reads as trustworthy and intentional, which matters when the app is asking users to follow an unknown route |
| Background | White `#ffffff` / Whitesmoke `#f5f5f5` | Two-tier background gives cards a sense of depth over the screen without needing borders or shadows |
| Text | Near-black `#1e1e1e` | Softer than pure black, easier to read over long sessions |

Typography is Inter throughout, at four sizes: 18–24px for section headings, 16px for body and labels, 13px for sublabels, 11–12px for micro text. One typeface keeps the hierarchy resting on size and weight rather than font-switching.

### Design principles

One font family, five core colours, and a uniform border radius mean users never have to relearn visual conventions between screens. Flat design with no shadows or gradients keeps attention on the instructions rather than the chrome around them.

### UI components and pages

#### Forward navigation button

A large, full-width button filled with the primary navy (`#1a2b8a`). The high contrast against the white background makes it the most visually dominant element on any given screen. The large tap target reduces missed taps for someone using the app while walking.

#### Back navigation button

Plain navy text with no fill, by contrast. That's deliberate: once a route is generated, the design nudges users to lean into it rather than second-guess and restart, while still leaving the back option available rather than removing it outright. Making the back action visually quiet, rather than invisible, is the balance being struck.

#### Filter screen

The main point of user input, kept to a single scrollable screen rather than a multi-step wizard. A strict top-to-bottom hierarchy lets users see every option at once and adjust freely before committing, which keeps the setup feeling lighter than its actual number of choices.

---

## Development plan

Routlette is being built across three Orbital milestones.

### Milestone 1: shipped

| Area | What's done |
|------|-------------|
| Backend | FastAPI app with CSV-based venue retrieval; filter pipeline (budget, walking radius, excluded place types, haversine distance); gem scoring engine blending rating quality, review-count mystery score, and mode-based randomness |
| Routing logic | Vibe-based stop selection: two food stops guaranteed from different vibe buckets, plus one activity stop |
| Frontend | 4-screen React Native app (Dashboard, Location, Filters, Results); multi-select vibe pickers; single-select budget/distance/mode chips; results rendered as venue cards with name, vibe, address, and coordinates |
| Integration | Frontend wired to the live backend, with no mock data in the current build |

### Milestone 2: in progress

| Status | What it covers |
|--------|----------------|
| Shipped early | Live GPS location input via expo-location and react-native-maps, with Google Places autocomplete; LLM-generated clue-based navigation via Groq (llama-3.3-70b-versatile), with a static fallback bank; Navigation screen with compass-and-distance UI and 50m arrival reveal; post-route Completion summary screen |
| Near-term | Route sequencer that orders the 3 stops sensibly rather than by distance alone; connecting the offline VADER sentiment pipeline in `scoring.py` into the live `/generate-route` scoring path |
| Stretch | Supabase integration for saved routes and persisted user preferences |

### Final milestone: stretch goals

Side quests between main stops, a user rating system that feeds back into future route scoring, and saved/shareable routes are scoped as extension features beyond the core experience, to be tackled if the core loop is solid going into the final stretch.

### Notable decisions & trade-offs

- A `USE_MOCK` flag in the API layer during early frontend work, so UI could be built and demoed before the backend was ready. Removed once the live backend was stable.
- Walking distance is shown to users as time (~3 to ~25 min) rather than metres, since metres are a worse mental model for "how far am I willing to walk." Internally it still maps to a 300m–2000m scale.
- Sentiment score in the offline pipeline is weighted 20% against an 80% gem score, so that review-text noise can't dominate a venue's ranking. This hasn't been merged into the live endpoint yet (see Known issues / watch-outs).
- `scoring.py` is intentionally not imported into `main.py`, because it auto-executes a full scoring run at module load. The vibe mapping it depends on was duplicated into `main.py` instead of shared, to sidestep that side effect rather than refactor it under deadline.

### Known issues / watch-outs

- `scoring.py` runs `filter_and_score_gems()` at import time, so never import it directly from the live app.
- `generate_dataset.py` hits the live Google Places API, so don't re-run it without intent: it costs quota.
- Physical-device testing needs `--host 0.0.0.0` on uvicorn and a manually updated `BASE_URL` in `api.ts`; easy to forget after switching networks.
- Windows Firewall can silently block port 8000 on first run.
- Clue generation needs a valid `GROQ_API_KEY` in `backend/.env`; without one, every stop quietly falls back to its static clue instead of erroring, which is by design but can look like the LLM integration isn't running if you're not aware of the fallback.

---

## Software engineering practices

### Version control & collaboration

The repo follows a feature-branch workflow on GitHub: `feature/livelocation` and `feature/navigation-system` were each built on their own branch and merged back into main once working, rather than committed directly to main. Commit messages follow a loose `feat:` / `fix:` convention (e.g. `feat: replace ResultsScreen with compass-based NavigationScreen and CompletionScreen`), which keeps the history readable when tracing when a given screen actually landed.

### Testing approach

There's no automated test suite yet (see Testing). With a two-person team, the practical substitute has been each person manually exercising the other's feature on a physical device before merging, rather than a formal review process.

### Keeping main deployable

Features are merged once they run end to end on a physical device, not just in the Expo web preview, since the GPS, compass heading, and live network calls don't behave identically across the three. This is informal rather than enforced by CI, which is the main gap between this and a production-grade workflow.

---

## Testing

Routlette doesn't yet have an automated test suite. Testing so far has been manual, done alongside development each week. The table below is the actual record of issues surfaced and how they were resolved, pulled from the team's weekly project log.

### Issue log

| Week | Area | Issue found | Resolution |
|------|------|-------------|------------|
| 0 | Backend setup | venv activation syntax differs between Windows and Mac | Documented both commands in the README so either OS works without back-and-forth |
| 0 | Git | Git identity not configured, first commit failed | Set up a feature-branch workflow and committer config before further work |
| 1 | Backend env | No issue logged this week | Used `.env` for all API keys from the start, to avoid an accidental commit of secrets |
| 2 | Frontend scaffold | Node 24 incompatible with Expo SDK 52, plugin errors on start | Downgraded to Node 20 via nvm; documented the version requirement |
| 2 | Dataset generation | Google Places API (New) uses a different endpoint and field-mask syntax than the legacy API; a single combined search also hit the 20-result cap per area | Queried one place type at a time across the NUS area to stay under the cap and maximise venues collected per type |
| 3 | Filter pipeline | Walking distance in raw metres was a confusing input for users | Switched to time-based labels (~3–25 min) in the UI, kept metres internally on a fixed 1–5 scale |
| 3 | Scoring engine | VADER sentiment returns 0 for venues with no review text, which would unfairly tank their score | Defaulted empty-review venues to a neutral 0.5 sentiment instead of 0 |
| 3 | Frontend / Expo | Expo SDK mismatch (52 vs. 54) caused plugin resolution errors | Emptied the plugins array and pinned the Node version that matches SDK 52 |

### Manual test checklist

Cases to (re-)run before each milestone submission. Status reflects what's been verified manually as of this round of testing; this list should be updated as more Milestone 2 features land.

| Test case | Expected behaviour | Status |
|-----------|-------------------|--------|
| Budget filter | Venues with `price_level` above the selected budget, or with a null `price_level`, are excluded from results | Verified |
| Walking radius filter | Only venues within the haversine distance for the selected radius (300m–2000m) are returned | Verified |
| Vibe diversity rule | Generated route always contains 2 food stops from different vibe buckets, plus 1 activity stop | Verified |
| Mode randomness | Safe mode results stay close to top-rated gems run after run; Chaotic mode varies widely between runs with the same filters | Verified (spot-checked, not statistically measured) |
| API parameter defaults | Calling `/generate-route` with no query params returns a valid route using NUS-area defaults | Verified |
| Frontend ↔ backend integration | Filter selections on the Filters screen are reflected correctly on the Navigation screen | Verified |
| Physical device connectivity | App reachable from a phone on the same network via `BASE_URL` + `--host 0.0.0.0` | Verified, firewall rule required on Windows |
| Live GPS location input | Location screen returns the user's actual coordinates instead of the NUS default | Verified |
| Sentiment-adjusted scoring on live route | `/generate-route` score reflects VADER sentiment, not just `gem_score` | Not yet implemented; pipeline exists offline only |
| Clue-based navigation reveal | Stops are revealed one clue at a time, with the destination name hidden until the 50m arrival radius is reached | Verified |
| Groq fallback | If the Groq call for a stop's clue fails, the static fallback clue for that stop's `(category, vibe)` pair is used instead of an error | Verified (manual fallback test) |
| Saved routes | A completed route can be saved and reloaded later | Not yet implemented; pending Supabase integration |

Total logged development time for Milestone 1: 84 hours across both team members, tracked weekly by task and category in the project log.

### User testing

No structured user testing round has been run yet. Feedback so far has come from the two team members testing on their own devices during development, not from people outside the team. A short feedback round, similar in spirit to a usability pass, is planned for Milestone 2 or 3, once the Navigation and Completion screens have had more time in people's hands. Until then, this section is a placeholder rather than a result.
