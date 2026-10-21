# GameDev.tv Unreal Coding Program: exercise design analysis

Source: the exercise repository for the GameDev.tv Unreal Coding Program (28 markdown files, 8 module folders, README). Read in full on 2026-10-21. This document records how the exercises are built, what they cover, and how Unreal Dojo should go further. Everything in sections 6 and 7 is original and written for our authors. Nothing from the source is reproduced except one short structural line in section 2.

Exercise references use the form `M.G.N` (module, group, exercise). `M.G.pre` is a group preamble. `M.MJ` is a module's microjam. Example: `3.1.5` is Module 3, group 1, exercise 5.

---

## 1. Structure

### 1.1 The hierarchy

```
Program (8 modules)
  Module (one folder, 1 to 4 group files + 1 microjam file)
    Exercise group (one markdown file, a preamble and 5 to 11 numbered exercises)
      Numbered exercise (## N. Title, 2 to 12 bullet lines)
    Microjam (one file: a base system + 4 extension tasks)
  Module 7 and 8: one file each, a method and phases instead of numbered exercises
```

### 1.2 Module and group map

| Module | Groups (file order) | Exercises per group | Microjam |
|---|---|---|---|
| 1 Input Mastery | Trigger States, Input Modifiers, Trigger Qualifiers, Movement Abilities | 5, 5, 11, 7 | Stamina System |
| 2 Transforms and Movement | Movement, Rotation, Scaling | 10, 8, 7 | Obstacle set (3 obstacles + more) |
| 3 Collision Detection | Overlaps, Hits, Interactable Objects | 9, 8, 9 | Inventory System |
| 4 Spawning and Timers | Spawning, Timers, Combined ("Its Time To Spawn") | 7, 9, 6 | Projectile Weapon |
| 5 Line and Shape Tracing | Line traces, Shape sweeps, Look and Interact | 9, 9, 9 | Physics Interaction (grab and carry) |
| 6 Delegates | Built-in delegates, Custom delegates, Event-Driven Gameplay | 11, 7, 10 | Multi-quest System |
| 7 Mechanic Maker I | one file: method + 3 mechanics + showcase | n/a | n/a |
| 8 Mechanic Maker II | one file: 5 phases | n/a | n/a |

Totals: 156 numbered exercises across modules 1 to 6, 6 microjams each with 4 extension tasks (24 extensions), 2 project modules. Average group size is 8.2 exercises; range 5 to 11.

### 1.3 The three-group rhythm inside a module

Modules 3 to 6 follow the same internal arc:

1. Group 1 explores one raw mechanism in isolation (overlap events, spawning, line traces, built-in delegates).
2. Group 2 explores the sibling mechanism (hit events, timers, shape sweeps, custom delegates).
3. Group 3 combines both into gameplay objects (interactables, spawners with timers, an interaction system, pressure plate doors and a quest line).
4. The microjam asks for a player-facing system that uses the whole module and earlier modules.

Module 1 is four groups because input has four separate dimensions (states, modifiers, qualifiers, then abilities built from them). Module 2 is three parallel explorations (move, rotate, scale) with no combination group; the microjam does the combining.

Each module also reaches backwards on purpose. Module 3 asks you to use Module 2 actors as test subjects. Module 4 reuses the coin and pressure plate. Module 5 reuses interactables and movement actors. Module 6 rebuilds the Module 4 respawning pickup and the Module 3 pressure plate with the new tool. Module 7 lists which module each piece of an example mechanic comes from.

### 1.4 How difficulty ramps inside a group

Every group has the same shape, roughly thirds:

- First third: fully scripted. The exercise names the component, the collision preset, the delegate, the function to call, and the exact message to print. The learner's only decision is where to type. Verification is "play, do X, watch for the message".
- Middle third: goal plus one or two constraints plus a hint naming an API or a place to look. The learner chooses the approach.
- Last third: a one-line goal, sometimes literally one bullet ("figure out how to use X"), or a small combination that needs two earlier exercises. The final exercise of a group is almost always a mini-mechanic (sentry eye, robot cleaner, stomp detector, random geyser, bomber blimp, health reporter, traffic light) or a free-form polish task (sound designer, input harmony).

Within a single exercise, the same ramp appears as ordered sub-steps: do it by hand first, then with an interpolation function; one axis first, then three; identity rotation first, then the arrow's rotation; uniform first, then per-axis. The learner always sees the naive version before the better one.

The explanation density also ramps across modules. Modules 1 and 2 contain almost no explanation and no reflection questions. Module 3 introduces "answer this question". Modules 5 and 6 add short declarative sentences explaining what a thing is before the steps, and Module 6 adds "notice" lines that name the design lesson (direction of dependency, multicast meaning, why broadcasting to nobody is safe).

### 1.5 "Continue with the previous actor" versus "new actor"

The group preamble sets the default. One line carries it (the only quote in this document):

> Create a new C++ Actor Class and Blueprint for **each** exercise unless told to continue.

Rules observed in practice:

- A new class per exercise is the default from Module 2 onward. Each preamble suggests two example class names so the naming convention is modelled (prefix A, descriptive noun, suffix Actor).
- "Continue" is used only when the next exercise adds a second event, a second parameter, or a second visualisation to the same object. Chains are 2 or 3 exercises long and never longer: overlap begin, end, who (3.1.1 to 3.1.3); hit, who, hit versus overlap (3.2.1 to 3.2.3); impact point then impact normal (3.2.4 to 3.2.5); physics hits then hit strength (3.2.6 to 3.2.7); first spawn, spawn point, blocked spawn (4.1.1 to 4.1.3); trap trigger then short lived (4.1.4 to 4.1.5); first trace then inspecting the hit (5.1.1 to 5.1.2); first sweep then location versus impact point (5.2.1 to 5.2.2).
- When the concept changes, the object changes. A new class is a visible signal that a new idea starts, and it keeps each class small enough to read later.
- Module 1 is the exception: all four groups edit the one template character, with a warning about variable name collisions with subclasses.
- Groups that build one system (5.3 Look and Interact, 6.3 Event-Driven Gameplay) work on one character or one pair of actors for the whole group, and the microjam continues the same code.
- Microjams never say "new actor". They say "implement a system for the player character", which pushes the learner to decide the class layout alone.

### 1.6 How modules 7 and 8 differ

They have no numbered exercises, no hints, no exact messages. Each is a method the learner applies to their own idea:

- Module 7 gives a four-step method (pitch in one or two sentences, decompose into pieces and map each piece to a module, isolate and spike the unknown pieces, build and tune) and three worked example decompositions. The learner builds three mechanics with rising constraints: the first may copy an example and must span at least three modules; the second must be the learner's own idea in a different area; the third is the showpiece with polish. Output is a demo area and a 30-second clip per mechanic.
- Module 8 gives five phases (choose a 2-minute moment from a real game, study it and write a mechanic inventory mapped to modules with gaps marked, graybox the layout and check scale, build unknowns first then reuse the library, then tune and record a side-by-side). It also gives a buildability filter: pick moments heavy on movement, physics, triggers, doors, and platforming; avoid moments built on melee animation, dialogue, cutscenes, or complex AI.

The key difference from modules 1 to 6: the planning step, which the earlier modules never asked for, becomes mandatory and is called the skill being practiced. This is exactly the gap the Dojo's breakdown quests fill, and we should start it in module 1, not module 7.

---

## 2. Exercise anatomy

### 2.1 Group preamble template

```
# <Group Title>                                  (2 to 3 words, often a pun)
- **<one sentence: what you will practice>**      (bold)
	- <which class to work in, or "new class per exercise" with 2 example names>
	- <where to put the Blueprints: one folder per group>
	- <a tool: console command, F8 eject, debug draw advice>
	- <a warning: name clashes, delete settings between exercises, set a flag>
	- <pointer to the showcase video>
```

### 2.2 Numbered exercise template

```
## N. <Short Title>
- Goal: <one sentence naming the finished behaviour>
- <step>                                 imperative, one action, names the API or setting
	- <sub-step>                          detail of the step above
- <fact>                                 declarative sentence explaining the thing just named
- Hint: <API name, header, or where to look in the editor or template>
- Play the game, <do X>, observe <when or what>.        verification
- Tweak <setting> and observe <effect>.                 experiment
- Try to answer this question: <question>.              reflection
- Bonus: <optional extension>                           extension
- Notice: <design lesson>                               reflection (Module 6 only)
```

Which lines are which:

- Instructions: any line starting with an imperative verb (create, bind, set, add, log, place, spawn, draw). These are the only mandatory lines.
- Verification: lines starting with "Play the game" or "Test". They always pair an action with an expected observation. In early exercises the expected log string is given verbatim so the learner can compare exactly.
- Experiments: "Tweak", "Experiment", "Set X to false and observe", "turn it off, then back on". These are A/B toggles of one setting.
- Hints: lines prefixed "Hint:". They name an API, a header, a template asset to copy from, or a function to look up. They never contain code.
- Explanations: declarative sentences with no verb of instruction ("X is a struct that...", "Looping timers run forever unless you stop them."). Rare in modules 1 and 2, common in 5 and 6.
- Reflection: "Try to answer this question", "Understand how the parameter affects", "Notice", "Think about". Answers are not given anywhere in the text. Some questions have definite answers (can a blocking collision fire overlap events), some are design judgement (should anything happen when a non-player falls in).
- Extensions: "Bonus:" lines, always optional, often polish (sound, animation, smooth interpolation, auto-aim).
- Callbacks: sentences of the form "remember X from Module N" or "your Module 2 actors are good test subjects". They are the only repetition mechanism.

Not every exercise has all of these. The minimum is a title plus one instruction line (several "figure out how to use X" exercises are exactly that). The maximum is about 12 lines (5.1.5, 6.1.1). Goal lines are missing from a few exercises (3.3.6, all of 1.1 and 1.3), which reads as an oversight rather than a choice.

### 2.3 Microjam template

```
# Microjam - <System Name>
- **Implement <system> for the player character.**
- Look at the game "<a real game>" to see an implementation.
- <3 or 4 core requirements, each one bullet, including one UI requirement>
---
## Extension Tasks
### 1. <Named extension>     one focused addition with a concrete number (1 second, 20 percent, 10 shots)
### 2. <Named extension>
### 3. <Named extension>
### 4. More, more, more!     3 to 5 loose ideas, usually including a debug toggle and a tuning instruction
```

Every microjam has exactly this shape. The reference game is always named. The last extension always ends with "tune it until it feels like X", which is the feel criterion.

### 2.4 Modules 7 and 8 template

