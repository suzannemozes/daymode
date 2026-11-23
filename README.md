# Day Mode

A private, one-person daily check-in app. Each morning it asks about sleep, drinks, energy and movement, works out the cycle day and phase, names the day's mode (Peak, Steady, Wind-down or Restore), and links to the matching Notion view. It saves history, asks gently how each day and its writing went, and shows patterns in what leads to the best days.

All data stays in the browser on the device (local storage). Nothing in this repository contains personal data.

## What's here

| Path | What it is |
|---|---|
| `prototype/index.html` | The working prototype: one self-contained HTML file (React from a CDN). Open it in a browser to try it. It's the source of truth for behavior and wording until the FEA build replaces it. |
| `docs/FEA build prompts.md` | Four prompts to paste into FEA Create (AI Studio), one at a time, to build the real app. |
| `screenshots/` | Reference screens: the header and period button, writing time and the look-ahead, and the Patterns charts. |

Live prototype (private): https://claude.ai/artifact/R2wHZxhBpCsnujBWqcJLTS

## Building the real app in FEA Create

1. Set up four filtered Notion views (Peak, Steady, Wind-down, Restore) and copy each view's link.
2. In FEA Create, import this repository or attach `prototype/index.html`, then paste **Prompt 1** from `docs/FEA build prompts.md`. Test it.
3. Paste Prompts 2, 3 and 4 in order, testing after each.
4. When the FEA build works, add its code to this repository (for example in `app/`) and make future changes there. From then on the prototype is the original spec.

## Where to edit the rules and words

In `prototype/index.html` (and in the FEA build, by the same names):

- **Mode rules**: the block marked `the mode rules (edit here)`: scoring and thresholds.
- **Phase notes**: `PHASE_NOTES`: the hormone and ADHD lines for each phase.
- **Life-stage notes**: `lifeNotes()`: perimenopause signals (STRAW+10 markers) and the 40+ note.
- **Writing lines**: `WLINES`: the kind lines shown after a writing answer.
- **Mode advice**: `MODES`: colors and one-line advice.

## Sources

The phase and life-stage notes cite their research in the app (the "Sources" toggle on the top card). The research is early and individual variation is large. The app is a reminder tool, not medical advice.
