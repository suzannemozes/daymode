# Day Mode: FEA build prompt

A private, one-person app. Paste the prompts into FEA Create one at a time, testing after each. Prompt 1 gives you a working app in well under an hour. Prompts 2–4 add writing time and the look-ahead, the charts, and the AI. Working prototype to compare against: https://claude.ai/artifact/R2wHZxhBpCsnujBWqcJLTS

Before you start, set up in Notion: four filtered views of your task list (Peak, Steady, Wind-down, Restore). For each, use "Copy link to view". You'll paste these into the app's Setup tab.

---

## Prompt 1: the app (about 30–40 minutes)

```
Build "Day Mode", a tiny private React app for one person (me). Plain, simple UI. Do not spend time on design: system fonts, white background, black buttons are fine. Phone-first. No sign-in, no accounts. Save everything in the browser's local storage.

Four tabs: Today, History, Patterns, Setup.

HEADER (every tab): today's date and "Day Mode" on the left. On the right, when cycle tracking is on, a compact red button (#C9332A, white text) "Period started". Tapping it adds today to the period log. Once today is logged, it becomes a white button with a red border and red text, "Logged ✓" with "Tap to undo" underneath; tapping it removes today from the log.

TOP OF EVERY TAB: "YOUR BODY TODAY" CARD (only when cycle tracking is on)
- Label: "Your body today", plus " · age N" when a date of birth is saved.
- Heading: "Day N of [cycle length] · likely [phase]". During days 1–5, also show "Period day N."
- Then the hormone line and the ADHD line for that phase (text below, kept in one editable content block).
- Then any life-stage notes (see LIFE STAGE below), each separated by a thin line.
- A small "Sources" toggle that shows: which cycle length is being used ("Cycle length (N days) is the average of your last logged cycles." or "Cycle length comes from Setup until you've logged a few periods."), then "The research is early, mostly small studies, and women vary a lot, so treat this as a reminder, not a rule, and not medical advice.", then the source links below (the life-stage sources only when a life-stage note is showing).
- If no period is logged: "Add the first day of your last period in Setup to see where you are."
- If today is 7+ days past the expected cycle length: don't guess a phase. Heading "Day N since your last period" and the line "That's later than your usual cycle, so the app won't guess a phase. Tap the red "Period started" button at the top when it comes." Score the day with no cycle adjustment.

Phase text:
- Menstrual. Hormones: "Estrogen and progesterone are both at their lowest." ADHD: "Low estrogen means less support for dopamine, so focus, memory and getting started can feel harder, especially the first couple of days. It eases as estrogen starts to climb."
- Follicular. Hormones: "Estrogen is rising." ADHD: "Often the easiest stretch for focus, motivation and starting things. If you take a stimulant, it tends to work its strongest now."
- Ovulatory. Hormones: "Estrogen peaks, with a brief rise in testosterone." ADHD: "Often sharp, social, high-energy days. Some studies also see restlessness and impulsivity tick up around now, so watch for saying yes to too much."
- Early luteal. Hormones: "Progesterone is rising; estrogen dips, then rises again." ADHD: "Some women notice more impulsivity and wandering attention after ovulation. Rising progesterone may also blunt stimulant medication a little."
- Late luteal. Hormones: "Estrogen and progesterone are both falling fast." ADHD: "The most consistently reported hard stretch: scattered attention, irritability, low energy and mood dips, and medication can feel weaker. It's hormones, not you slipping. Plan lighter."

Phase sources (links):
- ADHD and the menstrual cycle: theory and evidence (Hormones and Behavior, 2024): https://pubmed.ncbi.nlm.nih.gov/38039899/
- ADHD and sex hormones in females: a systematic review (J. Attention Disorders, 2025): https://journals.sagepub.com/doi/10.1177/10870547251332319
- Menstrual cycle hormones and cognition in ADHD: narrative review (J. Clinical Medicine, 2025): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12786913/
- Premenstrual adjustment of stimulant dosage (Frontiers in Psychiatry, 2023): https://www.frontiersin.org/articles/10.3389/fpsyt.2023.1306194

PERIOD LOG AND CYCLE LENGTH
- Keep a sorted list of period start dates (no duplicates). The red header button and the Setup "Add" button both add to it. The latest date is the current cycle's start.
- Cycle lengths = days between consecutive starts.
- Cycle length used by the app: the average of the last 3 cycle lengths between 15 and 90 days, once there are at least 2 of them; otherwise the "Usual cycle length" from Setup (default 28). Clamp to 21–45 days.
- cycle day = days since the latest start + 1
- ovulation day = length − 14
- Menstrual: days 1–5. Follicular: day 6 to ovulation − 2. Ovulatory: ovulation − 1 to ovulation + 1. Early luteal: up to length − 5. Late luteal: the last 5 days.
- If cycle is switched off or nothing is logged, leave it out of everything.

LIFE STAGE (keep the wording in one editable content block)
Signals from the period log count at any age (these are the STRAW+10 markers doctors use); age alone only adds the general 40+ note. Show at most one of the first three, checked in this order:
- 365+ days since the last logged period: "It's been 12 months or more since your last logged period, which is how menopause is defined. Phases no longer apply, so the app leaves them out. Log a period if one comes." (No phase heading, no phase scoring.)
- 60+ days since the last period, or any of the last 3 cycles 60+ days: "You've had a stretch of 60+ days between periods. Doctors use that as the marker of late perimenopause. Phase guesses are rough now; worth raising with your doctor."
- Among the last 4 cycle lengths, at least 2 consecutive pairs differ by 7+ days: "Your recent cycles differ from each other by 7+ days. That's the standard marker of early perimenopause, so treat the phase as a rougher guess, and mention it to your doctor."
- Plus, if age is 40 or over (and not past the 12-month mark): "In your 40s, estrogen swings more widely before it declines. Many women with ADHD find symptoms get harder in perimenopause, and it may start earlier for women with ADHD than for others."
Life-stage sources (links):
- Perimenopausal symptoms in women with and without ADHD (population cohort, 2025): https://pubmed.ncbi.nlm.nih.gov/40903825/
- Menstrual cycle changes approaching the final period: STRAW+10 criteria (2018 review): https://pubmed.ncbi.nlm.nih.gov/30401545/
- Perimenopause overview (Mayo Clinic): https://mayoclinic.org/diseases-conditions/perimenopause

RATING BUTTONS (one shared component, used in three places): Great (5), Good (4), OK (3), Meh (2), Rough (1). The current rating, if any, shows as selected.

TODAY TAB
1) Morning: if there's an earlier check-in from the last 3 days with no rating, show first: "How did yesterday go?" (or the date, if it wasn't yesterday) with the rating buttons. One tap saves the rating onto that day's entry and the card disappears.
2) Four questions, each as tap buttons:
   - Hours of sleep: Under 6 (5), 6–7 (6.5), 7–8 (7.5), 8–9 (8.5), 9+ (9.5)
   - Sleep quality: Awful 1, Poor 2, OK 3, Good 4, Great 5
   - Drinks last night: None 0, 1, 2, 3, 4, 5, 6+ (6)
   - Energy right now: Empty 1, Low 2, Medium 3, Good 4, Buzzing 5
3) Button "Name my mode". Save today's entry (overwrite if I check in again today, keeping any rating) and show a big colored panel in that mode's color: "Today you're in [MODE]", one line of advice, and a button "Open my [MODE] list in Notion" linking to that mode's Notion URL from Setup (open in a new tab). If no URL is set, say "Paste your Notion link for this mode in Setup."
4) Evening: after 5pm, if I've checked in today, show a card "How did today go?" with the rating buttons. Note under the heading: "Rate it now while it's fresh, and tomorrow won't ask." Once rated: "Saved. Tap another to change it."

Mode colors (dark text on Peak and Wind-down, white text on Steady and Restore): Peak #1baf7a, Steady #2a78d6, Wind-down #eda100, Restore #6250d6.

MODE RULES (keep these in one clearly labeled block of code so I can edit them)
Score = sum of:
- Sleep hours: 8+ → +2, 7–8 → +1, 6–7 → 0, under 6 → −2
- Sleep quality: 5 → +2, 4 → +1, 3 → 0, 2 → −1, 1 → −2
- Energy: same as sleep quality
- Drinks: −1 per drink, capped at −5 (6+ counts as 5)
- Cycle phase: Menstrual −1, Follicular +1, Ovulatory +1, Early luteal 0, Late luteal −1 (0 when there's no phase)
Mode: if energy is 1 → Restore. Otherwise score ≥ 4 → Peak; 1 to 3 → Steady; −2 to 0 → Wind-down; ≤ −3 → Restore.
Advice lines:
- Peak: "Your best brain is here. Write the hard thing first, then the calls, pitches and big asks."
- Steady: "A good, ordinary day. Morning writing as usual, then work the business list."
- Wind-down: "Lighter lift. Editing, admin and replies. Stop early on purpose."
- Restore: "Rest is the work today. One small thing, then step away."

Each saved entry: date, sleepHours, sleepQuality, drinks, energy, cycleDay, phase, score, mode, rating.

HISTORY TAB
A simple table, newest first: date, mode, sleep (hours and quality), drinks (show 6 as "6+"), cycle day, and how the day went. The last cell is a small button showing the rating word, or "Rate" if there isn't one. Tapping it opens the rating buttons in a row underneath ("How did [date] go?"). One tap saves and closes it. Under the table: "Tap a day's rating to add or change it."

PATTERNS TAB (no AI yet, just averages of the day ratings)
- Fewer than 5 rated days: "Rate N more days and patterns appear."
- Otherwise, compare average rating for: no drinks vs 1+; 8+ hours sleep vs under 8; sleep quality 4–5 vs lower; energy 4–5 vs lower. Only show a comparison when each side has at least 2 days. Show each as two simple bars with the average and the number of days, sorted by biggest difference first.
- Average rating by cycle phase (phases with 2+ days).
- "Great day recipe": on days rated 5, average sleep hours, sleep quality, drinks, and the most common phase.

SETUP TAB
- About you: date of birth. Under it: "You're N. Your age turns on life-stage notes at the top (from 40). The period log below does the real adjusting, by noticing when your cycles change."
- Cycle: "Include my cycle" switch; "Add a period start date" (date field + Add button) with the note "Add your last two or three if you know them; after that, the red "Period started" button at the top keeps the log going."; a table of the last 8 starts, newest first, with the cycle length before each and a "× Remove" button; "Usual cycle length (days)" with a note saying either "Now using N days, the average of your last N cycles. This number is only a fallback." or "Used until you've logged three period starts; then the app uses your real recent average and keeps updating it."
- Notion: four URL fields (Peak, Steady, Wind-down, Restore).
- Daily reminder: a time (default 8:00am) and two buttons:
  - "Add to Google Calendar": open Google's add-event link with title "Day Mode check-in", 5 minutes long, starting tomorrow at that time, repeating daily (recur=RRULE:FREQ=DAILY), with this app's web address as the first line of the description.
  - "Download for Apple Calendar": an .ics file with the same daily repeat, the app link in the description and URL fields, and an alert at the start time.
- My data: "Download history (CSV)" (check-ins plus the period log), "Import CSV" (so I can restore a backup), "Load 6 weeks of sample data" and "Clear sample data" (mark sample entries so clearing removes only those), and "Delete all data" (with an are-you-sure step).
```

