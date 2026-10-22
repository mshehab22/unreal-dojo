---
id: p7-state-when-not
title: When a mode is more than you need
order: 7
kind: concept
difficulty: 2
patterns: [state]
skills: [state, architecture]
terms: [finite-state-machine, behavior-tree, state-tree, animation-blueprint, uenum]
prerequisites: [p7-breakdown-champion]
xp: 25
estimatedMinutes: 6
concepts:
  - A single on and off switch is a boolean, not a machine
  - Independent concerns are separate fields or separate machines, not one list of every combination
  - Rich AI that weighs many options at once is a job for Behavior Trees or StateTree, not a hand-written mode list
  - Animation state machines drive poses; gameplay rules belong in gameplay code
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an arena torch is either lit or unlit, and lighting it twice does nothing. A teammate writes an abstract torch mode class with Lit and Unlit subclasses, each with Enter and Exit. What did that buy?"
choices:
  - Safety from impossible combinations the boolean would allow
  - Nothing a single boolean does not already give, at the cost of three classes
  - Faster lighting
  - Blueprint access it would not otherwise have
answerIndex: 1
explanation: With two modes and no data, a boolean cannot hold an impossible combination. The pattern earns its keep when there are several modes, each with its own rules.
```

# Card

Lesson zero asks whether a layer earns its place. A mode machine is a layer.

**Two modes and no data.** On or off, lit or unlit, open or shut with nothing in between: a boolean says it, and there is no impossible combination to guard against. Reach for a mode when there are three or more, when inputs mean different things in each, or when modes need entry and exit work.

**Independent concerns stay separate.** A guard's activity (patrolling, chasing, searching) and whether it carries a torch do not depend on each other. One mode list holding every pairing grows by multiplication; two small fields or two small machines grow by addition. Put a cross-rule where it matters (no searching dark rooms without a torch) as one explicit check.

**Rich AI is a different tool.** A champion that weighs distance, health, cover, and allies every moment to pick the best action is not a handful of modes with fixed transitions. Behavior Trees choose among tasks by priority and conditions, and StateTree adds hierarchy, conditions, and data-driven editing; both are engine tools built for that. A hand-written machine is right for a kiosk, a bridge, a ballista, or a boss with a few fixed phases.

**Animation is not gameplay.** An Animation Blueprint's state machine picks poses and runs on the animation update. Letting it decide gameplay rules (whether the champion can be hit, whether a door is passable) ties those rules to animation timing. Keep the rule's mode in gameplay code and let the animation follow it.

**Fixed transitions can be too rigid.** A machine knows only the transitions written into it. If designers keep asking for "but in this case it should also be able to...", the rules may want data (a table of allowed transitions) or a richer decision tool rather than another hand-written edge.

# Example

```cpp
// Right-sized: two values, no data, no entry work. A boolean says it all.
void ADojoArenaTorch::Light()
{
	if (bLit) return;

	bLit = true;
	Flame->SetVisibility(true);
}
```

# Questions

```yaml
- id: when-not-two-modes
  type: multiple-choice
  prompt: "Which of these needs a mode machine least?"
  choices:
    - A kiosk that waits, takes a choice, dispenses, or is sold out
    - A banner that is either raised or lowered, with nothing else to it
    - A ballista that rests, aims with progress, and reloads with a countdown
    - A boss with taunting, charging, staggered, and down phases
  answerIndex: 1
  explanation: Two modes with no data and no rules beyond the switch itself are a boolean. The others have several modes whose rules differ.
- id: when-not-ai
  type: multiple-choice
  prompt: "An arena opponent must choose every moment between attacking, flanking, using cover, healing, or calling allies, weighing many conditions. What fits best?"
  choices:
    - A hand-written enum with a transition for every pair of behaviors
    - A Behavior Tree or a StateTree, built for prioritized, condition-driven decisions
    - A boolean per behavior
    - An Animation Blueprint state machine
  answerIndex: 1
  explanation: Fixed hand-written transitions explode with that many options; the engine's decision tools handle priorities and conditions as data.
- id: spot-anim-truth
  type: spot-the-bug
  prompt: This champion decides whether a bolt can hurt it. Which line ties a gameplay rule to the animation's state?
  code: |
    bool ADojoArenaChampion::CanBeHurt() const
    {
    	if (Health <= 0.f) return false;
    	const bool bAnimSaysStaggered = AnimInstance->IsInStaggerPose();
    	return !bAnimSaysStaggered;
    }
  bugLine: 4
  fix: Ask the champion's own gameplay mode whether it is staggered, and let the animation follow that mode.
  explanation: The animation updates on its own schedule and blends between poses, so a gameplay rule read from it can be a frame late or mid-blend.
- id: when-not-combinations
  type: multiple-choice
  prompt: "A guard has an activity (patrolling, chasing, searching) and an alert level (calm, wary, alarmed) that change independently. What is the better shape?"
  choices:
    - One mode list with nine values, one per pairing
    - Two separate mode fields, one for activity and one for alert level
    - Nine booleans
    - A single integer with arithmetic to decode both
  answerIndex: 1
  explanation: Two independent concerns are two small machines; nine combined modes would multiply every rule.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a hand-written mode machine is the wrong tool.
  modelAnswer: When there are only two modes with no data, a boolean is enough, and when behavior must weigh many options and conditions at once, the engine's Behavior Trees or StateTree fit better than fixed hand-written transitions.
  rubric:
    - Names the too-small case, such as two modes with no data
    - Names the too-big case, such as rich AI decisions, and a better engine tool
  explanation: The pattern fits the middle ground of a few modes with fixed rules.
```