```
# <Title>
## The Challenge         why this module exists, what it proves
## The Method / Phases   numbered steps, each a heading with 2 to 5 bullets
## Example Ideas         3 mechanics, each with a pitch and a numbered decomposition mapped to modules
## Mechanic 1 / 2 / 3    rising constraints
## The Showcase          deliverable (clip), share with community
```

---

## 3. Pedagogy

### 3.1 What works

1. One idea per exercise, two to five minutes of typing. A learner can finish 3 to 6 exercises in a sitting and feel the ladder move.
2. Verification inside the editor every time. "Play, walk into it, read the message" is the test. The exact log string is given so there is no ambiguity about success in early exercises.
3. Observe and answer. The reflection question is asked after the learner has seen the behaviour, so the answer comes from evidence, not reading.
4. A/B experiments on a single setting. Generate Overlap Events on and off, bSweep true and false, trace responses Ignore, Overlap, Block on three walls in a row, AddDynamic twice versus AddUniqueDynamic twice. The learner forms the rule by seeing both sides.
5. Deliberate failure first. Several exercises are designed so the first run fails: the spawn inside a wall does not spawn, the trace hits the actor's own mesh, the character does not block the visibility channel, the distance accumulator drifts past the threshold. Then the exercise names the fix. This beats being told the rule up front.
6. Naive version before the better version inside one exercise (manual math then interpolation, bool flag then unbind, Tick polling then delegates).
7. Naming modelled, not lectured. Two example class names in every preamble, asset prefixes (IA_), delegate type naming with a suffix, the F prefix explained once.
8. Organisation modelled. One Content folder per group. One class per concept. Warnings about name clashes with subclasses.
9. Tooling taught as it becomes useful: a console command in the preamble of the group that needs it (input debug, show collision), the eject key when debug lines need inspecting, debug draw helpers before any trace exercise.
10. The gameplay library idea. Interactables are explicitly built to be reused, and later modules use them as test subjects or rebuild them with better tools. The learner sees their own earlier code again with new eyes (6.1.2 asks them to reread a Module 3 binding as a delegate subscription).
11. Microjams give creative control inside a frame: fixed core requirements with numbers, a real game as reference, named extensions, and a feel criterion at the end. Extensions are ordered from the most structural to the loosest.
12. Pattern naming when it is cheap: a timer chain is called a state machine, a broadcaster with two events is called the shape of a real health component, a door plus many plates is called a multi-switch puzzle. Each is one sentence, placed right after the learner built it.
13. Design direction called out. Module 6 states which actor knows about which and which knows nothing, right after the learner wires it in the editor.
14. The final modules convert the method into the deliverable: pitch, decompose, spike, build, tune, record, share.

### 3.2 What is missing (and what Unreal Dojo adds)

1. No automated checks. The only oracle is the showcase video and the solution project. A learner can be wrong and not know it. The Dojo runs automation tests per build quest and AI review.
2. No pattern vocabulary. Observer is never named though Module 6 is entirely about it. Component, State, Command, Object Pool, Type Object are all touched (actor components suggested at 5.3.7, state machine at 4.2.8, buffered input never, spawn and destroy churn at 4.3.3 with no pooling) and never named. The Dojo names the pattern on the card, in the brief, and in the rubric.
3. No planning or breakdown step before Module 7. Learners build 156 exercises without once writing which classes they will create and why. The Dojo puts a breakdown quest in every world.
4. No spaced repetition. Callbacks exist but are ad hoc, and nothing returns after a gap. The Dojo schedules drills and rematches.
5. Little explanation of why. Modules 1 to 4 state what to do and leave the reason to the video. Where a reason is given (Module 6) it is one line. The Dojo gives every build quest of difficulty 3 and above a "why this is the Unreal way" paragraph.
6. No success criteria beyond "observe". No rubric, no acceptance list, no time estimate, no difficulty label. Authors must supply all four.
7. No C++ hygiene. UPROPERTY appears only as EditAnywhere. Nothing on forward declarations, const correctness, TObjectPtr, header and source split, GC ownership of pointers, when a raw pointer is unsafe. The Dojo's reviewer prompt checks these, so briefs must mention them when relevant.
8. No performance or lifecycle guidance beyond "timers mean no Tick needed". Nothing on Tick cost, Tick enabling and disabling, BeginPlay ordering, EndPlay cleanup, or unbinding on destruction.
9. Reflection questions have no answers in the text and no feedback path. The Dojo turns each into a graded recall question with an explanation.
10. "Figure out how to use X" exercises (1.2.5, 1.3.7 to 1.3.10, 2.2.8, 2.3.5) give no fallback. In the Dojo, a hint ladder exists on every quest.
11. Dependence on the First Person template and its variant characters. Our sandbox project replaces this with a fixed DojoCharacter and test world.
12. UI is assumed (progress bar, crosshair, prompt, HUD) but never taught. Each UI requirement needs a minimal widget quest or a provided widget.
13. No data-driven step. Values live as EditAnywhere on actors; Data Assets, Data Tables, curves as data, and soft references never appear except UCurveFloat. The Dojo's Pack 1 data world covers this and the Mechanics Lab should use it from the spawning world onward.
14. No error handling teaching: null checks are mentioned once (6.1.1). ensure, check, IsValid, and logging categories never appear.

---

## 4. Concept inventory

Kind codes: cls = class or struct, fn = function or method, macro, comp = component, asset, setting = editor setting or property, enum, console = console command, idea = concept without a single API, ui = UMG element.

### 4.1 Module 1: Input Mastery

| Concept | Kind | First appears | Note |
|---|---|---|---|
| First Person template C++ character and its Blueprint | cls | 1.1.pre | All of Module 1 edits this class |
| UInputAction asset, IA_ prefix | asset | 1.1.pre | One per experiment |
| UInputMappingContext, key to action mapping | asset | 1.1.pre | |
| Console (tilde key) | console | 1.1.pre | |
| `ShowDebug EnhancedInput` | console | 1.1.pre | Shows live action values and trigger state |
| Showcase video as oracle | idea | 1.1.pre | |
| Binding a function to an action (UEnhancedInputComponent::BindAction) | fn | 1.1.1 | Implied by "bind a function" |
| On-screen debug message (GEngine->AddOnScreenDebugMessage) | fn | 1.1.1 | "log a message to the screen" throughout |
| ETriggerEvent::Started | enum | 1.1.1 | |
| ETriggerEvent::Completed | enum | 1.1.2 | |
| ETriggerEvent::Triggered | enum | 1.1.3 | |
| Hold trigger, Hold Time Threshold | setting | 1.1.3 | |
| ETriggerEvent::Ongoing | enum | 1.1.4 | Only visible with a timed trigger |
| ETriggerEvent::Canceled | enum | 1.1.5 | Fires when released before threshold |
| Input Action Value Type (bool, Axis1D, Axis2D, Axis3D) | setting | 1.2.1 | Hint: three states need an axis, not a bool |
| Input modifier: Negate | setting | 1.2.1 | Two keys, one action, opposite signs |
| Input modifier: Scalar | setting | 1.2.2 | Mouse sensitivity |
| Template MouseLook action as a reference | asset | 1.2.2 | |
| Invert axis with Negate per axis | setting | 1.2.3 | |
| FInputActionInstance | cls | 1.2.4 | Bound function takes const reference |
| GetValue, GetTriggeredTime, GetElapsedTime on the instance | fn | 1.2.4 | |
| Input modifier: Dead Zone | setting | 1.2.5 | Needs a gamepad |
| Trigger: Pressed | setting | 1.3.1 | |
| Trigger: Released | setting | 1.3.2 | |
| Trigger: Tap, Tap Release Time Threshold | setting | 1.3.3 | |
| Trigger: Repeated Tap, Repeat Delay, Number Of Taps | setting | 1.3.4 | |
| Trigger: Hold, Is One Shot | setting | 1.3.5 | |
| Trigger: Hold And Release | setting | 1.3.6 | |
| Trigger: Down | setting | 1.3.7 | |
| Trigger: Pulse | setting | 1.3.8 | |
| Trigger: Chorded Action | setting | 1.3.9 | Second action as a modifier key |
| Trigger: Combo Action | setting | 1.3.10 | Sequence of actions |
| Combining triggers (implicit AND and blocker rules) | idea | 1.3.11 | |
| Subclass name clash (variant characters inherit the player class) | idea | 1.4.pre | |
| UPROPERTY(EditAnywhere) on a float | macro | 1.4.1 | First tuning knob |
| UCharacterMovementComponent::MaxWalkSpeed | setting | 1.4.1 | |
| Input style choice (press and release, toggle, chord) | idea | 1.4.1 | |
| Sprint as a speed swap | idea | 1.4.2 | |
| UCharacterMovementComponent::JumpZVelocity | setting | 1.4.3 | |
| Charged action with movement penalty while charging | idea | 1.4.3 | |
| Crouch support in the movement component (Crouch, UnCrouch, bCanCrouch) | fn | 1.4.4 | |
| UCapsuleComponent half height | setting | 1.4.4 | |
| UCameraComponent relative location | setting | 1.4.4 | |
| Crouch animations | asset | 1.4.4 | |
| Smooth camera interpolation | idea | 1.4.4 bonus | |
| ACharacter::LaunchCharacter | fn | 1.4.5 | Dash |
| Sound effect playback | fn | 1.4.5 bonus | |
| Flying movement mode (SetMovementMode, MOVE_Flying) | fn | 1.4.6 | Up, down, and planar input |
| Ability gating and mutual exclusion | idea | 1.4.7 | "should dash be allowed while crouched" |
| Resource float with drain and regen | idea | 1.MJ | Stamina |
| UMG progress bar | ui | 1.MJ | |
| Threshold state (exhausted until 20 percent) | idea | 1.MJ ext 2 | |
| Regen delay timer | idea | 1.MJ ext 3 | |
| Debug toggle key for testing | idea | 1.MJ ext 4 | |

### 4.2 Module 2: Transforms and Movement

