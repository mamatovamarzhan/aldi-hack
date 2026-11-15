---
name: Aldi design system
description: Exact patient UI tokens and the latest WebGL sky direction; doctor design stays unchanged
type: design
---

Aldi patient design system (user-specified, use exactly):
- Font: Manrope 500/700, title Aldi 800 at 44px with subtly moving light inside letters. Body 18px/27px. Start-only supportive line exactly «Сказать вслух — уже половина пути»: Cormorant Garamond Italic 500, 28px, centered below the sphere, no shape, 1.6s letter blur reveal then still; day #1B2A5C, night #F3F1FF with glow.
- Primary buttons: azure #2EA8FF → #1565D8, white 20px bold label, shadow 0 10px 30px rgba(30,120,240,0.45), 6s light sweep and touch-origin ripple. Secondary: azure text/border on glass. Ghost: #5B4A9E day / #D9CCFF night. Lilac remains for accents and chips, not primary actions.
- Sky blues (decor/gradients/chips only): light #BFE0F5, mid #8EC5E8, deep #2F6A98 (the only blue allowed for text or links).
- Meadow greens (decor/gradients/chips): light #CFE6D3, sage #A9CBB0, meadow #8DBF9A, deep #2F7A5B (also the success color).
- Base: background #FBF9F4, panel #F3EFFA, surface #FFFFFF, text #2A2438, muted #6E6880, faint #A39DB3, border #E7E2F0, warn #B8860B, danger #C9393F with danger bg #FDECEC. Every text/background pair ≥ 4.5:1; color variety goes into gradients/chips/sphere/background, never body text.
- Buttons: pill radius, 56px tall, full width on mobile; variants primary (gradient filled), secondary (outlined), ghost (text).
- Cards, sheets and live card: liquid glass, blur 24px / saturate 160%, thin top specular highlight, faint inner refraction gradient, 1px light border, subtle current-sky tint. Day white 68%; night rgba(16,20,52,0.58). All text on glass except the Start supportive line; contrast at least 4.5:1. Card radius 20px, sheet top radius 28px.
- Sphere: ElevenLabs UI audio-reactive 3D Orb or equivalent R3F if unavailable; iridescent lilac/azure/mint glass with flowing internal light, voice-driven idle/listening/talking. Warm day sun halo, silver-lilac night moon glow; speaking gently brightens surrounding sky. Shared-element Start→Call transition, shrink to card top on ending; preserve existing routes and logic.
- Max content width 480px, centered on desktop. No navigation bar, no header on patient screens.
- Red (danger) is used ONLY for the urgent banner and the hang-up call button; urgent banner always solid #FDECEC, never transparent.
- Patient background direction supersedes the earlier oil-painted sky: high-end devices, full-screen WebGL atmosphere with azure/lilac/peach daytime sky, volumetric-looking fBm clouds, meadow, stars, Milky Way, subtle lilac/teal/green aurora and fireflies. Local clock dawn 05:00–07:30, day 07:30–17:30, sunset 17:30–20:30, night 20:30–05:00. Never restore the kite, uploaded sky/image layers, title blob or SVG turbulence/displacement filters. No separate moon: the existing sphere is the moon. Reduced motion freezes the scene; hidden tabs pause rendering. Doctor design, copy, routes and logic stay unchanged. Text/Card screens keep the 75% ivory veil.
- Tokens live in src/shared/ui/theme (tokens.ts) and are mirrored in src/styles.css @theme inline.
- Cloud direction supersedes earlier noise/primitive restrictions: use ready-made Drei Clouds/Cloud with seven unique seeded groups, Lambert lighting and horizon fog; delete custom fBm cloud shader. Drift left to right at 0.15 units/s with offscreen wrap. Perspective ground camera fov 50. Day white cloud/warm light, dawn lilac/pink, sunset peach, night #8F88B8 at opacity .35 with dim lilac light. GodRays from a small mesh hidden behind Aldi's sphere, occluded by clouds; no separate visible sun. Preserve the sky gradient, sphere, hills, grass and UI.
