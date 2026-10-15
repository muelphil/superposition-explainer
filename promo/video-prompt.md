# Prompt: LinkedIn promo video for an interactive explainer

Act as a designer and social media professional who also writes code. Your task is to create a short promotional video for LinkedIn that advertises this interactive explainer. The goal is to make people stop scrolling, give them one real insight, and get them to open the explainer.

You can't render video files yourself. Instead, build a self-playing, recordable "promo stage" inside this web app. I will screen-record it (OBS), and you then help me encode it with ffmpeg.

## Core decisions (already made — follow them)

- **Separate branch.** Work on a new branch (e.g. `linkedin-promo`) created from the main branch. This is never merged and never deployed. Keep changes to the existing app minimal: small opt-in hooks with defaults that leave the main app unchanged. Put everything else in its own folder (e.g. `src/promo/`).
- **Simplest possible routing.** No router library. A hash check in the app entry (`#promo` renders the promo view instead of the normal app).
- **Format: 1:1 square, 1080×1080 CSS px.** The stage is a fixed-size box centered on a black page.
  - Show the `devicePixelRatio` on the start screen. For pixel-exact recording, the browser zoom must be set so it reads 1 (on a Windows display at 125% scaling, that's 80% browser zoom).
  - Don't scale components with CSS `transform` or `zoom`; it breaks layout measurements and blurs canvases. Enlarge them natively instead: root font size, CSS variables, explicit sizes.
- **Dark mode.** Force the app's dark theme on the promo page without overwriting the user's saved theme preference.
- **Explanatory, not just pretty.** The clip autoplays muted, mostly on phones, so every message must come through on-screen text:
  - One idea per caption: a big headline (about 54 px), optionally one short subline.
  - The first 2–3 seconds must hook with the problem or question, not the logo.
  - Length about 40–60 s. End with a clear call to action: what the reader gets, the URL in a prominent pill, title, authors, venue. Animate the end card in (staggered) so it doesn't feel frozen.
  - A small persistent brand bar (logo + URL) during the clip.
- **Use the real app, not mock-ups.** Compose the explainer's own interactive components and visualizations, driven by a scripted async timeline (`await wait(ms)`, `say(title, sub)`, service calls). Reuse the app's figures and illustrations where they carry the story.
- **Reproducible takes.** If anything is random (training, sampling, layouts), make it deterministic with a seeded PRNG.
  - Scope the RNG swap to the calls that need it, so render-time randomness elsewhere doesn't change the result.
  - Choose seeds and parameters by simulating offline (run the app's real model code in Node) and pick runs that show the intended behaviour clearly and quickly.
  - Pace long processes over time with easing, so the interesting early phase is visible.
- **Scientific accuracy.** Every caption must be true for what is shown. No overclaims ("millions", "perfectly", "always") unless the explainer supports them. Prefer showing a contrast (A vs. B, changing one variable) over stating a claim. Show the cost or limitation, not only the win.
- **Start/restart controls.** A start overlay (not part of the clip, with a 1 s blank lead-in after clicking), `R` to restart, and `?autostart` for testing.

## How to work

1. Read the explainer first and extract its core story: the problem, the key mechanism, the key result, why it matters.
2. Propose a storyboard as a table (time, visual, caption title/sub) plus a short rationale, and wait for my feedback before building. Flag which segment to cut if it runs long.
3. Implement, then verify with `npm run build` (or the project's equivalent).
   - Browser screenshots may not capture WebGL or composited layers, and background tabs get throttled, so tell me what you could not verify visually.
4. After I review a take: tighten wording and timing, then give me an ffmpeg command to trim and encode the recording as H.264 MP4 (yuv420p, 30 or 60 fps, `+faststart`) for LinkedIn.
5. Optionally, draft the LinkedIn post text with the same structure as the video: an eye-catching first line, short emoji-structured sections, link at the top and bottom, a few hashtags.

My explainer-specific requests and design expectations follow below.