| Concept | Kind | First appears | Note |
|---|---|---|---|
| New C++ Actor class plus Blueprint child per exercise | idea | 2.1.pre | |
| USceneComponent as root | comp | 2.1.pre | |
| UStaticMeshComponent with engine basic shapes | comp | 2.1.pre | |
| One Content folder per group | idea | 2.1.pre | |
| Tick and DeltaTime scaling | fn | 2.1.1 | Implied by "moves continuously" |
| Speed and direction variables (float, FVector) | idea | 2.1.1 | |
| SetActorLocation / AddActorWorldOffset | fn | 2.1.1 | |
| UArrowComponent | comp | 2.1.2 | |
| GetForwardVector of a component | fn | 2.1.2 | |
| Distance accumulator with threshold and reversal | idea | 2.1.3 | Overshoot drift bug is named |
| FMath::VInterpConstantTo, FInterpConstantTo, Lerp | fn | 2.1.4 | |
| Target actor pointer and stop distance | idea | 2.1.5 | |
| FVector::Dist (implied) | fn | 2.1.5 | |
| Waypoint as component or as separate actor | idea | 2.1.6 | |
| TArray of waypoints, index wrap | cls | 2.1.7 | |
| USplineComponent, location at distance along spline, spline length | comp | 2.1.8 | |
| UCurveFloat asset, GetFloatValue | asset | 2.1.9 | |
| FMath::Sin, easing functions | fn | 2.1.10 | External reference to easings site |
| FRotator, AddActorLocalRotation / SetActorRotation | cls | 2.2.1 | |
| Yaw, pitch, roll as separate speeds | idea | 2.2.2 | |
| FMath::RandRange, random choice on BeginPlay | fn | 2.2.3 | |
| Ping pong between angle limits | idea | 2.2.4 | |
| Lerp between two FRotators | fn | 2.2.5 | |
| UKismetMathLibrary::FindLookAtRotation | fn | 2.2.6 | |
| FMath::RInterpTo (implied by bonus) | fn | 2.2.6 bonus | |
| Child component offset to produce orbit | idea | 2.2.7 | Pivot by hierarchy |
| CurveFloat driving rotation speed | asset | 2.2.8 | |
| SetActorScale3D, FVector as scale | fn | 2.3.1 | |
| FMath::FRandRange per axis | fn | 2.3.1 | |
| Timer re-randomising scale | fn | 2.3.1 bonus | First timer mention, before Module 4 |
| Max cap and clamp (FMath::Clamp or Min) | fn | 2.3.2 | |
| Per-axis cap and speed | idea | 2.3.3 | |
| Ping pong scale | idea | 2.3.4 | |
| CurveFloat driving scale | asset | 2.3.5 | |
| Sine driving scale | fn | 2.3.6 | |
| Distance from spawn point driving scale | idea | 2.3.7 | Store spawn location in BeginPlay |
| Obstacle that pushes the player (physics or sweep) | idea | 2.MJ | Fall Guys reference |
| Combining move, rotate, scale in one actor | idea | 2.MJ ext 4 | |

### 4.3 Module 3: Collision Detection

| Concept | Kind | First appears | Note |
|---|---|---|---|
| `show Collision` | console | 3.1.pre | |
| UBoxComponent | comp | 3.1.1 | |
| Collision preset OverlapAllDynamic | setting | 3.1.1 | |
| UFUNCTION on a delegate handler | macro | 3.1.1 | Required for AddDynamic |
| OnComponentBeginOverlap signature (OverlappedComponent, OtherActor, OtherComp, OtherBodyIndex, bFromSweep, SweepResult) | fn | 3.1.1 | |
| AddDynamic | macro | 3.1.1 | |
| OnComponentEndOverlap signature | fn | 3.1.2 | |
| OtherActor, OtherComp parameters | idea | 3.1.3 | |
| AActor::GetActorNameOrLabel | fn | 3.1.3 | |
| Capsule is the overlapping component of a character | idea | 3.1.3 question | |
| Generate Overlap Events flag on a mesh | setting | 3.1.4 | A/B toggle |
| Collision presets compared for overlaps | setting | 3.1.4 | |
| GetWorld()->GetTimeSeconds | fn | 3.1.5 | Time inside |
| Player filtering by Cast or by Actor Tag (ActorHasTag) | fn | 3.1.6 | Two options named |
| Overlap counter with on-screen display | idea | 3.1.7 | |
| USphereComponent, two sizes | comp | 3.1.8 | |
| One handler bound to several components, OverlappedComponent to tell apart | idea | 3.1.8 | |
| UPrimitiveComponent::GetOverlappingActors | fn | 3.1.9 | Polling versus events |
| Simulation Generates Hit Events flag | setting | 3.2.pre | |
| Collision preset BlockAllDynamic | setting | 3.2.1 | |
| OnComponentHit signature (HitComponent, OtherActor, OtherComp, NormalImpulse, Hit) | fn | 3.2.1 | |
| Jump onto the actor as a test input | idea | 3.2.2 | |
| Blocking versus overlapping and which events each fires | idea | 3.2.3 | |
| FHitResult::ImpactPoint | cls | 3.2.4 | |
| Output log (UE_LOG) as distinct from the screen | fn | 3.2.4 | |
| DrawDebugSphere, DrawDebugHelpers.h | fn | 3.2.4 | |
| FHitResult::ImpactNormal | cls | 3.2.5 | |
| DrawDebugLine, DrawDebugDirectionalArrow | fn | 3.2.5 | |
| Simulate Physics on a mesh | setting | 3.2.6 | |
| NormalImpulse, FVector::Size | fn | 3.2.7 | |
| Threshold variable with two messages | idea | 3.2.7 | |
| Hit direction from the normal (dot with up) | idea | 3.2.8 | Stomp detector |
| Material colour change (dynamic material instance implied) | fn | 3.2.8 | |
| Gameplay library: build to reuse | idea | 3.3.pre | |
| AActor::Destroy | fn | 3.3.1 | Coin |
| Shrink animation in Tick before destroy | idea | 3.3.1 bonus | |
| Respawn location and teleport by SetActorLocation | idea | 3.3.2 | Kill zone |
| LaunchCharacter reuse, launch along facing | fn | 3.3.3 | |
| Modify and restore MaxWalkSpeed on enter and exit | idea | 3.3.4 | Mud zone; must block sprint |
| Smooth press and release of a plate mesh | idea | 3.3.5 | |
| Sliding door opened by presence | idea | 3.3.6 | |
| Platform with activated state, travels to destination, toggles | idea | 3.3.7 | |
| SetSimulatePhysics at runtime, impulse from a hit | fn | 3.3.8 | Breakable door |
| Condition on player state (sprinting) | idea | 3.3.8 bonus | |
| PlaySoundAtLocation or audio component, free sound sourcing | fn | 3.3.9 | |
| Item types and counts (map of type to amount) | idea | 3.MJ | Inventory |
| Inventory widget | ui | 3.MJ ext 1 | |
| Drop: spawn in front of the player, collectable again | idea | 3.MJ ext 2 | |
| Use or equip an item | idea | 3.MJ ext 3 | |
| Capacity limit, chest with random loot, weight | idea | 3.MJ ext 4 | |

### 4.4 Module 4: Spawning and Timers

| Concept | Kind | First appears | Note |
|---|---|---|---|
| TSubclassOf<AActor> with EditAnywhere | cls | 4.1.1 | "pick which class to spawn" |
| UWorld::SpawnActor with class, location, rotation | fn | 4.1.1 | |
| Swap Blueprint classes without code changes | idea | 4.1.1 | |
| ArrowComponent as spawn point, component location and rotation | comp | 4.1.2 | |
| SpawnActor returns null on collision failure | idea | 4.1.3 | Deliberate failure |
| FActorSpawnParameters | cls | 4.1.3 | |
| SpawnCollisionHandlingOverride, ESpawnActorCollisionHandlingMethod | enum | 4.1.3 | Try each value |
| Trigger plus spawn (trap) | idea | 4.1.4 | |
| One-shot bool flag | idea | 4.1.4 | |
| AActor::SetLifeSpan versus Destroy | fn | 4.1.5 | |
| SpawnActorDeferred and FinishSpawning | fn | 4.1.6 | |
| Destruction zone (overlap then Destroy other) | idea | 4.1.7 | |
| Timers replace Tick for scheduled work | idea | 4.2.pre | |
| FTimerHandle as a member | cls | 4.2.1 | |
| FTimerManager::SetTimer with a UFUNCTION callback | fn | 4.2.1 | |
| Looping timer flag | setting | 4.2.2 | |
| Random colour (FLinearColor::MakeRandomColor implied) | fn | 4.2.2 | |
| InFirstDelay parameter | setting | 4.2.3 | Fire at once, then loop |
| Counting loops and ClearTimer | fn | 4.2.4 | Why the handle must be stored |
| PauseTimer, UnPauseTimer, IsTimerPaused | fn | 4.2.5 | |
| GetTimerElapsed | fn | 4.2.5 | |
| Pause versus clear and effect on elapsed time | idea | 4.2.5 question | |
| GetTimerRemaining | fn | 4.2.6 | Countdown bomb |
| Radial push on explosion (AddRadialImpulse implied) | fn | 4.2.6 bonus | |
| Particles and sound as polish | asset | 4.2.6 bonus | |
| Several handles and callbacks in one actor | idea | 4.2.7 | |
| Reusing one handle for two timers (the bug) | idea | 4.2.7 question | |
| Chain of one-shot timers as a state machine | idea | 4.2.8 | First pattern named |
| Re-arming a one-shot timer with a random duration | idea | 4.2.9 | SetTimer on the same handle replaces |
| Validity tracking of a spawned actor | idea | 4.3.1 | Respawning pickup |
| Actor destroyed event (OnDestroyed, previewed) | fn | 4.3.2 hint | Stock keeper |
| Waves: count per wave, interval, wave number log, spread spawn | idea | 4.3.3 | |
| Configurable spawner (size, interval, class, duration) | idea | 4.3.3 bonus | |
| Projectile with physics and lifespan | idea | 4.3.4 | Cannon |
| Explode on impact, auto-aim at player in range | idea | 4.3.4 bonus | |
| Trap that rearms after a delay | idea | 4.3.5 | Icicle |
| Moving spawner (blimp) with drop condition | idea | 4.3.6 | |
| Fire while held, fire rate gate (0.1 s) | idea | 4.MJ | Projectile weapon, camera direction |
| Magazine, ammo HUD, reload timer blocking fire | idea | 4.MJ ext 1 | |
| Projectile impact reaction (colour, stick, pop, sound) | idea | 4.MJ ext 2 | |
| Weapon state animations or colour states | idea | 4.MJ ext 3 | |
| Grenade fuse with radial impulse, shotgun spread, charge shot, ammo pickups, rocket jump | idea | 4.MJ ext 4 | |

### 4.5 Module 5: Line and Shape Tracing

