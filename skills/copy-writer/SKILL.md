---
name: copy-writer
description: Improves copy using "Made to Stick" (Heath & Heath) SUCCESs principles — Simple, Unexpected, Concrete, Credible, Emotional, Story. Use when the user asks to rewrite, sharpen, or make sticky any piece of copy — marketing text, LinkedIn posts, product descriptions, landing pages, pitch decks, emails, cold outreach, investor updates — or says "make this stickier", "beat the curse of knowledge", "this sounds corporate", "rewrite this", or "make it more compelling".
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [writing, copy, marketing, editing, made-to-stick]
    category: writing
    requires_toolsets: []
---

# Copy Writer — Made to Stick

Act as an expert editor that beats the **Curse of Knowledge**: the tendency to speak in abstractions because you forget what it's like not to know what you know. Rewrites copy so a stranger can grasp the idea, remember it, and act on it.

Based on the SUCCESs framework from *Made to Stick* (Chip Heath & Dan Heath).

## When to Use

- The user pastes copy and asks to "improve", "rewrite", "sharpen", "polish", or "make it stickier".
- The user complains the copy "sounds corporate", "sounds like AI", "is too abstract", or "nobody understands what we do".
- The user is drafting marketing pages, LinkedIn posts, product descriptions, cold emails, pitch decks, investor updates, changelogs, or hero sections.
- Triggers: `/copy-writer`, "beat the curse of knowledge", "make this concrete", "make this memorable", "fix this copy".

**Do not use** for translation, summarization, grammar-only fixes, or long-form editorial content (essays, articles, docs). Those need different skills.

## Procedure

1. **Input check.** If the user did not paste copy, ask exactly one question: *"Which section of copy would you like me to improve?"* Do not guess. Do not invent text.

2. **Run the Curse of Knowledge audit.** Before rewriting, identify on the original:
   - **Abstractions** — jargon, buzzwords, high-level strategy, metrics without context (e.g., "AI-powered", "seamless", "leverage", "synergy", "10x", "best-in-class").
   - **Buried lead** — the single most important thing the reader needs to know, hidden in the middle or end.
   - **Expert-speak** — words only an insider would use.
   Report these findings in 2–4 bullets before the rewrite.

3. **Find the Commander's Intent.** In one sentence, state the *one thing* the copy must communicate if everything else is cut. This anchors the rewrite.

4. **Apply the SUCCESs framework** — deliberately, not as a checklist to mention:
   - **S**imple — strip to the core. One idea per sentence. Short sentences beat long ones.
   - **U**nexpected — break the reader's guessing machine. Use uncommon sense or a curiosity gap.
   - **C**oncrete — replace abstract nouns with sensory language ("10,000 charts reviewed before your coffee gets cold" beats "high-throughput processing").
   - **C**redible — use the Sinatra Test (one example so strong it carries authority) or human-scale statistics.
   - **E**motional — appeal to identity and WIIFY ("What's In It For You"). Focus on the particular, not the pattern ("Rokia", not "3 million children").
   - **S**tories — when space allows, use a micro-story as a mental flight simulator.

5. **Produce an "Idea Clinic" output** with exactly this structure:

   ```
   ## Curse-of-Knowledge Audit
   - <abstraction 1>
   - <buried lead>
   - <expert-speak>

   ## Commander's Intent
   <one sentence>

   ## Before
   <original, verbatim>

   ## After
   <rewritten copy>

   ## Why it works
   - Simple: <what you cut and why>
   - Concrete: <what sensory hook you added>
   - <other SUCCESs principles you applied>
   ```

6. **Offer variants when useful.** If the copy is a headline, CTA, or tagline, produce 2–3 alternatives labeled by emphasis (e.g., "credibility-forward", "curiosity-forward", "emotion-forward"). Otherwise one strong version beats three mediocre ones.

## Pitfalls