**Check before moving on:** add your last two or three period start dates and your date of birth, check in once, rate a day from History, add the calendar event, and tap the link in your phone's calendar to confirm it opens the app. Then download the CSV once so you know backup works.

---

## Prompt 2: writing time, movement and the two-week look-ahead (about 15–20 minutes)

```
Add three things. The writing question must feel kind, never like a report card: no streaks, no "missed" counts, no red, no totals of days without writing, and rest is always a valid answer.

1) MOVEMENT
Add a fifth morning question: "Did you move your body yesterday?" with buttons Yes / Not yesterday. It's required before "Name my mode". Save it on today's entry as moved (true/false). It does NOT change the score; it's only for patterns. Days saved before this question existed have no value and are left out of comparisons.

2) WRITING TIME (gentle by design)
Make a shared "day review" block: the rating buttons, then "Any writing time?" with a small italic note "Every answer counts, rest included." and buttons:
Rest day (0) · A little (15) · Some · 30–60m (45) · A good stretch · 60–90m (75) · Deep · 90m+ (100). Save as writing (minutes).
After a writing answer is tapped, show one kind line in italic (pick one per day so it doesn't flicker; keep the lines in an editable content block):
- Rest day: "Rest counts. Ideas keep composting while you're away." / "A day off the page is part of the practice." / "Refilling the well is writing work too." And if that day's mode was Restore or Wind-down, instead: "Your body asked for an easier day, and you listened. That's wisdom, not slacking."
- A little: "A little is how books actually get written." / "You touched the work. That keeps it alive." / "Small pages add up to whole chapters."
- Some: "That's real time with the work. Nice." / "Steady pages. That's the craft." / "You made progress you can build on."
- A good stretch: "A good stretch. The book is closer." / "That's a satisfying session. Savor it." / "Look at you, in the flow."
- Deep: "Deep work. Remember what that felt like." / "A big writing day. Enjoy it." / "That's the good stuff. Well done."
Use the day review block in three places:
- the morning "Looking back: How did yesterday go?" card. It now shows while a recent day lacks a rating OR a writing answer. Under it: once rated, a "Done" button that closes the card (if writing wasn't answered, save it as skipped so it won't ask again); before rating, "Tap how the day went to save."
- the evening "How did today go?" card
- the History row editor (opened by tapping a day's rating), with a Close button.
History table: add columns Moved (Yes / –) and Writing (Rest / A little / Some / Good stretch / Deep). Let the table scroll sideways on a phone. Under it: "Tap a day's rating to add or change it, and its writing time."

Patterns tab:
- Add a "Moved the day before" comparison (Moved vs Didn't) to the existing rating comparisons.
- Add a new card at the TOP, "What helps your writing flow". Needs 5+ days with a writing answer; before that: "After N more days with writing time logged, this shows what tends to come before your easier writing days." Compare average writing minutes for: moved the day before (only days with an answer), no drinks, 8+ hours sleep, sleep quality 4–5, morning energy 4–5. Only list conditions where the "with" side is at least 10 minutes higher and each side has 2+ days, top 3, biggest gap first, as sentences: "After [moving your body the day before], your writing time averages about N minutes, compared with about N otherwise (N days)." Then: "These are levers, not report cards. Pick one to lean on this week." If nothing qualifies: "Nothing stands out yet across N days, which is useful too: your writing isn't hostage to any one thing. Check back in a week or two."
CSV: add moved_day_before and writing_minutes columns.

3) TWO-WEEK LOOK-AHEAD (Today tab, at the bottom; only when cycle tracking is on and a period is logged, and not if the current period is already overdue or past the 12-month mark)
- Label "The next two weeks", heading "Plan the big asks for your strong days".
- A 7-column grid of the next 14 days. Each cell: weekday, date number, phase abbreviation (M/F/O/EL/LL), tinted by phase (Menstrual #F3D9D7, Follicular #DCEFE6, Ovulatory #FBEFC9, Early luteal #E3E6F5, Late luteal #EDE0F0). Predict into the next cycle using the cycle length the app is using; mark the expected next period start "● P".
- Each day gets a tone. Once at least 3 phases each have 3+ rated days, use my own averages: phase average ≥ 3.8 → strong, ≤ 2.8 → lighter, else steady. Before that, use the research default: Follicular and Ovulatory → strong; Late luteal and Menstrual days 1–2 → lighter; else steady.
- Strong days get a green outline (#1baf7a); lighter days are slightly faded. A one-line legend lists only the markers that appear.
- Summary lines: "Likely strong: [date range]. Good for pitches, client calls, interviews and big asks." and "Likely lighter: [date range]. Keep these roomy: editing, admin, replies, rest." (up to 2 of each), and "Next period expected around [date]."
- Footer note: "Based on how your own days have gone in each phase." or "Based on general research for now; once you've rated a few weeks, it switches to your own pattern." Add " Your cycles have been varying lately, so treat this as a loose sketch." when the early- or late-perimenopause signal is on. End with " Sleep and drinks still decide each actual day."
```

