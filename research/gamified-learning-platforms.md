# Gamified and interactive learning platforms: what they do, what the research says, and what Unreal Dojo should take from them

Written 2026-10-21 for the Unreal Dojo game design (see `PLAN.md` section 5 for the current rule set this document is meant to inform). Every claim carries a URL. Where a platform's own page did not state a rule, that gap is written down rather than guessed. Where a source is the company's own marketing, it is labelled as such.

How to read this: section 1 is one block per platform (what it teaches, how a lesson flows, the mechanics and their rules, what users praise and complain about, what to borrow and what to leave). Section 2 is one block per research finding with the design implication for Dojo. Section 3 ranks the mechanics to adopt. Section 4 lists what to avoid. Section 5 proposes a session shape.

Unreal Dojo quest kinds referenced throughout: **concept** (card plus 3 to 5 recall questions), **drill** (spaced recall over due terms and patterns), **breakdown** (decompose a finished mechanic or system into classes, components, data, events, and an order before coding), **build** (write real UE C++, compiled and tested by the engine), **boss** (breakdown, then build pieces, then integration).

---

## 1. Platforms

### 1.1 Brilliant

**What it teaches.** Math, science, data, and programming through short interactive problems. Courses are now called topics, levels are units, and lessons are "concepts" (https://brilliant.org/help/features/what-is-a-streak).

**How a lesson flows.** Problem first, explanation after. Brilliant's own description: learners "work through questions before receiving explanations, so they can discover why a method works before they rely on it"; each concept introduces one idea at a time starting from the simplest useful case, using draggable diagrams and animations to connect concrete experience to notation. Wrong answers are treated as diagnostic information and the interactive problem responds while the reasoning is still fresh. The digital tutor (Koji) can see the problem, the on-screen state, and the learner's attempts; it asks guiding questions, highlights parts of diagrams, breaks problems into steps, and is explicitly meant to fade support as the learner gains independence rather than hand over answers. Independent practice removes scaffolding and tutoring; practice sets use retrieval rather than rereading, new contexts, spaced review across sessions, interleaving of related problem types, and corrective feedback. The page cites Freeman et al. 2014 (active learning), Roediger and Karpicke 2006 (testing effect), Rohrer and Taylor 2007 (shuffled math practice), and Hattie and Timperley 2007 (feedback) (https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/). This is a marketing page, but it is the clearest statement of a problem-first design on any platform surveyed.

**Mechanics and rules.**
- Streak: a day counts when you complete 3 problems or one full concept. Missing a day auto-applies a Streak Charge if you hold one; eligible long streaks may get one free automatic save; otherwise the streak resets to 0 (https://brilliant.org/help/features/what-is-a-streak).
- Streak Charge: earned by completing a concept or practice when eligible and when you have room; hold at most two; they never expire; using one keeps the streak at its count but does not add a day (https://brilliant.org/help/features/what-is-a-streak-charge/).
- XP: earned for completing concepts, solving problems, and engaging with topic content; amount "scales with the time and effort"; repeating the same concept on the same day earns nothing, redoing it on a later day earns again (https://brilliant.org/help/features/what-is-xp).
- Leagues: 30 learners per league, weekly cycle resetting Monday 03:00 UTC, placed automatically the first time you earn XP in a week, 10 tiers (Hydrogen, Lithium, Carbon, Neon, Titanium, Xenon, Barium, Neodymium, Tungsten, Einsteinium), end-of-week rank decides promotion, demotion, or stay. Cutoffs and opt-out are not on the page (https://brilliant.org/help/features/what-are-leagues-and-leaderboards).
- Hints and solutions: the help pages fetched do not price hints. The tutor is positioned as guidance rather than an answer key (https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/).

**Praise and complaints.** Trustpilot reviewers praise step-by-step intuition ("explained intuitively and step by step"), a difficulty range "from very easy to very challenging," and that streaks and leagues "incentivise daily engagement without punishing taking a day off." The dominant complaint is billing: surprise annual charges, a free trial that "eats your 14 day cooling off period," refused refunds (https://ca.trustpilot.com/review/brilliant.org?page=4). A long-form review praises the small daily chunks and simple UI but complains that progress is only emailed as percentages and not shown on the dashboard, that sound effects annoy, and that the product is priced and positioned like a kids' product while serving adults (https://hackernoon.com/learning-programming-bewitched-by-brilliant-gamification-a-sort-of-product-review-of-brilliant). Brilliant's own "reddit reviews" page is curated marketing and shows no criticism (https://brilliant.org/help/why-brilliant/reddit-reviews).

**Borrow.** Problem-before-explanation as the default shape of a concept quest (ask one recall or prediction question before showing the card, not after). Wrong answers as diagnosis: respond to the specific wrong option, not just "incorrect." The "no XP for the same concept the same day, XP again on a later day" rule, which rewards spacing instead of grinding. Two-charge cap on streak protection. Progress visible on the home screen (the complaint about emailed percentages).

**Leave.** Leagues (needs accounts and 30 live peers; see section 4). Daily-day streak granularity (Dojo build quests take 20 to 60 minutes and an engine build; a 3-day window fits better, which PLAN.md already has).

### 1.2 Boot.dev

**What it teaches.** Backend development (Python, Go, SQL, HTTP, Docker, Kubernetes) in paths that take "about 12 months" for most students (https://www.boot.dev/).

**How a lesson flows.** Short lessons with an in-browser exercise that is checked automatically, project lessons, and an AI mentor ("Boots") that uses "the Socratic method" and "helps you solve problems instead of just giving the answer" (https://www.boot.dev/blog/news/bootdev-beat-2023-10, https://www.boot.dev/).

**Mechanics and rules** (all from https://blog.boot.dev/wiki/the-game/).
- XP: earned mostly by passing coding exercises. Level thresholds: level 2 at 400, level 3 at 880, level 4 at 1,440, level 5 at 2,080 (so 480 XP from level 2 to 3).
- Roles: unlock at level 10 (Apprentice), 20 (Pupil), 30 (Acolyte), 40 (Disciple), 50 (Scholar), 60 (Sorcerer), 70 (Sage), 80 (Archsage), 90 (Mage), 100 (Archmage). Shown on the profile and in Discord with perks.
- Quests: each day pick one of three; each requires earning a set XP that day; harder quests give better chests; one quest per 24 hours; you cannot abandon an accepted quest.
- Chests: awarded by quests; opening gives gems and random items (Sharpshooter Armor, XP Potions, Baked Salmon, Seer Stones, Frozen Flames). Gems buy items in the store. Drop rates and prices are not published.
- Sharpshooter Spree: 15 assignments correct in a row with no mistakes; running code does not count as a mistake; once earned a spree is never lost; completing one grants a random chest and counts toward achievements.
- Sharpshooter Armor: protects a spree; a wrong assignment consumes one armor piece instead of the spree; an assignment once protected stays protected; armor is not consumed on resubmits of already-completed assignments, when the spree is 0, or if armor was already used on that lesson.
- Seer Stone: lets you view the solution without losing lesson XP; auto-consumed on "View Solution"; without one you lose 100% of the lesson's XP.
- Baked Salmon: lets you talk to Boots without the 50% XP penalty that normally applies to lesson completion after using Boots.
- XP Potion: bought with gems; +50% XP on new assignments for 30 minutes; stacking adds 30 minutes.
- Streak: must pass a new assignment at least every seven days; a Frozen Flame is consumed instead of streak progress if you miss, buying seven more days; losing a streak keeps earned streak achievements but the next one starts over.
- Boss events: platform-wide, every few months; bonus XP, chests, and boss achievement progress; at least 5,000 XP must be earned during the event to qualify; more participants raise the bonus for everyone.
- Karma and leaderboards: karma for helping in Discord; public leaderboard spots for daily XP and top karma.

**Praise and complaints.** Trustpilot 4.8/5 from 231 reviews (93% five-star). Praise: gamification "really works for my ADHD," streaks drive daily use, Boots helps "without simply giving the answer," lessons explain reasoning. Complaints: a one-star review says the site leans on "trust me, this works"; others report wrong quiz answers, a cluttered and slow interface, a steep curve for absolute beginners (https://ca.trustpilot.com/review/www.boot.dev).

**Borrow.** The economy is the most complete worked example of pricing help: hints and solutions cost XP, and consumables buy exemptions. PLAN.md already mirrors Seer Stones, hint cost, sprees, armor, and frozen flames. Worth keeping: the "running code is not a mistake" rule (map to Dojo: Run never counts against the spree, only Submit does); spree never lost once earned; streak at 7-day granularity for a demanding curriculum; three daily quests of rising difficulty with better chests; boss events as collective, time-boxed pushes with a minimum participation bar.

**Leave or change.** A 50% XP penalty for talking to the tutor discourages asking questions, which is the opposite of what the self-explanation and subgoal research wants (section 2). Dojo should charge for *answers* (hint spells, seer stone) and never for *asking* the reviewer to explain a finding. Unpublished drop rates and gem prices make the economy feel arbitrary; Dojo should publish its rates in GAME_RULES.md. Karma and leaderboards need a community Dojo does not have in v1.

### 1.3 Duolingo

**What it teaches.** Languages, with the "Duolingo Method" stated as five principles: interactive learn-by-doing lessons built around patterns with "optional hints and short explanations along the way"; personalization via an AI model that "adjusts the order and difficulty of the exercises you see"; standards alignment (Common Core and CEFR); motivation through "bite-sized lessons, points, streaks, and friend competition"; and delight (characters, humor), with the line "funny content sticks with you" (https://blog.duolingo.com/duolingo-teaching-method/).

**How a lesson flows.** Exercises start simple and get harder; hints are tappable per word. After select exercises an "Explain My Answer" button gives a personalized explanation of the error, tailored to the learner's language background; the stated rationale is that "mistakes might be necessary for learning" and that understanding the reason behind a rule builds confidence (https://blog.duolingo.com/explain-my-answer-now-free/).

**Personalization engines.**
- Half-life regression (2016): per-word practice history feeds an exponential forgetting curve; correct recalls lengthen the half-life, mistakes shorten it; the best time to practice is when recall is "on the verge of failing," and the model is working if learners remember "a little more than half the time." Offline, its error was nearly half that of the Leitner system on 12 million sessions; in A/B tests it raised daily retention about 9.5% for practice, 1.7% for lessons, and 12% overall (https://blog.duolingo.com/how-we-learn-how-you-learn/).
- Birdbrain (2020): predicts the probability a learner answers a given exercise correctly, combining a learner model with item difficulty, and feeds the Session Generator so lessons skip mastered items and avoid too-hard ones. Duolingo reports learners "learn more" and complete more lessons in A/B tests, with no numbers given (https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/).

**Mechanics and rules.**
- Streak: one lesson a day now extends it (previously the full daily goal was required). The change was made because learners with the hardest daily goal were least likely to hold a streak even when they opened the app daily. A/B results: day-14 retention +3.3%, daily active learners +1%, share of daily learners on a streak +10.5% within 20 days, new learners on a streak +19%; a year later just over half of daily learners held a 7+ day streak, up from about a third (https://blog.duolingo.com/improving-the-streak/).
- Streak research: early streak days feel rewarding and later ones less so (2 to 3 days is +50%, 200 to 201 is +0.5%), so Duolingo adds milestone celebrations; loss aversion keeps long streaks going; a new milestone animation raised 7-day retention of new learners by 1.7%; reaching a 7-day streak made learners 3.6 times more likely to complete a course (correlational); allowing two streak freezes at once raised daily active learners by 0.38%, citing University of Pennsylvania and UCLA research that slack in goal pursuit can raise motivation; the post admits losing a long streak can make learners avoid lessons entirely (https://blog.duolingo.com/duolingo-streak-research/).
- Leagues: ten tiers (Diamond at the top), new league every Sunday in the learner's time zone, grouped with learners of similar habits and time zone, competition spans all courses; the top 10 Diamond learners qualify for a three-round Diamond Tournament; opt out by turning off "Make My Profile Public"; the post acknowledges "the competition is too intense" and cheating suspicions (https://blog.duolingo.com/duolingo-leagues-leaderboards/).

**Praise and complaints.** The quantitative praise is Duolingo's own retention numbers above. The strongest independent critique is a qualitative study of 357 forum posts, 30,618 comments, and 15 interviews documenting gamification misuse: XP farming, repeating easy stories as "one of the cheapest ways" to climb leagues, streak obsession where losing one led users to quit, league cheating including paid hacking tools, and compulsive binge lessons without retention. Reported effects: lower confidence and interest, anxiety about rankings, disrupted routines, even repetitive strain injury. Causes included "dark nudges" such as demotion despite meeting daily goals, and random grouping of learners at different levels. Recommendations: compare learners fairly, make gamification optional, weight rewards by difficulty, reward progression over repetition, measure cognitive engagement not just behavior, and tell users what each mechanic is for (https://ar5iv.labs.arxiv.org/html/2203.16175). A behavioral-science essay makes the same point from the product side: people "optimize for the metric rather than the goal it was meant to represent," users who break a streak are more likely to quit entirely, and guilt messaging ("You made Duo sad") creates obligation rather than motivation (https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification).

**Borrow.** The minimum-viable streak unit (one small completed thing keeps the streak; the big goal is tracked separately) is the single best-evidenced retention rule in this survey. Milestone celebrations that scale (7, 30, 100). Two-freeze cap. "Explain my answer" after a miss, free and optional. A difficulty model that targets "a little more than half" recall at the moment of review (this is what SM-2 or FSRS gives the drill for free). Explain the purpose of each mechanic inside the app.

**Leave.** Leagues and any XP-per-repetition reward that makes grinding the cheapest path. Guilt notifications. Streak as a daily unit for an app whose core unit of work is an engine build.

### 1.4 Codecademy

**What it teaches.** Web, Python, data, and career paths in a browser editor.

**How a lesson flows.** Narrative and instructions on the left, editor in the middle, output on the right; checkpoints are checked automatically. Codecademy's own write-up of the current learning environment lists: "Explain code" by highlighting a selection; AI hints on practice projects that "confirm you're on track or point to the next step" without giving the solution; hovering a term shows a Docs definition with a jump to the full Doc; autocomplete that can be turned off "to practice syntax" (https://www.codecademy.com/resources/blog/new-learning-environment-platform-features). The help center adds: the AI Learning Assistant reads the course, instructions, and solution code and can check a solution and explain errors, with "unlimited prompts" for Pro and Plus and a limited number for free users; it can be switched off; Doc Tooltips must be turned on; a Job-Readiness Checker and Interview Simulator exist (https://help.codecademy.com/hc/en-us/articles/23400751016859-AI-Features-available-on-Codecademy).

**Mechanics and rules.** Weekly Targets: you choose how many days per week to make progress; a day counts when you make any progress; each week you hit the target your weekly streak grows by one; weeks begin Monday 00:00. Badges: exercise-count badges, course badges, course-specific badges, promotion badges, weekly-target achievements; thresholds and what happens on a missed week are not stated (https://help.codecademy.com/hc/en-us/articles/115003050088-About-Badges-and-Weekly-Targets).

**Praise and complaints.** Trustpilot 2.4/5. Praise: "clear, interactive, and well-structured" with "instant feedback when coding," good foundation, fast human support. Complaints: dark-pattern auto-renewal and refund trouble dominate; "minimal instructions" and outdated courses; the AI helper "doesn't resolve problems" and is unavailable in some practice sessions; certificate generation bugs (https://ca.trustpilot.com/review/codecademy.com?page=2).

**Borrow.** Hover definitions everywhere, including inside the editor (PLAN.md 4.1 already does this with a Monaco hover provider). "Weekly target in days" as an alternative to a daily streak: the learner picks the cadence and the streak counts weeks. Autocomplete that the learner can switch off for syntax practice; Dojo could do the reverse and offer "no completion" drills.

**Leave.** Checkpoint-by-checkpoint instructions that tell you exactly which line to type. The Trustpilot and forum complaints that Codecademy leaves people unable to start a project alone are the "tutorial hell" failure Dojo's breakdown quests exist to prevent.

### 1.5 CodeCombat and Ozaria

**What they teach.** CodeCombat: Python or JavaScript through a dungeon-crawler where typed code moves a hero; 11 courses (CS 1 to 6, Game Development 1 to 3, Web Development 1 to 2), AP CSP prep. A level is a puzzle: type code, run, watch what happens; "hints and tutorials help when players get stuck." Reviewer's con: in-game supports are "extensive but text-heavy, which may cause more frustration than relief" (https://www.commonsense.org/education/reviews/codecombat). Ozaria: same company, built for classrooms, a connected fantasy narrative in cutscenes, puzzles gate the story, each chapter ends with a capstone project; cons: students have no narrative choices and the puzzles resemble other coding games; only chapter one is free (https://www.commonsense.org/education/reviews/ozaria). The CEO's reason for the pivot: "Combat doesn't play well in today's educational climate," and the aim to "encourage players to create, not crush" (https://edsurge.com/news/2019-08-28-codecombat-dials-down-the-fighting-for-its-next-coding-game-and-raises-6-million).

**Mechanics and rules.** Gems, heroes, and items exist in the consumer product but neither review page documents their rules, so none are stated here.

**Borrow.** The idea that the output of code is a visible thing in a world. Dojo's "See it in editor" component is the equivalent; a build quest should, whenever possible, end with the learner seeing their mechanic run in the sandbox map, not only a test report. Capstone per chapter maps to Dojo's boss per world.

**Leave.** A fictional world the learner has to care about. Sailer and Homner found game fiction mattered only for behavioral outcomes, not learning (section 2.1), and the Ozaria review notes the fiction gives no agency. Dojo's fiction should stay thin: roles, cards, and a studio, not a storyline.

### 1.6 Exercism

**What it teaches.** Fluency in 85 languages through "learning, practice and mentoring"; free forever (https://exercism.org/docs/mentoring).

**How a track flows.** Learning Mode: Learning (concept) Exercises unlock further Learning and Practice Exercises; it is the default on tracks that have them. Practice Mode: everything unlocked. Each Learning Exercise "should take about 5 minutes if you're fluent." Mentoring can be requested on any exercise in either mode (https://exercism.org/docs/building/product/unlocking-exercises). The v3 rationale is the most honest design post-mortem in this survey: v2 "doesn't explicitly teach concepts," relied on mentors giving hints after mistakes, students "often repeat early mistakes later," unidiomatic solutions to complex exercises created mentor backlog and "slow feedback breaks learning momentum." The fix: Concept Exercises with one clear learning goal each, stubs to avoid boilerplate, small enough that about 95% of iterations can be analyzed automatically, unlocking driven implicitly by "concepts learnt" and "prerequisite concepts" tags rather than a hand-ordered list; Practice Exercises are story-based, have no approval step, and come with community "Approaches" articles that explain common solutions and tradeoffs (https://github.com/exercism/v3/blob/master/docs/rationale-for-v3.md).

**Mechanics and rules.** Reputation only, no XP: 5 for mentoring a solution to completion; 1, 2, or 3 for publishing a solution by difficulty; 20 for authoring an exercise; 10 for a concept; 12 default for a merged PR; cannot be spent; thresholds unlock privileges (https://exercism.org/docs/using/product/reputation).

**Praise and complaints.** Forum users praise the onboarding explanation of the two modes but are confused about whether to do practice exercises during learning mode; a maintainer notes learning exercises are solvable with what you have learned so far while practice exercises "have no restrictions" and can be hard even for experts; easy exercises are "more likely to be picked up by a mentor" (https://forum.exercism.org/t/learn-vs-practice-mode/38380/11).

**Borrow.** Prerequisite-tag unlocking instead of a fixed linear order (a quest declares `concepts[]` it teaches and `terms[]` it needs; the map unlocks whatever is satisfiable). "Approaches" after submission: Dojo's "shows one alternative breakdown after" (PLAN.md 4.2) is this; extend it to build quests by showing one alternative reference solution with a one-paragraph tradeoff note after a pass. Keep concept quests small enough to grade automatically; put the AI reviewer's budget on build and breakdown.

**Leave.** Human mentoring queue (no community in v1). Reputation as the only reward; Exercism explicitly chose not to gamify, which fits a free community product but does not give the solo learner the short-loop feedback Dojo wants.

### 1.7 Scrimba

**What it teaches.** Front-end web through "scrims": recordings of editor events rather than video, about 1% of a video's size, which the viewer can pause at any moment, edit the code, and experiment with. The founders' reasoning: explaining code on video "often took an hour" for something that takes two minutes in person, and letting learners "test ideas directly instead of only watching" closes that gap (https://survivejs.com/blog/scrimba-interview/).

**Mechanics and rules.** No XP or streak system is documented on the pages fetched. The product's loop is short lesson, immediate challenge in the same editor.

**Praise and complaints.** Trustpilot 4.1/5 from 78 reviews. Praise: "the best online learning platform I've ever used," the active-recall approach, short lessons followed immediately by practice, enthusiastic instructors. Complaints: cancellation and renewal problems, exercises "too easy for real-world work," lessons "split into too many small pieces," few advanced courses, editor bugs (https://nl.trustpilot.com/review/www.scrimba.com?page=2).

**Borrow.** The "pause and edit the example" idea maps onto Dojo's concept card example: the one fenced C++ example on a card should be editable and runnable in a scratch buffer (even if only syntax-checked), not static text. Worked examples that can be poked are better worked examples (section 2.5, 2.7).

**Leave.** Video-length pacing. Dojo's unit is a quest, not a screencast.

### 1.8 Mimo

**What it teaches.** Python, web, SQL, in a mobile-first Duolingo-style format with a Practice tab, projects, and challenges.

**Mechanics and rules.**
- Leaderboard position is based on XP from lessons, projects, and challenges; leagues, group size, and cycle are not documented on the help page (https://support.mimo.org/hc/en-us/articles/24330086777874-What-is-the-Mimo-Leaderboard-and-how-does-it-work).
- Streak Freeze: bought ahead of time from the store with coins, activates automatically on a missed day, cannot cover the day of purchase; cost and holding limit are not stated (https://support.mimo.org/hc/en-us/articles/360017480999-How-does-the-Streak-Freeze-work).
- Streak Repair: store item, once per month, restores a single inactive day, works even for a previous month (https://support.mimo.org/hc/en-us/articles/360017480779-I-ve-lost-my-Mimo-streak-How-can-I-repair-it).
- Streak Challenge: buy the item, then "Code 7 days in a row," "No breaks allowed," and freezes, weekend tickets, and repairs do not cover gaps; the reward is not stated (https://support.mimo.org/hc/en-us/articles/25873385070098-How-Streak-Challenge-works).

**Praise and complaints.** No independent review with specifics was reachable; the help-center structure (freeze, repair, weekend ticket, challenge) shows a product whose economy is mostly about protecting the streak.

**Borrow.** The opt-in "challenge" item: the learner stakes something for a self-chosen 7-day commitment. A Dojo variant: "Boss week," where the learner commits to finishing a boss within seven days for a bonus chest; failing costs nothing but the stake.

**Leave.** Three different paid streak-protection items. One freeze type is enough.

### 1.9 Sololearn

**What it teaches.** 13 languages plus fundamentals, in a "learn, quiz, practice" format with linear, short lessons; staff write the first lessons of each course and users write many of the rest; each lesson has a glossary, a Reddit-style comment thread (up to about 700 comments, often unmoderated), and a built-in IDE (https://careerkarma.com/blog/sololearn-app-review/).

**Mechanics and rules.** XP from lessons and challenges feeds levels; higher levels earn certificates; head-to-head challenges use a modified Elo system where XP gained or lost depends on the gap with the opponent; regional and global leaderboards; ads for non-Pro users including full-screen timed ads; Pro was $6.99/month at review time (https://careerkarma.com/blog/sololearn-app-review/). Hearts (lives) exist: a reviewer says "correct answers feel intentionally skewed to make you lose lifes and pay for pro" (https://kimola.com/reports/essential-insights-from-sololearn-app-user-feedback-google-play-en-141037). No official rules page for hearts was reachable.

**Praise and complaints.** Praise: community help, strong IDE, volume of content, explanations that "stick." Complaints: not for beginners, jargon-heavy, undefined terms despite a glossary, ads, Code Coach challenges locked behind Pro and hard without reading comments, tooltips that appear at random (https://careerkarma.com/blog/sololearn-app-review/, https://kimola.com/reports/essential-insights-from-sololearn-app-user-feedback-google-play-en-141037).

**Borrow.** Nothing structural. The one useful signal is negative: a glossary that leaves terms undefined is a complaint, which supports Dojo's verifier rule that every term in a quest exists in the glossary.

**Leave.** Hearts that gate attempts (section 4). Elo duels. Ads.

### 1.10 Kaggle Learn

**What it teaches.** Practical data science in free micro-courses of 3 to 8 hours, described by its lead as "the fastest possible way to start doing a new type of data science project," with practice over theory (https://www.kdnuggets.com/2019/08/kaggle-learn-faster-data-science-education.html).

**How a lesson flows.** Each lesson is a tutorial notebook paired with an exercise notebook; you read the tutorial, then run the exercise notebook; some cells include a verification that confirms the code is correct; special hint cells reveal guidance; finishing all lessons in a module earns a certificate (https://www.packtpub.com/en-ar/product/developing-kaggle-notebooks-1-9781805128519/chapter/introducing-kaggle-and-its-basic-functions/kaggle-learn). The checker lives in the open-source `learntools` package, with a `core` module providing the exercise-checking infrastructure and one module per course (https://github.com/Kaggle/learntools).

**Mechanics and rules.** None beyond completion and certificates. Hints and solutions are free and un-priced.

**Praise and complaints.** Recommended for beginners and as concise refreshers; the lead's own advice is to prioritize personal projects over long courses (https://www.kdnuggets.com/2019/08/kaggle-learn-faster-data-science-education.html).

**Borrow.** The exact pairing "tutorial then exercise in the same environment with an in-place checker" is Dojo's concept-then-build pairing. The learntools idea of a per-question checker object that owns its hint and its solution is a clean content model: each Dojo build quest's tests, hints, and reference solution live together under the quest id (PLAN.md already stores `solutions/<quest-id>/`).

**Leave.** Un-priced solutions. Without a cost, "show solution" becomes the default path for a tired learner; the testing-effect evidence (section 2.2) says the attempt is where the learning is.

### 1.11 Khan Academy

**What it teaches.** K-12 and early college math and science, plus computing.

**Mechanics and rules.**
- Mastery levels per skill: Not started, Attempted (below 70% on an exercise), Familiar (70 to 99%), Proficient (100% on an exercise), Mastered (Proficient plus correct on the skill in a mixed-skill assessment). Missing skill questions in a mixed assessment moves a skill down one level (Mastered to Proficient, Proficient to Familiar, Familiar to Attempted) (https://support.khanacademy.org/hc/en-us/articles/5548760867853).
- Course mastery percentage: share of skills at Proficient or Mastered; exercises, quizzes, unit tests, and course challenges can move skills up or down, and the learner sees which skills changed after each activity (https://support.khanacademy.org/hc/en-us/articles/115002552631).
- Energy points: a measure of effort ("learners earn more energy points by pushing the edge of their knowledge"), earned for programming challenges, videos, practice, and tasks; they unlock avatars and feed some badges; they are explicitly not a measure of mastery (https://support.khanacademy.org/hc/en-us/articles/202487710-What-are-energy-points-).

**Praise and complaints.** A learner on the support forum complains that course mastery only goes up: "If I get the questions right ONCE, my course level mastery level bumps up, and never comes back down," while his real retention two days later is poor; staff asked for a ticket and the thread ended unresolved (https://support.khanacademy.org/hc/en-us/community/posts/17266266115469).

**Borrow.** Two separate meters: an effort meter (XP) and a mastery meter (skill levels) that can go down. Mastery only confirmed by a *mixed* assessment, which is exactly what an interleaved drill is. Dojo's skill tree should show skill level derived from drill and rematch performance, not from "passed once."

**Leave.** Mastery that never decays. The forum complaint is the failure mode; Dojo's SM-2 or FSRS drill gives decay for free.

### 1.12 Anki, SM-2, and FSRS

**What Anki's SM-2 variant does** (https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm). Cards start at ease 250%. New cards walk through learning steps: Again goes back to step one, Hard repeats, Good advances, Easy graduates at once; failures in learning do not lower ease. Review cards: Again subtracts 20 ease points and sends the card to relearning with the interval multiplied by the "new interval" setting; Hard subtracts 15 and multiplies the interval by 1.2; Good keeps ease and multiplies the interval by ease; Easy adds 15 and multiplies by ease times an easy bonus. Ease cannot drop below 130%; each new interval is at least one day longer than the previous; late answers are factored in. Differences from original SM-2: initial intervals come from learning steps not fixed 1 then 6 days; four buttons not six; failure resets by default but can be set to reduce instead.

**What FSRS does** (https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm, https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm, https://domenic.me/fsrs/). Three per-card components: Difficulty (1 to 10), Stability (the interval at which recall probability falls to 90%), Retrievability (probability of recall now). FSRS-6 retrievability is R(t,S) = (1 + factor * t/S)^(-w20) with factor chosen so R(S,S) = 0.9 and the decay exponent trainable. After a successful review, the stability gain is smaller when difficulty is higher, smaller when stability is already high (saturation), larger when retrievability was lower (the spacing effect), and always at least a factor of 1. After a lapse, the new stability falls with difficulty, rises sublinearly with prior stability, and is larger if retrievability was low at the lapse. Difficulty shifts with each grade and is pulled back toward its initial value to prevent "ease hell." Parameters (21 in recent versions) are fitted to the user's history; the user sets a desired retention (90% default in Anki) and the scheduler derives intervals. Anki's docs say FSRS needs fewer reviews than SM-2 for the same retention and handles delayed reviews better, and preliminary tests put it on par with SuperMemo's proprietary SM-17.

**Praise and complaints.** The FSRS development log notes that most attempts to eliminate "ease hell" (a card whose ease has been hammered down so it shows up constantly) hurt prediction metrics, that FSRS kept bidirectional damping, and that log loss replaced calibration graphs as the main metric because the latter can be gamed (https://www.lesswrong.com/posts/G7fpGCi8r7nCKXsQk).

**Borrow.** Use SM-2 as the v1 scheduler (PLAN.md says "SM-2 lite"), with Anki's guardrails: ease floor, interval always grows at least one day on a pass, no ease penalty during the first learning steps. Expose one knob, desired retention, not ease numbers. Plan the data model so FSRS can replace SM-2 later: store per-item review log (timestamp, grade, elapsed), not just the next due date. Treat "wrong on a drill" as a lapse that reduces stability, not as a reset to zero, to avoid ease hell on hard Unreal terms (UPROPERTY specifiers, replication keywords).

**Leave.** Four-button self-grading for auto-graded drills (Dojo grades correctness itself; map correct-fast to Good, correct-slow to Hard, wrong to Again). Manual parameter tweaking.

### 1.13 Codewars

**What it teaches.** Language practice through community-written kata, 8 kyu (easiest) to 1 kyu, then 1 to 8 dan (https://docs.codewars.com/gamification/ranks/).

**Mechanics and rules.**
- Rank: a hidden rank score; your overall rank rises only on the *first* completion of a kata in any language; each language has its own rank; forfeited kata give no progress. Points per completed kata: 8 kyu 2, 7 kyu 3, 6 kyu 8, 5 kyu 21, 4 kyu 55, 3 kyu 149, 2 kyu 404, 1 kyu 1,097. Cumulative score to reach each rank: 7 kyu 20, 6 kyu 76, 5 kyu 229, 4 kyu 643, 3 kyu 1,768, 2 kyu 4,829, 1 kyu 13,147, 1 dan 35,759, 2 dan 97,225. The page gives relative progress by difficulty: a kata two ranks above you gives about +30% toward the next rank, one above about +12%, your own rank about +5%, one below about +1.7%, two below about +0.3% (https://docs.codewars.com/gamification/ranks/).
- Honor: 2 for white (8 to 7 kyu) kata, 8 yellow (6 to 5), 32 blue (4 to 3), 128 purple (2 to 1); rank-up bonuses (7 kyu 20, 5 kyu 45, 1 kyu 225, 1 dan 450, up to 12,800 for 6 dan); authoring, translating, and curation points; upvotes on solutions ("best practices" or "clever") give 1 each; honor cannot be spent but unlocks privileges such as creating kata (https://docs.codewars.com/gamification/honor, https://docs.codewars.com/gamification).
- Solutions: after solving you can see and vote on others' solutions. The documentation page for unlocking solutions before solving (forfeit) failed to load twice during this research; the ranks page confirms only that forfeited kata give no rank progress.

**Praise and complaints.** No independent review source with specifics was reachable; the saashub comparison pages are aggregator stubs. The documented quality problem is structural: kata are user-authored, which is why Codewars publishes curation guidelines (https://docs.codewars.com/curation/guidelines/kata/).

**Borrow.** The difficulty-weighted progression curve: a quest above your level moves you far more than one below it, and doing easy quests below your rank gives almost nothing. This is the direct cure for the Duolingo misuse finding (easy repetition as the cheapest XP). Rank only advances on *first* completion of a quest; rematches pay partial (PLAN.md's 50%) and repeats pay nothing. Show alternative solutions after a pass with a "best practice" vs "clever" split; Dojo's reviewer can label the alternative as "idiomatic Unreal" vs "works but not how Epic does it."

**Leave.** User-authored content and the moderation it needs. Honor as a second currency on top of rank; one progression number plus a spendable currency is enough.

### 1.14 LeetCode

**What it teaches.** Interview-style algorithm problems.

**Mechanics and rules** (from a LeetCode discuss post summarizing the official coin table, https://leetcode.com/discuss/general-discussion/3620981/Different-Ways-of-Earning-LeetCoins/). Daily check-in 1 coin; 30-day check-in streak 30 coins; Daily Challenge 10 coins; 25-day Daily Challenge streak 25 coins; finishing every daily problem in a month 50 coins; contest participation 5; both weekly and biweekly contests in one week 35; first contest submission 200; approved test case 100; approved question 1,000; profile completion and social links 2 to 10 each; coins buy merchandise and premium time.

**Praise and complaints.** On a thread asking whether daily consistency is worth it, users call streak-for-its-own-sake "arbitrary and fundamentally meaningless," say to "focus on quality, not quantity," warn that grinding without understanding leads to burnout, and recommend small achievable goals (one easy problem every other day, then harder) with variation of constraints and comparison of multiple solutions (https://redlib.ssps.io/r/leetcode/comments/1l6duvn/is_leetcode_consistency_worth). A LeetCode discuss thread titled "Unacceptable quality of LeetCode" exists (https://leetcode.com/discuss/general-discussion/730802/unacceptable-quality-of-leetcode) but was not fetched; it is listed here only as a pointer.

**Borrow.** The monthly completion badge is a clean, bounded goal ("do every daily this month") that does not punish a miss with a reset: you simply do not get the badge. That is a better shape than a streak for Dojo's daily quest.

**Leave.** Check-in coins for opening the app (rewarding presence rather than work). Coins for profile fields.

### 1.15 Game-development specific platforms

**Epic's Unreal Online Learning / Epic Developer Community.** The 2019 portal preview offered 35+ courses, search by topic and industry, progress tracking with bookmarks, built-in quizzes "to check your understanding before applying what you learned," and skill badges on course completion, tied to an Epic account (https://www.unrealengine.com/en-US/blog/new-unreal-engine-learning-portal-preview-released). The 2024 relaunch on the Epic Developer Community groups free, self-paced professional courses into four tracks; the Programming track is "C++ Introduction to Gameplay," "C++ Introduction to AI," and "C++ Introduction to Networking in Unreal Engine for Programmers," plus "C++ Introduction to Unreal Engine for Programmers" under game development. Format, quizzes, and badges are not described on that page (https://www.unrealengine.com/news/free-professional-unreal-engine-courses-now-available-on-the-epic-developer-community). What to take: these course titles are the canonical topic list for Dojo's Pack 1 and the glossary should link each term to Epic docs as PLAN.md requires. What they lack is any checked practice: nothing compiles your code.

**Unity Learn.** Pathways, missions, projects, tutorials, courses. A mission page shows per-item XP (+60 for Getting Started, +600 per unit, +0 for a tutorial), a mission badge on completion, an asset unlock reward, and "test out" by completing mission assessments and skipping to the checkpoint (https://learn.unity.com/mission/programming-basics). The FAQ lists XP and badge questions but the index page gives no rules (https://learn.unity.com/faq). What to take: "test out" of a world through its assessment is a good respect-the-expert mechanic (section 2.5); an asset unlock as a reward is thematically right for a game-dev app (Dojo's cosmetic studio items). What to leave: XP for watching.

**GameDev.tv.** Video courses with in-lecture challenges where the instructor says "pause and try." Trustpilot 4.0 from 50 reviews: praise for structure, instructors, and community; complaints about repackaged or outdated content (a 2025 course on Unity 2018), a C++ course that "didn't prepare them to start a project alone," no captions (https://au.trustpilot.com/review/gamedev.tv). The platform's own forum thread on an intermediate course is the most useful: students say the challenges are "vague and open ended," not clearly tied to the slide, in contrast to another instructor's challenges that "usually asked them to fix or extend earlier work"; instructors who type, stop, and change approach make a 6-minute video take 25; "fix this later" promises eroded trust; experienced developers wanted more decoupling and reusable components (https://community.gamedev.tv/t/feedback-on-this-course-so-far/164032). What to take: the challenge format that works is "fix or extend the thing you just built," which is exactly a Dojo build piece after a breakdown. Every challenge needs a crisp acceptance criterion (Dojo has tests). What to leave: tutorial-first "type along" as the main mode; the complaint that students cannot start a project alone is the strongest argument for breakdown quests.

**Zenva.** Short video lessons (about 10 minutes), illustrated notes and code, downloadable project files, a follow-along project that the learner then modifies, an AI tutor, and certificates; no quizzes, in-browser editor, badges, or XP are described (https://academy.zenva.com/). Trustpilot pages exist (https://pl.trustpilot.com/review/academy.zenva.com) but were not fetched. What to take: "follow along then modify" is PRIMM's Modify step (section 2.10). What to leave: no checked practice.

---

## 2. Research findings and what each means for Unreal Dojo

### 2.1 Gamification helps learning a little, motivation less, and behavior least; fiction and competition are not where the effect comes from

**Claim.** Gamification of learning has a small positive effect on learning outcomes.
**Evidence.** Sailer and Homner's meta-analysis of 38 publications (40 experiments) found Hedges' g = 0.49 for cognitive outcomes (k = 19, N = 1,686), 0.36 for motivational (k = 16, N = 2,246), and 0.25 for behavioral (k = 9/10, N = 951). Only the cognitive effect survived the high-rigor subsplit (g = 0.42). Game fiction and social interaction moderated only behavioral outcomes; competition combined with collaboration beat competition alone for motivation in the rigorous subset; interventions up to half a year beat one-day ones for motivation. The authors say bias-free results are "highly unlikely" without preregistration and call their moderator explanations post hoc (https://link.springer.com/article/10.1007/s10648-019-09498-w).
**Implication.** Keep the game layer, keep expectations modest, and spend design effort on the learning mechanics (sections 2.2 to 2.12), which have larger and better-replicated effects. Fiction should be thin. If any social mechanic is added later, make it cooperative (shared boss events) rather than pure competition.

### 2.2 Retrieval beats rereading, and learners misjudge it

**Claim.** Testing yourself on material produces better long-term retention than restudying it, even though restudying feels better and raises confidence more.
**Evidence.** Roediger and Karpicke 2006, Experiment 1: after one week, students who had taken an initial test recalled 56% of idea units versus 42% for those who restudied; at 5 minutes restudy was ahead (81% vs 75%). Experiment 2 at one week: SSSS 40%, SSST 56%, STTT 61%. The repeated-study group predicted the best recall (4.8 of 7) and performed worst (https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf). Dunlosky et al. 2013 rated practice testing and distributed practice the only two "high utility" techniques of ten; rereading, highlighting, and summarization were low (https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html).
**Implication.** The concept card should never be the whole quest. Ask before showing: open a concept quest with one prediction or recall question, then the card, then the 3 to 5 questions. Make "Drill me on this" (PLAN.md 4.1) the main call to action on a hover card, not "Read more." Show the learner their own forgetting curve on the Codex screen so the confidence illusion is visible.

### 2.3 Spacing has an optimal gap that scales with how long you want to remember

**Claim.** Spreading two study sessions apart helps, and the best gap is a fraction of the retention interval.
**Evidence.** Cepeda et al. 2008, over 1,350 participants, gaps up to 3.5 months and tests up to a year later: at any test delay, widening the gap first improves then reduces final recall; the optimal gap falls from about 20 to 40% of a one-week retention interval to about 5 to 10% of a one-year interval (https://pubmed.ncbi.nlm.nih.gov/19076480/). Duolingo's half-life regression operationalizes this and raised overall daily retention 12% in A/B tests (https://blog.duolingo.com/how-we-learn-how-you-learn/).
**Implication.** A pass in a concept quest should schedule the first drill for about one to two days later, the second for about a week, and so on (SM-2's growth does this). Pattern rematches (PLAN.md 4.2) should be scheduled by the same scheduler, not by world order. Brilliant's rule of no XP for repeating a concept the same day is the enforcement side: pay for spaced retrieval, not massed.

### 2.4 Interleaving hurts practice performance and roughly doubles test performance

**Claim.** Mixing problem types during practice, rather than blocking one type at a time, improves later test performance because learners must choose the method, not just execute it.
**Evidence.** Rohrer's study holding spacing constant: children who practiced four kinds of math problems interleaved did worse during practice "yet doubled scores" on a next-day test; error analysis showed interleaving helped match each problem to its procedure (https://digitalcommons.usf.edu/psy_facpub/1760/). Bjork lists interleaving among desirable difficulties and warns performance during instruction is "an unreliable index of learning" (https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/RBjork_inpress.pdf).
**Implication.** Drills must mix topics (PLAN.md says this). More important: the "which pattern fits this scenario" question type is the interleaving payoff for patterns, because the hard part of patterns is recognizing when to use one. Every drill should include at least one discrimination item (Observer vs Event Queue, Component vs Subclass Sandbox). Expect lower drill scores than concept-quiz scores and tell the learner why, so lower in-session accuracy is not read as failure.

### 2.5 Worked examples help novices and stop helping experts (expertise reversal)

**Claim.** Novices learn more from studying worked examples than from solving problems; as expertise grows the advantage disappears and then reverses, so guidance should fade.
**Evidence.** Kalyuga, Ayres, Chandler, and Sweller 2003: with trade apprentices, novices studying worked examples outperformed novices solving problems and reported lower mental load; with experience the advantage vanished and then problem solving won, with "a gradual fading out and then crossing over, not a sudden flip" (https://csed.substack.com/p/the-expertise-reversal-effect-2003, paper listing at https://ro.uow.edu.au/edupapers/136).
**Implication.** The first build quest in a world should be a completion or modification of a worked example (a full, commented UE class with one function body missing), the second a larger gap, the third a stub-only quest, the boss a blank file with only the spec. Encode a `scaffold` level in quest front matter (worked, faded, stub, blank) and let the verifier check each world fades. Let a learner who passes a world's drill at a high level "test out" (Unity Learn's mechanic) so experts are not forced through worked examples that would now add load.

### 2.6 Productive failure: struggling first, then instruction, beats instruction first

**Claim.** Letting learners attempt a problem before being taught the canonical solution produces deeper conceptual learning than teaching first, provided the problem is within reach and the attempt is followed by consolidation.
**Evidence.** Kapur 2008 and Kapur and Bielaczyc 2012: students who worked on ill-structured problems before instruction outperformed those taught first, on both structured and open assessments; the design is a generation phase with little feedback where reaching the answer is de-emphasized, then a consolidation phase comparing student solutions to the canonical one; boundary conditions are that the problem must be "challenging but within reach" and allow multiple solution paths (https://www.bu.edu/ctl/?p=5396). Sinha and Kapur's 2021 meta-analysis in Review of Educational Research covered 53 studies and 166 comparisons and found practice-before-instruction superior, with stronger effects for secondary and undergraduate learners than primary; in a 650-student linear algebra course, students who attempted problems before lectures had a pass rate about 20 points above the course average (https://www.weforum.org/stories/2021/09/students-who-productively-fail-learn-more/). Bjork's caveat applies: a difficulty is desirable only if the learner can respond to it (https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/RBjork_inpress.pdf).
**Implication.** Breakdown quests are productive failure by construction: the learner plans before seeing a reference. Keep the two-phase shape explicit: (1) plan with no hints and no grading until submit, (2) consolidation that shows the learner's plan beside a reference and names the differences. Do not grade the first attempt harshly; the research de-emphasizes reaching the right answer in phase one. Score breakdown quests mainly on the consolidation step (did the learner revise toward the reference and explain why), not the first draft. Order each world: breakdown attempt, then concept cards for the pieces that the attempt exposed as missing, then build.

### 2.7 Self-explanation: good learners explain examples to themselves

**Claim.** Learners who generate explanations of why each step of a worked example is correct learn far more from it than those who merely read it.
**Evidence.** Chi, Bassok, Lewis, Reimann, and Glaser 1989 (physics): successful solvers generated about 15.3 self-explanations per example versus 2.8 for unsuccessful ones, scored about 82% versus 46% on the posttest, made fewer errors from missing rules, and referred back to examples less because they knew what to look up (summarized with figures in https://pcl.sitehost.iu.edu/rgoldsto/courses/cogscilearning/chiselfexplanation.pdf; abstract at https://serc.carleton.edu/resources/19512.html).
**Implication.** Attach a "why is this line here?" prompt to worked-example build quests: the learner must write one sentence per marked line (why `UPROPERTY()` on this pointer, why `BindAction` here, why `TObjectPtr`) before the editor unlocks the gap to fill. The AI reviewer's `reflectionQuestion` (PLAN.md section 8) is this at the end of a quest; add one at the start too. Do not charge XP for asking the reviewer to explain a finding (Boot.dev's 50% Boots penalty works against this).

### 2.8 Subgoal labels cut cognitive load and halve attrition in CS1

**Claim.** Naming the purpose of each group of steps in a worked example (an action phrase, not a line comment) improves performance and retention, most for at-risk learners.
**Evidence.** Margulieux, Catrambone, Morrison, and Decker's CS1 study at the University of Nebraska Omaha (N = 307, replicated across five sections the next year): the subgoal-labeled group scored better on every quiz (medium effect), better on exams overall (small effect, lower variance), gave more relational and abstract answers on "Explain in Plain English" questions, and had roughly half as many students withdraw or fail; students with below-average GPA or who expected the course to be hard gained most. The recommended method is to group steps, name each group with an action phrase, and pair labeled examples with practice problems; expert task analysis uncovers the tacit subgoals (https://www.raspberrypi.org/app/uploads/2020/07/Using-subgoal-labels-to-reduce-cognitive-load-in-introductory-programming.pdf; publication record at https://scholarworks.gsu.edu/ltd_facpub/4).
**Implication.** Breakdown quests should ask the learner to *name each step* as an action phrase ("declare the cooldown state," "bind the input action," "broadcast the dash-started event," "gate the dash on the timer"), not only list classes. Grade the names: a plan whose steps are named by purpose is worth more than one listing files. Worked-example build quests should ship with subgoal labels as section headers in the starter code, and faded quests should ship with the labels but no code under them (the labels become the scaffold). Reference breakdowns in content (PLAN.md 4.5) should carry the same labels so the grader can match learner labels to reference subgoals.

### 2.9 Parsons problems teach as much as writing code in less time, and adapt well

**Claim.** Arranging mixed-up code blocks into the correct order produces the same learning gains as writing or fixing the equivalent code, in significantly less time; distractor blocks model common errors; adaptive versions keep more learners in the zone.
**Evidence.** Ericson's dissertation (three studies): students completed Parsons problems "significantly faster than fixing or writing code" with the same pretest-to-posttest gains; intra-problem adaptation (making the current problem easier on request) and inter-problem adaptation (next problem harder or easier) helped more learners solve them (https://hg.gatech.edu/node/603172).
**Implication.** Add a drill item type "reorder these UE statements": the lines of a small UE function (constructor setup, `BeginPlay` binding, a timer callback) shuffled, with one or two distractor lines showing a common Unreal mistake (raw pointer without `UPROPERTY`, `AddDynamic` on a non-`UFUNCTION`, calling `Super::BeginPlay()` last). Use it as the cheap, fast step between concept and build, and as the first-step fallback when a build quest fails twice (intra-problem adaptation: "want this as a reorder first?").

### 2.10 PRIMM: read and predict before you write

**Claim.** A lesson that moves Predict, Run, Investigate, Modify, Make builds code reading before code writing and shifts ownership gradually.
**Evidence.** The Raspberry Pi Foundation summary: Predict is low-stakes and unassessed; Run avoids the blank editor; Investigate uses tracing, annotating, and debugging; Modify makes the code "partly mine"; Make applies the structure to a new problem. It cites Lister's finding that novices need about 50% tracing accuracy before they can write code with confidence, and a 2018 study of 500 learners aged 11 to 14 showing improved outcomes after 8 to 12 weeks (https://static.raspberrypi.org/files/curriculum/quickreads/11-Pedagogy_Summary_PRIMM_V4_2023.pdf).
**Implication.** This is the arc for a world's build quests: Predict (a concept question "what does this UE snippet print or do"), Run (the editable example on the card), Investigate (spot-the-bug and explain-in-plain-English items), Modify (faded build quest), Make (stub or blank build quest, then boss). Dojo already has most pieces; the gap is a dedicated Predict step before the card, which costs almost nothing to add.

### 2.11 "Explain in plain English" is the bridge between reading and writing code

**Claim.** The ability to describe what a code fragment does at the level of its purpose (a relational answer, not line by line) correlates substantially with code-writing ability and is a useful formative check.
**Evidence.** Whalley, Lister, and colleagues (2008, N = 38, end-of-semester Java exam): explain-in-plain-English score correlated with writing score at r = 0.5586 (p = 0.0002), explaining about 31% of writing variance; combined with iterative tracing, 46% (https://opus.lib.uts.edu.au/bitstream/10453/10806/1/2008001530.pdf). Fowler, Chen, Azad, West, and Zilles 2020 (N = 452 in a data structures course): r = 0.555 with code-writing exam performance; a 7-point rubric scoring correctness, abstraction, and ambiguity was reliably applied (median Krippendorff's alpha 0.775); giving students samples of good and poor answers helped because they otherwise wrote long low-level descriptions; the authors suggest EiPE is most valuable as formative assessment (https://zilles.web.engr.illinois.edu/papers/EiPE_rubric_sigcse_2020.pdf).
**Implication.** Add an "explain this in one sentence" item type to concept quizzes and drills, graded by the AI reviewer on the Fowler rubric (correct, purpose-level, unambiguous), with a model answer shown after. Reward relational answers ("gates the dash on a cooldown timer and broadcasts when it fires") over multistructural ones ("sets a bool, then starts a timer, then..."). Use the same rubric to grade the `summary` the learner writes for a breakdown.

### 2.12 Desirable difficulties, and the condition that makes them undesirable

**Claim.** Spacing, interleaving, testing, generation, varied conditions, and intermittent feedback slow apparent progress during practice and improve long-term retention and transfer; they help only when the learner has enough prior knowledge to respond to them.
**Evidence.** Bjork and Bjork: performance during instruction is "an unreliable index of learning"; massed practice gives rapid performance gains with little lasting benefit; generation helps "only if learners can actually generate a workable response" (https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/RBjork_inpress.pdf).
**Implication.** Two design rules. First, the app should show two meters, as Khan Academy does: effort (XP, which rises during practice) and mastery (skill level from spaced, mixed drills, which can fall). Second, difficulty must be gated: a blank-file build quest or a breakdown of a whole system should unlock only when the prerequisite concepts are at least "Familiar" in the drill scheduler, otherwise the difficulty is undesirable. This is Exercism's prerequisite unlocking with a mastery threshold.

### 2.13 Points, badges, and leaderboards act as extrinsic incentives; forced badges and leaderboards can lower intrinsic motivation and grades

**Claim.** Common game elements raise output quantity but not intrinsic motivation, and in a classroom setting mandatory badges plus a leaderboard lowered satisfaction, intrinsic motivation, and final exam scores.
**Evidence.** Mekler, Brühlmann, Tuch, and Opwis 2017 (N = 273, image tagging): points, levels, and leaderboards each raised the number of tags versus a plain condition, with no effect on tag quality, intrinsic motivation, competence, or autonomy; the authors conclude the elements "functioned as extrinsic incentives, effective only for promoting performance quantity" (https://glassmanlab.seas.harvard.edu/annotated_works/mekler17.pdf). Hanus and Fox 2015 (two sections of a semester course): the gamified section with a leaderboard and mandatory badges reported lower satisfaction and lower intrinsic motivation and scored lower on the final, which the authors attribute to social comparison and loss of autonomy (https://www.smhp.psych.ucla.edu/pdfdocs/gamil.pdf).
**Implication.** Use XP and levels to reward *quantity of the right thing* (first completions, spaced drills, difficulty-weighted quests) and accept that they will not make the learner love Unreal; the quests have to do that. Never make a badge mandatory for progress. Keep leaderboards out of v1 and, if added later, make them opt-in and grouped fairly.

### 2.14 Streak design: lower the bar to keep it, cap the protection, celebrate milestones, and let the metric not become the goal

**Claim.** The streak is the strongest retention mechanic available, and its failure modes are predictable: it decays in meaning as it grows, it is kept by loss aversion, and it invites doing the cheapest qualifying thing.
**Evidence.** Duolingo's A/B data in section 1.3 (https://blog.duolingo.com/improving-the-streak/, https://blog.duolingo.com/duolingo-streak-research/); the misuse study's finding that users repeat easy content and quit after losing a streak (https://ar5iv.labs.arxiv.org/html/2203.16175); the Decision Lab's "we optimize for the metric rather than the goal" (https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification).
**Implication.** Make the streak unit small and useful (a completed drill keeps it, which is also the spaced retrieval the research wants), make the window generous (3 days per PLAN.md, or 7 like Boot.dev), cap freezes at two, do not sell repairs, celebrate 7, 30, and 100, and never send guilt copy. Make the daily quest's XP depend on quest difficulty so that the cheapest way to keep a streak is still a real retrieval.

---

## 3. Ranked list of mechanics and lesson formats to adopt

Ranked by evidence strength times fit to Dojo's quest kinds. "Maps to" names the quest kind(s).

1. **Spaced recall drill as the heartbeat.** Rule: every glossary term and pattern has a due date from an SM-2-style scheduler (Anki guardrails, FSRS-ready log); the drill shows due items mixed across topics. Why: testing effect (2.2), spacing (2.3), Duolingo HLR +12% retention (1.3), Dunlosky high utility. Maps to: drill. Risk: review debt if the learner adds terms faster than they drill; cap the daily due count and let overflow slide (FSRS "load balance" idea).

2. **Problem before explanation in every concept quest.** Rule: a concept quest opens with one prediction or recall question before the card is shown. Why: Brilliant's design (1.1), productive failure (2.6), PRIMM Predict (2.10). Maps to: concept. Risk: a cold-start question on an unknown term feels unfair; label it "guess, no penalty."

3. **Breakdown steps must be named by purpose (subgoal labels).** Rule: each piece and step in a breakdown plan carries an action-phrase label and the grader matches labels to reference subgoals. Why: 2.8 (medium effect on quizzes, half the attrition). Maps to: breakdown, boss. Risk: the grader must accept synonyms; use the AI grader with a label-matching rubric, not string equality.

4. **Faded scaffolding across a world (worked, faded, stub, blank).** Rule: build quests in a world go from completing a labeled worked example to a blank file; the verifier checks the fade. Why: expertise reversal (2.5). Maps to: build, boss. Risk: more content per world; worked and faded variants can share one reference solution.

5. **Two-phase breakdown: attempt, then consolidation.** Rule: no hints and no grading during the plan; on submit, show the learner's plan beside a reference and ask what to change and why; most of the score comes from the revision. Why: productive failure (2.6). Maps to: breakdown, boss. Risk: a learner who skips the revision step gets little; require at least one written revision note.

6. **Reorder-the-statements (Parsons) drill item with Unreal distractors.** Rule: shuffle 5 to 9 lines of a small UE function with one or two distractor lines showing a common mistake; also offered as the fallback after two failed submits on a build. Why: 2.9. Maps to: drill, and build (as adaptation). Risk: trivial if lines are too distinctive; use lines that differ in order-sensitive ways (`Super::BeginPlay()` first).

7. **Explain-in-plain-English items graded on a rubric.** Rule: "say what this does in one sentence," graded for correctness, abstraction level, and ambiguity, with a model answer after. Why: 2.11 (r about 0.55 with code writing). Maps to: concept, drill, breakdown summary. Risk: AI grading cost; keep these to one per quiz and one per breakdown.

8. **Self-explanation gate on worked examples.** Rule: before the gap in a worked-example build unlocks, the learner writes one sentence for each marked line explaining why it is there. Why: 2.7. Maps to: build (worked and faded levels). Risk: friction; keep to 3 to 5 marked lines and accept any plausible sentence (grade leniently, show the model reason).

9. **Difficulty-weighted XP and rank progress.** Rule: XP for a first pass scales steeply with quest difficulty relative to the learner's level (Codewars' +30% / +12% / +5% / +1.7% / +0.3% curve); repeats pay 0; rematches pay 50%. Why: 1.13, and the Duolingo misuse finding that flat rewards invite easy repetition (1.3). Maps to: all. Risk: discourages healthy review; that is what the drill is for, and drills pay flat small XP.

10. **Minimum-viable streak with a generous window, two freezes, milestone celebrations.** Rule: a completed drill or passed quest within every 3 days keeps the streak; up to two freezes, earned from bosses; celebrations at 7, 30, 100; no repairs for sale; no guilt copy. Why: 1.3, 2.14. Maps to: drill, all. Risk: the 3-day window weakens the daily habit; the daily quest carries the daily habit instead.

11. **Priced hints and solutions, free explanations.** Rule: hints are staged (3 per quest, each 15% of base XP per PLAN.md); viewing the reference solution costs the quest's XP unless a Seer Stone is spent and schedules a rematch within 3 days; asking the reviewer "why is this a finding" is always free. Why: Boot.dev's economy (1.2) with the Boots-penalty removed on the strength of 2.7. Maps to: build, breakdown. Risk: a learner can farm Seer Stones from chests; cap held stones at two.

12. **Sharpshooter spree with armor, where Run never counts.** Rule: consecutive first-try Submit passes; Run is free; a spree once earned is never lost; armor absorbs one miss. Why: Boot.dev rules (1.2); rewards checking your work before submitting, which is generation plus intermittent feedback (2.12). Maps to: build. Risk: encourages over-cautious submitting; keep the bonus modest.

13. **Daily quest: one of three, rising difficulty, better chest, LeetCode-style monthly badge instead of a reset.** Rule: pick one of three (drill, concept, short build); finishing all daily quests in a calendar month earns a badge; missing days costs nothing. Why: Boot.dev quests (1.2), LeetCode monthly achievement (1.14), Hanus and Fox on not forcing badges (2.13). Maps to: drill, concept, build. Risk: the "short build" needs an engine build in under 5 minutes; use Parsons or a single-function build for the daily slot.

14. **Two meters: effort (XP) and mastery (skill level that can fall).** Rule: XP only rises; each skill shows Attempted / Familiar / Proficient / Mastered from drill and rematch results, and a miss on a mixed drill drops it one level. Why: Khan Academy's split (1.11), Bjork's performance-versus-learning (2.12). Maps to: drill, skill tree. Risk: learners dislike seeing mastery fall; show the decay as "due for review" rather than a loss.

15. **Prerequisite-tag unlocking with a mastery threshold.** Rule: a quest unlocks when every term in its `terms[]` is at least Familiar and its prerequisite concepts are passed; the map is a graph, not a line. Why: Exercism v3 (1.6), undesirable difficulty (2.12). Maps to: all. Risk: dead ends if content tags are wrong; the verifier should check every quest is reachable.

16. **Pattern discrimination items in every drill.** Rule: at least one "which pattern fits" or "which would you not use here" item per drill. Why: interleaving (2.4); the Codewars-style collectible pattern card gives this a reward surface (PLAN.md 5). Maps to: drill, concept. Risk: scenario text must be unambiguous; two reference answers with an explanation when a scenario is debatable.

17. **Alternative after the pass.** Rule: after a build or breakdown passes, show one alternative solution or plan with a one-paragraph tradeoff note, labeled "idiomatic Unreal" or "works, but not how Epic does it." Why: Exercism Approaches (1.6), Codewars best-practice vs clever (1.13), consolidation (2.6). Maps to: build, breakdown. Risk: content cost; one alternative per quest is enough.

18. **Editable, runnable example on the card.** Rule: the card's example opens in a scratch buffer where the learner can change it and at least syntax-check it. Why: Scrimba (1.7), PRIMM Run and Investigate (2.10). Maps to: concept. Risk: a full engine compile is too slow for a card; syntax-check or a prebuilt sandbox function is enough.

19. **See it run.** Rule: every build quest ends with the mechanic visible in the sandbox map, not only a test report. Why: CodeCombat's visible output (1.5), GameDev.tv students losing motivation when the result is abstract (1.15). Maps to: build, boss. Risk: engine launch time; make it optional after the first pass of each world.

20. **Test out of a world.** Rule: pass the world's mixed drill at Proficient to skip its worked and faded quests. Why: Unity Learn (1.15), expertise reversal (2.5). Maps to: drill, build. Risk: skipping the self-explanation gate; keep the boss mandatory.

---

## 4. Five things to deliberately avoid

1. **Leagues and leaderboards in v1.** They need accounts and fair grouping; without both they are either empty or unfair. The Duolingo misuse study ties leagues to cheating, XP farming, and anxiety (https://ar5iv.labs.arxiv.org/html/2203.16175); Hanus and Fox tie a classroom leaderboard to lower intrinsic motivation and grades (https://www.smhp.psych.ucla.edu/pdfdocs/gamil.pdf); Sailer and Homner found competition alone weaker than competition with collaboration (https://link.springer.com/article/10.1007/s10648-019-09498-w). If social play comes later, make it a cooperative boss event with a minimum participation bar (Boot.dev's 5,000 XP rule, https://blog.boot.dev/wiki/the-game/).

2. **Punishing streak loss, selling repairs, or guilt notifications.** Duolingo's own research says losing a long streak can make learners avoid lessons entirely (https://blog.duolingo.com/duolingo-streak-research/); the misuse study records users quitting after a lost streak; the Decision Lab notes repairs reduce the motivation to keep the streak and that guilt copy creates obligation (https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification). Dojo: generous window, two freezes, no repairs, milestone celebrations, no "the dojo misses you."

3. **Hearts, lives, or any cap on attempts.** Sololearn reviewers believe hearts are tuned to make them pay (https://kimola.com/reports/essential-insights-from-sololearn-app-user-feedback-google-play-en-141037). Retrieval and generation are where the learning happens (2.2, 2.12); an attempt cap removes the one thing that works. Build quests already have a natural cost (an engine build); that is enough friction.

4. **Flat XP for repetition, XP for presence, or XP for watching.** Flat rewards make easy repetition the cheapest path (https://ar5iv.labs.arxiv.org/html/2203.16175); LeetCode's check-in coin and Unity Learn's tutorial XP reward opening the app, not learning. Brilliant's "no XP for the same concept the same day" (https://brilliant.org/help/features/what-is-xp) and Codewars' first-completion-only rank (https://docs.codewars.com/gamification/ranks/) are the fix.

5. **Charging for asking questions, and un-priced answers.** Both ends are wrong. Boot.dev's 50% XP penalty for talking to Boots (https://blog.boot.dev/wiki/the-game/) taxes self-explanation, which is the behavior that separates good learners from poor ones (https://pcl.sitehost.iu.edu/rgoldsto/courses/cogscilearning/chiselfexplanation.pdf). Kaggle Learn's free solution cell (https://www.packtpub.com/en-ar/product/developing-kaggle-notebooks-1-9781805128519/chapter/introducing-kaggle-and-its-basic-functions/kaggle-learn) makes "show solution" the path of least resistance and skips the attempt the testing effect depends on. Dojo: explanations free, answers priced, and the seer stone schedules a rematch.

A sixth, smaller one: **thick fiction**. Game fiction moved only behavioral outcomes in the meta-analysis and Ozaria's reviewer dinged a story with no agency. Roles, cards, and a studio are enough.

---

## 5. Proposed session shape (25 to 45 minutes)

Grounded in: spacing and retrieval first while fresh (2.2, 2.3), interleaving (2.4), productive failure before instruction (2.6), self-explanation and subgoals before writing (2.7, 2.8), fading (2.5), and a visible result at the end (1.5). The session is one screen flow; the learner can stop after any block and the streak, XP, and schedule are consistent at every stop.

**Block 0. Warm-up recall (3 to 5 min, always).**
Drill of due items, mixed across topics: 6 to 10 items including at least one pattern-discrimination item, one Parsons reorder, and one explain-in-plain-English. This block alone keeps the streak. Items hovered often but not yet passed are injected first (PLAN.md 4.1). Grading feeds the scheduler; misses drop the skill one level and mark the term "due for review," not "lost."

**Block 1. Predict (1 to 2 min).**
One question about the thing the session is about, before any card: "Here is a dash with a cooldown; which of these parts must exist for it to work?" or "What does this `BeginPlay` do?" Guess allowed, no penalty, answer revealed after the card. This is the PRIMM Predict step and the productive-failure generation step in miniature.

**Block 2. Breakdown attempt (8 to 15 min, on sessions that start a mechanic; skipped on build-only sessions).**
Spec and acceptance criteria shown. The learner builds the plan on the board: pieces (class, component, data, event, step) and an action-phrase label on each. No hints, no grading until submit. On submit: the plan sits beside one reference breakdown; the learner writes at least one revision note ("I put cooldown state on the character; the reference keeps it in the component because..."). Score weights the revision. Terms the attempt exposed as unknown are pushed to the front of the next drill.

**Block 3. Concept card(s) for the gap (3 to 6 min).**
Only the one or two cards the breakdown (or the predict question) showed the learner lacks. Card, editable example, 3 to 5 questions including one explain-in-plain-English. Terms enter the scheduler. If the learner already holds the terms at Proficient, this block is skipped (test-out).

**Block 4. Build one piece (12 to 25 min).**
Scaffold level set by the world's fade position: worked (complete the marked gap after writing a one-sentence reason for each marked line), faded (subgoal labels present, bodies missing), stub, or blank. Run is free and never counts against the spree. Submit triggers engine build, tests, AI review, and the loot screen. After two failed submits the app offers the same function as a Parsons reorder, then returns the learner to the editor. Hints are spells priced in XP; "explain this finding" is free. On a pass: show one alternative with a tradeoff note, then "See it run" in the sandbox map.

**Block 5. Close (1 to 2 min).**
Loot screen itemizes XP (difficulty-weighted, first-pass only), card upgrades, skill changes (up or down), spree, streak, and the next due dates. One reflection question from the reviewer, answered in a sentence, free. The app states the next session's first drill size so review debt stays visible.

**Timing variants.**
- 25 minutes: Block 0, Block 1, Block 4 (worked or faded level), Block 5.
- 35 minutes: Block 0, Block 1, Block 3, Block 4 (faded or stub), Block 5.
- 45 minutes: all blocks, with Block 2 starting a new mechanic and Block 4 building its first piece.
- Boss sessions: Block 0, then Block 2 for the whole system, then Block 5; the pieces run as separate sessions in the learner's chosen order; the integration build is a 45-minute session with Block 2 replaced by a review of the learner's own earlier breakdown.

**Why this order and not card-first.** Card-first is the Codecademy and video-course default, and the recurring complaint about it on GameDev.tv and Codecademy is that learners cannot start a project alone (https://community.gamedev.tv/t/feedback-on-this-course-so-far/164032, https://ca.trustpilot.com/review/codecademy.com?page=2). Attempt-first with consolidation is what the productive-failure meta-analysis supports (https://www.weforum.org/stories/2021/09/students-who-productively-fail-learn-more/), and the cost is only that the first attempt scores low, which the session shape absorbs by scoring the revision.

---

## Appendix: gaps and source quality notes

- Codewars' "viewing solutions" documentation page failed to load twice (https://docs.codewars.com/training/solutions); forfeit cost is therefore not stated here beyond "forfeited kata give no rank progress."
- Mimo's coin prices and freeze holding limits are not on its help pages.
- Boot.dev publishes no drop rates or gem prices.
- Brilliant's hint pricing and league cutoffs are not on its help pages.
- Sololearn's hearts rules come only from a user review, not an official page.
- Brilliant's "reddit reviews" page and Boot.dev's home page are marketing; their claims are marked as such above.
- Sailer and Homner's motivational and behavioral effects did not hold in their high-rigor subsplit; only the cognitive effect is robust.
- Duolingo's "3.6 times more likely to complete a course" is correlational by the post's own framing.
- Kapur's meta-analysis article as reported by the World Economic Forum does not give a standardized effect size; the "20 points above the course average" figure is from a single course.