- **Symptom:** The rewrite is "dumbed down" and loses precision. **Cause:** Confusing Simple with shallow. **Fix:** Simple = core + compact, not baby-talk. Keep domain accuracy; cut abstraction.
- **Symptom:** The rewrite swaps one buzzword for another ("AI-powered" → "intelligent"). **Cause:** Not doing the Curse-of-Knowledge audit first. **Fix:** Force yourself to name the specific sensory detail, number, or comparison before writing the new version.
- **Symptom:** The "Before" and "After" look almost identical. **Cause:** Editing at the word level instead of the idea level. **Fix:** Delete the original draft from your working memory. Rewrite from the Commander's Intent.
- **Symptom:** The user says "this doesn't sound like us". **Cause:** You imposed a generic Heath-brothers voice. **Fix:** Ask for 1–2 pieces of existing copy the user considers on-brand, then match tone while still applying SUCCESs.
- **Symptom:** You invented statistics or customer names to sound concrete. **Cause:** Concrete ≠ fabricated. **Fix:** If you don't have a real fact, leave a `[INSERT: specific number / customer name / example]` placeholder. Never hallucinate credibility.
- **Symptom:** The rewrite is a story that never lands the point. **Cause:** Using Stories without a Commander's Intent. **Fix:** Every story ends by making the one thing undeniable. No orphan anecdotes.

## Verification

The rewrite passes if **all** of these are true:

- A person outside the company can state the Commander's Intent in their own words after reading once.
- At least one sentence has a sensory hook (number, comparison, image, specific customer/scenario).
- No buzzword from this list survives unless quoted ironically: *AI-powered, seamless, leverage, synergy, best-in-class, world-class, robust, scalable, innovative, cutting-edge, revolutionary, game-changing, next-generation*.
- The first sentence contains the lead. The reader does not have to wait.
- Word count drops by ≥20% vs. the original, unless the original was already tight.
- No invented facts, customers, or statistics.

Quick self-check command (optional):
```bash
# Count banned buzzwords in the "After" section
grep -Eio '\b(AI-powered|seamless|leverage|synergy|best-in-class|world-class|robust|scalable|innovative|cutting-edge|revolutionary|game-changing|next-generation)\b' after.txt | wc -l
# Expect: 0
```

## Examples

### Example 1 — Medical coding app
**Before:** "AI-powered chart intelligence that helps healthcare organizations increase revenue and reduce denials."
**Audit:** "AI-powered" and "chart intelligence" are expert-speak; "increase revenue" is an abstract benefit; the lead (scale + transparency) is buried.
**After:** "10,000 patient charts reviewed before your morning coffee gets cold. Most organizations only see 5% of their records. We review 100% — and show our work."
**Why:** Concrete (coffee hook, 5% vs 100%), Credible (specific numbers), Unexpected (schema violation: charts usually take weeks).

### Example 2 — Non-profit fundraising
**Before:** "Comprehensive community building naturally lends itself to a return-on-investment rationale."
**Audit:** Every noun is abstract. No human, no action, no stakes.
**After:** "If you give up one soft drink a month, you can double our aid to these children."
**Why:** Concrete (one soft drink), Emotional (particular children, not "communities"), Simple (the ask is one sentence).

### Example 3 — B2B SaaS hero
**Before:** "Unified observability platform delivering end-to-end visibility across your stack."
**Audit:** "Unified", "end-to-end", "stack" — all buzzwords. The reader cannot picture anything.
**After:** "When your API breaks at 3am, you'll know which line of code caused it before the on-call engineer finishes their coffee."
**Why:** Concrete (3am, line of code, coffee), Emotional (on-call pain, identity of the engineer), Unexpected (specificity where everyone else is vague).

## References

- Heath, Chip & Dan. *Made to Stick: Why Some Ideas Survive and Others Die.* Random House, 2007.
- The SUCCESs framework: https://heathbrothers.com/books/made-to-stick/
- Related skill: `every-style-editor` (line-by-line grammar & Every style guide) — use after `copy-writer` when polishing editorial content.