**Check before moving on:** answer the writing question with "Rest day" once and confirm the line feels kind. If any wording lands wrong for you, change it in the content block. These lines should sound like you.

---

## Prompt 3: charts on the Patterns tab (about 10–15 minutes)

```
On the Patterns tab, under the existing numbers, add these charts drawn as plain SVG (no chart library needed). Each chart gets a small uppercase title and a one-line italic explanation. Keep text at least 11px on a phone. Every dot, bar and day column shows its details on hover/tap (an SVG <title> is fine).

Phase tints, used as light backgrounds and labeled M, F, O, EL, LL: Menstrual #F3D9D7, Follicular #DCEFE6, Ovulatory #FBEFC9, Early luteal #E3E6F5, Late luteal #EDE0F0.

1) "Writing time by mode" (only with 5+ days of writing answers)
   Explanation: "Average minutes on days you logged, rest days included. This shows how much each kind of day tends to hold, so you can plan kindly."
   Horizontal bars for Peak, Steady, Wind-down, Restore in the mode colors, labeled "~N min · Nd", or "mostly rest · Nd" when the average is under 8 minutes.

2) "Where good and rough days fall in your cycle"
   Explanation: "Each dot is a rated day, placed by cycle day. Dashed line = that phase's average. M menstrual · F follicular · O ovulatory · EL early luteal · LL late luteal."
   x = cycle day (1 to the cycle length the app is using), y = rating (Rough to Great). Phase bands shaded behind with their abbreviations on top. One blue dot (#2a78d6, white outline) per rated day. A dashed dark line across each phase band at that phase's average rating.

3) "The last six weeks, lined up"
   Explanation: "Read down a column: the night before, your writing, and how the day went. Tap or hover a day for details."
   Up to the last 42 entries, one column per day, as stacked strips sharing the same days left to right:
   - a thin cycle strip colored by phase, with the abbreviation where each phase begins
   - the day rating as a dark line with dots (Rough to Great; gaps where a day isn't rated)
   - writing time as violet bars (#6250d6); a rest day is a small open violet circle, not an empty gap. Panel label "WRITING TIME · ○ = REST DAY"
   - sleep hours as blue bars, with a dashed guide line at 8 hours
   - drinks the night before as orange bars (#eb6834)
   - a "Moved" row with a small dark dot on days I moved the day before
   Each panel has its own small label. Never put two measures on one axis. First and last dates under the strips.

4) "Drinks the night before → how the day went"
   Explanation: "Average day rating (1 rough to 5 great) and number of days."
   Horizontal orange bars for None, 1, 2, 3, 4 or more, each labeled with the average and day count (e.g. "4.3 · 24d"). "no days yet" when empty.

5) "Was the mode right?"
   Explanation: "If the rules work, Peak days rate highest and Restore days lowest. If not, the scoring needs adjusting."
   Horizontal bars for Peak, Steady, Wind-down, Restore in the mode colors, labeled with the average and day count.
```