| Concept | Kind | First appears | Note |
|---|---|---|---|
| Debug drawing as the primary debugging tool | idea | 5.1.pre | |
| UWorld::LineTraceSingleByChannel | fn | 5.1.1 | |
| ECC_Visibility | enum | 5.1.1 | |
| Trace start, end, length (1000 units) | idea | 5.1.1 | |
| bool return of a trace | idea | 5.1.1 | |
| DrawDebugLine coloured by result | fn | 5.1.1 | |
| Trace Response Block on the character for Visibility | setting | 5.1.1 | Deliberate failure |
| FHitResult::GetActor | fn | 5.1.2 | |
| Debug sphere at ImpactPoint | fn | 5.1.2 | |
| FHitResult::Distance, FVector::Dist | fn | 5.1.3 | Rangefinder, line drawn to impact |
| Self-hit problem | idea | 5.1.4 | Deliberate failure |
| FCollisionQueryParams, AddIgnoredActor | cls | 5.1.4 | |
| Trace channels versus object channels | idea | 5.1.5 | |
| Per-channel responses Ignore, Overlap, Block | setting | 5.1.5 | Three-wall experiment |
| Block the player but ignore traces | idea | 5.1.5 question | |
| Debug arrow | fn | 5.1.5 | |
| UWorld::LineTraceMultiByChannel, TArray<FHitResult> | fn | 5.1.6 | Multi stops at first block |
| LineTraceSingleByObjectType, LineTraceMultiByObjectType | fn | 5.1.7 | |
| Object types WorldStatic, WorldDynamic | enum | 5.1.7 | Mover stops at static |
| Rotating actor plus trace (radar beam) | idea | 5.1.8 | |
| Line of sight test to the player | idea | 5.1.9 | Sentry eye |
| Sweep as a trace with volume | idea | 5.2.pre | |
| UWorld::SweepSingleByChannel | fn | 5.2.1 | |
| FQuat::Identity | cls | 5.2.1 | |
| FCollisionShape::MakeSphere | fn | 5.2.1 | |
| Debug spheres at sweep start and end with matching radius | idea | 5.2.1 | |
| FHitResult::Location versus ImpactPoint | cls | 5.2.2 | Safe placement |
| Line versus sweep side by side | idea | 5.2.3 | Off-centre target |
| FCollisionShape::MakeBox, MakeCapsule | fn | 5.2.4 | |
| DrawDebugBox, DrawDebugCapsule | fn | 5.2.4 | |
| UENUM to pick shape in the editor | macro | 5.2.4 bonus | |
| Sweep rotation from a component (GetComponentQuat) | fn | 5.2.5 | Sphere ignores rotation |
| UWorld::SweepMultiByChannel | fn | 5.2.6 | |
| UWorld::OverlapMultiByChannel, FOverlapResult | fn | 5.2.7 | No collision component needed |
| AddActorLocalOffset / AddActorWorldOffset with bSweep and out FHitResult | fn | 5.2.8 | Solid mover |
| Reverse on hit (replaces distance threshold) | idea | 5.2.8 bonus | |
| Wander with look-ahead sweep | idea | 5.2.9 | Robot cleaner |
| New Character subclass, Blueprint, GameMode default pawn | cls | 5.3.pre | |
| IA_Interact mapped to E | asset | 5.3.pre | |
| Trace from eyes or camera (GetActorEyesViewPoint or camera location) | fn | 5.3.1 | |
| F8 eject to inspect debug lines | console | 5.3.1 | |
| Custom trace channel in Project Settings, Default Response Ignore | setting | 5.3.2 | ECC_GameTraceChannelN |
| Crosshair image centred | ui | 5.3.3 | |
| Interact key querying the current trace | idea | 5.3.4 | Two messages for hit and miss |
| Actor Tag as interactable marker | setting | 5.3.5 | Channel is not enough |
| Prompt widget shown and hidden by look target | ui | 5.3.6 | |
| Item recognition by tag or by cast; scalability note (component plus delegates) | idea | 5.3.7 | |
| UPrimitiveComponent::AddImpulseAtLocation | fn | 5.3.8 | Off-centre spin |
| Two tags for two interaction kinds | idea | 5.3.8 | |
| Sweep for aim assist | idea | 5.3.9 | |
| Grab and carry in front of camera, drop on second press | idea | 5.MJ | Physics handle or manual |
| Throw with velocity carry-over | idea | 5.MJ ext 1 | |
| Rotate held object with input | idea | 5.MJ ext 2 | |
| Outline highlight (custom depth) | idea | 5.MJ ext 3 | |
| Pull and push distance, smooth float to hold point | idea | 5.MJ ext 4 | |

### 4.6 Module 6: Delegates

| Concept | Kind | First appears | Note |
|---|---|---|---|
| Delegate as "listen for an event" | idea | 6.1.pre | |
| AddDynamic requires UFUNCTION and exact signature | idea | 6.1.pre | |
| EditAnywhere AActor* reference and null check | cls | 6.1.1 | Crash warning |
| Assigning references in the details panel (eyedropper) | setting | 6.1.1 | |
| Every AddDynamic was a subscription | idea | 6.1.2 | Reread old code |
| Multicast: two handlers on one event | idea | 6.1.2 | |
| AActor::OnDestroyed (AActor* DestroyedActor) | fn | 6.1.3 | |
| No polling, no Tick: notified | idea | 6.1.3 | |
| AActor::OnActorBeginOverlap, OnActorEndOverlap (OverlappedActor, OtherActor) | fn | 6.1.4 | Actor-level versus component-level |
| ACharacter::LandedDelegate (const FHitResult&) | fn | 6.1.5 | |
| Finding the player in BeginPlay | fn | 6.1.5 | GetPlayerCharacter implied |
| RemoveDynamic | macro | 6.1.6 | Unbind after N events |
| Unbind versus bool flag | idea | 6.1.6 question | |
| AddUniqueDynamic versus AddDynamic | macro | 6.1.7 | Double-binding experiment |
| FTimerDelegate with payload arguments | cls | 6.1.8 | BindUObject or CreateUObject |
| OnDestroyed driving a respawn | idea | 6.1.9 | Unbind question |
| Sparse delegates | idea | 6.1.10 | Research task |
| OnActorHit | fn | 6.1.11 | |
| OnEndPlay and EEndPlayReason | fn | 6.1.11 | |
| OnTakeAnyDamage | fn | 6.1.11 | |
| UButton OnClicked, OnPressed, OnReleased, OnHovered | fn | 6.1.11 | |
| ACharacter::MovementModeChangedDelegate | fn | 6.1.11 | |
| Four delegate kinds: single, multicast, dynamic single, dynamic multicast | idea | 6.2.pre | Only dynamic multicast is practiced |
| Naming: F prefix, Signature suffix | idea | 6.2.pre | |
| DECLARE_DYNAMIC_MULTICAST_DELEGATE | macro | 6.2.1 | |
| UPROPERTY(BlueprintAssignable) | macro | 6.2.1 | |
| Broadcast() | fn | 6.2.1 | |
| Typed pointer (ADoorbell*, not AActor*) to see the delegate | idea | 6.2.1 | |
| IsBound | fn | 6.2.2 | Safe with zero listeners |
| DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam | macro | 6.2.3 | Type and name pairs |
| DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams | macro | 6.2.4 | Collector pointer from the overlap |
| Bind Event to a C++ delegate in Blueprint, Events section of details | setting | 6.2.5 | |
| Blueprint-only listener actor | idea | 6.2.5 bonus | |
| One broadcaster, three listeners, add a fourth without touching the source | idea | 6.2.6 | |
| Several delegates on one actor (lives changed, died) | idea | 6.2.7 | Health shape |
| Plate with pressed and released delegates; door listens | idea | 6.3.1 | Wiring in details panel |
| Dependency direction (door knows plate, plate knows nobody) | idea | 6.3.1 | |
| One plate, many doors | idea | 6.3.2 | |
| Door with TArray of plates, all-pressed condition | idea | 6.3.3 | Multi-switch puzzle |
| Other listeners: lamp, spawner, hidden platform, alarm | idea | 6.3.4 | |
| Quest item with collected delegate | idea | 6.3.5 | |
| Quest giver: interaction, start quest, count collected, finish | idea | 6.3.6 | |
| Quest started and completed delegates | idea | 6.3.7 | |
| UTextRenderComponent for dialogue, state-dependent text | comp | 6.3.8 | |
| Complete versus reward as separate events, reward delegate | idea | 6.3.9 | |
| Quest HUD widget | ui | 6.3.10 | |
| Multiple simultaneous quests | idea | 6.MJ | |
| Quest chain: system listens to its own completions | idea | 6.MJ ext 1 | |
| Ordered checkpoints race | idea | 6.MJ ext 2 | |
| All-complete finale | idea | 6.MJ ext 3 | |
| Secret quest, timed quest with failure broadcast, lifetime stats | idea | 6.MJ ext 4 | |

### 4.7 Modules 7 and 8: method vocabulary

| Concept | Kind | First appears | Note |
|---|---|---|---|
| Pitch (one or two sentences) | idea | 7 | |
| Decomposition into pieces mapped to modules | idea | 7 | |
| Unknown pieces, spike them in isolation | idea | 7 | |
| Build and playtest; EditAnywhere as tuning knobs | idea | 7 | |
| Example decompositions: grappling hook, coin magnet, patrolling guard | idea | 7 | |
| Constraint: three modules minimum; own idea; showpiece with polish | idea | 7 | |
| Demo area per mechanic, 30-second clip, share | idea | 7 | |
| Moment selection filter (buildable versus trap picks) | idea | 8 phase 1 | |
| Mechanic inventory of a reference clip | idea | 8 phase 2 | |
| Gap map (pieces that match nothing) | idea | 8 phase 2 | |
| Layout sketch on paper | idea | 8 phase 2 | |
| Graybox first, check scale and sight lines | idea | 8 phase 3 | |
| Unknowns first, reuse, retrofit, build fresh; keep it playable; cut and fake | idea | 8 phase 4 | |
| Side-by-side comparison with the original | idea | 8 phase 5 | |

---

## 5. Mechanics and systems inventory

Everything the learner is asked to build that is more than a single API call. Sub-pieces are what the exercise implies but does not spell out.

