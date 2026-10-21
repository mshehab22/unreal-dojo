# Game Programming Patterns: Study Inventory for Unreal Dojo

Source studied: Robert Nystrom, *Game Programming Patterns* (Genever Benning, 2014), 456-page PDF edition. Every chapter was read in full. Everything below is a paraphrase in our own words, with original code sketches. No sentences or code from the book are reproduced. The book's ideas are what Unreal Dojo teaches; its wording stays out of the product.

How to use this file: Part 1 is the map and the author's framing. Part 2 is one section per pattern, each with the same subsections so the content pipeline can slice them into lessons, drills, and quests. Part 3 is the teaching order. Part 4 is a list of cross-pattern boss quests.

---

## Part 1. Book map

### 1.1 Structure and page ranges (PDF page numbers)

| Section | Chapter | PDF pages |
|---|---|---|
| Front matter | Acknowledgements, contents | 1 to 6 |
| I. Introduction | Introduction (why this book, how it relates to Design Patterns, how to read it, about the sample code) | 7 to 16 |
| I. Introduction | Architecture, Performance, and Games | 17 to 32 |
| II. Design Patterns Revisited | Section intro | 33 to 34 |
| | Command | 35 to 49 |
| | Flyweight | 50 to 61 |
| | Observer | 62 to 82 |
| | Prototype | 83 to 101 |
| | Singleton | 102 to 119 |
| | State | 120 to 144 |
| III. Sequencing Patterns | Section intro | 145 to 146 |
| | Double Buffer | 147 to 168 |
| | Game Loop | 169 to 190 |
| | Update Method | 191 to 210 |
| IV. Behavioral Patterns | Section intro | 211 to 212 |
| | Bytecode | 213 to 245 |
| | Subclass Sandbox | 246 to 264 |
| | Type Object | 265 to 286 |
| V. Decoupling Patterns | Section intro | 287 to 288 |
| | Component | 289 to 316 |
| | Event Queue | 317 to 341 |
| | Service Locator | 342 to 361 |
| VI. Optimization Patterns | Section intro | 362 to 363 |
| | Data Locality | 364 to 390 |
| | Dirty Flag | 391 to 413 |
| | Object Pool | 414 to 435 |
| | Spatial Partition | 436 to 456 |

The six "Design Patterns Revisited" chapters are the author's commentary on Gang of Four patterns as they apply to games; they are essay-shaped, not template-shaped. The thirteen chapters from Double Buffer onward are the author's own catalog and all follow one fixed template.

### 1.2 The author's framing of what a pattern is

The book positions itself between two kinds of game programming books: deep single-domain books (graphics, physics, AI, audio) and whole-engine books that walk you through building one engine for one genre. Neither tells you how to connect the pieces gracefully across many kinds of games. So the book is deliberately "a la carte": each chapter is one independent idea you can pick up and apply on its own, and you are expected to mix and match.

A pattern, in this framing, is an open-ended solution shape rather than a fixed algorithm. You will implement it differently every time, which is why each chapter has a design-decisions section rather than one canonical implementation. The author inherits the lineage of Christopher Alexander's *A Pattern Language* through the Gang of Four's *Design Patterns* and sees himself continuing the job of documenting practices that already exist in game code (he explicitly says he does not have the luxury of inventing new names, which is why "Component" keeps its overloaded name).

Why games specifically? He lists four pressures that make these patterns matter more in games than in business software:

1. Time and sequencing are core architecture. Things must happen in the right order at the right moment.
2. Development cycles are compressed and many programmers must build lots of behavior in parallel without trampling each other.
3. All that behavior ends up interacting (monsters, potions, explosions), and the interactions must not turn the code into a knot.
4. Performance is decisive. Shaving cycles can be the difference between a hit and a game that drops frames.

The book's examples are in deliberately old-fashioned, library-free C++ so readers from Java, C#, or C can follow. The author warns that the samples are not good C++ style; read them for the idea, not the code. This matters for Unreal Dojo: our examples should be modern Unreal C++, not the book's bare-bones style.

### 1.3 How each catalog chapter is structured

Every chapter from Double Buffer onward uses the same eight headings, in this order. Unreal Dojo lessons should map to these so a learner can use the app as a reference the same way they would the book.

1. **Intent.** One sentence stating the problem the pattern solves, so you can scan quickly for the one you need.
2. **Motivation.** A concrete example problem. The author's view is that a pattern is shapeless until applied to something specific, so he always starts from a story (a forest of trees, a baker named Bjorn, slapping comedians).
3. **The Pattern.** The dry, textbook distillation of the idea once the example has made it concrete. Doubles as a refresher.
4. **When to Use It.** Guidelines for when the pattern fits and when to avoid it.
5. **Keep in Mind.** Consequences, risks, and costs you take on.
6. **Sample Code.** A full step-by-step implementation.
7. **Design Decisions.** The space of variations: for each knob, the options and the tradeoffs of each.
8. **See Also.** Relationships to other patterns and real engines or libraries that use it.

### 1.4 The introduction's argument, in our words

The author's own path: a kid typing BASIC games, a teenager hitting the wall of programs bigger than fit in his head, then finding *Design Patterns* and finally feeling like he had tools. At Electronic Arts he found brilliant low-level code hanging off architecture that was an afterthought: heavy coupling, features bolted on wherever they fit, and good solutions buried in the codebase where nobody could find them, so coworkers reinvented them. The book exists to dig those solutions up and polish them so people stop reinventing them.

### 1.5 The "Architecture, Performance, and Games" chapter, in our words

This chapter is the lens for the whole book and should be lesson zero in Unreal Dojo.

**What architecture is.** The book is about the code between the domain-specific algorithms: how code is organized, not what it computes. Good architecture is measured by one thing: how easily the program accommodates change. If nobody is changing the code, its design does not matter.

**The cost of a change is mostly learning.** Before you can change anything you have to load the relevant code into your head, and that is the slowest step in programming. Then you figure out the change (often easy), type it (often trivial), and finally clean up so the next person cannot tell where the seam is. The point of decoupling is to shrink the amount of code you must understand before you can act: two pieces are coupled if you cannot understand one without the other. A second definition: decoupled code means a change in one place does not force a change in another.

