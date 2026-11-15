<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- Two themes scoped by wrapper class `.theme-patient` / `.theme-doctor` in src/styles.css; never mix tokens across them (why: patient and doctor styles must never blend).
- Keep the WebGL patient backdrop lazy-loaded behind ClientOnly, with time rules in pure TypeScript and scene colors in shared theme tokens; why: preserve SSR, doctor screens, and independently test local-clock/demo timing.
- Advance sky animation through one frame callback and stop the canvas loop for reduced motion, hidden tabs and offscreen patient sections; why: accessibility must freeze all effects together without accumulated animation jumps.
- Patient glass uses the sky canvas's data-sky-phase signal and shared semantic tokens; why: panel contrast and sky time must stay synchronized, including demo cycles.
- The Aldi sphere is the ElevenLabs UI Orb (src/components/ui/orb.tsx, local edits: project-hosted noise texture, frameloop prop), lazy-wrapped by AldiOrb with agentState, optional live volume getters, placement and one shared layoutId; why: voice screens pass useConversation volumes straight in, and visual transitions are reused without inventing call logic.
- Use seeded Drei Clouds with the project-hosted standard texture, pure cloud-motion drift and GodRays behind the orb; why: reuse the requested cloud renderer while testing wind separately and preserving the gradient/foliage shaders. Dev canvas data-cloud-x and data-cloud-opacity expose live verification state.
- Patient routes declare staticData.patient (full/call/veil); __root renders one persistent PatientShell (sky + LayoutGroup) around them; why: the WebGL sky and shared orb transition survive navigation.
- Patient copy lives only in src/shared/copy/patient.ts; card rules in src/features/session/card.ts (pure, tested), browser persistence in storage.ts; why: exact user strings and quote-backed card rules stay in one testable place.
- Reading screens (data-reading) keep day text/glass tokens under the ivory veil at night; why: contrast on the 75% ivory veil.
- React Bits GradientText/ClickSpark are vendored in src/components/ui (ClickSpark is ts-nocheck); why: upstream code, kept close to source.
<!-- AGENT-MEMORY:END -->