| Mechanic or system | Where | Implied sub-pieces |
|---|---|---|
| Walk toggle, sprint | 1.4.1, 1.4.2 | input action and style; speed variables; set MaxWalkSpeed; restore on release; mutual exclusion later |
| Charged jump | 1.4.3 | Hold trigger; elapsed time to charge; JumpZVelocity swap; movement penalty while charging; restore |
| Crouch with camera | 1.4.4 | movement component crouch; capsule height; camera height; animation; smooth interpolation |
| Dash | 1.4.5 | LaunchCharacter with forward vector; strength variable; optional sound; later cooldown and cost |
| Free fly toggle | 1.4.6 | movement mode swap; vertical input action; restore walking |
| Ability harmony | 1.4.7 | state flags; allowed combinations table; input consumption |
| Stamina system | 1.MJ | resource float; drain per ability; regen with delay; exhausted state with threshold; bar widget; smooth bar; debug toggle |
| Constant mover, arrow mover, bounded mover | 2.1.1 to 2.1.3 | direction, speed, accumulator, reversal, overshoot guard |
| Interpolated mover, follower | 2.1.4, 2.1.5 | target points or target actor; interp function; stop distance |
| Waypoint patrol (2 and N) | 2.1.6, 2.1.7 | waypoint representation; index; arrival test; loop |
| Spline follower | 2.1.8 | spline component; distance along spline; wrap |
| Curve-driven speed | 2.1.9 | curve asset; time sampling; speed application |
| Sine mover, rotator, scaler | 2.1.10, 2.2.5, 2.3.6 | time, frequency, amplitude; remap -1..1 to 0..1; Lerp |
| Spinners (single, multi-axis, random axis, ping pong, curve) | 2.2.1 to 2.2.4, 2.2.8 | rotator deltas; angle limits; axis selection |
| Look-at turret base | 2.2.6 | target pointer; look-at rotation; smooth interpolation |
| Orbiter | 2.2.7 | pivot root; offset child; spin root |
| Scalers (random, uniform, non-uniform, ping pong, curve, distance) | 2.3.x | scale vector; caps; per-axis; spawn location memory |
| Fall Guys style obstacles | 2.MJ | mover, spinner, scaler; player push (physics or sweep); combinations |
| Overlap logger, who logger, time-inside, player-only, counter, layered zones, polling scanner | 3.1.x | box or sphere; handler signatures; name access; time stamps; filtering; counter; multi-component binding; GetOverlappingActors |
| Hit logger, impact visualiser, physics hit, hit strength, stomp detector | 3.2.x | mesh with hit events; FHitResult fields; debug draw; impulse magnitude; direction test; material swap |
| Coin pickup | 3.3.1 | player filter; destroy; spin; shrink |
| Kill zone and respawn | 3.3.2 | volume; respawn location; teleport; non-player policy |
| Launch pad | 3.3.3 | overlap; LaunchCharacter; direction from facing |
| Mud zone (slow area) | 3.3.4 | enter and exit; save and restore speed; block sprint |
| Pressure plate (visual only) | 3.3.5 | overlap; target positions; smooth move |
| Automatic door | 3.3.6 | presence; open and close positions; smooth move |
| Activated platform | 3.3.7 | landing detection; active state; destination; toggle on reach |
| Breakable door | 3.3.8 | block then physics; impulse from hit; sprint condition |
| Interactable sound pass | 3.3.9 | sound assets; play at moment |
| Inventory system | 3.MJ | item types; counts; pickup; widget; drop with spawn; use; capacity; chest; weight |
| Spawner (basic, arrow point, blocked handling) | 4.1.1 to 4.1.3 | class property; spawn call; transform source; spawn params |
| Trap trigger, short-lived spawn | 4.1.4, 4.1.5 | overlap; spawn above player; one-shot; lifespan |
| Deferred spawner | 4.1.6 | deferred spawn; finish on event |
| Destruction zone | 4.1.7 | overlap; destroy other |
| Timer actors (one-shot, loop, first delay, limited, pause, countdown, juggling) | 4.2.1 to 4.2.7 | handle; callback; flags; clear; pause; remaining and elapsed display |
| Traffic light | 4.2.8 | three states; chained one-shot timers; colour per state |
| Random geyser | 4.2.9 | re-arming random timer; launch player and physics |
| Respawning pickup, stock keeper | 4.3.1, 4.3.2 | validity tracking; respawn timer; multiple slots; destroyed event |
| Wave spawner | 4.3.3 | wave count; interval; spread positions; config; plate start |
| Cannon | 4.3.4 | projectile class; fire condition; lifespan; explode; auto-aim |
| Icicle trap | 4.3.5 | trigger; drop; regrow timer; armed state |
| Bomber blimp | 4.3.6 | mover; bomb spawner; below-player test |
| Projectile weapon | 4.MJ | input held; fire rate gate; camera direction; projectile; ammo; reload timer; impact; states; grenade; shotgun; charge; pickups; rocket jump |
| Trace probes (first, inspect, rangefinder, ignore self, selective, multi, object type) | 5.1.1 to 5.1.7 | trace calls; debug draw; query params; channel responses |
| Trace radar | 5.1.8 | spinner plus trace; player filter; colour feedback |
| Sentry eye | 5.1.9 | trace to player; blocked test; colour |
| Sweep probes (first, location versus impact, versus trace, shapes, rotated, multi, area scan) | 5.2.1 to 5.2.7 | sweep calls; shapes; debug shapes; enum; overlap query |
| Solid mover | 5.2.8 | sweep flag on offset; reverse on hit |
| Robot cleaner | 5.2.9 | look-ahead sweep; new direction choice; solid move |
| Interaction system | 5.3.x | camera trace; custom channel; crosshair; interact action; tag filter; prompt; pickup; push; sweep aim assist |
| Physics grab system | 5.MJ | hold point; carry; drop; throw; rotate; highlight; pull and push; smooth |
| Remote control, one-to-many, buddy watcher, zone watcher, landing judge, stop listening, unique bind, timer payload, respawn 2.0 | 6.1.x | typed references; built-in delegate binding; unbind; payloads |
| Doorbell and resident, lonely broadcaster, generous coin, who and how much, Blueprint listener, town crier | 6.2.1 to 6.2.6 | custom delegate declarations; broadcast; listeners; parameters |
| Health reporter | 6.2.7 | lives; damage source (stomp); two delegates; display; death reaction |
| Pressure plate and sliding door (event version), many doors, many plates, other listeners | 6.3.1 to 6.3.4 | pressed and released delegates; door listens; array of plates; all-pressed; lamp, spawner, platform, alarm |
| Quest system (single quest) | 6.3.5 to 6.3.10 | quest item with collected delegate; giver with interaction; count and finish; started and completed delegates; dialogue by state; reward delegate separate from completion; HUD |
| Multi-quest system | 6.MJ | parallel quests; chain; checkpoint race in order; finale; secret; timed failure; lifetime stats |
| Grappling hook, coin magnet, patrolling guard | 7 examples | listed decompositions mapping to modules 1 to 6 |
| Two-minute gameplay moment | 8 | inventory; gap map; graybox; build; polish |

---

## 6. Expansion proposal for Unreal Dojo

Everything below is original. Difficulty is 1 to 5. "Repeats" names the earlier concept the quest deliberately reuses, so the verifier's repetition rule is satisfied and the learner sees the idea return. Concepts are glossary ids to be created. Titles are working titles.

Each module also gets two microjam-style bosses: breakdown first, then build pieces in the learner's order, then integration.

### 6.1 Module 1: Enhanced Input (world: input)

| # | Title | Goal | Diff | Concepts | Repeats |
|---|---|---|---|---|---|
| 1 | Two Keys, One Axis | Map two keys to one Axis1D action with opposite signs and drive a turntable with the value | 1 | Axis1D, Negate, BindAction, Triggered | none (entry) |
| 2 | Context Switch | Add a second mapping context for a "menu mode" and swap it in and out at runtime; prove the gameplay keys stop responding | 2 | AddMappingContext, RemoveMappingContext, priority | mapping context |
| 3 | Priority Duel | Map the same key in two contexts with different priorities and consume settings; record which wins in each configuration | 2 | context priority, consume input | context switch |
| 4 | Charge Meter | Fill an on-screen bar from the instance's elapsed time while a key is held and release at one of three power tiers | 3 | FInputActionInstance, GetElapsedTime, Hold, Canceled | trigger states |
| 5 | Double-Tap Dodge | Use Repeated Tap on a 2D move action and dodge in the direction of the stick value at the moment of the second tap | 3 | Repeated Tap, Axis2D value, LaunchCharacter | dash |
| 6 | Swizzle Tank | Build tank controls from a 2D action using Swizzle and Negate so Y drives forward and X drives yaw | 2 | Swizzle Input Axis Values, Negate, Axis2D | modifiers |
| 7 | Analog Walk | Make speed follow stick magnitude and compare radial dead zone to axial dead zone on a diagonal push | 2 | Dead Zone types, vector length, MaxWalkSpeed | dead zone |
| 8 | Device Detective | Detect whether the last input came from a gamepad or keyboard from the key in the instance and swap a prompt string | 3 | FKey, IsGamepadKey, input device change | instance |
| 9 | Custom Modifier | Write a UInputModifier subclass in C++ that applies a response curve to a look axis and plug it into the asset | 4 | UInputModifier, ModifyRaw_Implementation, curve | scalar |
| 10 | Grounded-Only Trigger | Write a UInputTrigger subclass that only fires when the owning character is on the ground, and use it for a slide | 4 | UInputTrigger, UpdateState_Implementation, movement mode | triggers, Chorded |
| 11 | Input Buffer | Store a jump press made during a non-cancellable action for 150 ms and perform it when the action ends | 4 | buffer window, timer, Command pattern (preview) | charged jump |
| 12 | Rebind At Runtime | Let the player press a key to rebind the interact action, writing a new mapping into a runtime copy of the context | 5 | UInputMappingContext::MapKey, UnmapKey, RequestRebuildControlMappings | mapping context |

Bosses:

- Boss 1, Combo Trainer: an input reader that recognises three named sequences with timing windows, shows an input history strip on the HUD, and fires a different ability per combo. Pieces: input history ring buffer, combo table as data (Data Asset), matcher, HUD strip, ability stubs. Patterns: Command, State.
- Boss 2, Possession Swap: pressing a key near a drone possesses it, swaps the mapping context and camera, and a second key returns control to the character. Pieces: nearby-pawn query, Possess and UnPossess, per-pawn mapping context, camera blend, HUD mode label. Patterns: State.

### 6.2 Module 2: Transforms and Movement (world: transforms)

