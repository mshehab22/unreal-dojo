---
id: p23-patterns-together
title: Three patterns, one room
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [architecture, planning]
terms: [actor-component, timer-manager]
prerequisites: [p19-boss-dusk, p20-boss-practice-yard, p21-boss-ember-range, p22-boss-gauntlet]
xp: 25
estimatedMinutes: 10
concepts:
  - A real feature has several jobs, and each job may have its own pattern
  - The trouble with a combination is in the seams, where one piece hands a value to another
  - A director decides the order of things and owns no rules, so every piece keeps passing its own tests
  - Every seam answers three questions, about who calls whom, what is handed over, and when
  - A pattern with one user, or glue code larger than the parts, is a sign of too much structure
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a team builds an arena night from three parts that each pass all of their own tests. In the first playtest the scoreboard counts a knockout one frame before the loot it dropped appears. Where should the team look first?"
choices:
  - Inside each of the three parts, because one of them must have a hidden bug
  - In the engine itself, because three correct parts cannot disagree
  - At the compiler settings and the build flags the team chose
  - At the hand-overs between the parts, and the order and moment of each
answerIndex: 3
explanation: Each part is right on its own, so the fault is in the order and timing of the hand-overs between them. That is where combinations go wrong.
```

# Card

Every world so far taught one pattern, with one job and a small system around it. A real game feature is rarely one job. An arena night needs fighters built from parts, loot that drops, and an announcement of who fell. A replay needs recorded moves, a clock, and a screen that never shows half a frame. This world puts three jobs together and asks the question the earlier worlds could leave out: what happens at the joins?

**Each job, its own pattern.** Choose a pattern for a job because the job has the problem the pattern solves, not because the pattern is on a list. A health part and a loot part are components because designers will mix parts. A knockout announcement is posted to a mailbox because the sender must not wait for the listeners. If you cannot say which problem a pattern is solving in your feature, leave it out.

**The seams.** Between two pieces there is a seam: the place where one calls the other, or hands it something. Each seam answers three questions, and a bug nearly always lives in an unanswered one.

- **Who calls whom?** The direction should point one way. A health part that tells the scoreboard what to show has been made to depend on the scoreboard.
- **What is handed over?** A plain value that is copied is safe to keep. A pointer to a fighter who may be gone by the time the receiver looks is not. Events that wait in a queue carry copies of what they need.
- **When?** Now, at the end of the frame, on the next fixed step, or after a timer. Two things that happen in one moment have no promised order unless a piece promises one.

**A director that owns no rules.** The code that makes the pieces work together is the director. Its job is the order of things: build the fighters, play this turn, end the night. It does not work out damage, loot, or announcements, because the pieces already do. A useful test: take the director away, and every piece still passes the tests it passed when it was built. If the director has copied a rule, that rule now exists twice and the two will drift apart.

**Reuse, do not rewrite.** The bosses in this world compile against build quests you have already finished and use them unchanged. If the combination seems to need a change to a piece, first ask whether the director can do it from outside, and change the piece only when it cannot.

**Plan before code.** Each boss is preceded by a breakdown: a plan for a similar system that names the pieces, which pattern owns each job, and what runs at which moment. Writing the seams down first is cheaper than finding them in a playtest.

**Signs of too much.** A pattern with a single user. Glue code that is larger than the pieces it joins. A piece that only exists to satisfy the pattern's name. Three patterns are a lot to hold at once; add the third because a problem asked for it.

# Example

```cpp
// The director decides the order and nothing else.
Health->ApplyDamage(Damage);

// The loot part has already heard the health run out by this line, so sending the fighter away cannot cut its drop short.
if (Health->IsDepleted()) Fighter->KnockOut(Striker);
```

# Questions

```yaml
- id: seam-questions
  type: multiple-choice
  prompt: "Which three questions does every seam between two pieces have to answer?"
  choices:
    - Who wrote it, who tested it, and who reviews it
    - Who calls whom, what is handed over, and when
    - How big it is, how fast it is, and how old it is
    - Which pattern, which class, and which file
  answerIndex: 1
  explanation: The direction of the call, the thing handed over, and the moment it happens are where parts that pass alone start to disagree.
- id: fill-owns-no
  type: fill-blank
  prompt: "A good director decides the order of things and owns no ___."
  acceptedAnswers: [rules, rule]
  explanation: Damage, loot, and announcements belong to the pieces. A director that copies a rule leaves two copies to drift apart.
- id: spot-copied-rule
  type: spot-the-bug
  prompt: The loot part already drops a fighter's loot when its health runs out. Which line makes the director work out loot a second time?
  code: |
    void ADojoNight::HandleKnockout(const FDojoKnockout& Event)
    {
    	Purse += Event.LootCount * 2;
    }
  bugLine: 3
  fix: Listen to the loot part's own drop and add what it reports to the purse, so the number is worked out once.
  explanation: The director has copied the loot rule, with its own idea of the count. When the loot part changes, the purse will no longer match what dropped.
- id: pointer-or-copy
  type: multiple-choice
  prompt: "A knockout waits in a mailbox until the end of the frame. The fighter it names is destroyed in the meantime. What should the waiting message carry?"
  choices:
    - A pointer to the fighter, so the listener sees its live state
    - Nothing at all, and the listener looks the fighter up later
    - A copy of the fighter's name, team, and the winner's name
    - A handle to the timer that will deliver the message
  answerIndex: 2
  explanation: A copy still makes sense after the fighter is gone. A pointer would be dangling by the time the message is read.
- id: explain-director
  type: explain-in-one-sentence
  prompt: In one sentence, say what a director does when several patterns are combined, and what it must not do.
  modelAnswer: The director builds the pieces and decides the order and timing in which they work together, and it must not copy or recompute any rule that a piece already owns.
  rubric:
    - Says the director sets up the pieces or decides their order and timing
    - Says it must not take over or duplicate a piece's rules
  explanation: Order belongs to the director, and rules belong to the pieces.
```