**Decoupling is not free.** Every abstraction, interface, or extension point is a bet that you will need that flexibility later. When the bet pays off, great. When it does not, the abstraction is pure overhead: more code to read, more layers to trace, and the layers themselves fill your mental scratch space. This is how codebases turn into plug-in systems and abstract base classes everywhere with no real code in sight, and it is why some people hate design patterns. YAGNI (you aren't gonna need it) is the counter-mantra. Maintaining a design also takes continuous effort; many codebases start beautiful and die from a thousand "just one tiny hack" cuts. Think of it as gardening: planting is not enough, you also weed.

**Flexibility versus performance.** Most patterns that add flexibility (virtual dispatch, interfaces, pointers, messages) have some runtime cost. Flexibility means encoding fewer assumptions; optimization thrives on assumptions (never more than 256 enemies, so an ID fits in a byte; one concrete type here, so we can inline). There is a spectrum: concrete calls fix the class at author time, virtual calls fix it at run time, templates fix it at compile time. The author's position: it is easier to make a fun game fast than to make a fast game fun. Game design needs iteration, iteration needs flexibility, so keep the code flexible until the design settles, then remove abstraction where profiling says it matters.

**Good bad code.** Prototype code that answers a design question quickly is legitimate, as long as it is actually thrown away. The classic failure is a manager asking for "just a prototype" and then asking to "clean it up and ship it." If there is any chance throwaway code will be kept, write it defensively well. One trick: write prototypes in a different language than the shipping game so they must be rewritten.

**The three speeds.** Three forces pull against each other: long-term development speed (good architecture), runtime speed (optimization), and short-term development speed (features done today). Architecture costs a little on every change; optimization takes engineering time and calcifies the code; cramming features saps future productivity. There is no formula, only tradeoffs, and the author finds that exciting rather than disheartening, the way a balanced game like chess stays interesting because no single tactic wins.

**Simplicity as the way out.** The thing that eases all three pressures is writing the simplest, most direct solution: get the data structures and algorithms right, in that order, and keep total code small. Simple code is less to read and often faster because there is less of it. But simple does not mean quick to write: a good solution is a distillation, not an accumulation. Novices handle a pile of use cases by writing one conditional per case; an elegant solution is a small general rule that covers the whole space, and finding it is real work.

**Closing advice, as rules for Unreal Dojo:**

- Abstraction and decoupling make change faster, but do not add them unless you are confident that code needs the flexibility.
- Think about performance throughout, but postpone the low-level optimizations that lock assumptions into the code until as late as possible.
- Move quickly to explore the design space, but not so fast that you leave a mess you must live with.
- If you will throw code away, do not make it pretty.
- Have fun making it.

### 1.6 Section intros, in brief

- **Design Patterns Revisited.** The Gang of Four book is nearly twenty years old and still relevant, but the industry has learned things. Some patterns are overused (Singleton), some underappreciated (Command), some are interesting specifically for games (Flyweight, Observer), and some are fun to see in the wider context of programming (Prototype, State).
- **Sequencing Patterns.** Games invent their own time. Game Loop is the axle the clock spins on, Update Method is how objects hear the tick, and Double Buffer hides sequential computation behind the illusion of simultaneous snapshots.
- **Behavioral Patterns.** Games need a huge breadth of behavior. Type Object creates categories without defining classes, Subclass Sandbox gives safe primitives to build behavior from, and Bytecode moves behavior out of code entirely.
- **Decoupling Patterns.** Writing code that does what you want is easy; writing code that adapts to changing requirements is hard. Component decouples domains within one entity, Event Queue decouples communication both statically and in time, Service Locator decouples a consumer from the provider of a facility.
- **Optimization Patterns.** Games remain one of the few places where performance is a competitive race. Data Locality is about the memory hierarchy, Dirty Flag avoids unneeded computation, Object Pool avoids unneeded allocation, Spatial Partition speeds up finding things in space.

---

## Part 2. Pattern by pattern

Each section below has the same subsections: Intent and problem; How it works (with an original sketch); Design decisions as questions; When to use and when not; Related patterns; Unreal Engine form; Original Unreal use cases; Common learner mistakes in Unreal; Recall questions; Scenario questions with distractors.

Convention for sketches: modern C++ in Unreal style where it helps (TArray, UPROPERTY, delegates), plain C++ where the pattern is engine-neutral. Sketches are illustrative, not compilable modules.

### 2.1 Command

**Intent.** Turn a request or an action into an object so it can be stored, passed around, queued, replayed, or undone.

**Problem it solves.** Plenty of game code calls a function directly the moment something happens: a button press calls jump, an AI decision calls attack. That hard-wires three things that often need to vary independently: which input triggers which action (rebindable controls), who performs the action (player avatar versus any AI-driven actor), and when the action runs (now, later, over the network, or in reverse for undo). The author's own tagline is that a command is a method call made into a thing: a piece of data you can hold in a variable. The Gang of Four's phrasing is that commands are an object-oriented replacement for callbacks.

**How it works.** Define a small interface with one method that performs the action. Each concrete command implements it. The input layer maps buttons to command objects rather than to function calls, so remapping is just reassigning a pointer. A second step decouples the performer: give the execute method a parameter for the actor to act on, so one command class can drive the player, an AI character, or a replay. A third step adds an undo method; each command remembers the small slice of state it changed so it can restore it. Keep a history list plus a "current" cursor: undo steps the cursor back and calls undo, redo steps it forward and calls execute, and a new command after an undo truncates everything past the cursor. The chapter also notes two flavors: reusable stateless commands (one jump command shared by all callers) and one-shot commands bound to a specific target and moment (move this unit to this tile this turn), which is the flavor you need for undo and replay. Closures can play the same role in languages that have them, but a class with named fields is clearer when a command has multiple operations or carries state.

```cpp
// Original sketch: undoable command with a tiny history.
class IGameCommand
{
public:
    virtual ~IGameCommand() = default;
    virtual void Execute() = 0;
    virtual void Undo() = 0;
};

class FMoveTokenCommand : public IGameCommand
{
public:
    FMoveTokenCommand(AToken* InToken, FIntPoint InTarget) : Token(InToken), Target(InTarget) {}
    void Execute() override { Previous = Token->GetCell(); Token->MoveToCell(Target); }
    void Undo() override { Token->MoveToCell(Previous); }
private:
    AToken* Token; FIntPoint Target; FIntPoint Previous;
};

struct FCommandHistory
{
    TArray<TUniquePtr<IGameCommand>> Items; int32 Cursor = 0;
    void Do(TUniquePtr<IGameCommand> Cmd) { Items.SetNum(Cursor); Cmd->Execute(); Items.Add(MoveTemp(Cmd)); Cursor++; }
    void Undo() { if (Cursor > 0) Items[--Cursor]->Undo(); }
    void Redo() { if (Cursor < Items.Num()) Items[Cursor++]->Execute(); }
};
```

**Design decisions as questions.**

- *Does the command know its target, or is the target passed in?* Baked-in target: simplest, needed for undo and replay because the command is a specific historical event. Passed-in target: one command class can drive any actor, enabling AI modules that emit commands, demo modes, and swapping who is controlled. Cost: one more parameter and a dispatcher that pairs commands with actors.
- *Reusable command objects or one-shot instances?* Reusable: no allocation per press, shareable (a Flyweight), fine for stateless actions. One-shot: carries parameters and before-state, required for undo and replay; in C++ someone must own and free them.
- *How does undo remember state?* Store only the fields the command changes (cheap, the author's preference). Snapshot the whole object (Memento style; wasteful because commands usually touch little). Persistent data structures that share unchanged parts (elegant, more machinery).
- *Single-level or multi-level undo?* One remembered command toggles between undo and redo. A list plus cursor gives full history; branching after an undo discards the redo tail.
- *Class or closure?* Closures are terse and capture state automatically. Classes make the captured state visible and support multiple operations (execute plus undo).
- *Who handles a command?* Explicit target is simplest. If targets form a hierarchy and may delegate to subordinates, you have drifted into Chain of Responsibility.

**When to use.** Rebindable input, AI that emits actions instead of calling methods, undo and redo in tools and turn-based games, replays and networked input streams (record the commands per frame, re-run the simulation). **When not.** When a direct call is clearer and nothing about who, what, or when needs to vary; the indirection is a cost, and one-shot commands add allocation and ownership questions. The author's discipline warning: undo only works if every mutation goes through a command.

**Related patterns.** Subclass Sandbox (a concrete command base with helper operations), Chain of Responsibility (targets that forward commands), Flyweight (share stateless commands), Null Object (a do-nothing command instead of null checks), Event Queue (a stream of commands between producer and consumer).

**Unreal form.** Unreal already reifies input mappings: Enhanced Input's Input Actions and Input Mapping Contexts separate "what the player did" from "which key did it," which is the first half of Command. Gameplay Ability System abilities are activation requests that can be queued, replicated, predicted, and cancelled, which is Command-shaped at a large scale. Editor transactions (`FScopedTransaction`, `Modify()`) are the engine's undo system. `FFunctionGraphTask`, latent actions, and `TFunction` are the closure-style command. What a UE programmer still writes by hand: an undoable gameplay command history for a turn-based game, a replay recorder of per-frame commands, a command queue between an AI decision layer and the actor that performs it, and a move-validation pipeline where commands are checked before execution.

**Original Unreal use cases.**

1. *Tactics grid with undo.* A turn-based tactics prototype where moving a unit, attacking, and using an item are each a command bound to a specific unit and cell. The pattern buys multi-level undo during the planning phase and a clean "commit turn" that flushes the history. The learner builds an `IGameCommand` interface, three concrete commands, and a history with cursor on the player controller. An automation test asserts that executing move then undo returns the unit to its original cell and that a new command after undo discards the redo tail (history length equals cursor).
2. *Input remapping without touching gameplay.* A character where the input component holds a map from Input Action name to a command object, so a settings screen can swap "Dodge" and "Interact" without recompiling. The pattern buys a single place where bindings live. The learner builds a small binding table plus two or three commands that call methods on the pawn. A test asserts that after swapping bindings, triggering the first action invokes the second command's effect (observable via a counter on the pawn).
3. *AI that emits commands.* A patrol AI that, instead of calling `MoveTo` and `Fire` on the pawn, pushes commands into a per-pawn queue consumed on tick. The pattern buys swapping an aggressive AI for a passive one by swapping the producer, and lets a "director" inject commands for scripted moments. The learner builds a producer interface and the consumer loop. A test asserts that a scripted producer yielding three commands results in exactly three effects on the pawn in order.
4. *Replay recorder for a racing time trial.* Record the per-tick command list (throttle, steer, brake values) during a run and re-run the simulation from the same seed to produce a ghost. The pattern buys a tiny replay file and a deterministic ghost. The learner serializes commands to a struct array and plays them back through the same executor. A test asserts that playing back a recorded sequence reproduces the same final transform within a tolerance (with physics substepping fixed).
5. *Level editor tool actions.* An in-game building tool (place wall, rotate, delete) where each action is a command with undo. The pattern buys designer-friendly undo during playtests. A test asserts that place then delete then undo leaves exactly one wall in the world.

**Common learner mistakes in Unreal.** Calling `Execute()` from inside the input callback and never actually storing the command (so nothing is gained). Capturing raw `AActor*` in long-lived commands without `TWeakObjectPtr`, then crashing when the actor is destroyed before undo. Forgetting that undo must restore everything execute changed, including side effects like spawned effects or score. Allocating a new command object every tick for continuous axis input (use a reusable command or a struct value instead). Mixing commands with GAS abilities when GAS already covers the case.

**Recall questions.**

1. Q: What is the one-sentence idea behind Command? A: A method call turned into an object you can store, pass, delay, and reverse.
2. Q: Why does passing the actor into `Execute` instead of hard-coding it inside the command matter? A: The same command class can drive any actor, which lets AI, replays, and demo modes reuse the player's command set.
3. Q: What must a command do to support undo? A: Record the specific state it is about to change before changing it, and restore that state in `Undo`.

**Scenario questions.**

1. *Scenario:* Your puzzle game needs the player to step back through their last twenty moves. *Answer:* Command, with a history list and cursor. *Distractor:* Memento looks right because it is about saving state, but snapshotting the whole board per move wastes memory; commands store only the delta each move made.
2. *Scenario:* You want an AI module and the keyboard to be interchangeable sources of control for the same character. *Answer:* Command, with the actor passed to execute and a producer interface. *Distractor:* State pattern seems related because the character "changes behavior," but State changes how the character responds to inputs; here the problem is who generates the inputs.

### 2.2 Flyweight

**Intent.** Share the part of an object's data that is identical across many instances so that thousands of instances cost little memory or bandwidth.

**Problem it solves.** A forest of thousands of trees where each tree carries its own mesh and textures would not fit in memory and could not be pushed to the GPU every frame. But almost every tree uses the same mesh and textures; only position, scale, and tint differ. The same shape shows up in a tile map: storing a full terrain object per tile is wasteful, while an enum with switch statements on it smears terrain data across many methods.

**How it works.** Split the object into intrinsic (context-free) state shared by all instances and extrinsic (instance-specific) state. Pull the intrinsic state into a separate class and have each instance hold a reference to one shared object. For rendering, modern graphics APIs support exactly this through instanced drawing: send the shared mesh once and a list of per-instance parameters, then draw all instances in one call. The author points out this may be the only Gang of Four pattern with hardware support. The second example is subtler: the terrain grid becomes a grid of pointers to a handful of immutable terrain objects, one per terrain kind. You get a real object API (ask the tile for its movement cost) at the price of a pointer per tile, which is often no bigger than an enum. Flyweight objects should be immutable because a change would appear everywhere at once.

```cpp
// Original sketch: shared immutable terrain kinds referenced from a grid.
struct FTerrainKind
{
    float MoveCost; bool bIsWater; UMaterialInterface* Material;
};

class FTerrainGrid
{
public:
    FTerrainGrid(int32 W, int32 H) : Width(W), Height(H) { Cells.SetNum(W * H); }
    void Paint(int32 X, int32 Y, const FTerrainKind* Kind) { Cells[Y * Width + X] = Kind; }
    const FTerrainKind& At(int32 X, int32 Y) const { return *Cells[Y * Width + X]; }
private:
    int32 Width, Height; TArray<const FTerrainKind*> Cells;
};
// Three FTerrainKind instances live once (grass, hill, river); thousands of cells point at them.
```

**Design decisions as questions.**

- *Create flyweights eagerly or on demand?* Eager: simplest, store them in the owning world, no lookup needed. On demand: a factory checks for an existing identical object before creating one, which requires a registry (and possibly an object pool) and hides the constructor.
- *Pointer versus enum for the reference?* Pointer: real object API, data lives with the type, no switch statements. Enum plus switches: no indirection, but data scattered through code. The author's profiling found the pointer version no slower and sometimes faster, but says to profile in your own layout.
- *Where do the shared objects live?* Owned directly by a world object (simple lifetime), or dynamically allocated and tracked (needed when the set is open-ended).
- *Mutable or immutable?* Immutable in almost every case, since a shared object's change is visible everywhere.

**When to use.** Many instances whose data is mostly identical; memory or GPU bandwidth pressure; enum-and-switch code that wants to become objects. **When not.** When there are few instances or the shared part is small; the indirection and the discipline of immutability are the costs, and the author stresses profiling before swapping an enum for a pointer in hot loops.

**Related patterns.** Type Object (same shape, different intent: Type Object is about defining kinds, Flyweight is about memory), Factory Method and Object Pool (on-demand creation and storage of shared instances), State (stateless state objects can be shared across many machines), Command (stateless commands can be shared).

**Unreal form.** The engine is Flyweight everywhere: `UStaticMesh`, `UMaterialInterface`, and `UTexture` assets are shared by every component that references them; `UInstancedStaticMeshComponent` and `UHierarchicalInstancedStaticMeshComponent` are instanced rendering with per-instance transforms and custom data; Niagara renders thousands of particles from shared renderers; Foliage and PCG place instances the same way; Material Instances share a parent shader. Data Assets referenced by many actors are the terrain-kind example. What a UE programmer still writes by hand: a tile grid that references shared tile definitions, a shared immutable "stats block" referenced by many enemies, and a registry that hands out shared instances on demand.

**Original Unreal use cases.**

1. *Hex map with shared tile definitions.* A strategy map of 10,000 hexes where each hex stores a pointer to one of six immutable `UPrimaryDataAsset` tile definitions (cost, defense bonus, material). The pattern buys constant memory and a clean `Tile.Def->MoveCost` API. The learner builds the definition asset class, a grid struct, and an ISM-based renderer that groups hexes by definition. A test asserts that two hexes painted with the same kind share the same definition pointer and that memory per hex equals one pointer plus a coordinate.
2. *Projectile visuals via instanced meshes.* A bullet-hell segment that draws 5,000 projectiles with one `UInstancedStaticMeshComponent` per projectile kind, updating transforms from a plain array of projectile structs. The pattern buys one draw call per kind. The learner writes the system that maps struct index to instance index and updates transforms each tick. A test asserts that spawning N projectiles creates N instances on the component and that despawning keeps instance count and struct count equal.
3. *Shared enemy archetype stats.* Fifty goblins referencing one immutable stats block (base health, speed, loot table) through a pointer, while each goblin owns only its current health and position. A test asserts that changing the archetype asset's base health in a test fixture changes what new goblins start with, and that no goblin stores a copy.
4. *Procedural city facades.* A city generator that uses HISM components keyed by facade module asset, so a street of 400 buildings costs a dozen meshes in memory. A test asserts the number of distinct ISM components equals the number of distinct modules used, not the number of buildings.

**Common learner mistakes in Unreal.** Duplicating a Data Asset per actor at runtime (`DuplicateObject`) and losing the sharing. Mutating a shared asset from gameplay code so every instance changes. Using one `UStaticMeshComponent` per bullet and wondering why 3,000 bullets tank the frame rate. Storing per-instance data inside the shared object. Forgetting that ISM instance indices shift when instances are removed unless you track them.

**Recall questions.**

1. Q: What are the two kinds of state in Flyweight? A: Intrinsic (shared, context-free) and extrinsic (per instance).
2. Q: Why should flyweight objects be immutable? A: Because one object is referenced from many places, so a change would show up everywhere at once.
3. Q: What is the Unreal rendering feature that embodies Flyweight at the GPU level? A: Instanced static meshes (ISM and HISM), which send the mesh once and per-instance transforms separately.

**Scenario questions.**

1. *Scenario:* Your dungeon has 20,000 floor tiles, each with a material and movement cost, and memory is tight. *Answer:* Flyweight, with tiles pointing at a few shared tile definitions. *Distractor:* Object Pool is also about many small objects, but pools reuse objects over time; here the objects coexist and should share data simultaneously.
2. *Scenario:* A grass field needs 50,000 blades drawn each frame and the draw call count is the bottleneck. *Answer:* Flyweight through instanced rendering. *Distractor:* Spatial Partition would help you find blades near the player, but it does nothing for the cost of drawing all of them.

### 2.3 Observer

**Intent.** Let one object announce that something happened so that any number of interested objects can react, without the announcer knowing who they are.

**Problem it solves.** An achievements system reacts to events from all over the game: physics (fell off a bridge), combat (kill count), navigation (finished a level). Putting achievement checks inside the physics code would couple two unrelated domains and scatter achievement logic everywhere. Observer lets the physics code say "this entity started falling" to whoever is listening, and the achievement system subscribes and decides what that means. You can delete the achievement system and physics does not change.

**How it works.** An observer interface has one notification method. A subject holds a list of observers (a list, not a single slot, so observers do not accidentally unregister each other) with public add and remove methods, and a protected notify method that walks the list and calls each observer. The subject stays unaware of concrete observers. The author's refinements: prefer composition (a subject object owned by the physics system, or a separate "event" object per kind of occurrence) over inheriting from a Subject base; notification is synchronous, so a slow observer blocks the subject; sending a notification allocates nothing, allocation only happens when wiring up. For allocation-free lists he shows an intrusive linked list (each observer carries a next pointer; cheap, but then an observer can only watch one subject) and a pooled list-node variant that restores many-to-many. If he designed one today it would be function-based (register a member function or closure) rather than interface-based.

```cpp
// Original sketch: a minimal function-based subject.
class FHealthSubject
{
public:
    using FHandler = TFunction<void(float NewHealth, float Delta)>;
    int32 Subscribe(FHandler Handler) { Handlers.Add({ NextId, MoveTemp(Handler) }); return NextId++; }
    void Unsubscribe(int32 Id) { Handlers.RemoveAll([Id](const FEntry& E) { return E.Id == Id; }); }
    void Notify(float NewHealth, float Delta)
    {
        TArray<FEntry> Snapshot = Handlers;      // safe against changes during notify
        for (FEntry& E : Snapshot) E.Handler(NewHealth, Delta);
    }
private:
    struct FEntry { int32 Id; FHandler Handler; };
    TArray<FEntry> Handlers; int32 NextId = 1;
};
```

**Design decisions as questions.**

- *Interface-based or function-based observers?* Interface: one notify method per class, so a class watching several subjects must switch on the sender; heavy. Function or delegate: a class can bind different handlers to different subjects; the modern default.
- *How is the observer list stored?* Dynamic array (simple, allocates only on add/remove). Intrusive singly linked list through the observers (no allocation, but one subject per observer, and removal is a walk unless doubly linked). Pool of list nodes (no allocation and many-to-many, more machinery).
- *Who is notified first?* With front insertion, the newest observer is notified first. The author's rule: observers of one subject must not depend on ordering; if they do, they are secretly coupled.
- *What if an observer modifies the list during notify?* The naive loop breaks. Either forbid it, iterate a copy, or defer adds and removes until the walk finishes.
- *What happens on destruction?* Deleting an observer leaves a dangling pointer in the subject. Options: observer unregisters in its destructor (easy to forget), subject sends a final "I am dying" notification, or a base observer class auto-unregisters from every subject it watches (needs back-pointers). In garbage-collected environments the symmetric bug is the lapsed listener: a dead UI screen stays alive and keeps reacting because the subject still references it.
- *Should notify stop early?* If an observer can return "handled, stop here," the pattern becomes Chain of Responsibility.
- *Threads?* The pattern is synchronous. Mixing it with locks can deadlock; in a heavily threaded engine use an Event Queue instead.

**When to use.** Communication between mostly unrelated domains (achievements and physics, UI and gameplay stats) where you want each side to be understandable alone. **When not.** Inside one cohesive feature, where an explicit call is easier to follow. The author's rule: if you routinely need to think about both ends to understand the code, do not hide the link in an observer list, because the runtime wiring cannot be read statically the way a direct call can. Also not for hot loops where virtual dispatch matters, and not when the receiver must run later or on another thread.

**Related patterns.** Event Queue (the asynchronous cousin), Chain of Responsibility (notify with early exit), Object Pool (list nodes), Data binding and reactive systems as the possible future for UI.

**Unreal form.** This is the pattern Unreal gives you most completely. `DECLARE_DELEGATE`, `DECLARE_MULTICAST_DELEGATE`, and `DECLARE_DYNAMIC_MULTICAST_DELEGATE` are function-based observer lists; dynamic multicast delegates are Blueprint-assignable events. `FDelegateHandle` solves the unsubscribe question; `AddUObject`, `AddSP`, and `AddWeakLambda` solve the dangling-observer question by skipping dead bindings. `OnActorHit`, `OnComponentBeginOverlap`, `OnTakeAnyDamage`, `OnDestroyed`, and GAS attribute change delegates are built-in subjects. Gameplay Message Subsystem (Lyra) and `FGameplayTag`-keyed channels are a broadcast bus. What a UE programmer still writes by hand: choosing where subjects live, designing event payloads, deciding ordering rules, and a struct-based or tag-based message layer when delegates would couple too many headers.

**Original Unreal use cases.**

1. *Quest tracker listening to world events.* A quest subsystem that subscribes to multicast delegates on a "world events" object (enemy killed, item picked up, area entered) and advances objectives. The pattern buys quests that can be added without touching combat or pickup code. The learner builds the event hub with typed multicast delegates and a quest that binds to two of them. A test asserts that broadcasting three "enemy killed" events with the right tag completes a "kill three" objective and that an unrelated tag does not.
2. *Health bar driven by attribute change.* A UMG widget that binds to the character's `OnHealthChanged` delegate with `AddWeakLambda`, and unbinds in `NativeDestruct`. The pattern buys UI that never polls. A test asserts the widget's displayed value updates after one broadcast and that destroying the widget leaves the delegate with zero bound handlers (no lapsed listener).
3. *Audio reactions without coupling.* A sound component that observes the movement component's "landed" and "footstep" delegates and chooses a sound by surface type carried in the payload. The learner designs the payload struct and the binding. A test asserts a landed broadcast with surface "water" triggers the water cue and that unsubscribing stops further reactions.
4. *Tutorial prompts that watch the player.* A tutorial subsystem that subscribes to the first few player actions (jumped, opened inventory) and dismisses the matching prompt, then unsubscribes itself. A test asserts the subscription count drops to zero after each prompt is dismissed.
5. *Observer ordering trap lab.* Two observers of the same "door opened" delegate where one assumes the other ran first. The learner is asked to find the hidden coupling and fix it by having the door broadcast a richer payload or by merging the two observers. A test asserts the result is the same regardless of binding order.

**Common learner mistakes in Unreal.** Binding with `AddLambda` capturing `this` on an object that can be destroyed (use `AddWeakLambda` or `AddUObject`). Never removing bindings, producing the lapsed listener bug in widgets and components that are recreated. Broadcasting from inside a handler and creating feedback loops. Relying on the order in which bindings were added. Making a `DYNAMIC` delegate when a non-dynamic one would do (dynamic ones are slower and need UFUNCTION handlers). Putting every event in the world on one giant delegate instead of small typed ones.

**Recall questions.**

1. Q: Why must a subject keep a list of observers rather than one observer slot? A: So observers are independent; registering one must not silently unregister another.
2. Q: Is Observer notification synchronous or asynchronous, and what follows from that? A: Synchronous; a slow observer blocks the subject, and the pattern cannot by itself move work to another thread or a later time.
3. Q: What is the lapsed listener problem? A: A subject's observer list keeps an otherwise-dead object alive and reacting (a closed UI screen, for example) because nobody unsubscribed it.

**Scenario questions.**

1. *Scenario:* Five unrelated systems (UI, audio, analytics, tutorial, achievements) all want to know when the player levels up, and the leveling code should not know any of them. *Answer:* Observer, via a multicast delegate on the leveling component. *Distractor:* Service Locator gives those systems a way to find the leveling component, but then each would have to poll it; it does not push the event out.
2. *Scenario:* The physics thread detects impacts and the audio system should react, but audio must process on its own thread later. *Answer:* Event Queue, not Observer, because the decoupling needed is in time and thread, not just in identity. *Distractor:* Observer is the tempting answer because "react to an event," but it runs the handler synchronously on the sender's thread.

### 2.4 Prototype

**Intent.** Create new objects by cloning an existing example object (and, more broadly, reuse data by letting one definition delegate to another).

**Problem it solves.** A spawner per monster class (ghost spawner, demon spawner) means a parallel class hierarchy full of boilerplate. If every monster can clone itself, one spawner class holds a prototype monster and copies it. Because clone copies state as well as class, a "fast ghost" spawner is just a spawner holding a fast ghost. The author is candid that in games this classic form rarely wins: writing clone in every class is as much code as the spawners, and deep-versus-shallow copy questions are thorny. The chapter then widens into prototype-based languages (Self, JavaScript) and lands on where the idea really pays off: data modeling, where one data record can name another as its prototype and inherit any field it does not override.

**How it works.** Classic form: an abstract clone method on the base class; each subclass returns a copy of itself; the spawner stores a prototype pointer and calls clone. Alternatives the chapter weighs: a spawn function pointer per type, a template spawner parameterized on the class, and first-class types in dynamic languages. Data form: entities are property bags; a record with a prototype field falls back to that record for missing properties. The chapter stresses that no abstract "base goblin" is needed: the simplest concrete goblin can be the prototype for the others, which fits games where bosses and unique items are refinements of common things.

```cpp
// Original sketch: a data record that delegates missing fields to a parent record.
struct FEnemyRecord
{
    FName Name; const FEnemyRecord* Parent = nullptr;
    TMap<FName, float> Numbers;   // "health", "speed"...
    float Get(FName Key) const
    {
        if (const float* V = Numbers.Find(Key)) return *V;
        return Parent ? Parent->Get(Key) : 0.f;
    }
};
// Archer = { Name="GoblinArcher", Parent=&Grunt, Numbers={{"range", 900}} }; Archer.Get("health") comes from Grunt.
```

**Design decisions as questions.**

- *Clone method, spawn function, template, or first-class type?* Clone: copies state too, but every class must implement it and decide deep versus shallow. Spawn function: least code, but no state copy. Template spawner: type-safe and zero boilerplate per type, needs a non-template base so callers can hold any spawner. First-class types: only in dynamic languages.
- *Deep or shallow clone?* If a demon holds a pitchfork, does cloning the demon clone the pitchfork? Deep is safer and costlier; shallow shares sub-objects and risks aliasing.
- *Data delegation: dynamic lookup or copy-down?* Walk the parent chain on each read (respects runtime edits, slower, keeps a parent pointer) versus copy inherited fields at load time (fast reads, no parent pointer, edits to the parent do not propagate later).
- *Is the prototype a distinct abstract record or a concrete sibling?* The author favors concrete siblings for game data (the grunt is the prototype of the archer).

**When to use.** Spawners that must vary not only the class but the starting state; data pipelines with many near-duplicate records; one-off bosses and unique items defined as deltas from a base. **When not.** When Type Object or Component already model kinds of entities (the author says this is why the classic form rarely fits modern engines); when clone semantics would be ambiguous.

**Related patterns.** Type Object and Component (the modern replacements for per-monster classes), Factory Method, Flyweight.

**Unreal form.** Unreal is built on prototypes: every `UClass` has a Class Default Object (CDO), and `NewObject` and `SpawnActor` copy property values from the CDO or from a supplied template. `SpawnActor` with `FActorSpawnParameters::Template` is literally clone-from-prototype, including state. Blueprint child classes inheriting defaults from parents, and Data Asset or Data Table rows with parent references, are the data-delegation form. `DuplicateObject` is a deep clone with engine semantics. Material Instances inheriting parameters from a parent are copy-down delegation. What a UE programmer still writes by hand: a "spawn from archetype actor" system that keeps a hidden template actor per enemy variant, a data-driven stat system where rows name a parent row and inherit unset fields, and clear rules for which subobjects get duplicated.

**Original Unreal use cases.**

1. *Enemy variants from template actors.* A spawner that holds a reference to a pre-configured enemy actor (hidden, not ticking) and spawns copies through `FActorSpawnParameters::Template`, so a "elite" variant is just a differently configured template. The learner builds the spawner and two templates. A test asserts the spawned actor's health and material parameters match the template and that the template itself remains unspawned in gameplay (hidden, no collision).
2. *Loot item definitions with parent rows.* A Data Table of item rows where a `Parent` column names another row and a loader resolves inheritance copy-down at startup. The pattern buys defining "Flaming Longsword" as "Longsword plus fire damage." A test asserts a child row with no damage value resolves to the parent's damage and that an explicitly set child value wins.
3. *Wave composition by cloning a wave recipe.* A wave director that clones a base wave description (counts, spawn delays) and tweaks numbers per wave instead of hand-authoring every wave. A test asserts wave 5 derived from wave 1 keeps unchanged fields and overrides only the enemy count.
4. *CDO-driven defaults check.* A lab where the learner changes a Blueprint child's defaults and observes that existing instances created from the parent are unaffected while new spawns pick up the new values; the test spawns before and after a CDO change through `GetMutableDefault` in a test world and asserts the difference.

**Common learner mistakes in Unreal.** Spawning from a template actor that is live in the world (it then also plays). Editing a CDO at runtime through `GetMutableDefault` in shipping code. Expecting `DuplicateObject` to clone referenced assets rather than references. Confusing Blueprint class inheritance with instance-level prototype inheritance. Writing a hand-rolled `Clone()` on `UObject` subclasses when `DuplicateObject` or `SpawnActor` with a template already does it.

**Recall questions.**

1. Q: What makes clone-based spawning different from a factory that calls a constructor? A: Clone copies the prototype's state as well as its class, so one spawner type can produce differently tuned variants.
2. Q: What two questions does a hand-written clone always force you to answer? A: Deep or shallow copy, and which referenced objects are shared versus duplicated.
3. Q: In the data-modeling form, what does a prototype field mean? A: The record delegates any missing property to the named parent record.

**Scenario questions.**

1. *Scenario:* Designers want 60 enemy variants where most differ from a base enemy by one or two numbers. *Answer:* Prototype in its data-delegation form (rows with a parent). *Distractor:* Subclass Sandbox is about defining behavior through base-class primitives, not sharing data between definitions.
2. *Scenario:* A spawner must produce enemies that start in a specific pre-tuned state, including equipment already attached. *Answer:* Prototype via `SpawnActor` with a template actor. *Distractor:* Type Object shares immutable kind-data but does not copy a configured instance's live state.

### 2.5 Singleton

**Intent.** Guarantee a class has only one instance and make that instance reachable from anywhere. The chapter's real message is how to avoid needing this.

**Problem it solves (and creates).** Some systems wrap an external resource that is itself global (a file system with in-flight operations that must coordinate), so a single instance really is required. And many systems are used everywhere (logging, audio), so passing them through every call looks tedious. The classic implementation (private constructor, static accessor with lazy creation) answers both needs, offers lazy initialization at runtime, and even lets the accessor pick a platform-specific subclass. The author's verdict: in the short term it is fine, in the long term it is a global variable in a costume, and it causes four kinds of regret.

**How it works, and why to avoid it.** The regrets: (1) It is global state, so it makes code harder to reason about (any function might touch it), invites coupling (a new teammate can include the audio header from physics and ruin the architecture), and is hostile to concurrency. (2) It solves two problems (one instance and global access) even when you have only one; the logger example shows how "global access" quietly forbids a second logger, and the restriction is entrenched at every call site. (3) Lazy initialization takes control away: a system that initializes itself the first time it is touched may do so mid-combat, and games want to control when heavy initialization and allocation happen. (4) The non-lazy static-instance variant that games actually use gives up polymorphism and runtime construction, at which point a plain static class is simpler and more honest.

Alternatives, in the author's order of preference: see if the class should exist at all (many "managers" are just behavior that belongs on the thing being managed); enforce single instantiation with a runtime assert in the constructor without providing global access; pass the object in as a parameter (the simplest dependency injection); get it from a base class (a protected accessor on a shared base, a Subclass Sandbox move); get it from something that is already global (one Game or World object that owns the few truly global services); or use a Service Locator. The author says he has never used the full Gang of Four Singleton in a game.

```cpp
// Original sketch: single-instance guard without global access.
class FSaveSystem
{
public:
    FSaveSystem()  { check(!bExists); bExists = true; }
    ~FSaveSystem() { bExists = false; }
private:
    static inline bool bExists = false;
};
// Whoever constructs it owns it and passes it where needed; a second construction fails loudly.
```

**Design decisions as questions.**

- *Do you need one instance, global access, or both?* Separate the two. If only one instance matters, use an assertion guard. If only convenient access matters, pass it in, reach it from a base class, hang it off an existing global, or use a locator.
- *Lazy or eager initialization?* Lazy avoids creating unused systems and lets initialization use runtime data, but hides when heavy work happens. Eager (static instance) gives control but forbids polymorphism and runtime configuration.
- *Static class versus singleton?* If you are never going to pass the instance around, a static class is simpler; the "you can change it later" argument for singletons rarely holds because every call site uses the accessor anyway.
- *Where should the global live?* Prefer one well-known root object that owns the others over many independent globals.

**When to use.** Almost never in the full form. A runtime single-instance guard is fine for resource wrappers. **When not.** Any time the real need is just convenient access.

**Related patterns.** Service Locator (the configurable cousin), Subclass Sandbox (shared state reachable only by subclasses), Object Pool (why games care about when allocation happens).

**Unreal form.** The engine replaces singletons with scoped objects that have a defined owner and lifetime: `UGameInstanceSubsystem`, `UWorldSubsystem`, `ULocalPlayerSubsystem`, `UEngineSubsystem`, and `UEditorSubsystem` are created and destroyed by the engine, found through `GetSubsystem<T>()`, and never require static state. `AGameModeBase`, `AGameStateBase`, `UGameInstance`, and `APlayerController` are the "something already global" roots. Per-module singletons like `FModuleManager` and `GEngine` exist at the engine layer, but gameplay code should not add more. What a UE programmer still writes by hand: choosing the right subsystem scope, a single-instance assertion on things like a save-game coordinator, and refactors that move "manager" logic onto the actors it manages.

**Original Unreal use cases.**

1. *Manager-to-subsystem refactor.* Start with a hand-written `UEnemyManager` singleton with a static `Get()`, then move it to a `UWorldSubsystem`. The pattern lesson is what is gained: automatic lifetime per world, no static state across PIE sessions, testability. A test asserts that two test worlds get two distinct subsystem instances and that the subsystem is null after world teardown.
2. *Kill the manager.* A `BulletManager` that moves bullets and checks bounds is dissolved into methods on the bullet actor itself. A test asserts that bullets update their own position with no manager object present.
3. *Single-instance guard for a save coordinator.* A `USaveCoordinator` owned by the Game Instance with an assertion that only one exists, passed to the systems that need it. A test asserts constructing a second one in the same process triggers the check (using the test's expected-error mechanism).
4. *Explicit dependency instead of global.* A scoreboard widget that receives the score component through an initializer rather than calling a global. A test asserts the widget can be constructed with a mock score source and renders the mock's value.

**Common learner mistakes in Unreal.** Writing `static UMySystem* Instance;` in a UObject, which breaks with PIE multiple worlds, garbage collection, and level transitions. Using `GEngine->GetWorld()` or `GWorld` from gameplay code to find things. Making every "manager" a Game Instance Subsystem when it is per-world state (use World Subsystem). Treating subsystems as a dumping ground, recreating the god-manager under a new name.

**Recall questions.**

1. Q: Name the two separate problems Singleton bundles together. A: Enforcing a single instance, and providing global access.
2. Q: Why is lazy initialization a problem in games specifically? A: Heavy initialization and allocation can happen at an unpredictable moment, such as mid-gameplay, and games want to control timing and heap layout.
3. Q: What does Unreal offer instead of gameplay singletons? A: Subsystems scoped to Engine, Game Instance, World, or Local Player, with engine-managed lifetime.

**Scenario questions.**

1. *Scenario:* You need one object that tracks world-wide weather state, created when the level loads and gone when it unloads. *Answer:* Not Singleton; a `UWorldSubsystem`. *Distractor:* A static singleton seems easiest but survives across worlds and PIE sessions and holds dangling world pointers.
2. *Scenario:* A wrapper over a platform API that must coordinate its in-flight operations, and you want to be sure nobody creates two. *Answer:* A single-instance assertion guard (the Singleton chapter's alternative), owned by the game instance and passed in. *Distractor:* Service Locator addresses access, not enforcement of a single instance.

### 2.6 State

**Intent.** Let an object change its behavior when its internal mode changes by delegating to a separate state object, and more broadly, model behavior as a finite state machine.

**Problem it solves.** A platformer heroine with jump, duck, and dive implemented as a growing pile of boolean flags: each new move adds a flag and a bug (air jumping, standing graphic mid-jump). The flags allow invalid combinations and the branching is scattered. The author's observation: complex branching plus mutable state is exactly the kind of code good programmers avoid, and a finite state machine is the tool that constrains it. An FSM has a fixed set of states, exactly one current state, a stream of inputs, and per-state transitions; inputs with no transition are ignored.

**How it works.** Step one: replace the flags with one enum and switch on the state first (so each state's code is together), which already eliminates invalid combinations. Step two, when per-state data appears (charge time while ducking), apply the Gang of Four State pattern: a state interface with a method for each state-dependent operation (handle input, update), one class per state holding its own data, and the owner delegating to a pointer to the current state. Changing state is reassigning that pointer. Entry and exit actions let each state own its own setup (set the sprite on enter) so every transition into a state behaves the same. Beyond the basic pattern: concurrent state machines (what she is doing and what she is holding, so n plus m states rather than n times m), hierarchical state machines (substates fall back to superstates, implementable through inheritance or an explicit stack), and pushdown automata (a stack of states so a temporary state like firing can pop back to whatever came before).

```cpp
// Original sketch: state objects with enter/exit and a transition returned from HandleInput.
class FMountState
{
public:
    virtual ~FMountState() = default;
    virtual void Enter(AMount&) {}
    virtual void Exit(AMount&) {}
    virtual TUniquePtr<FMountState> HandleInput(AMount&, EMountInput) { return nullptr; }
    virtual void Tick(AMount&, float Dt) {}
};

void AMount::Apply(EMountInput Input)
{
    if (TUniquePtr<FMountState> Next = Current->HandleInput(*this, Input))
    {
        Current->Exit(*this); Current = MoveTemp(Next); Current->Enter(*this);
    }
}
```

**Design decisions as questions.**

- *Enum plus switch or State objects?* Enum: minimal, fine while states have no private data. Objects: each state owns its data and code; costs a class per state and dynamic dispatch. The author says sometimes an if is enough.
- *Static shared states or instantiated states?* Stateless states can be single static instances shared across all machines (a Flyweight). States with per-machine data must be created on transition; then the current state must not be deleted while its own method is running, so have the method return the next state and let the owner swap afterward. Pools can avoid allocation churn.
- *Who sets up a state's visuals?* The outgoing state (duplicates code on every transition into the same state) or an enter action on the incoming state (consolidates it). Exit actions mirror this.
- *One machine or several concurrent ones?* Separate orthogonal concerns into separate machines; coordinate the rare interactions with explicit checks, and consider letting one machine consume an input so the other does not see it.
- *Flat or hierarchical?* Superstates share transitions; implement with inheritance of state classes or a stack walked from top.
- *Does the machine need history?* A pushdown automaton (stack) handles temporary states that must return to the previous one; otherwise state explosion.

**When to use.** An entity whose behavior depends on a small set of distinct modes and that responds to a stream of inputs or events: character controllers, input handling, menus, protocol parsers, simple AI. **When not.** Complex AI, where behavior trees and planners are better; the chapter's own warning is that the FSM's rigidity is both its virtue and its limit (it is not even Turing complete).

**Related patterns.** Strategy and Type Object (the same delegation shape with different intent), Flyweight (shared stateless states), Object Pool (allocated states), Update Method (states often own the per-frame update), Event Queue (queue inputs to a machine).

**Unreal form.** Animation Blueprints are visual state machines with enter and exit transitions. Behavior Trees are the engine's answer for AI, with State Trees as a newer hierarchical state machine. `ACharacter`'s `UCharacterMovementComponent` has movement modes (`MOVE_Walking`, `MOVE_Falling`, custom modes) with `OnMovementModeChanged`, which is an enum-based FSM. GAS abilities with tags that block or cancel each other model concurrent machines. What a UE programmer still writes by hand: gameplay state machines in C++ for player controllers and interactables (door open, closed, locked, opening), a generic `TStateMachine<TOwner>` helper, hierarchical and pushdown variants, and the rule that entry and exit actions live on the state.

**Original Unreal use cases.**

1. *Grapple hook controller.* A grapple with Idle, Aiming, Firing, Attached, and Reeling states as classes, where Reeling owns the reel speed ramp and Attached owns the anchor point. The pattern buys each state's data living only while it is active. The learner builds the state interface, five states, and the owner's swap logic with enter and exit. A test asserts that firing from Idle enters Firing, that a "release" input in Attached goes to Idle through Exit, and that the reel ramp value is reset every time Reeling is entered.
2. *Vending kiosk interactable.* A world interactable with Locked, Idle, Selecting, Dispensing, and OutOfStock states driven by player inputs and timers. A test asserts an input with no transition in the current state is ignored and that Dispensing returns to Idle or OutOfStock based on remaining stock.
3. *Pushdown stun.* A stun state pushed on top of whatever the enemy was doing (patrolling, chasing) that pops back to it when the timer expires. A test asserts that stunning during Chasing and waiting restores Chasing, and during Patrolling restores Patrolling, with the single stun class.
4. *Concurrent stance and weapon machines.* A character with a posture machine (standing, crouching, prone) and a weapon machine (holstered, drawn, reloading), where reloading is blocked while prone through one explicit check. A test asserts the two machines transition independently and that the one cross-check holds.
5. *Hierarchical menu navigation.* A pause menu where Options and Audio substates inherit "back returns to parent" from a Menu superstate. A test asserts pressing back from Audio lands on Options and from Options lands on the main pause menu, with the shared transition written once.

**Common learner mistakes in Unreal.** Keeping a dozen booleans on the character instead of one state. Deleting the current state object from inside its own handler. Using Animation Blueprint states as the only source of truth for gameplay logic, then fighting the animation thread. Putting enter-action work in every transition instead of in the state. Reaching for a full State pattern for a two-state toggle. Not resetting per-state data on enter when state objects are reused.

**Recall questions.**

1. Q: What four things define a finite state machine? A: A fixed set of states, one current state, a stream of inputs, and per-state transitions.
2. Q: Why does the chapter have the state's input handler return the next state instead of assigning it directly? A: So the owner swaps states after the handler returns, avoiding deleting the current state while it is still executing.
3. Q: What problem does a pushdown automaton solve that a plain FSM cannot? A: Returning to the previous state after a temporary one, without duplicating that temporary state for every possible origin.

**Scenario questions.**

1. *Scenario:* An elevator has Idle, DoorsOpening, DoorsOpen, DoorsClosing, and Moving modes and must ignore call buttons while moving. *Answer:* State (FSM). *Distractor:* Command models the call button presses as objects but says nothing about which presses are valid in which mode.
2. *Scenario:* A character can be armed or unarmed while also standing, crouching, or jumping, and you are writing six near-identical states. *Answer:* State with concurrent machines. *Distractor:* Type Object could define "kinds" of character but does not address the combinatorial explosion of modes within one character.

### 2.7 Double Buffer

**Intent.** Make a sequence of incremental writes appear as one instantaneous change by writing to a hidden copy and then swapping it with the visible one.

**Problem it solves.** Computers do things one step at a time, but users (and other code) often need to see the result all at once. The canonical case is the framebuffer: the display reads it continuously, so drawing directly into it shows half-finished frames (tearing). The second, subtler case is simulation code that reads the same state it is writing: a stage of comedians who slap whoever they face, where the outcome of one frame depends on the order the actors happen to be updated in. Both are "state read in the middle of being modified."

**How it works.** Keep two copies: current (read from) and next (written to). All reads go to current, all writes to next. When the writes are done, swap, atomically, so readers see a complete new state and the old current becomes the new scratch buffer. For the framebuffer the swap is a pointer exchange. For the comedians, each actor gets a current and a next "was slapped" flag; the stage updates every actor, then swaps every actor's flags. Now an actor reacts to a slap in the frame after it happened, regardless of update order. The chapter's trick for distributed buffers: store a two-element array per object and a single static "current index," so one static swap flips every object at once without touching them.

```cpp
// Original sketch: per-agent double-buffered "alert" flag with a global index flip.
struct FAlertState
{
    static inline int32 CurrentIndex = 0;
    static void SwapAll() { CurrentIndex = 1 - CurrentIndex; }
    bool Slots[2] = { false, false };
    void Raise() { Slots[1 - CurrentIndex] = true; }
    bool IsRaised() const { return Slots[CurrentIndex]; }
    void ClearNext() { Slots[1 - CurrentIndex] = false; }
};
// Tick: all agents read IsRaised() and may Raise() others; then FAlertState::SwapAll(); then each ClearNext().
```

**Design decisions as questions.**

- *Swap pointers or copy data?* Pointer swap: constant time regardless of buffer size; but nobody may hold pointers into a buffer across a swap, and the buffer you draw into holds data from two frames ago, not one (matters if you reuse old pixels, for example for motion blur). Copy: the next buffer holds last frame's data (fresher), but copying costs time proportional to size and both buffers are locked during the copy.
- *Monolithic buffer or distributed across objects?* Monolithic: one swap. Distributed: must visit every object to swap, unless you use the shared index trick; natural when the state naturally lives in the objects.
- *How expensive is the swap relative to the modification?* If the swap takes longer than the writes it protects, the pattern is not helping.
- *Can you afford two copies?* Memory doubles for the buffered state.

**When to use.** All of these hold: state modified incrementally, that state may be read mid-modification, readers must not see partial work, and readers must not wait for writers. Classic in rendering and in simulations where update order should not matter. **When not.** When memory for a second copy is unaffordable or when sequential updates are actually the desired semantics (the Update Method chapter argues that sequential, turn-like updates avoid ambiguity such as two pieces moving into the same square).

**Related patterns.** Update Method (where update-order bugs appear), Game Loop, Data Locality (layout of the two buffers).

**Unreal form.** The renderer is double and triple buffered through the RHI swap chain, and the game thread and render thread run on different frames of the same data (the "frame behind" design, with `FSceneProxy` and `ENQUEUE_RENDER_COMMAND` carrying snapshots across). `FGraphEventRef` and task results, Niagara simulation buffers, and Chaos physics results (`UPrimitiveComponent` reads results from the last physics step) are buffered state. Mass has read-only fragments during parallel processing phases. What a UE programmer still writes by hand: double-buffered gameplay state for crowd or cellular simulations so update order does not leak into behavior, input snapshots consumed per tick, and thread-safe handoff buffers between a worker and the game thread.

**Original Unreal use cases.**

1. *Fire spread on a grid.* A cellular fire simulation where each cell reads neighbor burn states from the current grid and writes its new state into the next grid, then swaps. The pattern buys order-independent spread. The learner builds two `TArray<uint8>` grids and the step function. A test asserts that a grid stepped once produces identical results when the iteration order is reversed, and that a straight line of fuel burns one cell per step.
2. *Flocking with buffered neighbor positions.* Boids that read positions from a current buffer and write into next, so each boid sees the same world snapshot. A test asserts that shuffling the boid array does not change the frame's resulting positions.
3. *Input snapshot per tick.* A controller that accumulates raw input events into a "next" snapshot on the input thread and swaps a "current" snapshot at tick start so gameplay reads a stable frame of input. A test asserts an event arriving mid-tick is only visible next tick.
4. *Worker thread to game thread handoff.* A pathfinding worker writing results into a back buffer that the game thread swaps and reads, with no locks held while gameplay reads. A test asserts no torn reads by checking a sequence number written before and after each result block.

**Common learner mistakes in Unreal.** Holding a raw pointer into the front buffer across the swap. Swapping in the middle of a tick instead of at a defined point. Assuming the back buffer contains last frame's data when using pointer swap (it is two frames old). Forgetting to clear the next buffer after swap when values accumulate. Trying to double buffer state that other systems expect to read immediately after a write (they will see stale data until the swap).

**Recall questions.**

1. Q: Which buffer do reads use and which do writes use? A: Reads use current, writes use next, and a swap makes next the new current.
2. Q: With pointer swapping, how old is the data in the buffer you are about to draw into? A: Two frames old.
3. Q: What simulation bug does Double Buffer fix besides tearing? A: Update-order dependence, where earlier updated objects' changes are seen by later ones in the same frame.

**Scenario questions.**

1. *Scenario:* A disease spreads between NPCs each tick and the spread looks different depending on which NPC ticks first. *Answer:* Double Buffer on the infection state. *Distractor:* Spatial Partition would make neighbor queries faster but does not remove order dependence.
2. *Scenario:* A background thread produces a navigation heat map that the game thread reads every tick, and you see half-updated maps. *Answer:* Double Buffer with an atomic swap. *Distractor:* Dirty Flag tracks whether recomputation is needed; it does not isolate readers from in-progress writes.

### 2.8 Game Loop

**Intent.** Keep the game running and advancing time at a steady rate regardless of user input timing and hardware speed.

**Problem it solves.** Batch programs run and stop. Event-driven programs block until the user does something. Games must keep moving even with no input: animations, enemies, music. So the loop processes input without waiting for it, advances the simulation, and renders. The second job is time: with a bare loop, game speed depends on how much work each frame does and how fast the machine is (why old PCs had turbo buttons). The loop has to make the game run at a consistent speed across hardware.

**How it works.** The chapter walks four variants. (1) Run as fast as possible: simple, speed tied to hardware. (2) Fixed step with a sleep to cap the frame rate: prevents running too fast, power friendly, but cannot help if a frame takes longer than the budget, so the game slows down. (3) Variable time step: measure elapsed real time and advance the simulation by that much; keeps up on slow machines and is smoother on fast ones, but makes physics unstable (damping is tuned for a step size) and non-deterministic (different machines accumulate different floating-point error, so a networked bullet lands in different places). (4) Fixed update step, variable rendering: accumulate real time into a lag counter, run fixed-size updates until caught up, then render once. Rendering is time-step independent because it draws a snapshot. The residual lag divided by the step length gives a 0 to 1 fraction that the renderer uses to extrapolate positions between updates, which removes stutter at the cost of occasional small corrections. Guard against a death spiral by capping the number of catch-up updates per frame.

```cpp
// Original sketch: fixed simulation step, free rendering, extrapolation fraction.
double Previous = Now(); double Lag = 0.0; const double Step = 1.0 / 120.0;
while (bRunning)
{
    double Current = Now(); Lag += Current - Previous; Previous = Current;
    PollInput();
    int32 Steps = 0;
    while (Lag >= Step && Steps < 8) { Simulate(Step); Lag -= Step; ++Steps; }
    Render(static_cast<float>(Lag / Step));   // 0.0 just after an update, almost 1.0 just before the next
}
```

**Design decisions as questions.**

- *Who owns the loop: you, the platform, or the engine?* Platform event loop: simple and well-behaved on the OS, but no control over timing. Engine loop: already written and tuned, but you do not get to change it. Your own: total control, but you must give the OS its time slices.
- *How is power managed?* Run flat out (best experience, hot laptop) or clamp the frame rate and sleep (good enough, battery friendly).
- *How is gameplay speed controlled?* Fixed step no sync (simple, hardware dependent). Fixed step with sync (simple, power friendly, cannot speed up when slow). Variable step (adapts both ways, unstable and non-deterministic; most developers advise against it). Fixed update with variable render (adapts both ways and stays deterministic; more complex, and the step must be tuned small enough for fidelity but larger than the slowest machine's update time).
- *Coordinate with the display refresh?* Usually the buffer flip is synchronized to vsync, which also provides the sleep.

**When to use.** Always; the author says this is the one pattern you will use whether or not you write it. Even turn-based games animate while waiting. **When not.** You do not choose not to use it; you choose whether to write it yourself.

**Related patterns.** Update Method (what the update phase calls), Double Buffer (the render flip), Event Queue (input buffering), Data Locality.

**Unreal form.** The engine owns the loop: `FEngineLoop::Tick` drives `UWorld::Tick`, which runs tick groups (`TG_PrePhysics`, `TG_StartPhysics`, `TG_DuringPhysics`, `TG_EndPhysics`, `TG_PostPhysics`, `TG_PostUpdateWork`), then the render thread works a frame behind. Delta time is variable by default (`FApp::GetDeltaTime`), clamped by `MaxFPS` and `t.MaxFPS`, with `FixedFrameRate` and `bUseFixedFrameRate` available. Chaos physics substeps at a fixed rate (`Project Settings > Physics > Substepping`) and async physics tick (`bAsyncPhysicsTickEnabled`) gives a fixed-step callback. Network prediction and GAS rely on fixed-step semantics for determinism. What a UE programmer still writes by hand: a fixed-step accumulator for deterministic gameplay simulations (lockstep RTS, replays), interpolation between simulation snapshots for rendering, and frame-rate-independent gameplay math that handles large delta times.

**Original Unreal use cases.**

1. *Deterministic lockstep simulation component.* A `UActorComponent` that accumulates `DeltaTime` and runs a fixed 20 Hz simulation step for a small RTS unit set, exposing an alpha for rendering interpolation. The pattern buys identical results on any machine. The learner writes the accumulator, the cap on catch-up steps, and the interpolation. A test asserts that feeding delta sequences of (0.016 x 60) and (0.1 x 10) produce the same simulation state after one second, and that a 2-second delta does not run more than the cap.
2. *Frame-rate-independent timers lab.* A buff timer written wrongly as "subtract one per tick," then fixed to use delta time, then fixed again to use the fixed-step accumulator. A test runs the timer at 30 and 120 simulated FPS and asserts equal expiry times.
3. *Spiral-of-death guard.* A simulation step that sometimes takes longer than its budget. The learner adds a max-steps clamp and a slow-motion fallback. A test asserts that after one slow frame the loop recovers rather than growing the lag without bound.
4. *Replay playback clock.* A replay system that re-feeds recorded fixed steps at 1x, 2x, and pause, independent of render frame rate. A test asserts that playing a 10-second recording at 2x reaches the end after 5 simulated seconds of wall time with the same final state.

**Common learner mistakes in Unreal.** Doing physics-like math in `Tick` with raw `DeltaTime` and expecting determinism. Forgetting that Unreal's default tick is variable step. Using `FPlatformProcess::Sleep` in the game thread to "slow things down." Putting simulation into the render-thread callbacks. Not clamping catch-up loops. Confusing tick group ordering with fixed-step simulation.

**Recall questions.**

1. Q: What are the two jobs of a game loop? A: Process input without blocking, and control the rate at which game time advances relative to real time.
2. Q: Why is a variable time step dangerous? A: Physics tuned for one step size becomes unstable, and floating-point error accumulates differently on different machines, breaking determinism.
3. Q: What does the renderer do with the leftover lag fraction in a fixed-update loop? A: It extrapolates object positions by that fraction between the last and next update to avoid visual stutter.

**Scenario questions.**

1. *Scenario:* Two players on different hardware must see identical outcomes in a networked simulation. *Answer:* Game Loop with a fixed update step. *Distractor:* Double Buffer makes updates order independent within a frame but does not make the number and size of steps consistent across machines.
2. *Scenario:* Your mobile game drains the battery because it renders 400 frames per second on the menu. *Answer:* Game Loop with a clamped frame rate and sleep. *Distractor:* Dirty Flag could skip re-rendering an unchanged menu, but the general fix is to cap the loop.

### 2.9 Update Method

**Intent.** Simulate many independent objects by giving each one a method that performs one frame of its behavior, called once per frame by the loop.

**Problem it solves.** A skeleton that patrols back and forth as two for loops locks up the game. Moving its logic into the game loop means every entity's state and code pile into the loop (a direction flag for the skeleton, a frame counter for each statue), a mush of unrelated behavior. The pattern moves each entity's per-frame behavior into the entity itself, so the loop just walks a collection and calls update on each. Adding and removing entities becomes adding to and removing from a collection, which lets level data populate the world.

**How it works.** An abstract update method on the entity (or on its components, or on a delegated state or type object). Each frame, the loop iterates the collection and calls it. Each object stores whatever state it needs to resume next frame (the patrol direction, the countdown). Optionally pass the elapsed time so behavior scales with variable steps, which adds complexity (a skeleton can overshoot the end of its patrol in a long step and must be corrected). Three consequences the chapter stresses: slicing behavior into frames is more complex than straight-line code (coroutines or a bytecode VM can give straight-line code back); you must externalize the "where was I" state (State machines help); and objects are not truly concurrent, so update order matters: A updating before B means B sees A's new state. Sequential updates are usually a feature (each step goes from one valid world to the next, and the move list is serializable), but if you need simultaneity use Double Buffer. Modifying the collection during iteration needs care: cache the count at loop start so newly spawned objects wait a frame, and defer removals (mark dead, sweep after) or iterate backwards.

```cpp
// Original sketch: deferred removal and spawn-this-frame exclusion.
void FSimWorld::Step(float Dt)
{
    const int32 CountAtStart = Agents.Num();
    for (int32 i = 0; i < CountAtStart; ++i)
    {
        if (!Agents[i]->bDead) Agents[i]->Update(Dt);   // may spawn (appends) or kill (sets bDead)
    }
    Agents.RemoveAll([](const TUniquePtr<FAgent>& A) { return A->bDead; });
}
```

**Design decisions as questions.**

- *Where does update live?* On the entity class (simple, but each new behavior means a subclass; brittle at scale). On components (each domain updates itself; the usual modern choice). On a delegate object such as a State or Type Object (the entity's non-virtual update forwards to it; behavior swaps by swapping the delegate).
- *How are dormant objects handled?* One collection with an enabled check per object (wastes cycles and cache). A separate active-only collection (extra memory, two collections to keep in sync, but the hot loop touches only live objects). Pick based on how many dormant objects you have.
- *Fixed or variable elapsed time passed in?* Fixed is simpler; variable requires every update to scale and handle overshoot.
- *How are additions and removals during the walk handled?* Cache the count; defer removal; iterate backwards; in threaded updates, always defer.

**When to use.** Many live objects behaving mostly independently over time (anything with creatures, vehicles, projectiles). **When not.** Abstract games where pieces do not act continuously (chess), though even there animation may want per-frame updates. The cost is the frame-slicing complexity and explicit resume state.

**Related patterns.** Game Loop and Component (the chapter calls the three a trinity at the core of most engines), State (resume state), Double Buffer (true simultaneity), Data Locality (iterating components contiguously), Bytecode (straight-line behavior that yields).

**Unreal form.** `AActor::Tick`, `UActorComponent::TickComponent`, and `FTickFunction` are the pattern, with `PrimaryActorTick.bCanEverTick`, tick intervals, tick groups, tick prerequisites (`AddTickPrerequisiteActor`), and `SetActorTickEnabled` handling dormancy. `UWorld::Tick` is the loop. Timers (`FTimerManager`) and latent actions replace many "countdown in tick" uses. Mass processors update entity chunks in bulk, the data-oriented form. What a UE programmer still writes by hand: lightweight non-actor simulations (thousands of projectiles or crowd agents in a struct array ticked by one manager), explicit update ordering between systems, "active list" management, and safe spawn-and-destroy-during-update handling.

**Original Unreal use cases.**

1. *Manager-ticked projectile swarm.* 5,000 projectiles as plain structs updated by one component's tick, with deferred removal on hit and spawn-this-frame exclusion. The pattern buys one tick instead of 5,000 actors. A test asserts that a projectile spawned during a step does not move in that step and that a hit projectile is removed after the step with no skipped neighbors (count of moved projectiles equals live count).
2. *Tick ordering with prerequisites.* A camera rig that must update after the pawn it follows, enforced with tick prerequisites rather than luck. A test asserts over 100 frames that the camera's recorded target position equals the pawn's position from the same frame, never the previous one.
3. *Dormant torch lamps.* 2,000 flicker lights where only those within range are in the active list; the manager moves lights between dormant and active sets on a slow timer. A test asserts that only in-range lights change intensity across frames and that the active set size matches the in-range count.
4. *Variable-step overshoot fix.* A patrolling drone whose update must clamp and reflect its position when a large delta would push it past the patrol end. A test asserts the drone stays inside its bounds with deltas of 0.01, 0.1, and 1.0 seconds.
5. *Timer versus tick refactor.* A buff system first written as countdowns inside tick, then rewritten with `FTimerManager`, with the learner comparing clarity and cost. A test asserts the buff expires at the same simulated time in both versions.

**Common learner mistakes in Unreal.** Ticking every actor every frame when a timer or an event would do. Destroying actors during iteration over a `TArray<AActor*>` snapshot and using the dangling pointers afterward. Using `TActorIterator` for hot per-frame loops. Depending on actor tick order without prerequisites. Not scaling motion by `DeltaTime`. Expecting a `SpawnActor` inside tick to tick in the same frame (or being surprised that it does).

**Recall questions.**

1. Q: Why does slicing behavior into per-frame updates add complexity? A: Straight-line code loses its implicit position; you must store resume state explicitly between frames.
2. Q: Are objects updated with this pattern truly simultaneous? A: No; they update sequentially, so later objects see earlier objects' new state in the same frame.
3. Q: Name two safe ways to handle removal of objects during the update walk. A: Defer removal by marking dead and sweeping afterward, or iterate backwards so removals only shift already-updated items.

**Scenario questions.**

1. *Scenario:* A dungeon has forty traps, patrolling guards, and torches that each need per-frame behavior that is independent of the others. *Answer:* Update Method (each object owns its per-frame behavior). *Distractor:* Observer fits reacting to events, not continuous time-based behavior.
2. *Scenario:* You have a crowd of 10,000 agents and updating each as an actor is too slow. *Answer:* Update Method on a manager over a contiguous struct array (leading into Data Locality). *Distractor:* Object Pool helps with spawn and despawn churn, but the per-frame cost comes from the update walk itself.

### 2.10 Bytecode

**Intent.** Give behavior the flexibility of data by encoding it as instructions that a small virtual machine inside the game executes.

**Problem it solves.** Behavior written in C++ needs an engineer and a long recompile for every tweak, cannot be patched or modded safely after shipping, and a bug in a modder's code can crash everyone. Spells in a wizard duel are the chapter's example: designers want to tune and compose them. The Interpreter pattern (a tree of expression objects that evaluate themselves) can express composable behavior in data, but a sprawling tree of small objects is slow to load, heavy in memory, and terrible for both data and instruction caches. Machine code is dense, linear, low-level, and fast, but letting users supply it is a security hole. Bytecode is the middle: a dense linear instruction stream for a made-up machine that the game emulates and sandboxes.

**How it works.** Start by thinking of the engine's API the spells need (set a stat, play a sound, spawn particles). Each becomes an instruction encoded as a byte. A spell is an array of bytes; the VM loops over them and switches on each to call the right API. To pass parameters, make it a stack machine: instructions pop their arguments from a value stack and push results. A literal instruction reads the next byte from the stream and pushes it. Reading stats (pop a target, push its value) plus arithmetic (pop two, push one) gives composition, so nested expressions become flat instruction sequences without any explicit grouping, because the stack handles nesting. The VM is sandboxed by construction: it can only do what its instructions do, its memory is the fixed stack size (assert on overflow), and you can bound execution by counting instructions. Then the hard part: a front end that produces bytecode from something designers can author, either a text language with a parser or a graphical tool that makes invalid programs impossible.

```cpp
// Original sketch: a tiny stack VM for buff effects.
enum class EOp : uint8 { PushLit, GetStat, SetStat, Add, Mul, End };

void FBuffVM::Run(const TArray<uint8>& Code, FStatsBlock& Target)
{
    TArray<int32> Stack;
    for (int32 Pc = 0; Pc < Code.Num(); ++Pc)
    {
        switch (static_cast<EOp>(Code[Pc]))
        {
        case EOp::PushLit: Stack.Push(static_cast<int8>(Code[++Pc])); break;
        case EOp::GetStat: { int32 Id = Stack.Pop(); Stack.Push(Target.Get(Id)); break; }
        case EOp::SetStat: { int32 V = Stack.Pop(); int32 Id = Stack.Pop(); Target.Set(Id, V); break; }
        case EOp::Add: { int32 B = Stack.Pop(), A = Stack.Pop(); Stack.Push(A + B); break; }
        case EOp::Mul: { int32 B = Stack.Pop(), A = Stack.Pop(); Stack.Push(A * B); break; }
        case EOp::End: return;
        }
        check(Stack.Num() < 64);
    }
}
```

**Design decisions as questions.**

- *Stack-based or register-based VM?* Stack: tiny instructions (one byte), easy code generation, more instructions to shuffle values. Register: larger instructions carrying operand slots (Lua uses 32 bits), fewer instructions, arguably faster. Author recommends stack-based.
- *What instructions exist?* External primitives (reach into the engine; they define what behavior can exist), internal primitives (literals, arithmetic, comparisons, stack juggling), control flow (jumps that modify the program counter), and abstraction (calls with a return stack).
- *How are values represented?* Single type (simplest; the sample is ints only). Tagged union (type tag plus payload; what most dynamic languages do; costs a few bytes per value). Untagged union (compact and fast, unsafe against malicious bytecode, which is why the JVM verifies). Polymorphic interface objects (open-ended, verbose, heap-allocated per value, slow).
- *How is bytecode generated?* Text language (must design syntax, which is user interface design; parsers are easy; error reporting is hard; non-technical users dislike it). Graphical tool (must build UI; fewer error cases since the tool prevents invalid programs; portability harder).
- *How much power?* Keep the instruction set on a short leash or it grows into an accidental full language.

**When to use.** Lots of behavior to define, where the host language is too low-level, too slow to iterate, or too trusting (needs sandboxing for mods and patches). **When not.** Performance-critical engine paths (bytecode is slower than native); when you lack the resources for an authoring front end and debugging tools (you lose your debugger; plan to build visibility features). The author calls it the most complex pattern in the book.

**Related patterns.** Interpreter (the tree form; your authoring tool will have one of these trees and walk it to emit bytecode), Type Object (behavior in data for type-defined kinds), Subclass Sandbox (the data-driven alternative when behavior is simple), Update Method (VM-driven coroutine-like behavior).

**Unreal form.** Blueprint is a bytecode VM: the Blueprint compiler emits `EExprToken` bytecode executed by `UObject::ProcessEvent` and `FFrame`; Kismet (named in the chapter) was its predecessor. Verse is a new language with its own VM. Material graphs compile to shader code. Niagara compiles module graphs to a VM (VVM) or GPU. Behavior Trees and State Trees are data-driven behavior with a graphical front end. What a UE programmer still writes by hand: a small domain VM for things Blueprint is too heavy or too unsafe for (user-created mod scripts, card-game rule text, dialogue logic, item effect formulas), the instruction set design, the sandboxing limits, and a front end (often a Blueprint node set or a Data Table of ops rather than a parser).

**Original Unreal use cases.**

1. *Card effect VM.* A card game where each card's effect is a short bytecode program (push target, get attack, push 2, mul, set attack) authored in a Data Table and run by a stack VM against a `FStatsBlock`. The pattern buys designer-editable effects with no recompile and a hard sandbox. The learner builds the op enum, the VM, and the table loader. A test asserts that the program "double attack then add 1" produces 2a+1 for a=5, that a stack underflow is caught without crashing, and that an instruction-count cap halts a runaway program.
2. *Workshop mod scripts.* A tower-defense mod format where modders describe tower behavior as ops restricted to a safe API (target nearest, fire, apply slow). A test asserts an op outside the allowed set is rejected at load.
3. *Dialogue condition evaluator.* NPC dialogue options gated by tiny expression bytecode (has item, quest stage greater than, and/or). A test asserts the compiled expression for "stage >= 3 and not has key" evaluates correctly over four truth-table cases.
4. *Graphical front end.* A simple in-editor tool (Editor Utility Widget) that builds the card bytecode from dropdowns so invalid programs cannot be authored. A test asserts the tool emits the expected byte sequence for a chosen configuration.

**Common learner mistakes in Unreal.** Building a scripting language when Blueprint already solves the problem. Letting the instruction set grow without a scope. Reaching into engine systems from instructions without a safe API layer (which breaks the sandbox). Representing values as `UObject*` boxes per value. Skipping bounds checks on the stack and program counter. Not building any debugging aid (at least a disassembler and a trace log).

**Recall questions.**

1. Q: Why is the Interpreter pattern's object tree slow, and how does bytecode fix it? A: The tree is many small heap objects linked by pointers with virtual calls, which thrashes caches; bytecode is a dense linear byte array walked by a loop and a switch.
2. Q: How do instructions pass values to each other in a stack machine? A: By pushing results onto and popping arguments from a shared value stack.
3. Q: What three things make a bytecode VM sandboxed? A: It can only do what its instructions expose, its memory is a bounded stack, and its execution can be bounded by an instruction count or by forbidding loops.

**Scenario questions.**

1. *Scenario:* Players will write their own item enchantment logic and share it online; it must not be able to crash or exploit the game. *Answer:* Bytecode. *Distractor:* Type Object lets players create new kinds by editing data fields, but it cannot express composed logic like "if health below half, double damage."
2. *Scenario:* Designers tune a dozen numbers on fifty enemy kinds and recompiles are killing iteration. *Answer:* Type Object (or Data Assets), not Bytecode; the behavior does not change, only values. *Distractor:* Bytecode would work but is massive overkill for data without logic.

### 2.11 Subclass Sandbox

**Intent.** Define many varied behaviors as subclasses that implement one abstract method using a toolkit of operations the base class provides.

**Problem it solves.** A superhero game with a hundred power subclasses, written by a team. Left alone, each power will call into audio, particles, physics, and AI directly: redundant code across powers, every engine system coupled to a hundred classes, changes in those systems breaking random powers, and no way to enforce invariants (all power audio must go through the priority queue). The fix is to give power authors a controlled set of primitives in the base class and one method to fill in.

**How it works.** The base class declares an abstract, protected sandbox method (the one subclasses must override) and a set of protected, usually non-virtual provided operations (play sound, spawn particles, move, query hero position). Subclasses implement the sandbox method by composing those operations and include nothing else. Duplication across subclasses gets rolled up into new provided operations. Coupling to the engine is concentrated in the base class, giving a shallow, wide hierarchy with one point of leverage. The chapter notes the risk: the base class accretes everything and becomes brittle (the brittle base class problem), and the remedy is to move groups of operations into helper objects the base class hands out.

```cpp
// Original sketch: a sandboxed ability with provided operations.
class UAbilityBase : public UObject
{
protected:
    virtual void Activate() = 0;                          // the sandbox method
    void PlayCue(FName Cue, float Volume);                // provided operations
    void SpawnBurst(UNiagaraSystem* Fx, int32 Count);
    void Launch(FVector Impulse);
    FVector OwnerLocation() const;
private:
    TWeakObjectPtr<AActor> Owner; UAudioRouter* Audio;    // hidden from subclasses
};

class UQuakeStomp : public UAbilityBase
{
protected:
    void Activate() override { PlayCue("Stomp", 1.f); SpawnBurst(DustFx, 30); Launch(FVector(0, 0, -900)); }
};
```

**Design decisions as questions.**

- *Which operations should the base provide?* From none (then it is not this pattern) to everything (subclasses include only the base header). Rules of thumb: operations used by only one or two subclasses may not be worth the base-class complexity; read-only access to outside state is a "safe" coupling that subclasses can do directly (with caveats about threads and determinism); state-modifying calls deserve to be provided operations; pure forwarding is low value unless it hides a field the base does not want to expose.
- *Provide methods directly or through helper objects?* Direct: convenient, bloats the base. Through objects (`GetSoundPlayer()`): fewer base methods, helper code easier to maintain, base coupled to one helper type instead of many systems.
- *How does the base get the state it needs?* Constructor parameter (every subclass constructor must forward it; leaks the dependency into subclasses). Two-stage init (clean constructors, but someone can forget to call init; wrap in a factory). Static state (initialize once for the whole class; shares singleton-like drawbacks). Service Locator (the base pulls what it needs itself).

**When to use.** A base with many subclasses, where the base can supply everything a subclass needs, subclasses overlap in behavior, and you want to minimize coupling between subclasses and the rest of the program. **When not.** When behavior is uniform enough that data alone (Type Object, Bytecode) would do; when the base class is becoming a stew (then split with components).

**Related patterns.** Template Method (the mirror image: base has the method, subclasses provide the primitives), Facade (base is a facade over the engine), Update Method (an update method is often a sandbox method), Component (relief for a bloated base), Command (a concrete command base with helpers).

**Unreal form.** The engine is full of this shape. `UGameplayAbility` is the clearest: subclasses override `ActivateAbility` and use provided operations (`CommitAbility`, `ApplyGameplayEffectToOwner`, `GetAvatarActorFromActorInfo`, ability tasks). `AActor` and `UActorComponent` provide `GetWorld`, `GetOwner`, timers, and spawn helpers around `BeginPlay` and `Tick`. `UBTTaskNode` subclasses implement `ExecuteTask` using node helpers. `UAnimNotify` and `UAnimNotifyState`, `UEnvQueryTest`, `UCameraModifier`, and `UUserWidget` follow the same shape. What a UE programmer still writes by hand: their own shallow-wide base classes for game-specific behavior families (abilities when not using GAS, interactables, enemy attacks, traps, card effects), choosing the provided-operation set, and moving groups of helpers into small objects when the base grows.

**Original Unreal use cases.**

1. *Trap family.* A `UTrapBase` with provided operations (detect pawns in radius, apply damage, play cue, start cooldown, spawn hazard) and twenty traps overriding `Trigger()`. The pattern buys trap authors who never include the damage or audio headers. The learner builds the base plus three traps. A test asserts a spike trap's trigger damages an overlapping test pawn exactly once and starts its cooldown, using a mock audio router injected into the base.
2. *Enemy attack moves.* `UAttackMoveBase` with windup, hit-box, and recovery helpers; subclasses compose them into combos. A test asserts a two-hit combo subclass produces two hit-box activations at the configured times.
3. *Interactable base.* `AInteractableBase` providing prompt text, highlight, inventory access, and quest-flag helpers; chests, levers, and NPC terminals override `Interact()`. A test asserts a locked chest consumes a key from the interacting pawn's inventory through the provided operation and refuses without one.
4. *Helper-object refactor.* The trap base grows to thirty methods; the learner moves effects into a `UTrapEffects` helper handed out by `Effects()`. A test asserts behavior is unchanged after the refactor (same test suite passes).
5. *Two-stage init with factory.* Powers need a particle system reference the base keeps private; the learner implements a `CreatePower` factory that constructs and initializes, and a check that catches a missing init. A test asserts using an uninitialized power triggers the expected ensure.

**Common learner mistakes in Unreal.** Making provided operations public, which lets anything call them. Marking provided operations virtual without need, inviting subclasses to bypass invariants. Letting subclasses reach `GetWorld()->SpawnActor` and the audio system directly, defeating the point. Building a 2,000-line base class and never splitting it. Reimplementing GAS's ability base poorly when GAS is available. Putting per-subclass special cases into the base as flags.

**Recall questions.**

1. Q: What are the two kinds of methods in a sandbox base class? A: One abstract sandbox method for subclasses to implement, and protected provided operations for them to call.
2. Q: Where does coupling to the rest of the engine end up in this pattern? A: Concentrated in the base class; subclasses are coupled only to the base.
3. Q: How is Subclass Sandbox the opposite of Template Method? A: In Template Method the base owns the algorithm and subclasses supply the steps; in Subclass Sandbox subclasses own the algorithm and the base supplies the steps.

**Scenario questions.**

1. *Scenario:* Six gameplay programmers will write eighty unique boss abilities over a year, and audio and VFX leads want consistent routing. *Answer:* Subclass Sandbox (or GAS, which is one). *Distractor:* Type Object would let designers vary numbers but cannot express eighty unique imperative behaviors.
2. *Scenario:* A family of UI screens all need to show toasts, play UI sounds, and read player data, and screen authors keep including random headers. *Answer:* Subclass Sandbox with a screen base class providing those operations. *Distractor:* Service Locator gives access but does not constrain which operations screens use or centralize the coupling.

### 2.12 Type Object

**Intent.** Represent "kinds" of things as instances of one type-object class so new kinds can be created in data instead of as new subclasses.

**Problem it solves.** Monsters have breeds (dragon, troll) that determine starting health and attack text. One subclass per breed means a seven-line class per breed, hundreds of them, and a recompile every time a designer wants a troll to have 52 health instead of 48. The programmer becomes a data entry clerk. Instead, one Monster class holds a reference to one Breed object; breeds are instances created at runtime, possibly from a file, and designers can add and tune them without code.

**How it works.** Two classes: the type object (Breed) with shared per-kind data, and the typed object (Monster) with per-instance data and a reference to its type. Shared behavior is read through the type. Enhancements: a factory method on the type object (breed creates monsters), which also lets the type control allocation (pools, custom heaps); and inheritance between type objects, implemented by you, either by walking a parent chain on each lookup (respects runtime edits, slower) or by copying inherited attributes down at construction (fast, no parent pointer kept). A JSON-style data file with a parent field per breed is the natural authoring format. The chapter's striking aside: a C++ vtable is a type object, and the vtable pointer is the typed object's reference to it. The limitation: data is easy to vary per type, behavior is hard. Workarounds: store a selector for one of several predefined behaviors (a function pointer, which is a vtable again), or go fully data-driven with Bytecode.

```cpp
// Original sketch: a type object as a Data Asset and a typed actor.
UCLASS()
class UCreatureKind : public UPrimaryDataAsset
{
public:
    UPROPERTY(EditDefaultsOnly) TObjectPtr<UCreatureKind> Parent;   // optional data inheritance
    UPROPERTY(EditDefaultsOnly) float BaseHealth = 0.f;             // 0 means "inherit"
    UPROPERTY(EditDefaultsOnly) FText AttackLine;
    float ResolveHealth() const { return (BaseHealth > 0.f || !Parent) ? BaseHealth : Parent->ResolveHealth(); }
};

class ACreature : public AActor
{
    UPROPERTY() TObjectPtr<const UCreatureKind> Kind; float Health;
public:
    void InitFromKind(const UCreatureKind* InKind) { Kind = InKind; Health = Kind->ResolveHealth(); }
};
```

**Design decisions as questions.**

- *Is the type object encapsulated or exposed?* Encapsulated: the rest of the code does not know kinds exist, and the typed object can override type behavior (a dying monster flails weakly), but you must write forwarding methods. Exposed: outside code can use kinds directly (needed for the factory method on the type), at the cost of a wider API.
- *How are typed objects created?* Construct the object and pass in the type (caller controls memory), or call a factory on the type object (type controls memory, can route through pools).
- *Can the type change?* Fixed: simpler and easier to debug. Changeable (corpse becomes zombie by swapping breed): avoids re-creation, but the new type's assumptions must be validated against the existing object's state.
- *What inheritance between types?* None (simple, duplicated data). Single (simple to understand, lookups may walk a chain or be copied down). Multiple (least duplication, hard to reason about; the author says rarely worth it).

**When to use.** You do not know all the kinds up front (downloadable content), or you want to add and tune kinds without recompiling. **When not.** When kinds differ mainly in behavior rather than data, or when there are few kinds and subclasses are clearer. Costs: you must manage type object lifetime yourself and ensure every typed object has a valid type.

**Related patterns.** Prototype (another way to share data across objects), Flyweight (same shape, memory intent), State (delegating what an object is now versus what it is), Bytecode and Interpreter (behavior in data), Object Pool (allocation through the type's factory).

**Unreal form.** This pattern is the Unreal data-driven mainstream. `UPrimaryDataAsset` and `UDataAsset` subclasses are type objects; `FTableRowBase` rows in `UDataTable` are type objects keyed by name; Blueprint classes with only default changes are a hybrid (the CDO is a type object managed by the engine). GAS attribute sets initialized from Data Tables, `UGameplayEffect` definitions, and the Lyra "Pawn Data" and "Experience Definition" assets are all type objects. The Asset Manager handles loading and lifetime of primary assets. What a UE programmer still writes by hand: the typed actor's initialization from its kind, data inheritance between assets (the engine does not resolve a Parent field for you), type swapping with validation, and factory methods on the kind (spawn through the kind so pools and class selection are centralized).

**Original Unreal use cases.**

1. *Creature kinds with data inheritance.* A `UCreatureKind` asset with a parent reference and copy-down resolution at load, plus a `ACreature` actor initialized from a kind. The learner builds both and a resolver. A test asserts that a "Troll Archer" asset with inherit markers resolves health from "Troll" and that overriding one field does not affect siblings.
2. *Weapon kinds spawning their own actors.* `UWeaponKind::SpawnWeapon(World, Owner)` as the only way to create weapon actors, choosing the actor class and pulling from a pool. A test asserts every spawned weapon's kind pointer is set and that spawning twice reuses a pooled actor.
3. *Zombification by type swap.* A dead creature whose kind becomes the zombie kind in place, with a validation step clamping health to the new maximum. A test asserts the swap keeps position and inventory, resets health to the zombie max, and rejects a swap to a kind with an incompatible size class.
4. *Hot-reload tuning.* Kinds loaded from a JSON file at startup in a test build so designers tune without the editor. A test asserts changing the file's troll health and reloading changes newly spawned trolls only.
5. *Encapsulated versus exposed lab.* The learner implements `GetAttackLine()` on the creature that overrides the kind's line below 20 percent health, showing why encapsulation gives a hook. A test asserts the override appears only below the threshold.

**Common learner mistakes in Unreal.** Subclassing an actor per enemy kind when a Data Asset would do. Copying kind data into every instance instead of referencing it (losing live tuning and wasting memory). Mutating a shared Data Asset at runtime. Spawning typed actors without setting their kind, leaving null references. Expecting Data Asset "parent" relationships to resolve by themselves. Hard-referencing hundreds of kinds from one asset so everything loads at once (use soft references and the Asset Manager).

**Recall questions.**

1. Q: What are the two classes in Type Object and what does each hold? A: The type object holds shared per-kind data; the typed object holds per-instance data and a reference to its type.
2. Q: What is the main thing Type Object makes hard compared to subclassing? A: Varying behavior per kind, since a field cannot override a method; you need behavior selectors or Bytecode.
3. Q: What are the two ways to implement inheritance between type objects, and the tradeoff? A: Walk the parent chain on lookup (dynamic, slower, respects edits) or copy inherited values down at construction (fast, frozen).

**Scenario questions.**

1. *Scenario:* The game must support hundreds of monster kinds, including ones added by DLC after launch, that differ in stats and loot. *Answer:* Type Object (Data Assets). *Distractor:* Prototype via cloning template actors shares configured state but is awkward to load as content and to inherit between.
2. *Scenario:* Fifty item kinds share one immutable stats block and memory is the concern, not authoring. *Answer:* Flyweight is the better description; Type Object is the same shape with an authoring intent. *Distractor:* Object Pool reuses instances over time, which is unrelated to sharing per-kind data.

### 2.13 Component

**Intent.** Let one entity span several domains (input, physics, rendering, audio, AI) without those domains being coupled to each other, by splitting the entity into separate component objects.

**Problem it solves.** A player character class that reads input, resolves collisions, animates, renders, and plays sounds becomes a thousands-of-lines file every programmer must touch and nobody wants to. Worse than size is coupling: conditions that mix collision state, render state, and audio in one line. And inheritance cannot share code cleanly between things that need overlapping subsets of capabilities (decorations render, zones collide, props do both: the deadly diamond). Cutting the class along domain lines yields reusable, independently maintainable components and lets you assemble kinds of objects by combination rather than by class.

**How it works.** Move each domain's code and data into its own component class; the entity owns one of each and calls their update methods in a deliberate order. Shared pan-domain state (position, velocity) can stay on the entity so components communicate through it without knowing each other. Then abstract the components behind interfaces so the entity holds pointers to interfaces and outside code wires concrete components in; now a demo-mode AI input component replaces the player input component with no other change. Finally the entity is just a generic container, and factory functions assemble particular kinds by choosing components. Some engines go further and make the entity an ID with components stored in separate arrays (the entity component system style, tied to Data Locality).

```cpp
// Original sketch: entity as a container with ordered component updates.
class IPartUpdate { public: virtual ~IPartUpdate() = default; virtual void Update(struct FRig& Owner, float Dt) = 0; };

struct FRig
{
    FVector Position; FVector Velocity;                       // pan-domain shared state
    TArray<TUniquePtr<IPartUpdate>> Parts;                    // input, physics, visuals, in that order
    void Update(float Dt) { for (auto& P : Parts) P->Update(*this, Dt); }
};

FRig MakeDummyTarget() { FRig R; R.Parts.Add(MakeUnique<FStaticPhysicsPart>()); R.Parts.Add(MakeUnique<FBillboardPart>()); return R; }
```

**Design decisions as questions.**

- *What components do you need?* Depends on the game's domains; bigger engines slice finer.
- *Who provides the components?* The object creates its own (guaranteed complete, hard to reconfigure) or outside code passes them in (flexible, decoupled from concrete types, risk of mis-wiring).
- *How do components communicate?* Through the container's shared state (decoupled, but shared data gets pushed up into the container, wasted on objects that do not need it, and communication becomes implicit and order dependent). By direct references between sibling components (simple and fast, but couples those pairs; fine for close pairs like animation and rendering). By messages routed through the container (decoupled, container stays dumb, good for fire-and-forget like "play a sound on collision"; beware feedback loops; can become an Event Queue). The author's advice: use all three, start simple, add paths only when needed.
- *Entity as object or as ID?* Object with pointers: easy access to components. ID: components live in arrays keyed by entity; tiny entities, no lifetime management, but lookups cost and arrays must stay parallel or be indexed.

**When to use.** A class touches multiple domains that should stay decoupled; a class has become huge; you want to define many kinds of objects by combining capabilities more precisely than inheritance allows. **When not.** Small games or classes where the clusters of objects, wiring, and indirection are over-engineering. Costs: each object becomes a cluster that must be created, initialized, and wired; inter-component communication is harder; a pointer hop to reach anything (though contiguous component arrays can improve cache behavior).

**Related patterns.** Strategy (a stateless component is a strategy), Mediator (container-routed messages), Update Method (components update), Data Locality (component arrays), Event Queue (queued component messages), Factory Method (assembly functions).

**Unreal form.** `AActor` is the container and `UActorComponent` and `USceneComponent` are the components, with `TickComponent`, `BeginPlay`, ownership, and the Details panel for designer assembly. `GetComponentByClass` and `FindComponentByClass` are the lookup. The engine ships the domain components (`UCharacterMovementComponent`, `USkeletalMeshComponent`, `UAudioComponent`, `UAbilitySystemComponent`). Component communication in UE uses all three book options: shared actor state (`GetActorLocation`), direct references (`GetOwner()->FindComponentByClass`), and delegates or Gameplay Messages. Mass Entity is the ID-plus-arrays form. What a UE programmer still writes by hand: game-specific components (health, inventory, interaction, stamina), component interfaces (`UInterface`) so actors can hold any implementation, assembly through Blueprint classes or spawn-time wiring, and discipline about which communication path each pair uses.

**Original Unreal use cases.**

1. *Composable interactables.* A single `AWorldObject` Blueprint-less actor assembled from components (`UHealthComponent`, `UInteractComponent`, `ULootComponent`, `UBreakableComponent`) where a crate, a lantern, and a lever are three component sets, not three classes. The pattern buys adding a new object kind without a new class. The learner builds three components and a factory function per kind. A test asserts that a crate assembled by the factory has health and loot but no interact component, and that breaking it spawns loot through the loot component.
2. *Swappable control component.* A `UControlSource` interface with `UPlayerControlSource` and `UScriptedControlSource`, where a cutscene swaps the pawn's control component at runtime. A test asserts that after the swap, input events no longer move the pawn and scripted commands do.
3. *Communication paths lab.* A stamina component, a movement speed modifier, and a HUD: stamina publishes a delegate (message), the speed modifier holds a direct reference to the movement component (close pair), and both read the actor's location (shared state). A test asserts that draining stamina reduces max walk speed and the HUD value in the same tick order every time.
4. *Pan-domain state decision.* The learner decides whether "facing direction" belongs on the actor or in the movement component, with a test that ensures the visuals component reads the same facing the movement component wrote this frame (ordering with tick prerequisites).
5. *Component versus subclass refactor.* An enemy hierarchy (Melee, Ranged, FlyingRanged) collapses into one actor class plus `UMeleeAttack`, `URangedAttack`, and `UFlightMovement` components. A test asserts the flying ranged assembly has both flight and ranged behavior with no multiple inheritance.

**Common learner mistakes in Unreal.** Putting all gameplay in the character class anyway. Components that `Cast<AMyCharacter>(GetOwner())` everywhere, coupling the component to one actor type (use interfaces or shared state). Components calling each other through circular hard references. Creating components at runtime without `RegisterComponent`. Assuming component tick order without prerequisites. Making a component for every two-line behavior, exploding the cluster. Forgetting that `USceneComponent` has a transform and `UActorComponent` does not.

**Recall questions.**

1. Q: What is the main problem Component solves beyond class size? A: Coupling between unrelated domains inside one entity, so domain experts can work independently (and on separate threads).
2. Q: What are the three ways components can communicate, in order of coupling? A: Through the container's shared state (least coupled, order dependent), by messages routed through the container (decoupled, fire-and-forget), by direct references (most coupled, fastest).
3. Q: What is left of the entity once all domains are components? A: A container of components plus pan-domain state, which can be generic and assembled by factories.

**Scenario questions.**

1. *Scenario:* Your enemy hierarchy needs a flying melee unit and a ground ranged unit and inheritance keeps forcing duplicated code. *Answer:* Component. *Distractor:* Type Object can vary data per kind but cannot give one kind a capability another lacks without the code for that capability living somewhere composable.
2. *Scenario:* The player class is 4,000 lines mixing camera, input, inventory, and audio logic. *Answer:* Component. *Distractor:* Subclass Sandbox would organize behavior families under a base but would not separate the domains inside one object.

### 2.14 Event Queue

**Intent.** Separate the moment a request or notification is sent from the moment it is processed.

**Problem it solves.** A synchronous audio API blocks the caller until the sound is loaded and playing (menus freeze for frames), handles each request alone so it cannot merge two identical sounds in one frame or prioritize when channels run out, and runs on whichever thread called it rather than the audio thread. The common cause is immediacy. Decoupling receipt from processing, via a queue the receiver drains when convenient, fixes all three. The chapter also describes the central event bus (combat posts "enemy died", the tutorial system listens) but deliberately uses the smaller single-domain example because the author distrusts big global systems.

**How it works.** Reify the request as a small struct (sound id, volume). Store pending requests in a plain array (no allocation, cache friendly). The sender appends and returns. An update method drains the queue later. To process one item at a time while leaving the rest, use a ring buffer: head reads, tail writes, both wrap with modulo, empty when head equals tail, and an assert (or growth) when the tail would collide with the head. Aggregation: when enqueuing, scan for a pending request for the same sound and keep the louder one (or aggregate when processing, or use a hash for constant-time duplicate checks). Threading: the sender locks briefly to append; the processor waits on a condition variable and processes on its own thread. The author warns that the window for aggregation is only as big as the queue, and that treating the queue as a live data structure lets lag affect behavior.

```cpp
// Original sketch: fixed-capacity ring buffer of requests.
template <typename T, int32 Capacity>
struct TRingQueue
{
    T Items[Capacity]; int32 Head = 0, Tail = 0;
    bool IsEmpty() const { return Head == Tail; }
    bool TryPush(const T& Item)
    {
        const int32 Next = (Tail + 1) % Capacity;
        if (Next == Head) return false;                 // full: caller decides to drop or grow
        Items[Tail] = Item; Tail = Next; return true;
    }
    bool TryPop(T& Out) { if (IsEmpty()) return false; Out = Items[Head]; Head = (Head + 1) % Capacity; return true; }
};
```

**Design decisions as questions.**

- *What goes in the queue: events or messages?* Events describe something that already happened (a monster died); senders do not care who listens, multiple listeners are typical, scope tends to be broad. Messages are requests for future work (play this sound); typically one receiver, like an asynchronous API to a service.
- *Who can read?* Single-cast (the queue is an implementation detail of one reader; encapsulated; no listener contention). Broadcast (every listener sees every item; items with zero listeners are dropped; you may need filtering). Work queue (each item goes to exactly one of several workers; you must schedule).
- *Who can write?* One writer (listeners know the source; most like Observer). Many writers (a central bus; cycles are easier to create; you likely need the sender in the item).
- *What is the lifetime of queued items?* Pass ownership (sender hands off, receiver frees; `TUniquePtr`). Share ownership (`TSharedPtr`, lives while referenced). Queue owns (sender fills a slot in the queue's own storage; the backing store is an Object Pool).
- *Where is aggregation done?* At enqueue (cheaper on the queue, cost on the caller) or at drain (cost on the processor).
- *Fixed capacity or growable?* Fixed ring buffer (no allocation; must handle full) or growable array (amortized constant time).

**When to use.** Only when you need to decouple in time, not just in identity: the sender pushes when convenient, the receiver pulls when convenient, so a buffer is required between push and pull. **When not.** When Observer or Command gives enough decoupling with less complexity; when the sender needs a response (queues take control away from the sender). Keep in mind: a central queue is a global variable with a protocol around it; the world can change between send and receive, so queued events must carry the data they need (they are heavier than synchronous notifications); feedback loops do not overflow the stack the way synchronous cycles do, so they can go unnoticed; avoid sending while handling, and log.

**Related patterns.** Observer (the synchronous cousin), Command (requests as objects), Object Pool (queue-owned storage), Service Locator (enqueueing without caring who processes), State (queue inputs to a machine; many machines with mailboxes is the actor model), Game Loop (where draining happens).

**Unreal form.** Unreal has queues at several layers: `TQueue<T, EQueueMode::Mpsc>` and `TCircularQueue` are the containers; `AsyncTask(ENamedThreads::GameThread, ...)` and `FFunctionGraphTask` queue work to threads; the audio engine already batches and prioritizes through `FActiveSound` and concurrency settings; `FTimerManager` is a time-indexed queue; the network layer queues RPCs and replicated property changes; `UGameplayMessageSubsystem` broadcasts tagged messages (synchronous, so it is Observer-shaped, not a queue); input events are queued by the platform layer and drained by `UPlayerInput` each frame. What a UE programmer still writes by hand: a gameplay event queue drained at a chosen point in the frame (end of tick, so all systems see a consistent world), a ring buffer of per-frame requests with aggregation (damage numbers, UI toasts, audio cues), a cross-thread handoff from a worker to the game thread, and mailboxes for state machines.

**Original Unreal use cases.**

1. *Damage number aggregation.* Floating damage numbers requested from many hit events in one frame, queued in a ring buffer, aggregated per target at enqueue (sum damage, keep the highest crit flag), and drained at `TG_PostUpdateWork` into one widget per target. The pattern buys readable numbers and fewer widgets. The learner builds the ring buffer, the aggregation, and the drain. A test asserts that five hits on one target in one frame produce one entry with the summed value and that the queue reports full rather than overwriting.
2. *Deferred world events.* Combat posts "enemy died" with a snapshot (enemy kind, location, killer id) into a world event queue drained at end of tick by the quest and tutorial systems. A test asserts that a listener registered mid-frame does not receive this frame's events, and that the event's snapshot is intact even though the enemy actor was destroyed before the drain.
3. *Worker-to-game-thread results.* A procedural generation worker pushes finished chunks into an MPSC queue; the game thread pops up to N per tick to spawn meshes. A test asserts that items are popped in FIFO order and that per-tick spawning never exceeds N.
4. *Mailbox state machines.* NPC brains with per-NPC input mailboxes (heard noise, saw player, got hit) consumed once per think interval. A test asserts that events queued between thinks are all seen at the next think, in order, and that a cycle (NPC A alerts B who alerts A) is cut by a "do not send while handling" guard.
5. *UI toast queue.* Toasts shown one at a time from a queue with priority and coalescing of identical messages. A test asserts three identical "item picked up" requests produce one toast with a count of three.

**Common learner mistakes in Unreal.** Using a queue when a delegate would do. Queuing raw `AActor*` and dereferencing it after the actor died (snapshot data or use weak pointers). Draining at an undefined point in the frame so consumers see mixed state. Broadcasting from inside a handler and creating an unnoticed feedback loop. Unbounded growth because nobody checks the full condition. Using `TQueue` in SPSC mode from multiple producers.

**Recall questions.**

1. Q: What do you need an event queue for that Observer cannot provide? A: Decoupling in time (and across threads): the sender pushes now, the receiver pulls later.
2. Q: How does a ring buffer know it is empty, and how does it wrap? A: Empty when head equals tail; both indices advance modulo the capacity.
3. Q: Why do queued events need to carry more data than synchronous notifications? A: The world may have changed by the time they are processed, so the details must be captured at send time.

**Scenario questions.**

1. *Scenario:* Hits land on multiple threads but the audio system must mix and prioritize them on its own thread once per frame. *Answer:* Event Queue. *Distractor:* Observer delivers synchronously on the sender's thread, which is exactly the problem.
2. *Scenario:* A UI widget needs to update whenever health changes, immediately and on the game thread. *Answer:* Observer (a multicast delegate), not Event Queue. *Distractor:* Event Queue adds latency and complexity when nothing needs to be deferred.

### 2.15 Service Locator

**Intent.** Give code a way to reach a service through an abstract interface without being coupled to the concrete implementation or to how the instance is found.

**Problem it solves.** Audio, logging, allocation, and random numbers are needed everywhere. Reaching them through a static class or a singleton couples every call site to a concrete class and to one access mechanism, so swapping the implementation means telling a hundred callers the new address. A locator is the phone book: callers look up the service by its abstract interface; the one place that registers the provider can change what is listed.

**How it works.** Three parts: a service interface (abstract audio API), one or more providers (the console implementation), and a locator with a static getter and a static provide method. Startup code constructs a provider and registers it; callers get the interface and never see the concrete class. Not even the locator knows the concrete class, and the interface does not know it is being located, so the pattern applies to existing classes. Refinements: a null service (a provider that implements the interface and does nothing) so callers never get a null pointer and so you can switch off a system by not registering anything; and a decorator (a logging provider that wraps another provider) swapped in at runtime to log every call.

```cpp
// Original sketch: locator with null-object default and a decorator.
class IHapticsService { public: virtual ~IHapticsService() = default; virtual void Pulse(float Strength) = 0; };
class FNullHaptics : public IHapticsService { void Pulse(float) override {} };

class FHapticsLocator
{
public:
    static IHapticsService& Get() { return *Current; }
    static void Provide(IHapticsService* Service) { Current = Service ? Service : &Null; }
private:
    static inline FNullHaptics Null; static inline IHapticsService* Current = &Null;
};

class FLoggedHaptics : public IHapticsService
{
public:
    explicit FLoggedHaptics(IHapticsService& In) : Inner(In) {}
    void Pulse(float S) override { UE_LOG(LogTemp, Log, TEXT("Pulse %f"), S); Inner.Pulse(S); }
private: IHapticsService& Inner;
};
```

**Design decisions as questions.**

- *How is the service located?* Outside code registers it (fast, you control construction with runtime data such as an IP address, you can swap at runtime, but callers depend on registration having happened). Bound at compile time with preprocessor selection (fast, guaranteed available, cannot change without recompiling). Configured at runtime from a file with reflection (swap without recompiling, non-programmers can change it, one build supports many configurations, but complex and slower to locate).
- *What if the service cannot be found?* Return null and let callers handle it (flexible, but every call site must check and one miss crashes). Assert (callers never check; the game halts on a bug, which blocks teammates on large teams). Return a null service (callers never check; the game keeps running, which hides an unintentional missing service, so have the null service log).
- *What is the scope?* Global (everything uses the same instance, nothing creates its own; you lose control over where it is used). Restricted to a class and its descendants via a protected static getter (controls coupling; duplicate effort if unrelated classes need it). The author's rule: domain-specific services scoped to a class, cross-cutting services like logging global.

**When to use.** Sparingly. Prefer passing the object in. Use a locator for cross-cutting concerns that do not belong in signatures (logging, allocation) and for facilities that are singular by nature (one audio device). **When not.** For anything that should only be used in a specific context or phase, since a global locator cannot enforce that. Costs: dependencies become invisible in the code and are wired at runtime; the service must handle being called from anywhere; used badly it is a singleton with worse performance.

**Related patterns.** Singleton (the rigid sibling), Null Object, Decorator, Subclass Sandbox (a base class pulling services), Component (Unity's `GetComponent` as a per-object locator), Event Queue.

**Unreal form.** `IModularFeatures::Get().GetModularFeature<T>(Name)` is a literal service locator with registration and null-safe queries. Subsystems are the common replacement: `GetGameInstance()->GetSubsystem<UMyService>()` locates by type with engine-managed lifetime; a subsystem can hold a pluggable provider behind an interface. `IOnlineSubsystem::Get()` locates platform services by name, with null and test implementations. Console variables (`CVars`) and `UDeveloperSettings` are the runtime-configured variant. `FAudioDevice`, `GEngine` accessors, and `UGameplayStatics` are the global forms. What a UE programmer still writes by hand: a subsystem that wraps a swappable provider interface (real, null, logged, mock) for things like analytics, haptics, save backends, and leaderboards; the null provider; a decorator for debugging; and the rule for which classes may touch it.

**Original Unreal use cases.**

1. *Pluggable analytics provider.* A `UAnalyticsSubsystem` holding an `IAnalyticsProvider` with real, null, and recording implementations, chosen by a developer setting. The pattern buys tests and shipping builds that swap providers without touching callers. The learner builds the interface, three providers, and the subsystem. A test asserts that with the recording provider, three gameplay events produce three records, and that with no provider registered calls are absorbed by the null provider without error.
2. *Haptics with a logging decorator.* A haptics service located through a subsystem, decorated with a logger when a console variable is set. A test asserts the decorator forwards every call and that toggling the variable swaps the provider at runtime.
3. *Scoped service.* A networking service exposed only to a `UOnlineFeatureBase` class family through a protected accessor, so UI code cannot reach it. The lesson is scope. A test (compile-time by design, runtime by check) asserts the accessor is unavailable outside the family and that two derived features share the same provider.
4. *Save backend swap.* A save service with local-disk and in-memory providers; the in-memory one is used in automation. A test asserts that saving then loading through the located service round-trips a struct with the in-memory provider.
5. *Missing-service policy lab.* The learner implements the three failure policies (null, assert, null object) behind a switch and documents when each is appropriate. A test asserts the assert policy triggers the expected check when nothing is registered.

**Common learner mistakes in Unreal.** Treating subsystems as singletons for everything, including state that should be passed in. Locating services from constructors or CDOs before the world exists. Forgetting the null provider and crashing in tests. Giving every class global access to a domain-specific service. Hiding true dependencies so that a class cannot be understood or tested without the whole engine. Caching a located provider pointer across a provider swap.

**Recall questions.**

1. Q: What three pieces make up a service locator? A: A service interface, concrete providers, and a locator that hands out the current provider.
2. Q: What does a null service give you? A: Callers never deal with a missing service, and you can switch a system off by not registering a provider; it should log so accidental absence is visible.
3. Q: How does Service Locator differ from Singleton? A: It couples callers to an interface rather than a concrete class, lets the provider change at runtime, and can be applied to classes not designed for it.

**Scenario questions.**

1. *Scenario:* Automation tests must run gameplay code that reports to a leaderboard, without hitting the network. *Answer:* Service Locator with a null or recording provider. *Distractor:* Singleton would give global access but bakes in one concrete class with no swap point.
2. *Scenario:* An enemy's attack needs a reference to the player's health component. *Answer:* Pass it in (or find it through the owning actor), not Service Locator; the dependency is local and should be visible. *Distractor:* Service Locator is tempting for "I need access to something," but player health is not a cross-cutting service.

### 2.16 Data Locality

**Intent.** Speed up memory access by laying data out contiguously in the order it is processed, so the CPU cache does the work instead of main memory.

**Problem it solves.** CPUs got far faster than RAM; a fetch from main memory can stall the processor for hundreds of cycles. Caches hide this by pulling in a whole line (around 64 bytes) around any byte you touch, so data next to what you just used is nearly free. Typical object-oriented game code defeats this: an array of pointers to entities, each pointing to components scattered across the heap, so every update is a chain of cache misses. The author measured the same computation fifty times slower with poor locality. Performance is a property of data layout, not just code.

**How it works.** Three techniques. (1) Contiguous arrays: store components of one kind in a flat array of values, not pointers, and have the game loop walk each array directly; the entity can keep pointers into those arrays for other uses. (2) Packed data: keep active objects at the front of the array by swapping on activate and deactivate, track the active count, and loop only over active ones; this also removes the need for an active flag and avoids branch mispredictions from checking it. (3) Hot/cold splitting: move rarely used fields (loot drop data) into a separate cold struct referenced by pointer, so the hot array stays dense. The chapter also notes that multithreaded writers want different cache lines (false sharing), and that pointer indirection and virtual calls are both locality costs.

```cpp
// Original sketch: packed active-first array with swap-based activation.
struct FEmber { FVector Pos; FVector Vel; float Life; };

struct FEmberField
{
    TArray<FEmber> Embers; int32 NumActive = 0;
    void Activate(int32 Index) { check(Index >= NumActive); Swap(Embers[Index], Embers[NumActive]); ++NumActive; }
    void Deactivate(int32 Index) { check(Index < NumActive); --NumActive; Swap(Embers[Index], Embers[NumActive]); }
    void Step(float Dt)
    {
        for (int32 i = 0; i < NumActive; ++i) { Embers[i].Pos += Embers[i].Vel * Dt; Embers[i].Life -= Dt; }
        for (int32 i = NumActive - 1; i >= 0; --i) if (Embers[i].Life <= 0.f) Deactivate(i);
    }
};
```

**Design decisions as questions.**

- *How do you handle polymorphism?* Avoid it in hot paths (safe, fast, inflexible; Type Object keeps some flexibility). Separate arrays per concrete type (tightly packed, static dispatch, but many collections to manage and you must know every type). An array of pointers to a base type (flexible, cache-unfriendly; fine outside hot loops).
- *How are entities defined?* Classes with pointers to components (components can be in packed arrays; easy to reach components from an entity; moving a component breaks raw pointers unless updated). Classes with IDs for components (components can move; more complex; slower lookup; needs a component manager). Entities as plain IDs (tiny, no lifetime management; everything must live in components; lookups cost unless the ID is the array index, which forces parallel arrays and blocks per-array sorting).
- *When to apply it at all?* Only with a measured problem caused by cache misses; the result is more complex and less flexible. But think about cache-friendliness throughout design.
- *What is hot and what is cold?* Rarely clear-cut; fields used in some modes and not others blur the line. Risk of endless fiddling.

**When to use.** A measured performance problem in code that touches a lot of data, confirmed by a cache-aware profiler. **When not.** Infrequently run code; anywhere the loss of abstraction, interfaces, and inheritance costs more than the speed gained. The chapter calls it a mindset more than a recipe.

**Related patterns.** Component (slices entities into per-domain arrays), Object Pool (contiguous arrays of homogeneous objects with reuse), Update Method, Type Object (flexibility without subclassing), Flyweight (pointer chasing caveat).

**Unreal form.** Mass Entity (MassEntity, MassGameplay) is the engine's data-oriented framework: entities are IDs, fragments are plain structs stored in chunks per archetype, processors iterate chunks in bulk, and the engine handles chunk packing. Niagara CPU and GPU simulations, Chaos particle data, ISM instance buffers, `TChunkedArray`, `TSparseArray`, and SoA-friendly `TArray<FStruct>` patterns are the raw tools. Unreal Insights and the memory and CPU profilers (plus platform tools) answer "is it cache misses." What a UE programmer still writes by hand: lightweight simulations as struct arrays managed by a single actor or subsystem instead of thousands of actors, packed active-first arrays, hot/cold splits of per-agent data, and stable handle schemes when structs move.

**Original Unreal use cases.**

1. *Crowd agents as struct arrays.* 20,000 festival-goers simulated as `FAgentHot` (position, velocity, goal) in one array and `FAgentCold` (name, outfit, schedule) in another, drawn with ISM. The pattern buys a 60 Hz update that an actor-per-agent approach cannot. The learner writes the hot loop, the cold split, and a handle table. A test asserts hot struct size stays under a chosen byte budget (a `static_assert`), and a benchmark test asserts the step over 20,000 agents completes under a time budget on the CI machine.
2. *Active-first packing.* A spark emitter where expired sparks are swapped to the inactive tail. A test asserts that after random activations and expirations, every index below `NumActive` is alive and every index at or above it is dead.
3. *Pointer chase lab.* The learner measures the same particle update implemented as `TArray<FParticle*>` versus `TArray<FParticle>` and reports the ratio. A test asserts both implementations produce identical results, and the benchmark records timings.
4. *Separate arrays per type.* Three projectile kinds (straight, homing, arcing) stored in three typed arrays with static dispatch instead of one array of base pointers. A test asserts each array's update touches only its kind and that totals match a reference implementation.
5. *Mass introduction.* The same crowd expressed as a Mass fragment and processor, to show the engine's form of the pattern. A test asserts the processor moves every entity with the movement fragment by velocity times delta.

**Common learner mistakes in Unreal.** Optimizing locality before profiling. Keeping `UObject` pointers in hot arrays (each is a cache miss and a GC concern). Using `TMap` lookups inside inner loops. Sorting a whole array every frame instead of swap-packing on change. Splitting hot and cold by guess and making the code unreadable for no measured gain. Reaching for Mass for a system with fifty entities.

**Recall questions.**

1. Q: Why does an array of pointers to objects perform worse than an array of objects in a tight loop? A: Each pointer dereference can be a cache miss; contiguous values stream through the cache line by line.
2. Q: What is hot/cold splitting? A: Moving rarely used fields out of the frequently iterated struct so more hot records fit per cache line.
3. Q: What does the active-first packing trick give you besides skipping dead objects? A: No per-object active flag, no branch misprediction from checking it, and smaller records.

**Scenario questions.**

1. *Scenario:* A profiler shows your 30,000-unit battle spends most of its time stalled on memory in the unit update loop. *Answer:* Data Locality (struct arrays, packing, hot/cold split, or Mass). *Distractor:* Object Pool fixes allocation churn, not scattered memory reads during update.
2. *Scenario:* An ability system with twenty abilities runs a little slowly, and someone suggests rewriting it data-oriented. *Answer:* Not Data Locality yet; profile first, twenty objects is not a locality problem. *Distractor:* Data Locality is the trendy answer, but the chapter's first rule is a measured cache-miss problem.

### 2.17 Dirty Flag

**Intent.** Avoid redundant work by marking derived data as out of date when its inputs change and recomputing it only when it is actually needed.

**Problem it solves.** In a scene hierarchy, an object's world transform is the product of its ancestors' local transforms. Recomputing every world transform every frame wastes time on static geometry. Caching helps, but recomputing eagerly whenever any local transform changes recomputes a deep child once per ancestor that moved in the same frame (the parrot on the pirate on the mast on the ship: four moves, ten recalculations). Deferring the recalculation until render time, and doing it once, is the pattern.

**How it works.** Primary data changes freely. A derived value is cached beside a flag that says whether the cache is stale. Any change to the primary data sets the flag. When the derived value is requested, if the flag is set, recompute and clear it; otherwise return the cache. For hierarchies, the chapter avoids recursively dirtying children on every change by passing a "parent was dirty" boolean down during the render traversal and OR-ing it with each node's own flag, so each node recalculates at most once per frame and only if something above it moved. This only works because rendering is the only consumer that needs the up-to-date world transform. Dirty flags also apply to synchronization (unsaved document, data to send to a server), not just calculation.

```cpp
// Original sketch: cached derived value with a dirty flag, non-hierarchical.
class FInventoryStats
{
public:
    void AddItem(const FItem& I) { Items.Add(I); bDirty = true; }
    void RemoveItem(int32 Index) { Items.RemoveAt(Index); bDirty = true; }
    float TotalWeight() const
    {
        if (bDirty) { CachedWeight = 0.f; for (const FItem& I : Items) CachedWeight += I.Weight; bDirty = false; }
        return CachedWeight;
    }
private:
    TArray<FItem> Items; mutable float CachedWeight = 0.f; mutable bool bDirty = true;
};
// Note: the chapter says a running total is simpler when incremental updates are easy; use the flag when they are not.
```

**Design decisions as questions.**

- *When is the flag cleaned?* On demand when the result is needed (never computes unused results; may cause a visible pause if the work is large). At fixed checkpoints (loading screens, docking at port; the work hides behind a natural pause, but you cannot guarantee the player reaches the checkpoint). In the background on a timer (tunable frequency; may redo work on mostly unchanged data; needs concurrency support and care with concurrent modification).
- *How fine-grained is the tracking?* Fine (only changed pieces are processed; more flags, more fixed overhead per piece). Coarse (one bit per large chunk; processes unchanged data; less memory for flags, less per-chunk overhead).
- *Propagate dirtiness down the hierarchy eagerly, or carry it during traversal?* Eager recursion is simple but slow; carrying a parent-dirty flag during the single traversal is cheap but only works when one traversal is the sole consumer.

**When to use.** Derived data that is expensive to produce from primary data that changes more often than the derived data is read, and when incremental updates (a running total) are not practical. The author notes you can find this pattern by searching a codebase for the word "dirty". **When not.** When a running total or incremental update is simpler; when deferring risks losing work (unsaved state on a crash) or causing a pause at the worst moment; when memory for the cached result is scarcer than time. Keep in mind the central risk: every path that modifies primary data must set the flag, so funnel modifications through a narrow API.

**Related patterns.** Data Locality (branch cost of the flag check), Object Pool, Update Method, Double Buffer (what it does not do), Observer (a change notification can set flags).

**Unreal form.** The engine uses dirty flags everywhere: `USceneComponent` caches world transforms and marks them dirty on local changes, with `UpdateComponentToWorld` and `bComponentToWorldUpdated`; `MarkRenderStateDirty`, `MarkRenderTransformDirty`, and `MarkRenderDynamicDataDirty` tell the render thread what to resend; Slate's `Invalidate` and `SInvalidationPanel` are UI dirty flags; `UPackage::IsDirty` is the unsaved-asset flag; replication uses `MARK_PROPERTY_DIRTY` with push model; navigation mesh rebuilds use dirty areas; UMG widgets rebuild layout on invalidation. What a UE programmer still writes by hand: gameplay-level caches (derived stats, inventory totals, visibility sets, AI influence maps) with explicit dirty bits, hierarchical flags for custom tree structures, and the discipline of a narrow mutation API.

**Original Unreal use cases.**

1. *Derived character stats.* A stats component where final attack and defense derive from base stats, equipment, and buffs; any change marks the cache dirty and the next query recomputes. The pattern buys recomputation once per frame at most, no matter how many buffs change. The learner builds the component with a narrow mutation API. A test asserts that ten buff changes followed by one query trigger exactly one recompute (counted) and that a query with no changes triggers none.
2. *Hierarchical attach rig with a custom tree.* A modular turret (base, arm, barrel, muzzle) stored as a custom node tree, not scene components, with world transforms resolved once per render pass using the carried parent-dirty flag. A test asserts moving the base then the arm in one frame recalculates each node once and that an untouched turret performs zero recalculations.
3. *Fog of war revealed set.* A visibility grid where unit moves mark cells dirty and the texture upload happens once per frame only for dirty rows (coarse granularity). A test asserts that moving one unit uploads only its rows and that no movement uploads nothing.
4. *Autosave timer.* A settlement game where the save file is the derived data, marked dirty by edits and written on a background timer. A test asserts that edits set the flag, the timer write clears it, and no write happens when nothing changed.
5. *Missed-flag bug hunt.* A provided stats component with one mutation path that forgets to set the flag; the learner finds it and fixes it by routing all mutation through one method. A test that previously failed on stale data passes.

**Common learner mistakes in Unreal.** Mutating fields directly from multiple places and missing a flag. Recomputing eagerly in every setter, which is the problem the pattern exists to fix. Setting the dirty flag but never clearing it (constant recomputes). Marking render state dirty every tick for a component that did not change. Using a dirty flag for a value that is trivially maintained incrementally. Reading a dirty-cached value from another thread while the game thread recomputes it.

**Recall questions.**

1. Q: What are the three pieces of the pattern? A: Primary data, derived data computed by an expensive process, and a flag set when the primary changes and cleared when the derived data is recomputed.
2. Q: Why not recompute immediately whenever the primary data changes? A: Several changes in one frame would recompute the derived data several times when only the last result is used.
3. Q: What is the main engineering risk of this pattern? A: Forgetting to set the flag on one of the modification paths, which leaves stale derived data.

**Scenario questions.**

1. *Scenario:* A weapon's final damage depends on twelve modifiers that change often, but damage is only read when the weapon fires. *Answer:* Dirty Flag on the computed damage. *Distractor:* Observer could notify on every modifier change, but recomputing on each notification is the eager waste the pattern avoids.
2. *Scenario:* An inventory needs the total item count, and items are added and removed one at a time. *Answer:* Not Dirty Flag; keep a running count. *Distractor:* Dirty Flag works, but the chapter says incremental updates win when they are easy.

### 2.18 Object Pool

**Intent.** Reuse objects from a pre-allocated fixed collection instead of allocating and freeing them one at a time.

**Problem it solves.** A spell that spawns hundreds of particles needs fast creation, and on consoles and mobile, repeated allocation and freeing fragments the heap: total free memory stays large while the largest contiguous block shrinks until an allocation fails. Console certification "soak tests" (running for days) fail on exactly this. Grabbing memory once at startup and never freeing it avoids fragmentation but does not let you create and destroy things during play. A pool does both: one allocation up front, free reuse inside it.

**How it works.** A pool holds an array of objects, each with an "in use" query. All start unused. Creating an object means finding an unused one, initializing it, and handing it back; destroying means marking it unused. The naive search is linear. A free list fixes that: when an object is unused, most of its fields are meaningless, so a union stores either the live state or a pointer to the next free object. The pool keeps a head pointer; creation pops the head in constant time; death pushes back onto the list.

```cpp
// Original sketch: pool with an index-based free list (no unions needed).
template <typename T, int32 Capacity>
class TSlotPool
{
public:
    TSlotPool() { for (int32 i = 0; i < Capacity; ++i) NextFree[i] = i + 1; NextFree[Capacity - 1] = INDEX_NONE; }
    int32 Acquire()
    {
        if (Head == INDEX_NONE) return INDEX_NONE;          // full: caller chooses a policy
        const int32 Slot = Head; Head = NextFree[Slot]; Live[Slot] = true; Items[Slot] = T{}; return Slot;
    }
    void Release(int32 Slot) { check(Live[Slot]); Live[Slot] = false; NextFree[Slot] = Head; Head = Slot; }
    T& operator[](int32 Slot) { return Items[Slot]; }
private:
    T Items[Capacity]; int32 NextFree[Capacity]; bool Live[Capacity] = {}; int32 Head = 0;
};
```

**Design decisions as questions.**

- *Are objects coupled to the pool?* Coupled: simpler; the object can expose "in use" itself, perhaps derived from existing state (frames left, off screen), and you can restrict construction to the pool via friendship. Not coupled: any type can be pooled by a generic pool, and "in use" must be tracked outside (a parallel bit array).
- *Who reinitializes reused objects?* The pool (fully encapsulates objects; but the pool must forward every initializer variant). Outside code (pool just returns a reference; simpler pool; callers must handle a null return when the pool is full).
- *What happens when the pool is full?* Prevent it by sizing (common for important objects; wastes memory for rare peaks; sizes may vary per level). Do not create the object (fine for particles nobody will miss). Forcibly recycle a live one (pick the quietest sound, the oldest particle; right when a disappearance is less noticeable than an absence). Grow or add an overflow pool (consider shrinking back later).
- *What size are the slots?* Uniform objects are easy. Mixed sizes mean sizing slots for the largest (waste) or splitting into pools by size class.

**When to use.** Frequent creation and destruction of similar-sized objects; allocation is slow or fragmenting; objects wrap expensive resources (connections). Used for particles, projectiles, sounds, entities. **When not.** Few objects, or objects of wildly varying size. Keep in mind: the pool can waste memory on unneeded slots; only a fixed number can be live at once; reused objects are not cleared (stale fields from a previous life look almost right, so fully initialize; consider a debug fill); unused objects stay in memory and, in garbage-collected settings, keep what they reference alive unless you clear references on release.

**Related patterns.** Flyweight (shares simultaneously; pools reuse over time), Data Locality (packed homogeneous array), Event Queue and Observer (pools as backing storage), Type Object (factory on the type routes to a pool), State (pooled state objects).

**Unreal form.** Unreal's garbage collector and `NewObject` are not fragmentation-prone the way raw `new` is, but actor spawning is expensive (construction, registration, BeginPlay, replication), so pooling actors is a standard optimization. The engine gives pieces: Niagara pools particle systems (`UNiagaraComponentPool`), audio pools components, `UGameplayStatics::SpawnEmitterAtLocation` uses pooling methods, `TSparseArray` and `TChunkedArray` give stable-slot storage with free lists, `FMemStack` and `TMemStackAllocator` give frame allocators, and Lyra ships a projectile pooling example. What a UE programmer still writes by hand: an actor pool subsystem with a reset protocol (hide, disable tick and collision, detach, reset state) and a per-class capacity, a struct pool with a free list for non-actor objects, overflow policies, and the "fully reinitialize on reuse" discipline.

**Original Unreal use cases.**

1. *Projectile actor pool.* A `UProjectilePoolSubsystem` that pre-spawns N projectiles per class, hands them out with a reset call, and takes them back on hit or timeout. The pattern buys no spawn hitches during a firefight. The learner builds the subsystem, the `IPoolable` reset interface, and the overflow policy (recycle the oldest). A test asserts acquiring N plus one recycles the oldest live projectile, that a released projectile is hidden and non-colliding, and that reacquiring one does not carry over its previous velocity.
2. *Damage popup widget pool.* Pooled UMG widgets for floating numbers with a "do not create when full" policy. A test asserts the widget count never exceeds capacity under a burst of 500 requests.
3. *Sound cue pool with quietest-recycle.* A pool of audio components where a full pool recycles the quietest playing one. A test asserts the recycled component is the one with the lowest volume.
4. *Stale state bug lab.* A pooled enemy that keeps its previous "stunned" timer because reset forgot a field; the learner finds it by adding a debug fill on release. A test asserts a reacquired enemy has default state in every field (compared against a freshly constructed one).
5. *Size-class pools.* Pooled debris chunks in three size classes instead of one pool sized for the largest. A test asserts memory reserved equals the sum of per-class capacities times sizes, not the largest size times total capacity.

**Common learner mistakes in Unreal.** Pooling actors but forgetting to disable tick, collision, and replication while pooled. Calling `Destroy()` on a pooled actor by accident. Not resetting every field on reuse. Keeping strong references from pooled objects to world actors, extending their lifetime. Growing the pool without bound, which reintroduces the allocation cost. Using a pool for objects that are created a few times per level.

**Recall questions.**

1. Q: What problem besides allocation speed does a pool solve on constrained platforms? A: Heap fragmentation, where free memory exists but no contiguous block is large enough.
2. Q: How does a free list make acquisition constant time without extra memory? A: Unused slots store a link to the next free slot in the space their live data would occupy, and the pool keeps a head pointer.
3. Q: Why are reused objects dangerous? A: They still hold their previous state, so forgetting to initialize a field yields plausible but wrong data.

**Scenario questions.**

1. *Scenario:* A shotgun spawns twelve pellet actors per shot and the frame hitches on each shot. *Answer:* Object Pool. *Distractor:* Flyweight would share the pellet mesh but does not remove the per-shot spawn cost.
2. *Scenario:* A level has one boss that is spawned once. *Answer:* Not a pool; spawn it directly. *Distractor:* "Everything should be pooled" is a common overgeneralization; pools cost memory and complexity.

### 2.19 Spatial Partition

**Intent.** Find objects near a location quickly by storing them in a data structure organized by position.

**Problem it solves.** Game worlds have space, and many systems ask "what is near here": combat, audio attenuation, chat range, collision. Checking every pair of units is quadratic; with hundreds of units per army it collapses. On a one-dimensional battle line you would sort by position and binary search. Spatial partitioning extends that idea to two and three dimensions.

**How it works.** The chapter implements the simplest partition, a fixed grid: overlay cells on the field; each cell holds the units inside it (as an intrusive doubly linked list so insert and remove are constant time). Combat only compares units within the same cell, which collapses the pairwise cost to a per-cell cost. When a unit moves, compute the old and new cell; if they differ, unlink from the old cell's list and add to the new one. For ranged interactions, also compare against neighboring cells, but only half of the eight neighbors so each pair is tested once; if attack range exceeds a cell, scan further out. Hierarchical structures (quadtrees, octrees, BSPs, k-d trees, bounding volume hierarchies) subdivide adaptively.

```cpp
// Original sketch: fixed grid of index buckets with move support.
struct FGridIndex
{
    float CellSize; int32 Cols, Rows; TArray<TArray<int32>> Buckets;   // bucket per cell, holds unit ids
    int32 CellOf(FVector2D P) const { return FMath::Clamp(int32(P.Y / CellSize), 0, Rows - 1) * Cols + FMath::Clamp(int32(P.X / CellSize), 0, Cols - 1); }
    void Insert(int32 Id, FVector2D P) { Buckets[CellOf(P)].Add(Id); }
    void Move(int32 Id, FVector2D From, FVector2D To)
    {
        const int32 A = CellOf(From), B = CellOf(To);
        if (A != B) { Buckets[A].RemoveSingleSwap(Id); Buckets[B].Add(Id); }
    }
    template <typename F> void ForEachNear(FVector2D P, F&& Fn) const { /* visit CellOf(P) and its eight neighbors */ }
};
```

**Design decisions as questions.**

- *Flat or hierarchical?* Flat grid: simpler, constant memory, fast updates when objects move. Hierarchical: handles empty space (no cells to walk) and dense clumps (keeps subdividing) better.
- *Does the partition depend on the set of objects?* Object-independent (grid): incremental adds, fast moves, but can become imbalanced when objects clump. Object-dependent (BSP, k-d tree, bounding volume hierarchy): balanced and consistent query times, best built all at once, so suited to static geometry. Quadtrees and octrees sit between: fixed split boundaries but subdivision that adapts to population, so adds and moves are cheap and bounded and partitions stay balanced.
- *Are objects stored only in the partition?* Only there: no duplicate collections to keep in sync. Also in a flat list: walking all objects is fast when many cells are empty; two structures to synchronize on create and destroy.
- *How big are cells relative to interaction range?* Range larger than a cell means scanning more rings of neighbors; cells too small make the outer loop over cells dominate.

**When to use.** Many objects with positions and enough location queries that performance suffers; both moving entities and static geometry; sophisticated games keep several partitions for different content. **When not.** Small object counts (not worth the bother). Keep in mind: moving objects must be re-filed (like a hash table whose keys change spontaneously), which costs code and cycles; the structure uses extra memory, trading memory for speed.

**Related patterns.** Grids relate to bucket sort, BSPs and k-d trees and BVHs to binary search trees, quadtrees and octrees to tries. Object Pool and Data Locality for the storage; Update Method for the per-frame re-filing.

**Unreal form.** The engine partitions space for you in most places: Chaos physics broadphase (acceleration structures for overlaps, sweeps, and traces), the navigation mesh tiles, World Partition's streaming grid and HLOD, the scene's octree for rendering and culling (`FScenePrimitiveOctree`), `TOctree2` as a reusable template, the Niagara and audio spatial queries, `UEnvQuery` and `UAISense` ranges, and `FSphereOverlap` style queries through `UWorld::OverlapMultiByChannel`. What a UE programmer still writes by hand: gameplay grids for things physics does not know about (influence maps, tactical cover scoring, crowd neighbor finds, tile-based logic, flock neighbors), choosing cell size versus interaction range, re-filing on move, and deciding whether a flat grid or `TOctree2` fits.

**Original Unreal use cases.**

1. *Flock neighbor grid.* 5,000 fish stored in a uniform grid keyed by cell, with neighbor queries over the 3x3 (or 3x3x3) cells for separation and alignment. The pattern buys a neighbor find that is linear in local density instead of quadratic. The learner builds the grid, the move re-file, and the query. A test asserts that a query returns exactly the set that a brute-force distance check returns for random positions, and that moving a fish across a cell boundary re-files it.
2. *Influence map for AI.* A tactical grid where units add influence to nearby cells and AI queries the safest cell within range. A test asserts influence falloff values at known cells and that removing a unit clears its contribution.
3. *Pair test de-duplication.* A melee resolution over grid cells that checks only four of eight neighbors. A test asserts each pair is resolved exactly once per frame, counting resolutions against the expected pair count.
4. *Octree for static pickups.* 50,000 static collectibles inserted into `TOctree2` once; the player's pickup radius queries it each tick. A test asserts the query result equals brute force for sampled positions and that the octree handles an empty quadrant without visiting leaf nodes (node visit count below a threshold).
5. *Cell size tuning lab.* The learner measures query time and re-file count across cell sizes relative to interaction range and records the knee. A test asserts correctness is unchanged across sizes.

**Common learner mistakes in Unreal.** Writing a grid when a physics overlap query already does the job. Forgetting to re-file objects when they move (objects "disappear" to queries). Comparing all eight neighbors and double-resolving pairs. Choosing cells smaller than the interaction range and scanning only one ring. Rebuilding the whole structure every frame for moving objects instead of incremental updates. Storing `AActor*` in buckets without removing on destroy.

**Recall questions.**

1. Q: What is the one-dimensional intuition behind spatial partitioning? A: Sorting by position and binary searching instead of scanning everything.
2. Q: Why check only half of the neighboring cells for pairwise interactions? A: So each pair is tested once; checking all eight would find each pair twice.
3. Q: What distinguishes a quadtree from a fixed grid and from a k-d tree? A: Its split boundaries are fixed like a grid, but it subdivides only where objects are dense, adapting to population without moving boundaries like a k-d tree.

**Scenario questions.**

1. *Scenario:* Ten thousand zombies need to find their nearest neighbor each frame to avoid overlapping. *Answer:* Spatial Partition (uniform grid). *Distractor:* Data Locality speeds up iterating all zombies but does not reduce the number of pairs compared.
2. *Scenario:* A static dungeon's 200 traps should trigger when the player is within two meters. *Answer:* Probably no custom partition; use a physics overlap or sphere trigger. If written by hand, a grid or octree. *Distractor:* Object Pool is unrelated to finding things by position.

---

## Part 3. Teaching order

Principles behind the order: start where the engine already does the work so the learner can feel the pattern before building it; teach dependencies before dependents; cluster patterns that are the same shape with different intent (Flyweight, Type Object, State, Strategy-like Component) so the learner builds a mental model of delegation; defer the optimization patterns until the learner can profile and has a reason; put the two "mostly about restraint" chapters (Singleton, Service Locator) together once the learner has felt the pull of a global.

**Phase 0. Lens (lesson zero).** The architecture, performance, and games chapter: change is the measure of architecture, decoupling versus speculative abstraction, the three speeds, simplicity, prototypes that stay prototypes. Every later pattern's "when not" section refers back to this.

**Phase 1. Time (the engine's heartbeat).** 1. Game Loop (the engine owns it; learn tick groups, delta time, fixed-step accumulators). 2. Update Method (tick on actors and components; dormancy; modify-during-iteration). 3. Double Buffer (order-independent simulation; the frame-behind render thread). These three are a unit; everything else runs inside them, and learners feel the benefit immediately because their first bugs are tick-order and delta-time bugs.

**Phase 2. Decoupling communication.** 4. Observer (delegates are ready-made; the first big payoff in clean code; also teaches unsubscription and lifetime). 5. Command (reified actions; undo; input remap; feeds Event Queue and State). 6. Event Queue (Observer plus time; ring buffer; requires Phase 1 to know where to drain). Teach Event Queue right after Observer so the "same but deferred" contrast is sharp.

**Phase 3. Behavior and modes.** 7. State (FSMs; needs Update Method for per-state ticks and Command for inputs; concurrent, hierarchical, pushdown). 8. Subclass Sandbox (shallow-wide hierarchies; GAS is this; needs Service Locator or injected state, so preview that question). 9. Component (actor and component model; communication paths reuse Observer and shared state; the entity-as-ID variant previews Data Locality). Component after State so learners see state machines living inside components rather than inside a monolith.

**Phase 4. Data-driven kinds.** 10. Type Object (Data Assets; data inheritance; factories). 11. Flyweight (same shape, memory intent; ISM; immutable sharing). 12. Prototype (CDOs, templates, data delegation; contrast with Type Object). Teach these as a trio about "where does the kind live," ending with Prototype because the author's own verdict is that it rarely wins in its classic form. 13. Bytecode last in this phase: it is the most complex pattern, builds on Type Object's "behavior is the hard part," and Blueprint gives the learner a working example to inspect.

**Phase 5. Access and restraint.** 14. Singleton (why not; subsystems; the manager smell). 15. Service Locator (interface plus provider plus null object; subsystems with pluggable providers; scope). Placed after the learner has built enough systems to feel the temptation of globals, and after Subclass Sandbox raised the "how does the base get its state" question.

**Phase 6. Performance (only with a profiler in hand).** 16. Object Pool (actor spawn cost; reset discipline; feeds Event Queue storage and Data Locality arrays). 17. Dirty Flag (small and sharp; needs a clear mutation API; builds on the transform hierarchy the learner knows from scene components). 18. Spatial Partition (grids first, octree second; needs Update Method for re-filing). 19. Data Locality (struct arrays, packing, hot/cold, Mass; the capstone because it asks the learner to trade away abstractions they just learned to love, and the author's first rule is to measure).

Dependencies worth encoding as prerequisites in the app: Update Method requires Game Loop; Event Queue requires Observer and Game Loop; State requires Update Method and Command; Component requires Update Method and Observer; Service Locator requires Singleton and Subclass Sandbox; Object Pool requires Update Method; Data Locality requires Component and Object Pool; Spatial Partition requires Update Method; Bytecode requires Type Object and Command.

---

## Part 4. Cross-pattern combos for boss quests

1. **Undo-able base builder.** Command plus Object Pool plus Dirty Flag. A settlement builder where placing, rotating, and removing structures are pooled command objects with undo, and the settlement's derived stats (power, housing, happiness) are dirty-flagged caches recomputed once per frame after any batch of commands. Boss test: fifty random commands followed by fifty undos restore the exact initial grid and stats, with one recompute per frame and zero command allocations after warm-up.

2. **Stealth sense system.** Spatial Partition plus Event Queue plus State. Guards keep a grid of noise and sight sources; perception events are queued into per-guard mailboxes with snapshots of position and loudness; each guard's brain is a pushdown state machine (patrol, investigate pushed on top, alert, return). Boss test: a noise at a known cell reaches only guards within range, a guard interrupted during investigation pops back to the exact patrol state, and no event references a destroyed source.

3. **Bullet-hell core.** Object Pool plus Data Locality plus Flyweight plus Update Method. 20,000 projectiles live in packed struct arrays, drawn through instanced meshes per projectile kind, acquired from a free-list pool and ticked by one manager with deferred removal. Boss test: a sustained 20,000-projectile scene stays within a frame budget on the CI machine, the live count always equals the ISM instance count, and expired projectiles never move.

4. **Moddable spell workshop.** Bytecode plus Type Object plus Subclass Sandbox. Spell kinds are Data Assets holding bytecode programs; the VM's external instructions are the provided operations of a spell-casting sandbox base (apply effect, spawn burst, play cue) so mod scripts can only touch the safe surface. Boss test: a hand-crafted malicious program (stack overflow, unknown op, runaway loop) is rejected or halted, and a valid "drain half the target's mana into my health" program produces the expected stats.

5. **Modular interactables.** Component plus Observer plus Command. World objects are assembled from components (lock, health, loot, interact); interactions arrive as commands (so a scripted sequence can drive them), and components coordinate through delegates (lock opened triggers loot available). Boss test: a crate, a chest, and a lever built from the same components behave differently with no subclasses; a scripted command stream opens the chest only after the lever command.

6. **Replay and ghost racer.** Command plus Game Loop plus Double Buffer. Input commands are recorded per fixed simulation step; a ghost replays them through the same fixed-step loop; render interpolation reads a double-buffered snapshot of simulation transforms. Boss test: replaying a recording produces the same final transform regardless of render frame rate (simulated at 30 and 144), and no render frame reads a half-written snapshot (sequence-number check).

7. **Living economy board.** Type Object plus Dirty Flag plus Service Locator. Goods and buildings are Data Asset kinds with data inheritance; market prices are dirty-flagged derived values from supply and demand edits; the pricing model is a located service with real, flat, and recording providers so tests and balancing tools can swap it. Boss test: changing the parent "grain" kind's base price changes child kinds that inherit it, a day of edits triggers one price recompute at the day boundary, and the recording provider logs every price query in order.

8. **Crowd festival.** Data Locality plus Spatial Partition plus Double Buffer plus Flyweight. Thousands of festival-goers as hot/cold struct arrays, neighbors found through a uniform grid, steering computed from a read-only current buffer into a next buffer so order does not matter, drawn with instanced meshes grouped by outfit kind. Boss test: shuffling agent order produces identical positions after a step, neighbor queries match brute force on samples, and the hot struct stays under a byte budget.

9. **Ability kit with cooldown UI.** Subclass Sandbox plus State plus Observer plus Object Pool. Abilities are sandboxed subclasses; each ability instance runs a small state machine (ready, casting, active, cooldown) that broadcasts transitions through delegates; the UI binds to those delegates; visual effects for abilities are pooled. Boss test: a cancelled cast returns to ready without triggering cooldown, the UI reflects every transition in order, and a burst of casts never allocates effect actors after warm-up.

10. **Audio director.** Event Queue plus Service Locator plus Flyweight plus Dirty Flag. Game systems push sound requests into a ring buffer; a located audio service (real, null, logged) drains it once per frame, aggregating duplicates and recycling the quietest voice when full; sound definitions are shared immutable assets; the listener's reverb settings are a dirty-flagged derived value recomputed only when the player changes zone. Boss test: ten identical requests in one frame produce one playback at the loudest volume, the null provider absorbs everything in automation, and crossing zones recomputes reverb exactly once.