| # | Title | Goal | Diff | Concepts | Repeats |
|---|---|---|---|---|---|
| 1 | Local Versus World | One actor rotated 45 degrees moves with a local offset for 2 seconds then a world offset for 2 seconds; log both paths | 1 | AddActorLocalOffset, AddActorWorldOffset, FTransform | none (entry) |
| 2 | Frame-Rate Proof | Run a mover at a capped 20 and 120 FPS and prove it covers the same distance per second; fix a deliberately unscaled version | 2 | DeltaTime, `t.MaxFPS` | basic mover |
| 3 | Elevator Call | A lift visits an array of floor heights on request with ease-in and ease-out and refuses new calls while moving | 2 | FMath::FInterpTo, TArray, state flag | waypoints |
| 4 | Pendulum | Swing a child mesh around a pivot using a sine on roll with period and amplitude knobs | 2 | child offset, FMath::Sin, FRotator | orbit, sine |
| 5 | Conveyor Belt | Move everything standing on the belt by applying a world offset to each overlapping actor every tick | 3 | GetOverlappingActors, AddActorWorldOffset on others | overlap polling (Module 3 preview) |
| 6 | Homing Dart | Move forward while turning toward a target with a capped turn rate so it can be dodged | 3 | FMath::RInterpTo, FindLookAtRotation, forward vector | look-at |
| 7 | Bezier Lob | Travel from A to B along a quadratic curve defined by a control point, drawn with debug lines | 3 | nested Lerp, control point, DrawDebugLine | interpolated mover |
| 8 | Spline Train | Three cars follow one spline at fixed spacing, each rotated to the spline tangent | 4 | GetTransformAtDistanceAlongSpline, spacing, wrap | spline follower |
| 9 | Breathing Idle | Combine a scale pulse and a bob with a random phase offset per instance so a field of them does not sync | 2 | sine, phase, FMath::FRand in BeginPlay | sine scaler |
| 10 | Ride Along | Attach the player to a moving platform on landing and detach on jump; observe relative transform in the log | 3 | AttachToActor, DetachFromActor, relative versus world | activated platform (Module 3 preview) |
| 11 | Yaw-Only Watcher | Face the player on yaw only, with pitch clamped, and switch between snap and smooth modes with a bool | 3 | FRotator component extraction, FMath::ClampAngle | look-at |
| 12 | Shared Clock | Five movers read a time from one clock actor so they stay in phase; pause the clock and all stop | 3 | reference to a clock actor, phase offsets | sine mover, target pointer |

Bosses:

- Boss 1, Clockwork Gauntlet: a corridor of five synchronised hazards (swinging blade, rising pillar, sliding wall, spinning bar, pulsing crusher) driven by one master clock with per-hazard phase offsets, plus a reset switch. Pieces: clock actor, hazard base class, five hazard subclasses, phase data, push-the-player response. Patterns: Update Method, Subclass Sandbox.
- Boss 2, Rollercoaster Cart: a cart rides a spline with speed derived from slope (faster downhill, slower uphill, minimum speed), carries the player, and loops. Pieces: spline track actor, cart with speed model, attach and detach, camera on the cart, lap counter. Patterns: Update Method.

### 6.3 Module 3: Collision (world: collision)

| # | Title | Goal | Diff | Concepts | Repeats |
|---|---|---|---|---|---|
| 1 | Checkpoint Flag | Overlapping a flag stores a respawn point on the player; the kill zone sends the player to the latest flag | 2 | overlap, player reference, stored transform | kill zone |
| 2 | Gravity Well | Entering a volume changes the character's gravity scale and leaving restores it; nested wells restore correctly | 3 | GravityScale, enter and exit pairing, counter | mud zone |
| 3 | Wind Tunnel | Push the character sideways every tick while inside a box using an additive launch with the override flags off | 3 | LaunchCharacter overrides, Tick while inside | launch pad |
| 4 | Normal Bounce | A pad launches the player along the surface normal of the hit, so a tilted pad launches at an angle | 3 | ImpactNormal, hit event on a mesh | impact normal |
| 5 | Fragile Floor | After three hits the floor disables collision and drops with physics | 2 | hit counter, SetCollisionEnabled, SetSimulatePhysics | breakable door |
| 6 | Projectile Channel | Create a custom object channel for projectiles so they pass through the player but hit walls; verify with `show Collision` | 4 | custom object channel, collision profile, responses | presets experiment |
| 7 | One-Way Platform | A platform ignores the player while they are below it and blocks once they are above | 4 | SetCollisionResponseToChannel, relative Z test, Tick | presets |
| 8 | Speed Stack | Two overlapping slow zones; leaving them in any order restores the right speed by keeping a stack of modifiers | 4 | TArray as stack, enter and exit ordering bug | mud zone |
| 9 | Damage Field | A volume applies damage every half second only while an actor is inside, using the engine damage path | 3 | UGameplayStatics::ApplyDamage, TakeDamage, timer while inside | time inside |
| 10 | Surface Sound | On hit, read the physical material from the hit result and play a different sound per surface | 4 | UPhysicalMaterial, SurfaceType, FHitResult::PhysMaterial | hit strength |
| 11 | Named Zones | One actor with three box components tells which zone fired from the overlapped component's tag | 2 | ComponentTags, OverlappedComponent | layered zones |
| 12 | Ragdoll Dummy | A skeletal mesh dummy ragdolls when hit above an impulse threshold and resets on a key | 3 | USkeletalMeshComponent, SetSimulatePhysics, NormalImpulse | hit strength |

Bosses:

- Boss 1, Weighted Button Room: a door opens only when enough mass sits on a button (two cubes, or the player plus one), a dispenser produces cubes on a lever, and cubes dropped in a hole are returned to the dispenser. Pieces: weighted button (overlap set with mass sum), door, dispenser, return chute, hole volume, HUD count. Patterns: Observer (preview), State.
- Boss 2, Hazard Course: lava floor, crusher with stomp detection, spinning bars that push, checkpoints, and a respawn with a death counter. Pieces: checkpoint flag, kill volume, crusher with hit direction, pusher, death counter on HUD. Patterns: Update Method, State.

### 6.4 Module 4: Spawning and Timers (world: spawning)

| # | Title | Goal | Diff | Concepts | Repeats |
|---|---|---|---|---|---|
| 1 | Spawn In A Box | Spawn N actors at random points inside a box extent and reject points that would overlap | 2 | FMath::RandPointInBox, spawn collision handling | blocked spawn |
| 2 | Owner And Instigator | Set owner and instigator in the spawn params so a projectile ignores the pawn that fired it | 3 | FActorSpawnParameters::Owner, Instigator, IgnoreActor | spawn params |
| 3 | Configured At Birth | Use deferred spawning to set speed and colour on a mover before it begins play | 3 | SpawnActorDeferred, FinishSpawning, EditAnywhere defaults | deferred spawn |
| 4 | Spawn Budget | Keep at most 10 live spawned actors; track them in an array and free a slot when one is destroyed | 3 | TArray<TObjectPtr>, OnDestroyed, cap | stock keeper |
| 5 | Cooldown Component | Write a reusable actor component with StartCooldown and IsReady backed by a timer; use it on two different actors | 3 | UActorComponent, GetTimerRemaining, Component pattern | dash |
| 6 | Timer Versus Tick | Blink a light with a Tick accumulator and with a looping timer; compare behaviour and cost with `stat unit` | 2 | accumulator, SetTimer, `stat unit` | looping timer |
| 7 | Lambda Timer | Schedule a one-off message with a lambda timer delegate that captures a weak pointer to this | 4 | FTimerDelegate::CreateLambda, TWeakObjectPtr | timer delegate |
| 8 | Slow Motion Timer | Under `slomo 0.25` observe which timers slow down; make a UI countdown that ignores time dilation | 4 | `slomo`, time dilation, real time | countdown bomb |
| 9 | Next Tick | Defer a lookup of other actors to the next tick so BeginPlay order does not matter | 3 | SetTimerForNextTick, BeginPlay ordering | remote control |
| 10 | Timed Lock | A door opens for 3 seconds, blinks for the last second, and closes; two handles, no Tick | 2 | two handles, GetTimerRemaining | juggling timers |
| 11 | Pool Primer | Pre-spawn 20 projectiles hidden and inactive, hand them out on fire, return on impact; never call Destroy | 4 | Object Pool pattern, SetActorHiddenInGame, SetActorEnableCollision | cannon |
| 12 | Spawn Director Lite | A spawner reads wave definitions from a Data Asset (count, class, interval) instead of hard-coded values | 4 | UDataAsset, TSubclassOf, wave data | wave spawner |

Bosses:

- Boss 1, Horde Director: waves from data, several spawn points chosen away from the player, a live budget, pooled enemies that walk toward the player, rest phases, and a HUD wave banner. Pieces: director, spawn point actors, pool, enemy mover, wave data, HUD. Patterns: Object Pool, Type Object, State.
- Boss 2, Chain Reaction Field: bombs with fuse timers that, on detonation, find neighbours in a radius and light their fuses with a short delay; one pressure plate starts it. Pieces: bomb, fuse timer, area query, propagation delay, radial impulse, plate. Patterns: Event Queue (preview), Observer.

### 6.5 Module 5: Tracing (world: tracing)

| # | Title | Goal | Diff | Concepts | Repeats |
|---|---|---|---|---|---|
| 1 | Ground Snap | At BeginPlay trace down and place the actor on the surface, aligned to its normal | 2 | downward trace, ImpactNormal, MakeRotFromZ | first trace |
| 2 | Ledge Finder | Two forward traces at chest and head height detect a grabbable ledge and draw it | 3 | two traces, boolean logic, debug box | rangefinder |
| 3 | Laser Mirror | A laser reflects off surfaces up to five times using the reflection vector; each segment drawn | 4 | FMath::GetReflectionVector, loop with query params | ignore self |
| 4 | Footstep Surface | Every 0.4 s while moving, trace down and log the physical material under the player | 3 | timer, PhysMaterial, bReturnPhysicalMaterial | surface sound |
| 5 | Camera Pull-In | Trace from the character to the camera and move the camera to the hit point so walls never hide the player | 4 | camera trace, Location versus ImpactPoint | location versus impact |
| 6 | Hitscan Rifle | On fire, trace from the camera, apply an impulse and damage to whatever is hit, and show a debug impact mark | 3 | camera trace, AddImpulseAtLocation, ApplyPointDamage | physics push |
| 7 | Vision Cone | A guard sees the player only inside a 60-degree cone and with a clear trace | 3 | dot product, FVector::Normalize, line of sight | sentry eye |
| 8 | Complex Versus Simple | Trace against a mesh with simple box collision with bTraceComplex off and on; note the difference on a hollow shape | 2 | bTraceComplex, simple collision | query params |
| 9 | By Profile | Trace using a named collision profile instead of a channel | 3 | LineTraceSingleByProfile, profile names | selective vision |
| 10 | Melee Arc | Sweep a box across a 90-degree arc over 0.2 s and hit each actor once using a set | 4 | multi sweep per frame, TSet, GetComponentQuat | rotated sweep |
| 11 | Placement Ghost | Sweep a box down in front of the player and show green or red depending on whether the spot is clear | 4 | box sweep, Location, material swap | location versus impact |
| 12 | Async Probe | Run a trace asynchronously and handle the result in a delegate callback | 5 | AsyncLineTraceByChannel, FTraceDelegate, FTraceHandle | first trace |