---

## Prompt 4: AI patterns (about 15 minutes)

```
On the Patterns tab, add a button "Ask AI what leads to my best days", shown only when there are at least 10 rated days.
When tapped, send the history (date, sleep hours, sleep quality, drinks, energy, moved the day before, cycle day, phase, mode, rating, writing minutes), the list of cycle lengths from the period log, and my current age (the number only, never the date of birth) to Gemini with this instruction:
"You are looking at one person's daily check-ins. 'rating' is how the day went (1 rough to 5 great). 'writing' is minutes of writing (0 means a rest day, which is a valid choice, never a failure). In plain, warm, short sentences: 1) the two or three things most linked to her best days and her easiest writing days, with the numbers behind each; 2) anything linked to her rough days; 3) whether her mode was usually right (did Peak days go well, did Restore days go badly?); 4) how her ratings move across cycle phases, compared with the general pattern that the premenstrual (late luteal) days are often hardest for women with ADHD; 5) given her age and cycle lengths, whether her cycles look steady or are changing, without diagnosing anything; 6) one small, kind experiment to try next week. Never count or list days without writing, never use words like 'missed', 'failed' or 'only', and frame writing findings as what helps rather than what went wrong. Say how many days each finding rests on, call anything under 5 days a hint, and never claim cause. No medical advice."
Show the answer under the button with the date it was made, and save the latest answer so it's there next time.
Keep the Gemini API key in Secrets, never in front-end code.
```

---

## Notes

- Your data stays in one browser on one device. Use the same phone each morning, and download the CSV now and then (clearing browser data wipes it).
- Prompt 4 sends your history, cycle lengths and age (not your date of birth) to Google's Gemini. Only the fields listed go out.
- The app learns your cycle length from the period log, so tap the red "Period started" button each time. Until you've logged three starts, it uses the number you typed in Setup.
- The life-stage notes are reminders, not a diagnosis. If your cycles change, that's worth raising with your doctor.
- The scoring is a starting guess. After three or four weeks, look at "Was the mode right?" and the AI's answer, and adjust the numbers in the mode rules block. Movement isn't in the score yet; if it keeps showing up as a lever, add it.
- The cycle chart and the look-ahead need about two full cycles of rated days before they reflect you rather than the research.
