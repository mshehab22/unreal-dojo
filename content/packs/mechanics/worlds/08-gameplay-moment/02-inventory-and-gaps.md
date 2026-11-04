---
id: m8-inventory-and-gaps
title: Reading a moment and mapping the gaps
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [planning]
terms: []
prerequisites: [m8-moment-plan]
xp: 30
estimatedMinutes: 9
concepts:
  - A moment is read as a list of mechanics, interactions, events, and numbers before any code
  - Every gap between the list and what you can already build is spiked, faked, or cut
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: you are handed a written walkthrough of a two-minute moment and told to build it. What is the best first move?"
choices:
  - "Build the most exciting mechanic first, so there is something to show"
  - "Open the editor and block out the whole level before reading further"
  - "Decide up front which parts look too hard and cut those parts out"
  - "List what the player does, what touches what, and the numbers"
answerIndex: 3
explanation: The list is what everything else is checked against. Without it you build what you notice and miss what you did not, and you cannot say what is cut.
```

# Card

A gameplay moment is a short run of play that has to feel right, such as an escape, a defence, or a chase. You build it the way you built your earlier worlds, from pieces, but a moment arrives as a description, not as a task list. Reading it well is a skill of its own.

**Inventory first.** Go through the walkthrough line by line and write down every mechanic (what the player can do), every interaction (what touches what), and every event (what happens and when). Nothing is too small: a counter on a wall, a light that comes on, a restart key. If a line has a number, such as a distance, a speed, or a time, put it in a metrics table next to the item. Those numbers become properties you can change without code.

**Map to what you have.** For each item, name the skill and world that already covers it: input, moving things, collision, timers, tracing, delegates. An item that matches a piece you built is a reuse. An item that matches nothing is a **gap**.

**Decide each gap.** There are three honest answers:

- **Spike**: build a quick throwaway to find out whether it works and how hard it is, then throw it away or keep it.
- **Fake**: make something cheaper that gives the same feel, for example a cone check instead of a lit beam.
- **Cut**: leave it out and say so. A moment with a cut part can still feel right; one with a hidden missing part cannot be checked.

Choose the cheapest answer that keeps what the player is meant to feel. Write the decision down next to the item, with the reason. A gap map is a list, not a plan to code everything.

# Example

```cpp
// Item                     Where it comes from   Number       Decision
// Walk with W, A, S, D     input                 300 u/s      reuse
// Tower light turns        transforms            45 deg/s     reuse
// Beam sees the hero       tracing               800 range    build (line trace)
// Fuse pickup              collision             -            reuse
// Counter on the wall     delegates             3 fuses      build (event)
// Glowing fuse             art                   -            fake (a sphere)
// Alarm siren              audio                 -            cut
```

# Questions

```yaml
- id: biggest-risk
  type: multiple-choice
  prompt: "A walkthrough says the player 'slips through a crowd of 30 dancing guests'. Your library has no crowds and no dancing. What is the best entry in your gap map?"
  choices:
    - "Build a full crowd system first, so the scene looks right from the start"
    - "Fake it with five slow obstacles to pass between, and cut the dancing"
    - "Ignore it, because a crowd is only scenery and the player never touches it"
  answerIndex: 1
  explanation: A fake keeps the feeling that matters, passing close to moving people, at a fraction of the work, and writing the cut down keeps the gap visible.
- id: not-too-small
  type: multiple-choice
  prompt: "The walkthrough says 'a green light comes on over the door when it has power'. Should it be in the inventory?"
  choices:
    - "No, because it is only decoration and nothing in the moment depends on it"
    - "Only if there is spare time after the main mechanics are done"
    - "Yes: the exit must announce it, even if the look of it is faked"
  answerIndex: 2
  explanation: The light is the player's only sign that the exit works. The inventory lists what happens; how it looks is decided afterwards.
- id: three-words
  type: fill-blank
  prompt: "A gap you decide to build a rough version of, only to learn whether it works, is a ___."
  acceptedAnswers: [spike]
  explanation: A spike is a quick experiment. The other two honest answers are to fake it or to cut it.
- id: hidden-cut
  type: multiple-choice
  prompt: "Why write down a cut as well as leaving it out?"
  choices:
    - "So the moment is judged against its plan, with the gap named"
    - "So nobody can ask for the missing part to be added back later"
    - "Because the engine expects every cut to be reported when it builds"
  answerIndex: 0
  explanation: A named cut can be argued about and brought back. An unnamed one looks like a mistake.
- id: explain-gap-map
  type: explain-in-one-sentence
  prompt: In one sentence, say what a gap map is for.
  modelAnswer: It lists every mechanic and event in the walkthrough, says which are already covered by something you built, and decides each gap as a spike, a fake, or a cut, so the moment is planned against what is real.
  rubric:
    - Says it starts from an inventory of the walkthrough
    - Says each gap is decided as spike, fake, or cut
  explanation: It turns a clip into a plan you can check.
```
