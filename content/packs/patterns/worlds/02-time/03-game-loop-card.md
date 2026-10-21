---
id: p2-game-loop-card
title: The loop you never write, and the clock you do
order: 3
kind: concept
difficulty: 2
patterns: [game-loop]
skills: [game-loop, time]
terms: [tick, deltatime, tick-groups, physics-substepping, game-thread]
prerequisites: [p2-swinging-blade]
xp: 25
estimatedMinutes: 8
concepts:
  - Game Loop keeps the game moving without waiting for input and decides how game time follows real time
  - In Unreal the engine owns the loop; the variable frame and DeltaSeconds are its default time policy
  - A fixed-step bank inside the frame is the hand-written part, for results that must repeat exactly
  - The leftover fraction of a step is for drawing only, never for the simulation
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the blade's simulation steps 32 times a second, but the game draws at 144 frames a second. What does the player see on the frames in between steps?"
choices:
  - The blade freezes until the next step
  - The blade drawn between its last two steps, by how much time is banked
  - The blade jumps ahead using the frame's delta
  - The engine draws only on frames that ran a step
answerIndex: 1
explanation: The alpha says how far the bank is toward the next step, and the drawing blends the last two steps by it, so the motion looks smooth while the simulation stays on its fixed steps.
```

# Card

What you built in the swinging blade is a piece of the **Game Loop** pattern. The whole pattern is the heartbeat every game has: a loop that keeps running whether or not the player presses anything, reads input without waiting for it, moves the game forward, and draws, over and over. Its second job is the one you just did by hand: deciding how much game time each pass of the loop represents, so the game plays at the same pace on any machine.

**Unreal owns the loop.** You never write the outer loop in an Unreal project. The engine runs it: each frame it processes input, ticks the world through its tick groups, and hands the frame to the render thread, which draws it while the game thread starts on the next. Its default time policy is a variable step: each frame advances the game by however long the last frame really took, which is the `DeltaSeconds` your Tick receives.

**When the variable step is not enough.** A variable step is right for most gameplay: movement, timers, camera smoothing. It falls short when rules interact within an update (a spring pulling while damping slows it) or when results must repeat exactly: a replay that must match the round, two machines in a lockstep match, a test that compares numbers. Then you put a fixed step inside the engine's frame: bank the frame's real time, spend it in whole steps of one fixed length, carry the remainder to the next frame. Every machine runs the same steps in the same order, so it gets the same answer.

**Drawing between steps.** The simulation only changes on steps, but the screen updates every frame. The remainder of the bank, divided by the step length, is a fraction from 0 to almost 1. Drawing the object that fraction of the way from its previous step to its current one hides the steps. The fraction is for drawing only; feed it into the simulation and the frame rate leaks back into the result.

**The engine's own fixed-step options.** Physics substepping (Project Settings, Physics) splits a long frame into several smaller physics steps. The async physics tick gives physics code a callback at a fixed rate. Use Fixed Frame Rate (Project Settings, General Settings, Framerate) forces every frame to the same delta, which suits offline captures but makes the game run slow, not choppy, on a machine that cannot keep up.

# Example

```cpp
// The shape you wrote, reduced to its parts: bank, spend in fixed steps, draw by the remainder.
void ADojoArenaSpinner::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Bank += DeltaSeconds;

	while (Bank >= StepSeconds)
	{
		PreviousSpin = Spin;
		Spin = SimulateSpin(Spin, StepSeconds);
		Bank -= StepSeconds;
	}

	const float Alpha = Bank / StepSeconds;
	SetActorRotation(FRotator(0.f, FMath::Lerp(PreviousSpin, Spin, Alpha), 0.f));
}
```

# Questions

```yaml
- id: lockstep-arena
  type: which-pattern
  prompt: "Two players' machines run the same arena match by exchanging only their button presses, and both must end the round with identical positions, whatever their frame rates. Which pattern's decision is at the heart of this?"
  choices: [game-loop, observer, double-buffer, command]
  answer: game-loop
  distractorNotes:
    - choice: observer
      why: Delegates spread news to listeners, but nothing about notification makes two machines advance time the same way.
    - choice: double-buffer
      why: Reading last step's state while writing the next keeps one step consistent, yet machines with different step sizes still drift apart.
    - choice: command
      why: Button presses as objects are what gets sent, but they only produce the same result if both machines run the same fixed steps.
  explanation: The time policy (fixed simulation steps, drawing free) is what keeps the two machines in lockstep.
- id: spot-it-engine
  type: multiple-choice
  prompt: "In an Unreal project, where does the outer loop that reads input, ticks the world, and draws actually live?"
  choices:
    - In the game mode's Tick
    - In the engine; your code joins it through Tick and timers
    - In the level Blueprint's Event Tick
    - In a while loop you add to BeginPlay
  answerIndex: 1
  explanation: The engine runs the loop every frame; actors, components, and timers are called from inside it.
- id: alpha-misuse
  type: spot-the-bug
  prompt: This step function is called from a fixed-step bank. Which line lets the frame rate back into the simulation?
  code: |
    void ADojoArenaSpinner::SimulateStep()
    {
    	PreviousSpin = Spin;
    	SpinSpeed *= Friction;
    	Spin += SpinSpeed * StepSeconds * (1.f + GetAlpha());
    }
  bugLine: 5
  fix: Advance the spin by SpinSpeed times StepSeconds only, and use the alpha only when drawing.
  explanation: The alpha depends on how frames happen to line up with steps, so feeding it into the simulation makes results differ by frame rate again.
- id: fill-bank
  type: fill-blank
  prompt: "In a fixed-step loop, the frame's real time is added to a bank, and steps run while the bank holds at least one ___."
  acceptedAnswers: [step, whole step, StepSeconds, step length]
  explanation: Each step spends exactly one step length of banked time; what is left waits for the next frame.
- id: explain-two-jobs
  type: explain-in-one-sentence
  prompt: In one sentence, name the two jobs of the Game Loop pattern.
  modelAnswer: It keeps the game running without waiting for input, and it controls how much game time each pass advances so play runs at the same pace on any machine.
  rubric:
    - Mentions running continuously, or not blocking on input
    - Mentions controlling how game time advances relative to real time
  explanation: The first job the engine does for you; the second you sometimes take over with a fixed step.
```
