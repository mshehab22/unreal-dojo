---
id: p17-recompute-every-frame
title: The same sum, sixty times a second
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [architecture, performance]
terms: [mutable-member]
prerequisites: [p16-boss-finale]
xp: 25
estimatedMinutes: 8
concepts:
  - A derived value is worked out from other values, and it is often read much more often than those values change
  - Working a derived value out on every read repeats work whose answer cannot have changed
  - Working it out on every change repeats work when several changes arrive before anyone reads
  - Remembering the answer, noting when it has gone out of date, and working it out only when asked after a change does the work once
  - A const reading function can refresh a remembered answer when that member is mutable
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a fighter's guard rating is the base guard plus every worn item plus every buff. The screen asks for the rating 60 times a second, and in a busy minute the fighter's gear and buffs change 6 times. How many times in that minute does the sum really have to be worked out?"
choices:
  - 3,600, once for every ask
  - 360, once every tenth ask
  - 60, once a second
  - 6, once for each change
answerIndex: 3
explanation: The answer only changes when a part changes, so six changes mean at most six new sums, however many times it is asked.
```

# Card

A lot of numbers in a game are not stored, they are worked out. A fighter's guard rating is the base guard plus the bonus of each item worn plus each temporary buff. The screen shows it every frame, the damage code reads it whenever a hit lands, and the enemy's decision code looks at it too. Meanwhile the parts change rarely: an item is put on, a buff runs out.

**Working it out on every read.** The simplest function adds the parts up each time it is called:

```cpp
int32 UDojoGuard::GetGuard() const
{
	return BaseGuard + SumOfGear() + SumOfBuffs();
}
```

It is always right, and it repeats the same sum sixty times a second to produce the same number. With three parts that costs nothing. With a few hundred parts, or a sum that sorts a list, it adds up across every fighter on the field.

**Working it out on every change.** The opposite habit recomputes inside each function that changes a part. That also wastes work: put on three items and drink a potion in one moment, and the sum runs four times to produce one answer that nobody read in between.

**Remember it, note when it is old, work it out when asked.** Keep the last answer next to a yes-or-no note saying whether any part has changed since that answer was worked out. A change only flips the note. A read looks at the note: if nothing has changed it returns the remembered answer for free, and if something has, it works the answer out once, stores it, and clears the note. Ten changes followed by one read cost one calculation. A hundred reads with no change cost none.

**A read that updates something.** The function that reads the rating is naturally a `const` function: asking must not change the fighter. But refreshing the remembered answer changes members. C++ allows this for members marked `mutable`: a const function may update them, because the remembered answer and the note are not part of what a caller sees change.

**What to watch.** The remembered answer is only right if every function that changes a part also flips the note. One path that forgets leaves the old answer standing.

# Example

```cpp
// Before: the sum runs on every ask.
int32 UDojoGuard::GetGuard() const
{
	return BaseGuard + SumOfGear() + SumOfBuffs();
}

// After: the last answer is kept, and the sum runs only when a part has changed.
int32 UDojoGuard::GetGuard() const
{
	if (bOutOfDate)
	{
		RememberedGuard = BaseGuard + SumOfGear() + SumOfBuffs();
		bOutOfDate = false;
	}
	return RememberedGuard;
}
```

# Questions

```yaml
- id: when-to-work-out
  type: multiple-choice
  prompt: "The rating changes six times a minute and is read sixty times a second. Which plan does the least work?"
  choices:
    - Work it out again every time anyone reads it
    - Work it out again every time a part changes
    - Keep the answer and redo it after a change
    - Work it out again once a second on a timer
  answerIndex: 2
  explanation: Only a read after a change needs a new sum. Reads with no change reuse the answer, and several changes before a read share one sum.
- id: fill-mutable
  type: fill-blank
  prompt: "A const function may update a member that is marked ___."
  acceptedAnswers: [mutable]
  explanation: A mutable member can be changed even through a const function, which is how a read can refresh a remembered answer.
- id: spot-every-read
  type: spot-the-bug
  prompt: The rating is read every frame and its parts rarely change. Which line makes the sum run on every read?
  code: |
    int32 UDojoGuard::GetGuard() const
    {
    	return BaseGuard + SumOfGear() + SumOfBuffs();
    }
  bugLine: 3
  fix: Keep the last answer and a note that a part has changed, and work the sum out only when the note is set.
  explanation: The function adds the parts up on every call, even when nothing has changed since the last one.
- id: why-not-on-change
  type: multiple-choice
  prompt: "A fighter puts on three items and drinks a potion in the same moment, and nobody reads the rating until the next frame. If every change recomputes the rating, how many sums run for the one answer that is read?"
  choices:
    - One
    - Four
    - Three
    - Zero
  answerIndex: 1
  explanation: Each of the four changes works the sum out, and the first three answers are thrown away unread.
- id: explain-remember
  type: explain-in-one-sentence
  prompt: In one sentence, say how a derived number that is read often and changes rarely can be worked out only when it needs to be.
  modelAnswer: Keep the last answer and a note that a part has changed, flip the note on every change, and work the answer out again only when it is read and the note is set.
  rubric:
    - Says to keep the last answer, or to remember it
    - Says a note or flag is set by changes and checked on a read
  explanation: Remember the answer, mark it old on a change, and refresh it on demand.
```