Bosses:

- Boss 1, Sentry Network: three sentries with vision cones feed one awareness meter that fills while seen and drains when hidden; at full it raises an alarm that locks a door. Pieces: sentry (cone plus trace), awareness component, alarm controller, door listener, HUD meter. Patterns: Observer, State.
- Boss 2, Blink Pad Gun: fire a placement trace; if the surface is a vertical wall with clearance (checked with a sweep), place a pad; a second key teleports the player to the pad keeping velocity. Pieces: placement validator, pad actor, teleport with velocity carry, cooldown, crosshair state. Patterns: State, Command.

### 6.6 Module 6: Delegates (world: delegates)

| # | Title | Goal | Diff | Concepts | Repeats |
|---|---|---|---|---|---|
| 1 | Health Component | A reusable component with OnHealthChanged and OnDied; put it on a crate and on the player | 3 | UActorComponent, two dynamic multicast delegates, Component pattern | health reporter |
| 2 | Order Of Arrival | Bind three listeners in a known order and record the broadcast order; then swap bind order | 2 | multicast ordering | town crier |
| 3 | Clean Exit | A listener removes all its bindings in EndPlay; destroy the listener first and confirm no stale calls | 3 | RemoveAll, EndPlay, lifetime hygiene | stop listening |
| 4 | Native Flavour | Declare a non-dynamic multicast delegate, bind with AddUObject and a lambda, and compare with the dynamic version | 4 | DECLARE_MULTICAST_DELEGATE, AddUObject, AddLambda, FDelegateHandle | custom delegate |
| 5 | Ask Permission | A single delegate with a return value lets a door ask "may I open?" and one bound guard answers | 4 | DECLARE_DELEGATE_RetVal, Execute, IsBound | lonely broadcaster |
| 6 | Payload Struct | Broadcast a USTRUCT with who, what, and where instead of three parameters | 3 | USTRUCT, OneParam with struct | who and how much |
| 7 | Score Board | A GameState keeps the score from coin delegates; a widget binds to GameState, not to coins | 3 | AGameStateBase, HUD binding | generous coin |
| 8 | Global Shout | A GameInstance subsystem owns a world-wide OnEnemyDied delegate any actor can find without a reference | 4 | UGameInstanceSubsystem, Service Locator pattern | remote control |
| 9 | Interface Instead | Implement an interact interface and compare it with the tag-based approach for interactables | 3 | UINTERFACE, Implements, Execute_ | interaction tag |
| 10 | Blueprint Bridge | Expose a BlueprintNativeEvent and a BlueprintAssignable on the same actor and say when each fits | 3 | BlueprintNativeEvent, BlueprintImplementableEvent | Blueprints can listen |
| 11 | Debounced Plate | A plate broadcasts pressed only after 0.5 s of continuous pressure and released at once | 2 | timer plus delegate | pressure plate |
| 12 | Logic Gates | AND, OR, and NOT relay actors combine plate signals and rebroadcast as a new signal to a door | 4 | arrays of sources, rebroadcast, composition | one door many plates |

Bosses:

- Boss 1, Alarm System: sensors (tripwire trace, pressure plate, broken glass hit) report to an alarm controller with armed, triggered, and reset states; lights, a siren, locked doors, and a HUD banner react; a wall panel resets it. Pieces: sensor base with OnTripped, controller with state and OnStateChanged, three reactors, reset switch. Patterns: Observer, State.
- Boss 2, Multi-Quest System (already named in PLAN as the Pack 3 World 6 boss): several quests in parallel from data, chained unlocks, a checkpoint race quest, timed failure, a secret quest, and a quest log widget. Pieces: quest definition data, quest tracker subsystem, objective types (collect, reach in order, survive timer), giver NPC, log widget, finale listener. Patterns: Observer, State, Type Object.

### 6.7 Module 7: Mechanic Maker (world: mechanic-maker)

This world is where the breakdown quest kind does its main work. Build quests here are integration pieces; most quests are planning.

| # | Title | Goal | Diff | Concepts | Repeats |
|---|---|---|---|---|---|
| 1 | Pitch Five | Write a one-sentence pitch for five supplied mechanics; graded on naming the player action, the response, and the constraint | 1 | pitch | none |
| 2 | Piece Sort | Given 20 shuffled pieces from three mechanics, sort each into class, component, data, event, or step | 2 | breakdown vocabulary | all modules |
| 3 | Map To World | For a supplied decomposition, name which Dojo world taught each piece and the closest quest | 2 | library mapping | all modules |
| 4 | Find The Unknown | Given a mechanic spec, mark which pieces you cannot build yet and write a 20-minute spike plan for one | 3 | spike, isolation | all modules |
| 5 | Acceptance First | Write five testable acceptance criteria for a supplied mechanic before any code | 2 | acceptance criteria | microjam numbers |
| 6 | Tuning Knobs | Take a finished mechanic and expose every magic number as an EditAnywhere with a range and a category | 2 | UPROPERTY meta ClampMin, Category | EditAnywhere |
| 7 | Reuse Audit | Given a new mechanic, list which library actors can be reused as is, retrofitted, or must be new | 3 | retrofit | gameplay library |
| 8 | Split The God Class | A supplied 400-line actor does everything; propose a split into components and events | 4 | Component pattern, coupling | health component |
| 9 | Spike It | Build only the unknown piece from quest 4 in a throwaway actor with debug draw | 3 | isolation build | debug draw |
| 10 | Feel Pass | Given a working but flat mechanic, add three feedback touches (sound, scale pop, camera shake) and tune two knobs with a reason each | 3 | juice, tuning | polish bonuses |
| 11 | Decompose Then Build | Full arc on a small supplied mechanic: breakdown graded, then build two pieces, then integrate | 4 | full arc | everything |
| 12 | Own Idea Review | Submit a pitch and breakdown for the learner's own mechanic; AI grades for buildability and gaps | 4 | pitch, breakdown | everything |

Bosses:

- Boss 1, Grapple Point: aim at tagged anchors within range, fire to pull the character along an arc with a cooldown and a cancel; HUD shows range and cooldown. Pieces: anchor actor, aim trace with range, pull movement (launch or interpolate), cooldown component, cancel input, HUD. Patterns: State, Command.
- Boss 2, Patrol Guard: waypoint patrol, vision cone, chase with follow movement, damage on contact through the health component, lose-sight timer back to patrol, debug state label above the head. Pieces: patrol mover, vision, chase, contact damage, state machine, text render. Patterns: State, Observer, Update Method.

### 6.8 Module 8: Gameplay Moment (world: gameplay-moment)

The app cannot show video, so each moment is supplied as a written walkthrough with timings, distances, and a layout sketch.

| # | Title | Goal | Diff | Concepts | Repeats |
|---|---|---|---|---|---|
| 1 | Buildable Or Trap | Rate three supplied moment descriptions for buildability with our library and justify each | 2 | selection filter | all worlds |
| 2 | Inventory The Clip | From a timed walkthrough, list every mechanic, interaction, and event, nothing too small | 2 | mechanic inventory | all worlds |
| 3 | Gap Map | Map each inventory item to a world and quest; mark the gaps; decide to spike, fake, or cut each gap | 3 | gap map, cut and fake | mechanic maker |
| 4 | Metrics Sheet | Extract distances, heights, timings, and speeds from the walkthrough into a table that drives the graybox | 2 | metrics, scale | frame-rate proof |
| 5 | Graybox It | Build the layout with basic shapes to the metrics and verify three sight lines with traces | 3 | graybox, sight lines | ground snap |
| 6 | Pacing Timeline | Draw the two minutes as a timeline of beats (tension, release, puzzle, reward) and place each mechanic on it | 2 | pacing | none |
| 7 | First Thirty Seconds | Build a playable vertical slice of the first beat only, with all its mechanics | 4 | vertical slice | everything |
| 8 | Cut List | Given a slipping schedule, decide what to cut, fake, and keep with one sentence each | 2 | scope | gap map |
| 9 | Integrate The Rest | Add the remaining beats one at a time, keeping it playable after each | 4 | integration | everything |
| 10 | Side By Side | Compare your version to the walkthrough beat by beat and list the three largest gaps with fixes | 3 | critique | everything |
| 11 | Polish Pass | Fix the three gaps and add feedback touches; final rubric on flow, feel, and completeness | 3 | polish | feel pass |
| 12 | Write The Postmortem | Three things that worked, three that did not, one thing to do differently next time | 1 | reflection | none |

Bosses (the app supplies the moment):

- Boss 1, Physics Test Chamber: a sealed room with a cube dispenser, two weighted buttons, a laser that must be redirected by a carried mirror cube, a timed door, and an exit lift. Pieces: dispenser, weighted button, laser emitter and receiver, carry system, timed door, lift, room reset. Patterns: Observer, State.
- Boss 2, Rooftop Chase: a 90-second run across rooftops with collapsing floors, a wind tunnel, a grapple point, a chasing drone with vision, and a final locked door opened by the last checkpoint. Pieces: fragile floor, wind volume, grapple, drone with vision and follow, checkpoint flags, door listener, HUD timer. Patterns: State, Observer, Update Method.

### 6.9 Fifteen ready mechanics for breakdown quests

Each spec is the finished behaviour the learner must decompose. Required pieces are what the grader must find in the plan (any valid split that covers them passes). Piece kinds: class, component, data, event, step.

1. Dash With Cooldown. Pressing dash launches the character 600 units along the camera's flat forward, locks movement input for 0.15 seconds, and cannot be used again for 1.2 seconds; the HUD shows a cooldown wedge; a dash into a wall stops early. Required: input action binding (step), dash executor on the character or a component (class or component), cooldown timer with ready query (component), movement lock window (step), wall stop via sweep or hit (step), OnDashStarted and OnCooldownReady (event), tunables speed, lock time, cooldown (data), HUD wedge listener (class).

2. Pressure Plate Door. A plate sinks when any actor with mass stands on it and rises when the last one leaves; a door listens and slides open and closed over 0.8 seconds; several doors can listen to one plate and one door can need several plates. Required: plate with overlap set and count (class), pressed and released delegates (event), door with open and close interpolation (class), door's array of plates with all-pressed check (data), wiring in the editor (step), plate visual move (step).

3. Grapple Point. Aim at tagged anchors within 1500 units, fire to zip to within 150 units of the anchor over about half a second, with a 2-second cooldown and a cancel on jump. Required: anchor marker actor with tag (class), aim query with range (step), pull movement (step), cooldown (component), cancel input (step), OnGrappleStarted and OnGrappleEnded (event), range and timing data (data), HUD reticle state (class).

4. Pickup With Respawn. A spinning coin is collected by the player only, broadcasts its value, destroys itself, and its spawner replaces it 5 seconds later at the same spot. Required: coin with spin and overlap filter (class), OnCollected with value (event), spawner that holds the class and spot (class), subscription to the coin's destroyed event (step), respawn timer (step), value data (data).

5. Stealth Meter. Guards with vision cones fill a shared awareness meter while the player is seen; it drains when hidden; at 100 percent an alarm fires and at 0 it clears. Required: vision sense per guard (component), awareness store with fill and drain (component or class), OnAwarenessChanged and OnAlarm (event), HUD meter listener (class), rates and thresholds (data), alarm reactions (class), seen and lost timing (step).

6. Double Jump With Coyote Time And Buffer. A second jump in the air, a 0.12-second grace after walking off a ledge, and a jump pressed up to 0.15 seconds before landing that fires on landing. Required: jump count state (data on the character), grounded tracking with last-grounded time (step), buffered jump timestamp (data), landing event consumption (event, LandedDelegate), reset rules (step), tunables (data).

7. Wall Jump. When airborne and touching a wall, jump launches the character away from the wall's normal and upward, limited to one per wall contact. Required: wall detection (sweep or hit), normal capture (data), launch (step), per-contact lock (data), input gating (step), feedback event (event).

8. Moving Platform Carrier. A platform between waypoints carries whatever stands on it and pauses 1 second at each end; it broadcasts arrival. Required: waypoint mover (class), carry of standing actors (step: attach or offset), pause timer (step), OnArrived with index (event), waypoints and dwell data (data).

9. Coin Magnet Power-Up. Picking up a magnet makes coins within 800 units fly to the player for 8 seconds; the HUD shows the remaining time. Required: power-up pickup (class), timed effect on the player (component), area query each tick or on a timer (step), coin attraction mover (step on the coin or by the effect), OnEffectStarted and OnEffectEnded (event), HUD timer (class), radius and duration (data).

10. Turret. A turret tracks the player within range and line of sight, fires a projectile every 0.7 seconds while tracking, and gives up after 2 seconds without sight. Required: target acquisition (step), look-at rotation (step), fire timer (step), projectile spawn with owner (step), state idle, tracking, lost (data), OnTargetAcquired and OnTargetLost (event), range and rates (data).

11. Checkpoint Respawn. Checkpoint flags set the active respawn; a kill volume respawns the player at the active flag with a short fade and a death count; the last flag opens the exit. Required: flag actor (class), respawn store on the player or GameState (data), kill volume (class), respawn step with fade (step), OnCheckpointReached and OnPlayerDied (event), exit door listener (class).

12. Breakable Crate With Loot. A crate takes damage from hits above a threshold and from projectiles, breaks after 3 hits, spawns one of a loot table, and plays a burst. Required: health or hit count (component), damage sources (step), loot table (data), spawn on break (step), OnBroken (event), visual and sound burst (step).

13. Key And Locked Door. A key pickup adds a key id to the player's inventory; a door with a key id opens on interaction when the player holds it and shows "locked" otherwise. Required: key pickup with id (class and data), inventory storage of ids (component or data), door with required id (class), interaction entry (step), locked and unlocked feedback (step), OnUnlocked (event).

14. Laser Tripwire. A beam between an emitter and a receiver; anything blocking the beam trips an alarm, with a 1-second re-arm after it clears. Required: emitter with trace to receiver (class), blocked detection each tick or on a timer (step), OnTripped and OnCleared (event), re-arm timer (step), beam visual (step), alarm listener (class).

15. Ground Pound. In the air, pressing crouch slams the character down; on landing it pushes physics objects within 400 units away and damages enemies in range. Required: air check and slam velocity (step), landing event (event), radial impulse (step), area query for enemies (step), damage application (step), cooldown or once-per-jump rule (data), camera shake (step).

### 6.10 Eight systems for breakdown quests

1. Inventory And Equipment. Items are defined as data (id, name, stack size, weight, icon, equip slot). The player carries stacks with a capacity and a weight limit, can drop (spawns the world item in front of them), use consumables (potion restores a resource), and equip to a slot (equipped item changes a stat). A widget shows stacks and slots and updates from events. Required: item definition (data asset or table), world item actor (class), inventory component with add, remove, find (component), equipment slots (data), OnInventoryChanged and OnEquipped (event), use and equip actions (step), capacity and weight rules (step), widget listener (class).

2. Quest System. Quests are defined as data with objectives of three kinds (collect N, reach ordered checkpoints, survive T seconds). Quests can run in parallel, unlock in chains, fail on time, and be hidden until found. A tracker owns active, complete, and failed states and broadcasts changes. A giver NPC starts quests and hands rewards separately from completion. A log widget shows active objectives. Required: quest definition and objective definitions (data), tracker subsystem or actor (class), objective trackers per kind (class or component), OnQuestStarted, OnObjectiveProgress, OnQuestCompleted, OnQuestFailed (event), giver with interaction and dialogue states (class), reward step separate from completion (step), log widget (class), chain unlock rule (step).

3. Ability System (then a note on GAS). Abilities are data: input action, cost, cooldown, cast time, tags that block other abilities. A component on the character activates abilities, checks cost and cooldown, applies the effect through a small set of effect types (launch, speed change, spawn, damage in radius), and broadcasts cooldown and resource events to the HUD. Required: ability definition (data), ability component with activate, can-activate, cooldown table (component), resource component (component), effect executors (class), blocking tags (data), OnAbilityActivated, OnCooldownChanged, OnResourceChanged (event), input routing (step), HUD slots (class).

4. Save And Load. The game saves player transform, inventory, quest states, and the open or closed state of doors to a slot; loading restores all of it, including which pickups were already taken. Required: save game object with fields (class), saveable interface or registration (class), id per saveable actor (data), gather and apply steps (step), slot naming and async save (step), OnSaved and OnLoaded (event), order of restore (step).

5. Interaction And Dialogue. A camera trace with a custom channel finds interactables implementing an interface; a prompt shows the verb; interacting with an NPC opens a dialogue made of nodes with choices from data; choices can set flags that quests and doors read. Required: interact interface (class), interactor component on the character (component), prompt widget (class), dialogue data with nodes and choices (data), dialogue runner with state (class), flag store (data), OnDialogueStarted, OnChoiceMade, OnDialogueEnded (event), input mode swap (step).

6. Spawning Director. Waves are data; the director picks spawn points out of the player's view, respects a live budget, pools enemies, ramps difficulty by a curve, inserts rest phases, and broadcasts wave events to the HUD and to doors. Required: wave data and difficulty curve (data), director with state (class), spawn point actors with visibility check (class), pool (component or class), budget tracking with destroyed events (step), OnWaveStarted, OnWaveCleared, OnRestStarted (event), HUD banner (class).

7. AI Perception And Behaviour. Guards sense the player by sight (cone plus trace) and by hearing (noise events with radius), hold an awareness value, and move through idle, suspicious, alert, and search states, each with its own movement (patrol, look around, chase, go to last known position). Required: sight sense (component), hearing sense with noise event (component and event), awareness store (data), state machine (class), per-state movement behaviours (class), last known position (data), OnStateChanged (event), debug label (step).

8. Damage, Health, And Respawn. A health component on anything that can be hurt takes damage through the engine damage path with damage types, applies armour from data, broadcasts changes and death, drops the actor into a dead state (ragdoll or hide), and respawns players at the active checkpoint after a delay while enemies are returned to a pool. Required: health component (component), damage type data (data), armour rule (step), OnHealthChanged, OnDied, OnRespawned (event), death handling per actor kind (class), respawn controller (class), checkpoint link (data), HUD health bar (class).

---

## 7. Rules for our authors

1. Open every build quest with one sentence that names the finished behaviour the learner will see in the editor. If you cannot write that sentence, split the quest.
2. One new idea per quest. If the brief needs two new glossary terms, cut one into its own quest or a concept card that precedes it.
3. Give an exact observable for verification: a log string, a colour, a number on screen, a debug shape. The automation test checks the same thing the learner sees.
4. Ramp inside the quest, not just across quests: naive version first, better version second, and say why the second is better in one sentence.
5. Design at least one deliberate failure per world: a first run that does not work for a reason the learner must find (null spawn, self-hit, missing channel response, drifting accumulator). Tell them it will fail only after the step that fails.
6. Every experiment is an A/B on one setting. Name the setting, name the two values, and ask what changed. Turn the answer into a graded recall question with an explanation.
7. Hints are a ladder of three: where to look, which API, what the shape of the call is. No hint contains code. The third hint may name a header.
8. Name the pattern the moment the learner finishes building it, in one sentence, and link the glossary card. Never name it before they have built it.
9. State the dependency direction in every quest with two actors: who holds a reference to whom, who broadcasts, who knows nothing. Put it in the rubric.
10. Reuse on purpose. From world 3 onward, every world has at least one quest that uses a library actor from an earlier world as a test subject or rebuilds it with the new tool, and the brief says which one.
11. Model the conventions instead of lecturing them: quest-prefixed class names in the starter, UPROPERTY on every UObject pointer, TObjectPtr, forward declarations, one Content folder per world, asset prefixes.
12. Give every microjam-style boss fixed core requirements with numbers, a named reference game, three focused extensions in order of structural importance, and a feel criterion ("tune until X feels like a decision").
13. Every mechanic or system quest starts with a breakdown. The learner writes classes, components, data, events, and order before the first build piece unlocks. Supply at least two reference plans so the grader accepts different valid splits.
14. Give difficulty, time estimate, and a 5 to 6 bullet rubric on every quest. Boss rubrics have 8 bullets and include hygiene (unbinding, no Tick where a timer or event fits, tunables exposed).
15. Teach the tooling in the preamble of the world that needs it: the console command, the eject key, the debug draw helpers, `show Collision`, `stat unit`, `slomo`, `t.MaxFPS`. Every trace and sweep quest requires debug drawing in the rubric.
16. Do not assume UI. When a quest needs a bar, prompt, or crosshair, either supply the widget in the sandbox or precede it with a short widget quest.
17. Original wording only. Use the source for structure and concept coverage, never for text, names, numbers, or example messages.
