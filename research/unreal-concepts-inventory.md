# Unreal Engine 5 C++ Concept Inventory for Unreal Dojo

Source studied: Zhenyu George Li, *Unreal Engine 5 Game Development with C++ Scripting* (Packt, August 2023, ISBN 978-1-80461-393-1; foreword by Dr. E. Wyn Roberts), 384-page PDF edition. The Unreal chapters (1, 4 to 12) were read in full; the general C++ chapters (2 and 3) were skimmed for the idioms later chapters rely on. Everything below is written in our own words. No sentences or code listings from the book are reproduced; the short code fragments here are original examples.

Companion file: `research/glossary-seed.json` (191 entries). The `Glossary id` column below links each concept to its seed entry.

How to use this file:
- Part 1 is the book map, the order the book introduces Unreal ideas, what it leaves out, and where it is outdated or wrong (useful for spot-the-bug items).
- Part 2 is the concept inventory, grouped by category. Every row says what the thing is, where it appears in a real project, which chapter teaches it, and an official Epic docs link. Rows marked `S` in the chapter column are supplemental: the book does not teach them, but Unreal Dojo needs them.
- Part 3 maps the inventory onto Pack 1 worlds and the Mechanics Lab.
- Part 4 lists ten common beginner mistakes with the fix.

Categories used: the seventeen requested (object model, reflection, memory, containers, strings, framework, components, input, collision, physics, animation, UI, AI, networking, editor workflow, build, debugging) plus two extra ones, `math` and `cpp idiom`, because vector math types and C++ habits such as forward declarations did not fit any of the seventeen without being misleading. Merge them back if the Codex filter needs exactly seventeen.

All Epic links were found through web search on dev.epicgames.com during this study: 157 distinct URLs in this file, 126 in the glossary seed, 166 across both. Where no page exists for a specific item, the link goes to the closest official page, and that is noted in the definition.

---

## Part 1. Book map

### 1.1 Structure and page ranges

Printed page numbers come from the book's table of contents. PDF page = printed page + 21.

| Part | Ch | Title | Printed pages | PDF pages | Summary (our words) | Read depth |
|---|---|---|---|---|---|---|
| Front matter | | Foreword, contributors, contents, preface | i to xix | 1 to 23 | Who the book is for (people who already know the editor and some Blueprint), software used (UE 5.0 and up, Visual Studio 2022), code repository location. | skimmed |
| 1. Getting Started | 1 | Creating Your First Unreal C++ Game | 3 to 20 | 24 to 41 | Why and when to use C++ next to Blueprint, installing Visual Studio with the right workloads, making a C++ project from the First Person template, and turning a Blueprint-only project into a C++ one by adding a class. | full |
| | 2 | Editing C++ Code in Visual Studio | 21 to 42 | 42 to 63 | A tour of the IDE (Solution Explorer, Output, Error List, IntelliSense, hotkeys) and a small console calculator to practice editing and building. | skimmed (general C++) |
| | 3 | Learning C++ and Object-Oriented Programming | 43 to 88 | 64 to 109 | Plain C++: program structure, types, variables, arrays, operators, input, flow control, references, pointers, classes, constructors, getters, inheritance. | skimmed (general C++) |
| | 4 | Investigating the Shooter Game's Generated Project and C++ Code | 89 to 114 | 110 to 135 | A guided reading of the First Person template's generated code: project layout, game loop and actor lifecycle, a character header line by line, projectile, pickup and weapon components, the module file, the game mode, Build.cs and Target.cs, build configurations, and running the editor from the IDE. | full |
| 2. C++ Scripting for Unreal | 5 | Learning How to Use UE Gameplay Framework Base Classes | 117 to 147 | 138 to 168 | Starts the Pangaea top-down project. Framework class hierarchy, Actor vs Pawn vs Character, the New C++ Class flow, recompiling, UPROPERTY and UFUNCTION syntax and specifiers, adding components in a constructor, making Blueprints from C++ classes, the roles of PlayerController, GameModeBase, GameState and GameInstance, and Cast. | full |
| | 6 | Creating Game Actors | 149 to 177 | 170 to 198 | Builds the player character: spring arm and top-down camera, movement settings, importing a skeletal mesh and animations, swapping the default pawn in the game mode, a C++ anim instance with a state enum, an animation blueprint with a blend space and state machine, and feeding speed from Tick. | full |
| | 7 | Controlling Characters | 179 to 204 | 200 to 225 | Player attack input through the player controller, animation notifies to end one-shot animations, destroying actors and garbage collection, an enemy character with pawn sensing, a C++ AI controller that chases and decides to attack, and nav mesh setup. | full |
| | 8 | Handling Collisions | 205 to 237 | 226 to 258 | Collision shapes, overlap vs hit events at actor and component level, collision presets and the response matrix, sockets and weapon attach and drop, spawning a weapon for enemies, a tower that detects and fires at the player, projectile motion and line traces for hits. | full |
| | 9 | Improving C++ Code Quality | 239 to 269 | 260 to 290 | Refactoring duplicate player and enemy code into a shared parent, merging anim instance classes and reparenting Blueprints, caching pointers, an object pool for fireballs, logging and on-screen messages, Cast vs IsA. | full |
| 3. Complete Multiplayer Game | 10 | Making Pangaea a Network Multiplayer Game | 273 to 294 | 294 to 315 | Single, local and network multiplayer, testing two players in the editor, net modes, server and multicast RPCs, property replication, RepNotify with a UMG health bar, server authority for hits, server-side spawning. | full |
| | 11 | Controlling the Game Flow | 295 to 326 | 316 to 347 | Lobby, HUD and game-over widgets, host, join and leave functions on the game instance using OpenLevel, showing widgets from Level Blueprints, a replicated countdown on the game state that reaches Blueprint through a dynamic multicast delegate, and a win condition. | full |
| | 12 | Polishing and Packaging the Game | 327 to 348 | 348 to 369 | Polish through better assets, bug fixing, profiling tools, console commands (typed and from C++), project settings for packaging, replacing hardcoded asset paths with class properties, packaging a Windows build. | full |
| Back matter | | Index, other books | 349 to 363 | 370 to 384 | Index and publisher pages. | skimmed |

The book uses two projects. MyShooter is the First Person template, used only to read generated code in Chapter 4. Pangaea is a top-down co-op arena game (hero, enemies, defense towers, fireballs, weapons, lobby, timer, win condition) built from Chapter 5 to the end. Code is on the publisher's GitHub, per chapter.

### 1.2 The order the book introduces Unreal concepts

This is the book's proven sequence, reduced to the Unreal ideas (plain C++ omitted). Each step builds on the one before it.

1. **Why C++ at all** (Ch1). C++ and Blueprint are partners; C++ for performance, complex logic and core systems, Blueprint for quick, editable content. Creating a C++ project; converting a Blueprint project by adding one C++ class.
2. **Project anatomy** (Ch4). Source folder, Config ini files, the `.uproject`, the module folder with Build.cs and Target.cs files, the IDE solution with Engine and Games.
3. **Game loop and actor lifecycle** (Ch4). Initialize, loop, end; OnConstruction, BeginPlay, Tick, EndPlay and their Blueprint twins.
4. **Anatomy of a reflected class header** (Ch4). Forward declarations, a delegate type declared above the class, UCLASS with a specifier, A and U prefixes, GENERATED_BODY first, UPROPERTY specifiers, constructor, virtual overrides, access sections, getters.
5. **Components made in the constructor** (Ch4, Ch5). CreateDefaultSubobject, root and attachment, capsule size, camera, mesh.
6. **Reading generated gameplay code** (Ch4). Input binding in SetupPlayerInputComponent, a Blueprint child of a C++ character, projectile (sphere, projectile movement, hit UFUNCTION, lifespan), pickup (overlap delegate, Cast), weapon (SpawnActor, play sound, play montage, bind and unbind a delegate), the primary game module macro, the game mode.
7. **Build configurations and IDE debugging** (Ch4).
8. **Gameplay framework hierarchy** (Ch5). UObject at the root; actors split into pawns, info actors and controllers; components; the game instance.
9. **Actor vs Pawn vs Character** (Ch5) and the New C++ Class wizard.
10. **Recompiling and regenerating project files** (Ch5).
11. **UPROPERTY then UFUNCTION** (Ch5). Syntax, specifiers, metadata, the difference between callable and pure nodes.
12. **Adding components properly** (Ch5, Ch6). The four-step recipe: private pointer, public getter, header include, constructor creation; the generated header goes last.
13. **Blueprints from C++ classes** (Ch5).
14. **The four framework managers** (Ch5). PlayerController, GameModeBase, GameState, GameInstance, what each is for and where it exists in multiplayer; getting them from the world; Cast.
15. **Camera rig and movement tuning** (Ch6). Spring arm, camera, character movement settings; constructor vs BeginPlay; TEXT and the three string types; FRotator.
16. **Character content pipeline** (Ch6). Import skeletal mesh and animations, set the default pawn through the game mode.
17. **Animation from C++** (Ch6). Anim instance base class with a UENUM state, animation blueprint, blend space, state machine, speed fed from Tick, FVector toolkit.
18. **Input and actions** (Ch7). Player controller input, action mappings, binding a handler.
19. **Animation events** (Ch7). Notifies to finish one-shot animations.
20. **Destruction and memory** (Ch7). Destroy, garbage collection.
21. **AI** (Ch7). Enemy character, pawn sensing, AI controller, MoveTo functions, nav mesh.
22. **Collision** (Ch8). Shapes, simple vs complex collision, overlap and hit events, presets, responses, generate flags.
23. **Attachment** (Ch8). Sockets, attach and detach rules.
24. **Spawning from classes and aiming** (Ch8). Class lookup, SpawnActor, look-at rotation, tick interval.
25. **Traces** (Ch8). Manual projectile movement, tunneling, line traces, hit results, query params.
26. **Code quality** (Ch9). Shared parent classes, reparenting, caching, object pool and engine containers, logging, Cast vs IsA.
27. **Networking** (Ch10). Multiplayer models, PIE with several players, net modes, RPCs, replication, RepNotify, authority.
28. **UI** (Ch10, Ch11). C++ widget base with BindWidget, widget component, widget blueprints, creating widgets.
29. **Game flow** (Ch11). Lobby and gameplay maps, OpenLevel with listen and join, replicated timer on the game state, dynamic multicast delegate to Blueprint, win and lose.
30. **Ship it** (Ch12). Profiling, console commands, packaging settings, TSubclassOf instead of hardcoded paths, packaging.

What to take from this order for Unreal Dojo: the book teaches by building one game, so it introduces the framework managers and components before memory and containers, and it reaches delegates, interfaces and data assets late or never. Pack 1's order (objects and reflection, memory, containers and strings, framework, communication, data and tools) is more foundation-first; use the book's order inside each world for the hands-on sequence (header anatomy, then specifiers, then components, then lifecycle), and borrow its Pangaea arc (hero, enemy, tower, projectile, pickup, HUD, lobby) as a source of small mechanics for build quests.

### 1.3 What the book does not teach

These items are in the glossary and marked `S` in Part 2. The book either skips them or only names them.

- Enhanced Input (the book uses the older Action and Axis Mappings throughout).
- TObjectPtr, TWeakObjectPtr, TSoftObjectPtr, TSharedPtr, TUniquePtr, NewObject, IsValid.
- Subsystems of every kind.
- Interfaces (UInterface and IInterface).
- Timers (FTimerHandle, FTimerManager); the book uses Tick countdowns and tick intervals instead.
- Single-cast and native multicast delegates, unbinding with handles (only dynamic multicast is shown).
- TMap and TSet in use (TMap appears only in a comparison table), FTransform, FText in use.
- Sweeps, collision channels in Project Settings, physics simulation and impulses beyond one template line.
- Data Assets, Primary Data Assets, Data Tables, curves.
- Montages in depth (only a single Montage_Play call is read), NativeUpdateAnimation.
- Behavior trees and blackboards (named as an alternative only), AI Perception.
- Player State.
- Custom log categories, check and ensure.
- USaveGame, gameplay tags, the Gameplay Ability System, automation tests.
- Client RPCs and dedicated servers (named only), net roles beyond HasAuthority.

### 1.4 Corrections and cautions for content authors

The book targets UE 5.0 to 5.2. These points are outdated, inaccurate, or buggy in its text or listings. They make good spot-the-bug and explain-why items, and Dojo content must not repeat them.

| # | What the book does or says | What is correct for UE 5.8 | Ch |
|---|---|---|---|
| 1 | Uses legacy Action Mappings and `BindAction` with `IE_Pressed`. | Legacy input is deprecated; Enhanced Input has been the default since 5.1. Teach Enhanced Input; show the legacy form only so learners can read old code. | 4, 7 |
| 2 | Describes the TEXT macro as marking literals as localization keys. | TEXT only makes a wide-character literal. Localization comes from FText created with LOCTEXT or NSLOCTEXT. | 6 |
| 3 | Says the game instance exists only on the client. | Every running game process, including a dedicated or listen server, has its own game instance; it is simply not replicated. | 5, 11 |
| 4 | Says `FRotator(0, 640, 0)` rotates around the y axis. | The middle value is Yaw, which turns around the vertical Z axis. Pitch is around Y. | 6 |
| 5 | The tower's `IsDestroyed` returns true while health is above zero, and a later `IsKilled` reads the max health field instead of current health. | Inverted and wrong-field logic. Good spot-the-bug material. | 5, 11 |
| 6 | A network check written as `GetNetMode() == ListenServer::NM_Client && HasAuthority()`. | Not valid C++ and the wrong idea; server-only logic should check `HasAuthority()`, or `GetNetMode() != NM_Client` for process-level checks. | 10 |
| 7 | Death code calls `K2_DestroyActor()` and then forces garbage collection. | In C++ call `Destroy()`. K2 functions are Blueprint wrappers. Forcing GC on every death causes hitches; the book itself warns GC is expensive. | 7, 9 |
| 8 | Caches UObject pointers (anim instance, weapon, chased target, class pointer, a TQueue of projectiles) as raw members without UPROPERTY. | Store UObject members in a UPROPERTY with TObjectPtr, or use TWeakObjectPtr for things you do not own. Raw unreflected pointers are invisible to GC and can dangle. TQueue cannot be a UPROPERTY, so a pool is safer in a UPROPERTY TArray. | 9 |
| 9 | Reflected members use raw pointers such as `UBoxComponent*`. | UE5 convention for reflected members is `TObjectPtr<UBoxComponent>`. | 5 to 10 |
| 10 | Prefixes protected and private members with an underscore (`_HealthPoints`). | Not part of Epic's coding standard, which uses PascalCase without such prefixes and `b` for booleans. Dojo content follows Epic's standard. | 5 to 12 |
| 11 | Enemy `Chase` casts the anim instance to the player's anim class and compares it to the enemy state enum. | Type mismatch from copy and paste before the refactor; a good example of why the Chapter 9 refactor matters. | 7 |
| 12 | Pushes animation variables from the character's Tick with a Cast every frame. | The book fixes the repeated Cast by caching in BeginPlay. The usual production pattern is for the anim instance to pull values in `NativeUpdateAnimation`. | 6, 9 |
| 13 | Tower fires from Tick, then lowers tick interval to stop firing every frame. | Works, but a looping timer (`SetTimer`) is the clearer tool for fire rates and cooldowns. | 8 |
| 14 | Finds Blueprints with ConstructorHelpers and hardcoded content paths. | The book itself replaces these with `TSubclassOf` properties in Chapter 12. Teach the property approach from the start. | 6, 8, 12 |
| 15 | The fireball pool is emptied in the game mode's C++ destructor, which destroys actors. | UObject destructors run during garbage collection; touching the world there is unsafe. Clean up in `EndPlay`. | 9 |
| 16 | Explains the `bTransient` parameter of `CreateDefaultSubobject` as controlling whether parent defaults are inherited. | It marks the subobject as transient, meaning it is not saved. | 6 |
| 17 | A Cast written with a pointer type as the template argument and no parentheses. | `Cast<APangaeaGameMode>(GameMode)`. Spot-the-bug material. | 5 |
| 18 | Calls the editor button "Recompile and Reload". | In UE5 that is the Live Coding compile button. Header changes that add reflected members or classes may still need a full build with the editor closed. | 5 |
| 19 | Points to the Epic Games Marketplace for assets. | Epic's asset store moved to Fab in 2024. | 12 |
| 20 | Text says the game state derives from AGameState while the listing derives from AGameStateBase. | Either works; pick one and keep text and code consistent. AGameStateBase pairs with AGameModeBase. | 11 |

---

## Part 2. Concept inventory

Column guide: **Ch** is the book chapter that teaches it (`S` means supplemental, not in the book). **Glossary id** matches `research/glossary-seed.json`; a dash in that column means the concept is covered inside the entry named in the definition, or is too small for its own entry.

### 2.1 Object model

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| UObject | object model | Base class for engine types; gives reflection, GC, saving and editor support. | Data-only classes: item definitions, quest objects, ability configs. | 4, 5 | [Objects](https://dev.epicgames.com/documentation/unreal-engine/objects-in-unreal-engine) | uobject |
| Gameplay framework class tree | object model | The family tree: UObject, then AActor, which splits into pawns, info actors and controllers; components and the game instance sit beside them. | Choosing the right parent for every new class. | 5 | [Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine) | actor |
| Class Default Object (CDO) | object model | Template instance built by running each constructor once; new instances copy from it. | Explains why constructors only set defaults and make components. | S | [Objects](https://dev.epicgames.com/documentation/unreal-engine/objects-in-unreal-engine) | cdo |
| Constructor vs BeginPlay | object model | Constructor builds defaults (also used in the editor); BeginPlay does runtime setup once the actor is in a world. | Components in the constructor; caching game mode, binding events, starting timers in BeginPlay. | 6 | [Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | beginplay |
| CreateDefaultSubobject | object model | Constructor-only factory for an actor's built-in components, with a stable name. | Every actor's mesh, collision shape, camera, sensing component. | 4, 5, 6 | [Creating Objects](https://dev.epicgames.com/documentation/unreal-engine/creating-objects-in-unreal-engine) | createdefaultsubobject |
| NewObject | object model | Runtime creation of a non-actor UObject with an outer. | Runtime item instances, quest steps, ability objects. | S | [Creating Objects](https://dev.epicgames.com/documentation/unreal-engine/creating-objects-in-unreal-engine) | newobject |
| Cast | object model | Safe downcast of a UObject pointer; null if the type does not match. | Overlap handlers, GetPawn results, framework getters. | 4, 5 to 11 | [Cast](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/CoreUObject/Cast) | cast |
| IsA and StaticClass | object model | Type test without conversion; StaticClass returns a C++ type's UClass. | Branching on hit target type; setting framework classes in a game mode. | 9, 11 | [UObject API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/CoreUObject/UObject) | isa |
| C++ templates (why Cast and CreateDefaultSubobject use angle brackets) | object model | Functions written once for many types; the type goes in the angle brackets. | Every `Cast<T>`, `SpawnActor<T>`, `GetSubsystem<T>` call. | 5 | [Casting Quick Start](https://dev.epicgames.com/documentation/en-us/unreal-engine/casting-quick-start-guide-in-unreal-engine) | cast |
| UInterface and IInterface | object model | Two-part interface: reflected U class plus I class with the functions; lets unrelated classes share a contract. | Interactables (doors, chests, NPCs), damageable objects. | S | [Interfaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/interfaces-in-unreal-engine) | uinterface, iinterface |
| Execute_ interface calls | object model | Generated static helper for calling Blueprint-implementable interface functions. | Calling Interact on anything that implements it, C++ or Blueprint. | S | [Interfaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/interfaces-in-unreal-engine) | iinterface |
| ConstructorHelpers (FClassFinder, FObjectFinder) | object model | Constructor-only lookup of assets or classes by content path. | Template game modes setting a default pawn; best replaced by properties. | 6, 8, 9 | [ConstructorHelpers](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/CoreUObject/ConstructorHelpers) | constructor-helpers |
| UClass and GeneratedClass | object model | The runtime description of a class; a Blueprint asset's GeneratedClass is the class you spawn. | Spawning Blueprint children from C++. | 8 | [Gameplay Classes](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-classes-in-unreal-engine) | tsubclassof |
| GetDefault | object model | Read a class's default object values without an instance. | Showing a weapon's base damage in a shop before spawning it. | S | [Objects](https://dev.epicgames.com/documentation/unreal-engine/objects-in-unreal-engine) | cdo |

### 2.2 Reflection

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| Reflection system | reflection | Runtime catalog of classes, properties and functions built from the U macros. | Details panel, Blueprint nodes, saving, replication, GC. | 4 | [Reflection System](https://dev.epicgames.com/documentation/en-us/unreal-engine/reflection-system-in-unreal-engine) | reflection |
| UCLASS | reflection | Registers a class with reflection; specifiers change editor and Blueprint behavior. | Every actor, component and UObject class. | 4, 5 | [Gameplay Classes](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-classes-in-unreal-engine) | uclass |
| UCLASS specifiers: Blueprintable, BlueprintType, config, ClassGroup, meta BlueprintSpawnableComponent, minimalapi | reflection | Allow Blueprint children, use as a variable type, save to ini, group in menus, show in Add Component, export minimally. | Making a C++ base that designers extend; custom components in the Add menu. | 4, 5, 9 | [Gameplay Classes](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-classes-in-unreal-engine) | uclass |
| USTRUCT | reflection | Registers a value-type data bundle. | Loot entries, data table rows, save data groups. | S | [Structs](https://dev.epicgames.com/documentation/en-us/unreal-engine/structs-in-unreal-engine) | ustruct |
| UENUM with enum class : uint8 | reflection | Registers an enum; byte-sized for Blueprint use; UMETA for labels. | Character state, weapon type, AI state. | 6, 9 | [UEnum API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/CoreUObject/UEnum) | uenum |
| GENERATED_BODY | reflection | Slot for generated boilerplate; first line in the class body. | Every reflected class and struct. | 4, 5 | [Reflection System](https://dev.epicgames.com/documentation/en-us/unreal-engine/reflection-system-in-unreal-engine) | generated-body |
| .generated.h include, last | reflection | Each reflected header includes its generated header as the final include. | Every reflected header. | 5, 6 | [Reflection System](https://dev.epicgames.com/documentation/en-us/unreal-engine/reflection-system-in-unreal-engine) | generated-h-include |
| UPROPERTY syntax | reflection | Specifiers then optional meta in parentheses above a member. | Every tunable or tracked member. | 4, 5 | [UProperties](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties) | uproperty |
| EditAnywhere, EditDefaultsOnly, EditInstanceOnly | reflection | Editable in the editor everywhere, on defaults only, or on placed instances only. | Damage, range, speed; per-instance door keys. | 5 | [UProperties](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties) | editanywhere |
| VisibleAnywhere, VisibleDefaultsOnly | reflection | Shown read-only in the editor. | Component pointers made in the constructor. | 4, 5 | [UProperties](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties) | visibleanywhere |
| BlueprintReadWrite | reflection | Get and Set nodes in Blueprint. | Anim instance variables. | 5, 6 | [UProperties](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties) | blueprintreadwrite |
| BlueprintReadOnly | reflection | Get node only. | Current health, cached targets, components. | 4, 5 | [UProperties](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties) | blueprintreadonly |
| BlueprintAssignable | reflection | Lets Blueprints bind to a dynamic multicast delegate property. | HUD binding to game state timer or health changes. | 4, 11 | [UProperties](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties) | blueprintassignable |
| BlueprintAuthorityOnly (property) | reflection | Delegate property that only accepts events from the authority. | Server-only event dispatchers. | 5 | [UProperties](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties) | - |
| Category, nested with a pipe | reflection | Groups properties and functions in the editor and Blueprint menus. | Keeping a 30-field class navigable. | 5 | [UProperties](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-uproperties) | category-specifier |
| meta specifiers | reflection | Editor hints: ClampMin, ClampMax, EditCondition, DisplayName and more. | Preventing invalid designer input. | 5 | [Metadata Specifiers](https://dev.epicgames.com/documentation/en-us/unreal-engine/metadata-specifiers-in-unreal-engine) | meta-specifier |
| AllowPrivateAccess | reflection | Exposes a private member to Blueprints. | Private component pointers. | 5, 6 | [Metadata Specifiers](https://dev.epicgames.com/documentation/en-us/unreal-engine/metadata-specifiers-in-unreal-engine) | allowprivateaccess |
| DisplayName | reflection | Changes the editor label for a property, function, class or enum value. | Designer-friendly node names. | 4, 5 | [Metadata Specifiers](https://dev.epicgames.com/documentation/en-us/unreal-engine/metadata-specifiers-in-unreal-engine) | displayname-meta |
| UFUNCTION syntax | reflection | Specifiers and meta above a function declaration. | Blueprint API, delegate handlers, RPCs. | 4, 5 | [UFunctions](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine) | ufunction |
| UFUNCTION() with no specifiers for delegate handlers | reflection | Bare UFUNCTION so dynamic delegates can find the handler by name. | Every overlap and hit handler. | 4, 8 | [UFunctions](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine) | ufunction |
| BlueprintCallable | reflection | Function callable from Blueprint with execution pins. | Host and join buttons calling C++; attach weapon. | 4, 5, 11 | [UFunctions](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine) | blueprintcallable |
| BlueprintPure | reflection | Getter node without execution pins. | GetHP, IsDead, GetHealthPercent. | 5 | [UFunctions](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine) | blueprintpure |
| BlueprintImplementableEvent | reflection | C++ calls it; Blueprint defines it; no C++ body. | Cosmetic reactions: level-up sparkles, hit flash. | 5 | [UFunctions](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine) | blueprintimplementableevent |
| BlueprintNativeEvent and _Implementation | reflection | C++ default body that Blueprint may override. | Default interaction behavior with per-asset overrides. | 5 | [UFunctions](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine) | blueprintnativeevent |
| Unreal Header Tool | build | Parses reflection macros and writes generated code before compiling. | Reading header tool errors after a typo in a specifier. | S | [Reflection System](https://dev.epicgames.com/documentation/en-us/unreal-engine/reflection-system-in-unreal-engine) | unreal-header-tool |

### 2.3 Memory

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| Garbage collection | memory | Automatic freeing of unreachable UObjects; only reflected references count. | Why every UObject member needs UPROPERTY. | 7, 9 | [Unreal Object Handling](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-object-handling-in-unreal-engine) | garbage-collection |
| When GC runs and why forcing it hurts | memory | Runs periodically or under memory pressure; manual forcing causes frame hitches. | Avoiding GC spikes during combat. | 7 | [Incremental GC](https://dev.epicgames.com/documentation/en-us/unreal-engine/incremental-garbage-collection-in-unreal-engine) | garbage-collection |
| Destroy, lifespan | memory | Removes an actor from play; memory freed later; SetLifeSpan schedules it. | Dead enemies, expired projectiles, shell casings. | 4, 7, 8 | [Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | destroy |
| K2_ functions | memory | Blueprint-facing wrappers such as K2_DestroyActor; call the C++ form instead. | Reading engine headers and old samples. | 7 | [AActor API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AActor) | destroy |
| TObjectPtr | memory | UE5 member pointer wrapper for UObjects; same as raw in shipping. | Every reflected UObject member. | S | [Object Pointers](https://dev.epicgames.com/documentation/en-us/unreal-engine/object-pointers-in-unreal-engine) | tobjectptr |
| TWeakObjectPtr | memory | Non-owning UObject pointer that becomes null when the object dies. | AI current target, UI observing a pawn. | S | [TWeakObjectPtr](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Core/TWeakObjectPtr) | tweakobjectptr |
| TSoftObjectPtr, TSoftClassPtr | memory | Path-based asset reference loaded on demand. | Catalogs of meshes or classes not all needed at once. | S | [Referencing Assets](https://dev.epicgames.com/documentation/en-us/unreal-engine/referencing-assets-in-unreal-engine) | tsoftobjectptr |
| Async asset loading | memory | Loading soft references in the background through the streamable manager. | Loading a boss's assets before the arena door opens. | S | [Asynchronous Asset Loading](https://dev.epicgames.com/documentation/unreal-engine/asynchronous-asset-loading-in-unreal-engine) | tsoftobjectptr |
| TSubclassOf | memory | Class-typed property limited to a base class and its children. | Projectile class on a tower, weapon class on an enemy. | 12 | [TSubclassOf](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/CoreUObject/TSubclassOf) | tsubclassof |
| TSharedPtr, TSharedRef, TWeakPtr, MakeShared | memory | Reference-counted smart pointers for non-UObject C++ types. | Helper data structures, async task results, Slate. | S | [Shared Pointers](https://dev.epicgames.com/documentation/en-us/unreal-engine/shared-pointers-in-unreal-engine) | tsharedptr |
| TUniquePtr, MakeUnique | memory | Single-owner smart pointer for non-UObjects. | Private helper owned by one manager. | S | [Smart Pointers](https://dev.epicgames.com/documentation/en-us/unreal-engine/smart-pointers-in-unreal-engine) | tuniqueptr |
| IsValid | memory | Null and pending-destroy check in one call. | Before using cached targets or overlap results. | S | [Unreal Object Handling](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-object-handling-in-unreal-engine) | isvalid |
| nullptr checks after Cast | memory | Testing a cast or getter result before use. | Every overlap handler. | 4, 5, 8 | [Casting Quick Start](https://dev.epicgames.com/documentation/en-us/unreal-engine/casting-quick-start-guide-in-unreal-engine) | cast |
| Caching pointers | memory | Store a frequently used lookup once, in BeginPlay, instead of every frame. | Anim instance, game mode, owner pointers. | 9 | [Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | - |
| Object pool | memory | Reuse inactive actors instead of spawning and destroying them. | Bullets, fireballs, damage numbers, enemies in waves. | 9 | [Spawning Actors](https://dev.epicgames.com/documentation/unreal-engine/spawning-actors-in-unreal-engine) | object-pool |
| Deactivate and reset an actor | memory | Hide, disable collision, disable tick; reverse to reuse. | Pooled projectiles and pickups. | 9 | [AActor API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AActor) | object-pool |

### 2.4 Containers

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| TArray | containers | Resizable ordered list; Num, index, Add, Remove, Contains. | Attached actors, enemy lists, inventory slots. | 8, 9 | [Array Containers](https://dev.epicgames.com/documentation/en-us/unreal-engine/array-containers-in-unreal-engine) | tarray |
| TMap | containers | Key to value lookup. | Item counts by id, cooldowns by ability tag. | 9 (table only) | [Map Containers](https://dev.epicgames.com/documentation/en-us/unreal-engine/map-containers-in-unreal-engine) | tmap |
| TSet | containers | Unique values with fast membership tests. | Enemies already hit by this swing; visited checkpoints. | S | [Set Containers](https://dev.epicgames.com/documentation/unreal-engine/set-containers-in-unreal-engine) | tset |
| TQueue, EQueueMode | containers | First in, first out, thread-safe; not reflectable. | Work handoff between threads; the book's fireball pool. | 9 | [TQueue](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Core/TQueue) | tqueue |
| Choosing a container | containers | Array for order and indexing, map for lookup by key, set for uniqueness, queue for FIFO. | Every data structure decision. | 9 | [Map Containers](https://dev.epicgames.com/documentation/en-us/unreal-engine/map-containers-in-unreal-engine) | tarray |

### 2.5 Strings

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| TEXT macro | strings | Wide-character literal for engine APIs. | Component names, log text, FName and FString construction. | 6, 9 | [String Handling](https://dev.epicgames.com/documentation/en-us/unreal-engine/string-handling-in-unreal-engine) | text-macro |
| FString | strings | Mutable string for building and editing text. | Log messages, server address input, file paths. | 6, 11 | [FString](https://dev.epicgames.com/documentation/en-us/unreal-engine/fstring-in-unreal-engine) | fstring |
| FName | strings | Fast, case-insensitive identifier. | Socket names, row names, level names. | 6, 8, 11 | [FName](https://dev.epicgames.com/documentation/en-us/unreal-engine/fname-in-unreal-engine) | fname |
| FText | strings | Player-facing, localizable text. | UI labels, item descriptions, dialogue. | 6 | [Text Localization](https://dev.epicgames.com/documentation/unreal-engine/text-localization-in-unreal-engine) | ftext |
| FString to FName with the * operator | strings | Dereferencing an FString yields a character pointer that FName accepts. | Passing a typed IP address to OpenLevel. | 11 | [String Handling](https://dev.epicgames.com/documentation/en-us/unreal-engine/string-handling-in-unreal-engine) | fstring |
| FString::Printf and format arguments | strings | printf-style formatting into an FString. | Building debug text and UI strings. | S | [FString](https://dev.epicgames.com/documentation/en-us/unreal-engine/fstring-in-unreal-engine) | fstring |

### 2.6 Math

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| FVector and its toolkit | math | 3D vector; Size, Size2D, Dist, Dist2D, DistSquared, DotProduct, CrossProduct, RotateAngleAxis, Rotation, operators. | Velocity to speed, distance checks, directions. | 6, 7, 8 | [TVector](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Core/Math/TVector?application_version=5.5) | fvector |
| FVector::ForwardVector and RotateVector | math | Unit forward axis rotated by an actor's rotation gives its facing direction. | Moving a projectile forward manually. | 8 | [TVector](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Core/Math/TVector?application_version=5.5) | fvector |
| FRotator | math | Pitch, Yaw, Roll in degrees. | Camera boom angle, turn rate, spawn rotation. | 6, 8 | [FRotator](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Core/Math/FRotator_1?application_version=5.5) | frotator |
| FQuat and FQuat::Identity | math | Quaternion rotation; identity means no rotation. | Spinning pickups, resetting a dropped item upright. | 8, 9 | [FQuat](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Core/Math/FQuat_1?application_version=5.5) | fquat |
| FTransform | math | Location, rotation and scale together. | Spawning at a socket's world transform. | S | [FTransform](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Core/Math/FTransform_1?application_version=5.5) | ftransform |
| FMath (Clamp and friends) | math | Static helpers: Clamp, Lerp, FInterpTo, RandRange. | Normalized health bar value, smooth camera, random loot. | 10 | [FMath](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Core/FMath) | fmath |
| UKismetMathLibrary::FindLookAtRotation | math | Rotation that points from one location to another. | Aiming a tower or turret. | 8 | [UKismetMathLibrary](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UKismetMathLibrary) | kismet-math-library |
| Struct vs class (value vs reference) | math | Structs like FVector are copied by value; UObjects are used through pointers. | Passing vectors by const reference; never storing a UObject by value. | 6 | [Structs](https://dev.epicgames.com/documentation/en-us/unreal-engine/structs-in-unreal-engine) | ustruct |

### 2.7 Framework

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| AActor | framework | Anything placed or spawned in a level. | Towers, weapons, projectiles, doors. | 4, 5 | [Actors](https://dev.epicgames.com/documentation/en-us/unreal-engine/actors-in-unreal-engine) | actor |
| APawn | framework | Controllable actor. | Vehicles, turrets, spectator cameras. | 5 | [APawn](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/APawn) | pawn |
| ACharacter | framework | Pawn with capsule, skeletal mesh and character movement. | Hero, enemies, NPCs. | 4, 5, 6 | [Characters](https://dev.epicgames.com/documentation/unreal-engine/characters-in-unreal-engine) | character |
| AInfo and AController branches | framework | Non-physical actors for information (game mode, states) and control (player and AI controllers). | Understanding why a game state is an actor with no mesh. | 5 | [Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine) | game-state-base |
| Actor lifecycle events | framework | OnConstruction, BeginPlay, Tick, EndPlay and their Blueprint twins. | Setup, per-frame work, cleanup. | 4 | [Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | beginplay, endplay, on-construction |
| BeginPlay | framework | Runtime setup once per actor. | Binding events, caching, initial health. | 4 to 11 | [Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | beginplay |
| EndPlay and EEndPlayReason | framework | Cleanup when leaving play, with the reason. | Unbinding delegates, clearing timers. | 4 | [Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | endplay |
| OnConstruction | framework | Runs on placement, edit and spawn; C++ twin of the Construction Script. | Procedural fences, editor previews. | 4 | [Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | on-construction |
| Tick | framework | Per-frame update. | Homing, smoothing, countdowns. | 4, 6, 7, 8 | [Actor Ticking](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine) | tick |
| DeltaTime | framework | Seconds since last frame; scale motion and timers by it. | Frame-rate-independent movement and cooldowns. | 6, 7, 8 | [Actor Ticking](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine) | deltatime |
| PrimaryActorTick: bCanEverTick, tick interval, enable and disable | framework | Whether and how often an actor ticks. | Turning off idle actors; firing twice a second. | 5, 7, 8, 9 | [Actor Ticking](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine) | primary-actor-tick |
| Tick groups | framework | Pre-, during- or post-physics phases. | Cameras following physics objects. | S | [ETickingGroup](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/ETickingGroup) | tick-groups |
| FTimerHandle and FTimerManager | framework | Delayed and repeating calls without Tick. | Fire rates, respawn delays, buff durations. | S | [Gameplay Timers](https://dev.epicgames.com/documentation/unreal-engine/gameplay-timers-in-unreal-engine) | timer-handle, timer-manager |
| Super calls | cpp idiom | Calling the parent's version in overrides. | Every BeginPlay, Tick, EndPlay override. | 4, 5 | [Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | super |
| UWorld and GetWorld | framework | Container for everything in play; gateway to spawning, traces and timers. | Spawning, tracing, finding framework objects. | 4, 5, 8 | [UWorld](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UWorld) | world |
| ULevel, maps | framework | One map's placed actors, loaded into a world. | Lobby map and gameplay map. | 11 | [ULevel](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/ULevel) | level |
| SpawnActor and FActorSpawnParameters | framework | Runtime actor creation at a location and rotation. | Bullets, enemies, dropped loot. | 4, 8, 9 | [Spawning Actors](https://dev.epicgames.com/documentation/unreal-engine/spawning-actors-in-unreal-engine) | spawnactor |
| Actor transform helpers | framework | GetActorLocation, SetActorLocation, SetActorRotation, AddActorLocalRotation, GetTargetLocation. | Moving and aiming actors. | 4, 7, 8 | [AActor API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AActor) | - |
| AGameModeBase and AGameMode | framework | Server-only rules and the class choices for players. | Win conditions, spawn rules, default classes. | 4, 5 | [Game Mode and Game State](https://dev.epicgames.com/documentation/unreal-engine/game-mode-and-game-state-in-unreal-engine) | game-mode-base |
| Default pawn, controller, game state and HUD classes | framework | Game mode fields that pick framework classes. | Making your hero the spawned pawn. | 6, 9, 11, 12 | [Setting Up a Game Mode](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-a-game-mode-in-unreal-engine) | default-pawn-class |
| AGameStateBase | framework | Match-wide replicated info. | Countdown timer, wave number, base destroyed flag. | 5, 11 | [AGameStateBase](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AGameStateBase) | game-state-base |
| APlayerController | framework | The player's will: input, camera, UI, possession. | Click to move, attack input, cursor. | 5, 7 | [Player Controllers](https://dev.epicgames.com/documentation/en-us/unreal-engine/player-controllers-in-unreal-engine) | player-controller |
| APlayerState | framework | Per-player replicated public data. | Scoreboards, team, kills. | S | [APlayerState](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/APlayerState) | player-state |
| UGameInstance | framework | One object per game process that survives level changes. | Host, join and leave; cross-map data. | 5, 11 | [UGameInstance](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UGameInstance) | game-instance |
| Getting framework objects | framework | From the world: first player controller, auth game mode, game state, game instance; or through Gameplay Statics. | Any system needing a manager. | 5, 9, 11 | [Gameplay Framework Quick Reference](https://dev.epicgames.com/documentation/unreal-engine/gameplay-framework-quick-reference-in-unreal-engine) | gameplay-statics |
| Possession, GetPawn, GetController | framework | Controller and pawn link. | Input forwarding, AI control. | 7 | [Controllers](https://dev.epicgames.com/documentation/en-us/unreal-engine/controllers-in-unreal-engine) | possession |
| UGameplayStatics | framework | Static helpers: OpenLevel, GetGameMode, GetGameState, PlaySoundAtLocation. | Quick access and one-shot effects. | 4, 9, 11 | [UGameplayStatics](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UGameplayStatics) | gameplay-statics |
| OpenLevel with ?listen and an address | framework | Level travel that can host or join. | Main menu host and join buttons. | 11 | [OpenLevel](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Kismet/UGameplayStatics/OpenLevel?application_version=5.5) | open-level |
| GEngine | framework | Global engine pointer. | On-screen messages, current play world. | 7, 9, 11 | [UEngine::AddOnScreenDebugMessage](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Engine/UEngine/AddOnScreenDebugMessage/2) | gengine |
| Subsystems (game instance, world, local player, engine, editor) | framework | Engine-managed singletons tied to a host's lifetime. | Quest log, spawn director, input mappings, tools. | S | [Programming Subsystems](https://dev.epicgames.com/documentation/unreal-engine/programming-subsystems-in-unreal-engine) | subsystem and its five variants |
| Single-cast delegate | framework | One bound function, called later. | Async callbacks, a one-listener event. | S | [Delegates](https://dev.epicgames.com/documentation/en-us/unreal-engine/delegates-and-lambda-functions-in-unreal-engine) | delegate |
| Native multicast delegate | framework | Many C++ listeners. | Health changed with several C++ observers. | S | [Multicast Delegates](https://dev.epicgames.com/documentation/en-us/unreal-engine/multicast-delegates-in-unreal-engine) | multicast-delegate |
| Dynamic delegate | framework | Bind by name through reflection; serializable. | Blueprint callback pins. | S | [Delegates](https://dev.epicgames.com/documentation/en-us/unreal-engine/delegates-and-lambda-functions-in-unreal-engine) | dynamic-delegate |
| DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam | framework | Many-listener delegate that Blueprint can bind. | Use-item event, timer changed, win and lose events. | 4, 11 | [Delegates](https://dev.epicgames.com/documentation/en-us/unreal-engine/delegates-and-lambda-functions-in-unreal-engine) | dynamic-multicast-delegate |
| AddDynamic, RemoveDynamic | framework | Subscribe and unsubscribe a UFUNCTION. | Overlap handlers; weapon fire on pickup and drop. | 4, 8 | [Delegates](https://dev.epicgames.com/documentation/en-us/unreal-engine/delegates-and-lambda-functions-in-unreal-engine) | adddynamic, unbinding-delegates |
| Broadcast | framework | Fire every listener of a multicast delegate. | Announcing state changes. | 4, 11 | [Multicast Delegates](https://dev.epicgames.com/documentation/en-us/unreal-engine/multicast-delegates-in-unreal-engine) | broadcast |
| Data Asset | framework | Designer-editable config asset from a C++ class. | Weapon stats, enemy archetypes. | S | [Data Assets](https://dev.epicgames.com/documentation/en-us/unreal-engine/data-assets-in-unreal-engine) | data-asset |
| Primary Data Asset | framework | Data asset known to the Asset Manager. | Large item catalogs, DLC. | S | [UPrimaryDataAsset](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UPrimaryDataAsset) | primary-data-asset |
| Data Table and FTableRowBase | framework | Spreadsheet asset of struct rows. | Enemy stats, XP tables, dialogue. | S | [Data Driven Gameplay](https://dev.epicgames.com/documentation/en-us/unreal-engine/data-driven-gameplay-elements-in-unreal-engine) | data-table, table-row-base |
| UCurveFloat | framework | Designer-drawn mapping from one number to another. | Door motion, charge strength, XP curves. | S | [UCurveFloat](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UCurveFloat) | curve-float |
| USaveGame | framework | UObject whose properties are written to a save slot. | Progress, settings, unlocks. | S | [Saving and Loading](https://dev.epicgames.com/documentation/unreal-engine/saving-and-loading-your-game-in-unreal-engine) | savegame |
| Gameplay Tags | framework | Hierarchical shared labels. | Status effects, damage types, quest flags. | S | [Using Gameplay Tags](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-gameplay-tags-in-unreal-engine) | gameplay-tags |
| Gameplay Ability System (pointer only) | framework | Epic's plugin for abilities, attributes, effects and cues. | Ability-heavy action RPGs and shooters. | S | [Understanding GAS](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-unreal-engine-gameplay-ability-system) | gas |
| Game flow with maps | framework | Lobby map, gameplay map, return path; often a small state machine. | Menus, matches, results screens. | 11 | [Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine) | open-level |

### 2.8 Components

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| UActorComponent | components | Reusable behavior with no transform. | Health, inventory, quest tracker. | 4, 5 | [UActorComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UActorComponent) | actor-component |
| USceneComponent | components | Component with a transform and parent and child links. | Muzzle points, pivots. | 6 | [USceneComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/USceneComponent) | scene-component |
| UPrimitiveComponent | components | Scene component with geometry: rendering, collision, physics. | Where collision events and settings live. | 8 | [UPrimitiveComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UPrimitiveComponent) | primitive-component |
| UStaticMeshComponent | components | Draws a rigid mesh. | Towers, weapons, props. | 5, 8 | [UStaticMeshComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UStaticMeshComponent) | static-mesh-component |
| USkeletalMeshComponent and GetMesh | components | Draws an animated, boned mesh. | Characters and creatures. | 4, 6 | [USkeletalMeshComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/USkeletalMeshComponent) | skeletal-mesh-component |
| UCameraComponent | components | Viewpoint; bUsePawnControlRotation. | Player view. | 4, 6 | [UCameraComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UCameraComponent) | camera-component |
| USpringArmComponent | components | Camera boom: arm length, collision test, absolute rotation, socket name. | Third-person and top-down cameras. | 6 | [USpringArmComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/USpringArmComponent) | spring-arm-component |
| UCharacterMovementComponent | components | Walk, fall, jump, swim, network smoothing; orient to movement, rotation rate, constrain to plane, max walk speed, velocity. | Tuning every character's feel. | 6, 7 | [UCharacterMovementComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UCharacterMovementComponent) | character-movement-component |
| bUseControllerRotation Pitch, Yaw, Roll | components | Whether the pawn turns with the controller's rotation. | Top-down characters that face their run direction. | 6 | [Characters](https://dev.epicgames.com/documentation/unreal-engine/characters-in-unreal-engine) | character-movement-component |
| UProjectileMovementComponent | components | Built-in projectile flight with speed, gravity, bounce, homing. | Bullets, grenades, missiles. | 4 | [UProjectileMovementComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UProjectileMovementComponent) | projectile-movement-component |
| Arrow component | components | Editor-visible forward indicator on characters. | Checking which way an actor faces. | 6 | [Components](https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine) | - |
| Four-step component recipe | components | Private pointer, public getter, header include, constructor creation. | Every component you add in C++. | 6 | [Components](https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine) | createdefaultsubobject |
| Root component, SetRootComponent | components | Top of the tree; its transform is the actor's. | Collision shape as root of pickups and projectiles. | 5 | [Components](https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine) | root-component |
| SetupAttachment, AttachToComponent, DetachFromActor, attachment rules | components | Build the tree in constructors; attach and detach at runtime with snap or keep rules. | Weapon pickup and drop, camera on spring arm. | 5, 6, 8, 9 | [Components](https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine) | attach-to-component |
| GetAttachedActors | components | Lists actors attached to an actor. | Dropping a currently held weapon. | 8 | [AActor API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AActor) | attach-to-component |
| Relative vs absolute transforms | components | SetRelativeRotation, SetUsingAbsoluteRotation. | Camera boom that does not spin with the character. | 6 | [USceneComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/USceneComponent) | scene-component |
| Custom component subclassing a shape | components | A component that extends a sphere to add pickup behavior. | Reusable pickup trigger. | 4 | [Components and Collision Quick Start](https://dev.epicgames.com/documentation/unreal-engine/quick-start-guide-to-components-and-collision-in-unreal-engine-cpp) | actor-component |
| UWidgetComponent | UI | Shows a UMG widget on an actor in screen or world space. | Health bars over enemies and towers. | 10, 11 | [UWidgetComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/UMG/UWidgetComponent) | widget-component |
| UPawnSensingComponent | AI | Simple sight and hearing for AI. | First chasing enemy. | 7 | [UPawnSensingComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/AIModule/UPawnSensingComponent) | pawn-sensing |

### 2.9 Input

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| SetupPlayerInputComponent and SetupInputComponent | input | Where pawns and controllers bind input. | Every controllable pawn. | 4, 7 | [Input Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/input-overview-in-unreal-engine) | setup-player-input-component |
| Legacy Action and Axis Mappings, BindAction with IE_Pressed | input | Pre-5.1 input set in Project Settings. | Reading older code; the book's attack input. | 4, 7 | [Input Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/input-overview-in-unreal-engine) | legacy-input |
| Direct key polling | input | WasInputKeyJustPressed, WasInputKeyJustReleased, IsInputKeyDown with EKeys. | Debug keys; quick prototypes. | 7 | [APlayerController](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/APlayerController) | legacy-input |
| Click to move (SimpleMoveToLocation) | input | Template player controller moving the pawn to a clicked spot through navigation. | Top-down and RTS movement. | 7 | [Basic Navigation](https://dev.epicgames.com/documentation/unreal-engine/basic-navigation-in-unreal-engine) | nav-mesh |
| Enhanced Input | input | UE5 input: action assets, mapping contexts, triggers, modifiers. | All new UE5 projects. | S | [Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) | enhanced-input |
| UInputAction | input | One verb with a value type. | IA_Move, IA_Jump, IA_Interact. | S | [UInputAction](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/EnhancedInput/UInputAction) | input-action |
| UInputMappingContext and AddMappingContext | input | Keys to actions, activated per local player with a priority. | On-foot vs vehicle vs menu controls. | S | [UInputMappingContext](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput/UInputMappingContext) | input-mapping-context |
| Triggers | input | When input counts: pressed, released, hold, tap, chorded. | Charged attacks, double-tap dodge. | S | [Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) | input-trigger |
| Modifiers | input | Reshape values: negate, swizzle, dead zone, scalar. | WASD to a 2D move vector; stick drift. | S | [Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) | input-modifier |
| ETriggerEvent | input | Started, Ongoing, Triggered, Completed, Canceled. | Sprint start and stop. | S | [Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) | etriggerevent |
| FInputActionValue | input | Handler argument read as bool, float, 2D or 3D vector. | Move and look handlers. | S | [Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) | finputactionvalue |
| UEnhancedInputComponent::BindAction | input | Binding an action and trigger event to a function. | Every Enhanced Input binding. | S | [BindAction](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput/UEnhancedInputComponent/BindAction) | enhanced-input-component |
| Enhanced Input local player subsystem | input | Per-player service for adding and removing contexts. | Switching control schemes. | S | [Programming Subsystems](https://dev.epicgames.com/documentation/unreal-engine/programming-subsystems-in-unreal-engine) | local-player-subsystem |

### 2.10 Collision

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| Collision detection: overlap vs ray casting | collision | Shapes intersecting vs a line crossing a surface. | Triggers vs hitscan. | 8 | [Collision Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview) | overlap-event, line-trace |
| UCapsuleComponent, InitCapsuleSize | collision | Pill shape for characters. | Character collision size. | 4, 8 | [UCapsuleComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UCapsuleComponent) | capsule-component |
| UBoxComponent | collision | Box trigger or blocker. | Door triggers, tower root. | 5, 8 | [UBoxComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UBoxComponent) | box-component |
| USphereComponent, SphereRadius | collision | Sphere trigger or blocker. | Aggro range, pickup radius, projectile root. | 4, 8 | [USphereComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/USphereComponent) | sphere-component |
| Simple vs complex collision on meshes | collision | Cheap hulls added in the mesh editor vs per-triangle collision. | Performance tuning props. | 8 | [Collision Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview) | collision-preset |
| Actor-level events | collision | OnActorBeginOverlap, OnActorEndOverlap, OnActorHit. | Whole-actor reactions such as weapon pickup. | 8 | [Collision Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview) | overlap-event |
| Component-level events and their signatures | collision | OnComponentBeginOverlap, OnComponentEndOverlap, OnComponentHit. | Which exact shape was touched. | 4, 8 | [Collision Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview) | overlap-event, hit-event |
| Overlap vs hit | collision | Pass-through notification vs blocking contact. | Pressure plate vs wall impact. | 8 | [Collision Response Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-response-reference-in-unreal-engine) | overlap-event, hit-event |
| Collision presets | collision | Named setting bundles such as NoCollision, BlockAll, OverlapAll, BlockAllDynamic, OverlapAllDynamic, OverlapOnlyPawn, Pawn, Custom. | Picking per-component behavior quickly. | 8 | [Collision Response Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-response-reference-in-unreal-engine) | collision-preset |
| Response matrix: Ignore, Overlap, Block | collision | Per-channel reaction; the weaker of two responses wins. | Debugging "it does not collide". | 8 | [Collision Response Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-response-reference-in-unreal-engine) | collision-response |
| Generate Overlap Events, Simulation Generates Hit Events | collision | Flags that must be on for events to fire. | First check when a handler never runs. | 8 | [Collision Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview) | generate-overlap-events |
| Collision channels and object types | collision | Categories like Pawn, WorldStatic, Visibility; custom ones in Project Settings. | Projectile channel, interact trace channel. | 8 (ECC_Pawn only) | [Collision Settings](https://dev.epicgames.com/documentation/unreal-engine/collision-settings-in-the-unreal-engine-project-settings) | collision-channel |
| Custom object types | collision | Adding your own object channel. | Projectiles that ignore other projectiles. | S | [Add a Custom Object Type](https://dev.epicgames.com/documentation/en-us/unreal-engine/add-a-custom-object-type-to-your-project-in-unreal-engine) | collision-channel |
| Tunneling | collision | Fast objects skipping past thin targets between frames. | Why bullets use traces or sweeps. | 8 | [Traces Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/traces-in-unreal-engine---overview) | line-trace |
| Line traces: single and multi, by channel, object type or profile | collision | Ray queries from the world. | Hitscan weapons, line of sight, interaction. | 8 | [Traces Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/traces-in-unreal-engine---overview) | line-trace |
| LineTraceSingleByObjectType | collision | Trace that only reports chosen object types. | Fireball checking only pawns. | 8 | [Single Line Trace by Object](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-a-single-line-trace-raycast-by-object-in-unreal-engine) | line-trace |
| LineTraceSingleByChannel | collision | Trace against a trace channel such as Visibility. | Crosshair targets. | S | [Single Line Trace by Channel](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-a-single-line-trace-raycast-by-channel-in-unreal-engine) | line-trace |
| Multi line trace | collision | Every hit along a line. | Piercing shots. | S | [Multi Line Trace by Channel](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-a-multi-line-trace-raycast-by-channel-in-unreal-engine) | line-trace |
| FHitResult | collision | What, where and which direction a hit happened. | Decals, damage, headshots. | 8 | [FHitResult](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/FHitResult) | fhitresult |
| FCollisionObjectQueryParams, FCollisionQueryParams | collision | Options for traces: object types, ignored actors. | Ignoring the shooter. | 8 | [Single Line Trace by Object](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-a-single-line-trace-raycast-by-object-in-unreal-engine) | collision-query-params |
| Sweeps | collision | Shape traces and swept movement. | Melee arcs, safe spawn checks. | S | [Traces Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/traces-in-unreal-engine---overview) | sweep |
| CanBeDamaged | collision | Actor flag for whether damage applies. | Invulnerability windows, cutscenes. | 8, 9 | [AActor API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AActor) | - |

### 2.11 Physics

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| Physics asset | physics | Simple bodies per bone, made on skeletal mesh import. | Ragdolls and hit reactions. | 6 | [Physics Asset Editor](https://dev.epicgames.com/documentation/unreal-engine/physics-asset-editor-in-unreal-engine) | physics-simulation |
| Applying force to a hit physics object | physics | Impulse at the impact point on a simulating body. | Bullets knocking crates. | 4 | [Physics](https://dev.epicgames.com/documentation/en-us/unreal-engine/physics-in-unreal-engine) | physics-simulation |
| Simulate Physics, AddImpulse, AddForce | physics | Hand a component to the physics engine and push it. | Barrels, explosions, ragdolls. | S | [Physics Components](https://dev.epicgames.com/documentation/unreal-engine/physics-components-in-unreal-engine) | physics-simulation |

### 2.12 Animation

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| Importing skeletal meshes and animations (FBX) | animation | Mesh, skeleton, physics asset and material on import; animations reuse the skeleton. | Bringing in characters. | 6, 7 | [Skeletons](https://dev.epicgames.com/documentation/unreal-engine/skeletons-in-unreal-engine) | skeletal-mesh-component |
| UAnimInstance C++ base | animation | Variables and functions the animation blueprint reads. | Speed and state for locomotion. | 6, 9 | [UAnimInstance](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAnimInstance) | anim-instance |
| GetOwningActor, TryGetPawnOwner | animation | Reaching the character from the anim instance. | Reading health or velocity. | 6 | [UAnimInstance](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAnimInstance) | anim-instance |
| NativeUpdateAnimation | animation | Per-frame hook for the anim instance to pull data. | Production locomotion setups. | S | [UAnimInstance](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAnimInstance) | anim-instance |
| Animation blueprint, Anim Class | animation | Graph that outputs a pose; assigned on the mesh. | Every animated character. | 6, 7 | [State Machines](https://dev.epicgames.com/documentation/unreal-engine/state-machines-in-unreal-engine) | animation-blueprint |
| Blend Space 1D | animation | Blends animations along one axis. | Idle, walk, run by speed. | 6 | [Blend Spaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/blend-spaces-in-unreal-engine) | blend-space |
| State machine, transition rules | animation | States and conditional arrows. | Locomotion, Attack, Hit, Die. | 6, 7 | [State Machines](https://dev.epicgames.com/documentation/unreal-engine/state-machines-in-unreal-engine) | state-machine |
| Animation notifies | animation | Timeline markers that fire events. | Ending attacks, footsteps, damage windows. | 7 | [Animation Notifies](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-notifies-in-unreal-engine) | anim-notify |
| Animation Sequence Editor | animation | Where you add notify tracks to animations. | Placing AttackEnds. | 7 | [Animation Sequence Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-sequence-editor-in-unreal-engine) | anim-notify |
| Montage_Play and montages | animation | One-off animations through slots and sections. | Attacks, reloads, emotes. | 4 (one call) | [Animation Montage](https://dev.epicgames.com/documentation/unreal-engine/animation-montage-in-unreal-engine) | anim-montage |
| Reparenting animation blueprints | animation | Pointing an existing animation blueprint at a new C++ parent. | Merging duplicate anim instance classes. | 9 | [State Machines](https://dev.epicgames.com/documentation/unreal-engine/state-machines-in-unreal-engine) | animation-blueprint |
| Skeleton sockets and preview assets | animation | Named attach points on bones, tuned with a preview mesh. | Weapons in hands, effects on bones. | 8 | [Skeletal Mesh Sockets](https://dev.epicgames.com/documentation/en-us/unreal-engine/skeletal-mesh-sockets-in-unreal-engine) | socket |

### 2.13 UI

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| UMG and the Widget Designer | UI | Visual UI builder with panels and controls. | HUDs and menus. | 10, 11 | [UMG Quick Start](https://dev.epicgames.com/documentation/en-us/unreal-engine/umg-ui-designer-quick-start-guide-in-unreal-engine) | umg |
| UUserWidget C++ base | UI | C++ parent for widget blueprints. | Health bar logic in C++. | 10 | [UUserWidget](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/UMG/UUserWidget) | user-widget |
| meta=(BindWidget) | UI | Auto-links a C++ pointer to a named designer widget. | Progress bar, text blocks. | 10 | [Metadata Specifiers](https://dev.epicgames.com/documentation/en-us/unreal-engine/metadata-specifiers-in-unreal-engine) | bindwidget |
| UProgressBar::SetPercent | UI | Fill a bar from 0 to 1. | Health and cooldown bars. | 10 | [UWidget](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/UMG/UWidget) | user-widget |
| Layout: Canvas Panel, anchors, alignment, position, size | UI | Placing widgets so they hold up on any screen size. | Corner timers, centered menus. | 11 | [UMG Quick Start](https://dev.epicgames.com/documentation/en-us/unreal-engine/umg-ui-designer-quick-start-guide-in-unreal-engine) | umg |
| Controls: Button, Text, Image, Editable Text Box | UI | Basic interactive and display widgets. | Host and join buttons, address field. | 11 | [UWidget](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/UMG/UWidget) | umg |
| Button OnClicked to a C++ BlueprintCallable | UI | Widget event wired to C++ logic. | Menu actions. | 11 | [UMG Quick Start](https://dev.epicgames.com/documentation/en-us/unreal-engine/umg-ui-designer-quick-start-guide-in-unreal-engine) | blueprintcallable |
| Create Widget and Add to Viewport | UI | Instantiate and show a widget; stack several. | HUD on level start, game-over overlay. | 11 | [UUserWidget](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/UMG/UUserWidget) | user-widget |
| Binding UI to a C++ event | UI | Widget binds a custom event to a BlueprintAssignable delegate. | Timer text updates. | 11 | [Delegates](https://dev.epicgames.com/documentation/en-us/unreal-engine/delegates-and-lambda-functions-in-unreal-engine) | dynamic-multicast-delegate |
| Set Game Paused, Show Mouse Cursor | UI | Pause play; show the cursor for menus. | Game-over and pause menus. | 11, 12 | [APlayerController](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/APlayerController) | player-controller |

### 2.14 AI

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| AAIController subclass | AI | Computer-controlled mind for a pawn. | Enemy decision making. | 7 | [AAIController](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/AIModule/AAIController) | ai-controller |
| MoveToActor, MoveToLocation, MoveTo with FAIMoveRequest, StopMovement | AI | Pathfinding movement commands and stopping. | Chasing, patrolling, holding position. | 7 | [MoveToActor](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/AIModule/AAIController/MoveToActor) | ai-controller |
| Pawn sensing settings | AI | Sight radius, hearing threshold, sensing interval, see and hear toggles. | Tuning enemy awareness. | 7 | [UPawnSensingComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/AIModule/UPawnSensingComponent) | pawn-sensing |
| A star pathfinding on a nav mesh | AI | Shortest walkable path search over navigation data. | Every AI move. | 7 | [Navigation System](https://dev.epicgames.com/documentation/unreal-engine/navigation-system-in-unreal-engine) | nav-mesh |
| NavMeshBoundsVolume and the P key view | AI | Defines where navigation is built; P shows it. | Level setup for AI. | 7 | [Basic Navigation](https://dev.epicgames.com/documentation/unreal-engine/basic-navigation-in-unreal-engine) | nav-mesh |
| Behavior trees | AI | Visual decision trees of tasks, composites, decorators, services. | Most shipped enemy AI. | 7 (named only) | [Behavior Tree Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview) | behavior-tree |
| Blackboards | AI | Key and value memory for a behavior tree. | Target, last seen location. | 7 (named only) | [Behavior Tree Quick Start](https://dev.epicgames.com/documentation/unreal-engine/behavior-tree-in-unreal-engine---quick-start-guide) | blackboard |
| AI Perception | AI | Modern sensing with configurable senses and memory. | Stealth guards, team-aware enemies. | S | [AI Perception](https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine) | ai-perception |
| AI debugging tools | AI | Gameplay debugger and visual logger for AI. | Seeing why an enemy chose a branch. | S | [AI Debugging](https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-debugging-in-unreal-engine) | behavior-tree |

### 2.15 Networking

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| Single-player, local multiplayer, network multiplayer | networking | Where simulation runs and how players connect. | Choosing a game's network design. | 10 | [Networking and Multiplayer](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-and-multiplayer-in-unreal-engine) | net-mode |
| Unreal is client and server even offline | networking | Single-player runs on the same framework. | Writing server-aware code from day one. | 5, 10 | [Networking Overview](https://dev.epicgames.com/documentation/unreal-engine/networking-overview-for-unreal-engine) | replication |
| Net modes: listen server, dedicated server, client, standalone | networking | The role of the whole process. | Hosting vs joining. | 10 | [Networking Overview](https://dev.epicgames.com/documentation/unreal-engine/networking-overview-for-unreal-engine) | net-mode, listen-server, dedicated-server |
| Server RPC | networking | Client asks, server runs. | Attack and use requests. | 10 | [Remote Procedure Calls](https://dev.epicgames.com/documentation/en-us/unreal-engine/remote-procedure-calls-in-unreal-engine) | server-rpc |
| Client RPC | networking | Server tells one owning client. | Personal feedback. | 10 (named) | [Remote Procedure Calls](https://dev.epicgames.com/documentation/en-us/unreal-engine/remote-procedure-calls-in-unreal-engine) | client-rpc |
| NetMulticast RPC | networking | Server tells everyone now. | Attack animation for all, explosion effects. | 10 | [Remote Procedure Calls](https://dev.epicgames.com/documentation/en-us/unreal-engine/remote-procedure-calls-in-unreal-engine) | netmulticast-rpc |
| Reliable and Unreliable | networking | Guaranteed vs droppable messages. | Critical actions vs frequent cosmetics. | 10 | [Remote Procedure Calls](https://dev.epicgames.com/documentation/en-us/unreal-engine/remote-procedure-calls-in-unreal-engine) | reliable-unreliable |
| _Implementation suffix for RPC bodies | networking | Where the RPC's code is written. | Every RPC. | 10 | [Remote Procedure Calls](https://dev.epicgames.com/documentation/en-us/unreal-engine/remote-procedure-calls-in-unreal-engine) | server-rpc |
| bReplicates, Replicate Movement | networking | Actor-level replication switches. | Server-spawned projectiles visible to clients. | 10 | [Networking Overview](https://dev.epicgames.com/documentation/unreal-engine/networking-overview-for-unreal-engine) | replication |
| Replicated, GetLifetimeReplicatedProps, DOREPLIFETIME | networking | Property replication setup. | Health, timer, win flag. | 10, 11 | [Replicate Actor Properties](https://dev.epicgames.com/documentation/unreal-engine/replicate-actor-properties-in-unreal-engine) | replicated-property |
| ReplicatedUsing (RepNotify) | networking | Client callback when a replicated value arrives. | Updating health bars and timers. | 10, 11 | [Replicate Actor Properties](https://dev.epicgames.com/documentation/unreal-engine/replicate-actor-properties-in-unreal-engine) | repnotify |
| RepNotify does not fire on the server in C++ | networking | Call the handler yourself on a listen server host. | Host's own UI updates. | 10, 11 | [Replicate Actor Properties](https://dev.epicgames.com/documentation/unreal-engine/replicate-actor-properties-in-unreal-engine) | repnotify |
| Server authority and HasAuthority | networking | Only the authoritative copy changes game state. | Damage, scoring, spawning. | 10 | [Networking Overview](https://dev.epicgames.com/documentation/unreal-engine/networking-overview-for-unreal-engine) | has-authority |
| GetNetMode | networking | Ask the process's net mode. | Server-only spawning. | 10, 11 | [Networking Overview](https://dev.epicgames.com/documentation/unreal-engine/networking-overview-for-unreal-engine) | net-mode |
| Where framework classes exist online | networking | Game mode on server only; game state and player states everywhere; game instance per process. | Deciding where data lives. | 5, 11 | [Game Mode and Game State](https://dev.epicgames.com/documentation/unreal-engine/game-mode-and-game-state-in-unreal-engine) | game-mode-base |
| Latency, prediction and lag compensation (named) | networking | Why client actions feel delayed and how games hide it. | Responsive shooters. | 10 (named) | [Networked Movement in CMC](https://dev.epicgames.com/documentation/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine) | character-movement-component |
| Replicating components and subobjects | networking | Components and UObjects can replicate too. | Replicated inventory component. | S | [Replicating Actor Components](https://dev.epicgames.com/documentation/unreal-engine/replicating-actor-components-in-unreal-engine) | replication |
| Net roles: autonomous and simulated proxies | networking | Per-actor role detail beyond authority. | Local-only effects for your own pawn. | S | [Networking Overview](https://dev.epicgames.com/documentation/unreal-engine/networking-overview-for-unreal-engine) | has-authority |

### 2.16 Editor workflow

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| C++ and Blueprint split | editor workflow | C++ for systems and heavy logic, Blueprint for content and tuning. | Every project's architecture. | 1, 5 | [Blueprint vs C++](https://dev.epicgames.com/documentation/unreal-engine/coding-in-unreal-engine-blueprint-vs-cplusplus) | blueprint-vs-cpp |
| Creating a C++ project from a template | editor workflow | Choose a template and the C++ option. | Project setup. | 1, 5 | [Unreal Engine CPP Quick Start](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-cpp-quick-start) | - |
| Converting a Blueprint project to C++ | editor workflow | Add one C++ class through the editor. | Growing a prototype. | 1 | [Managing Game Code](https://dev.epicgames.com/documentation/unreal-engine/managing-game-code-in-unreal-engine) | - |
| IDE setup and source code editor preference | editor workflow | Install the C++ game workloads; pick the IDE in Editor Preferences. | First-day setup. | 1 | [Setting Up Your Development Environment](https://dev.epicgames.com/documentation/unreal-engine/setting-up-your-development-environment-for-cplusplus-in-unreal-engine) | ide-debugging |
| Engine source option | editor workflow | Install engine source to read and step into engine code. | Debugging engine behavior. | 1 | [Setting Up Your Development Environment](https://dev.epicgames.com/documentation/unreal-engine/setting-up-your-development-environment-for-cplusplus-in-unreal-engine) | ide-debugging |
| New C++ Class wizard | editor workflow | Pick a parent, name the class, choose public and private folders. | Adding classes with correct boilerplate. | 1, 5 | [Managing Game Code](https://dev.epicgames.com/documentation/unreal-engine/managing-game-code-in-unreal-engine) | - |
| Live Coding (the compile button) | editor workflow | Patch code into the running editor. | Fast iteration on function bodies. | 5 | [Live Coding](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-live-coding-to-recompile-unreal-engine-applications-at-runtime) | live-coding |
| Generate project files | editor workflow | Rebuild the IDE solution after file changes outside the editor. | After deleting or renaming source files. | 5 | [Generate Project Files](https://dev.epicgames.com/documentation/en-us/unreal-engine/how-to-generate-unreal-engine-project-files-for-your-ide) | generate-project-files |
| Blueprint class from a C++ parent | editor workflow | BP_ child that sets assets and values. | Variants of towers, weapons, enemies. | 4, 5 | [Blueprint vs C++](https://dev.epicgames.com/documentation/unreal-engine/coding-in-unreal-engine-blueprint-vs-cplusplus) | blueprint-class |
| Components panel vs Details panel | editor workflow | Components appear in the tree; plain properties in Details. | Finding where a C++ member shows up. | 4, 5 | [Components](https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine) | blueprint-class |
| Blueprint component event from the plus button | editor workflow | Adding a component's event node in a Blueprint and calling C++ from it. | Designer-wired collision reactions. | 8 | [Collision Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview) | overlap-event |
| Project Settings: Maps and Modes | editor workflow | Default game mode, pawn, controller, state, instance, default maps. | Project-wide framework setup. | 6, 12 | [Project Section of Project Settings](https://dev.epicgames.com/documentation/en-us/unreal-engine/project-section-of-the-unreal-engine-project-settings) | default-pawn-class |
| Content folder organization and asset prefixes | editor workflow | Folders by type or feature; BP_, ABP_, M_ prefixes. | Keeping projects navigable. | 5, 8 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | coding-standard |
| Materials basics (Texture Sample, base color, normal, metallic, roughness) | editor workflow | Simple material graphs for imported assets. | Making imported models look right. | 6, 8 | [Material Concepts](https://dev.epicgames.com/documentation/unreal-engine/essential-unreal-engine-material-concepts) | - |
| Level Blueprint | editor workflow | Per-map scripting graph. | Showing the lobby widget; map-only events. | 11, 12 | [Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine) | level-blueprint |
| Play In Editor: players and net mode | editor workflow | Multi-window testing with listen server, client or standalone. | Testing multiplayer on one machine. | 10, 11 | [Networking and Multiplayer](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-and-multiplayer-in-unreal-engine) | play-in-editor |
| Close the project from the editor, not the debugger | editor workflow | Avoid losing unsaved assets and settings. | Daily habit. | 4, 6 | [Setting Up Your Development Environment](https://dev.epicgames.com/documentation/unreal-engine/setting-up-your-development-environment-for-cplusplus-in-unreal-engine) | ide-debugging |
| Editor subsystems | editor workflow | Managed homes for editor tools. | Batch asset tools, validators. | S | [Programming Subsystems](https://dev.epicgames.com/documentation/unreal-engine/programming-subsystems-in-unreal-engine) | editor-subsystem |

### 2.17 Build

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| Project folder layout | build | Source, Config, Content, the module folder, Saved, the solution. | Navigating any project. | 4 | [Directory Structure](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-directory-structure) | uproject |
| .uproject | build | JSON with engine association, modules, plugins. | Opening, switching engine versions, enabling plugins. | 4, 5 | [Directory Structure](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-directory-structure) | uproject |
| Config ini files | build | Project and engine settings saved as text. | Default game settings, input settings. | 4 | [Directory Structure](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-directory-structure) | - |
| Modules and IMPLEMENT_PRIMARY_GAME_MODULE | build | Code units with their own Build.cs; the main one is registered with a macro. | Every project; editor tool modules. | 4 | [Unreal Engine Modules](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-modules) | module |
| Build.cs dependency lists | build | Modules your code uses, such as Core, CoreUObject, Engine, InputCore, EnhancedInput, UMG, AIModule. | Fixing missing include or linker errors. | 4 | [Module Properties](https://dev.epicgames.com/documentation/unreal-engine/module-properties-in-unreal-engine) | build-cs |
| Target.cs (game and editor) | build | One file per executable type. | Adding server targets. | 4 | [UBT Target Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-build-tool-target-reference) | target-cs |
| Module API macro (PROJECT_API) | build | Exports a class from its module. | Every wizard-made class. | 5 | [Unreal Engine Modules](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-modules) | api-macro |
| Unreal Build Tool | build | Builds modules per target and configuration. | Every compile. | S | [Unreal Build Tool](https://dev.epicgames.com/documentation/unreal-engine/unreal-build-tool-in-unreal-engine) | unreal-build-tool |
| Build configurations | build | DebugGame, Development, Shipping, plus Editor variants. | Debugging vs release builds. | 4, 12 | [Compiling Game Projects](https://dev.epicgames.com/documentation/unreal-engine/compiling-game-projects-in-unreal-engine-using-cplusplus) | build-configurations |
| Packaging and maps to include | build | Standalone build with cooked content; list every map. | Shipping builds to testers. | 12 | [Packaging Your Project](https://dev.epicgames.com/documentation/unreal-engine/packaging-your-project) | packaging |
| Cooking and deploying | build | Converting content per platform before packaging. | Platform builds. | 12 | [Build Operations](https://dev.epicgames.com/documentation/en-us/unreal-engine/build-operations-cooking-packaging-deploying-and-running-projects-in-unreal-engine) | packaging |
| Hardcoded paths break in packages | build | Path lookups fail if assets move; expose class properties instead. | Robust asset references. | 12 | [Referencing Assets](https://dev.epicgames.com/documentation/en-us/unreal-engine/referencing-assets-in-unreal-engine) | tsubclassof |
| Includes: CoreMinimal first, base class header, generated header last | build | Standard header include order. | Every header. | 5, 6 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | generated-h-include |

### 2.18 Debugging

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| Debugging from the IDE | debugging | Run the editor with the debugger; breakpoints, stepping, watches. | Tracing gameplay bugs and engine code. | 4 | [Setting Up Your Development Environment](https://dev.epicgames.com/documentation/unreal-engine/setting-up-your-development-environment-for-cplusplus-in-unreal-engine) | ide-debugging |
| Natvis visualizers | debugging | IDE display rules that make engine types readable in the debugger. | Inspecting FString, TArray in watches. | 4 | [Setting Up Your Development Environment](https://dev.epicgames.com/documentation/unreal-engine/setting-up-your-development-environment-for-cplusplus-in-unreal-engine) | ide-debugging |
| UE_LOG with LogTemp and verbosity | debugging | Messages to the Output Log and log files. | Tracing events. | 9 | [Logging](https://dev.epicgames.com/documentation/en-us/unreal-engine/logging-in-unreal-engine) | ue-log |
| Log files in Saved/Logs | debugging | Persistent logs for later inspection. | Reading a tester's crash context. | 9 | [Logging](https://dev.epicgames.com/documentation/en-us/unreal-engine/logging-in-unreal-engine) | ue-log |
| Custom log categories | debugging | Per-system log channels. | Filtering combat or AI logs. | S | [Logging](https://dev.epicgames.com/documentation/en-us/unreal-engine/logging-in-unreal-engine) | log-category |
| AddOnScreenDebugMessage | debugging | Temporary text on the game screen. | Quick checks on devices without a log window. | 9 | [AddOnScreenDebugMessage](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Engine/UEngine/AddOnScreenDebugMessage/2) | on-screen-debug-message |
| check and ensure | debugging | Hard and soft assertions. | Guarding assumptions. | S | [Asserts](https://dev.epicgames.com/documentation/en-us/unreal-engine/asserts-in-unreal-engine) | check-macro, ensure-macro |
| Visual Logger | debugging | Records gameplay data over time for later scrubbing. | AI and movement debugging. | S | [Visual Logger](https://dev.epicgames.com/documentation/en-us/unreal-engine/visual-logger-in-unreal-engine) | - |
| Console and console commands | debugging | Tilde console: stat fps, stat unit, r.SetRes, open, exit, DumpConsoleCommands. | Testing and tuning. | 12 | [Stat Commands](https://dev.epicgames.com/documentation/en-us/unreal-engine/stat-commands-in-unreal-engine) | console-command |
| Console variables | debugging | Readable and settable engine settings. | Debug toggles. | 12 | [Console Variables Reference](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-console-variables-reference) | console-command |
| ConsoleCommand from C++ | debugging | Run console commands from the player controller. | Setting resolution or showing stats from code. | 12 | [APlayerController](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/APlayerController) | console-command |
| Network debugging commands | debugging | Console commands for network stats and simulation. | Testing lag. | 12 (link only) | [Network Debugging Commands](https://dev.epicgames.com/documentation/en-us/unreal-engine/console-commands-for-network-debugging-in-unreal-engine) | console-command |
| Profiling: Unreal Insights, GPU Visualizer, view modes | debugging | Measure CPU, GPU and memory costs. | Finding frame-rate bottlenecks. | 12 | [Unreal Insights](https://dev.epicgames.com/documentation/unreal-engine/unreal-insights-in-unreal-engine) | profiling |
| Performance profiling basics | debugging | Where to start when the game is slow. | Optimization passes. | 12 | [Introduction to Performance Profiling](https://dev.epicgames.com/documentation/en-us/unreal-engine/introduction-to-performance-profiling-and-configuration-in-unreal-engine) | profiling |
| Automation tests | debugging | Engine-registered C++ tests run from the editor or command line. | Regression checks; Dojo's build quest verifier. | S | [Write C++ Tests](https://dev.epicgames.com/documentation/unreal-engine/write-cplusplus-tests-in-unreal-engine) | automation-test |
| Automation Spec | debugging | Behavior-style test syntax in the same framework. | Larger test suites. | S | [Automation Spec](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-spec-in-unreal-engine) | automation-test |
| Code review and QA | debugging | Peer review and systematic testing as part of bug fixing. | Team workflow. | 12 | [Automation Test Framework](https://dev.epicgames.com/documentation/unreal-engine/automation-test-framework-in-unreal-engine) | - |

### 2.19 C++ idioms the Unreal chapters rely on

| Concept | Category | Definition | Where it shows up in a real project | Ch | Epic docs | Glossary id |
|---|---|---|---|---|---|---|
| Epic coding standard and type prefixes | cpp idiom | A, U, F, E, I, T prefixes; b for bools; PascalCase. | Every file. | 4, 5 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | coding-standard |
| Forward declarations | cpp idiom | Declare a class in a header instead of including it. | Faster builds, no circular includes. | 4, 8 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | forward-declaration |
| FORCEINLINE const getters | cpp idiom | Inline accessors for private members. | Component getters. | 5, 6 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | forceinline |
| virtual and override | cpp idiom | Overriding engine functions safely. | BeginPlay, Tick, SetupPlayerInputComponent. | 4, 5, 9 | [Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | super |
| #pragma once | cpp idiom | Include a header only once per compile. | Every header. | 3, 5 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | - |
| auto | cpp idiom | Let the compiler infer a type; Epic's standard limits where it is allowed. | Short-lived locals from casts. | 6 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | - |
| enum class | cpp idiom | Scoped enums; required style for UENUM. | Character states. | 6 | [UEnum API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/CoreUObject/UEnum) | uenum |
| const member functions | cpp idiom | Functions that promise not to change the object. | Getters, pure Blueprint functions. | 5 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | blueprintpure |
| Access sections (public, protected, private) | cpp idiom | Control who can touch members. | Encapsulating state behind getters. | 3, 4, 5 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | allowprivateaccess |
| Inheritance refactor into a shared parent | cpp idiom | Move duplicate members up to a common base class. | Shared character base for player and enemy. | 9 | [Characters](https://dev.epicgames.com/documentation/unreal-engine/characters-in-unreal-engine) | character |
| References and pointers | cpp idiom | Aliases vs addresses; UObjects are always used through pointers. | Passing FHitResult by const reference; UObject pointers. | 3 | [Coding Standard](https://dev.epicgames.com/documentation/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) | - |

---

## Part 3. Mapping onto Unreal Dojo packs

### 3.1 Pack 1, Unreal C++ Foundations (glossary ids per world)

Order inside each world follows the book's teaching order where it covers the topic. Ids in parentheses are supplemental (not in the book), so the concept quest for them has no book scaffold and leans on the Epic link.

1. **Objects and reflection:** uobject, actor, uclass, generated-body, generated-h-include, uproperty, editanywhere, visibleanywhere, blueprintreadwrite, blueprintreadonly, category-specifier, meta-specifier, allowprivateaccess, displayname-meta, ufunction, blueprintcallable, blueprintpure, blueprintimplementableevent, blueprintnativeevent, uenum, (ustruct), (cdo), reflection, (unreal-header-tool), coding-standard, forward-declaration, api-macro, cast, isa.
2. **Memory and ownership under GC:** garbage-collection, destroy, (tobjectptr), (tweakobjectptr), (tsoftobjectptr), tsubclassof, (tsharedptr), (tuniqueptr), (newobject), createdefaultsubobject, (isvalid), object-pool, constructor-helpers.
3. **Containers and strings:** tarray, (tmap), (tset), tqueue, fstring, fname, ftext, text-macro, fvector, frotator, fquat, (ftransform), fmath, kismet-math-library.
4. **The gameplay framework:** pawn, character, actor-component, scene-component, primitive-component, root-component, attach-to-component, game-mode-base, default-pawn-class, game-state-base, player-controller, (player-state), game-instance, possession, world, level, gameplay-statics, open-level, (subsystem and its five variants), beginplay, endplay, on-construction, super.
5. **Communication:** dynamic-multicast-delegate, adddynamic, broadcast, unbinding-delegates, blueprintassignable, (delegate), (multicast-delegate), (dynamic-delegate), (uinterface), (iinterface), tick, deltatime, primary-actor-tick, (tick-groups), (timer-handle), (timer-manager).
6. **Data and tools:** (data-asset), (primary-data-asset), (data-table), (table-row-base), (curve-float), (tsoftobjectptr reused), ue-log, (log-category), on-screen-debug-message, (check-macro), (ensure-macro), live-coding, generate-project-files, unreal-build-tool, build-cs, module, target-cs, uproject, build-configurations, ide-debugging, (automation-test), blueprint-vs-cpp, blueprint-class.

### 3.2 Pack 3, Mechanics Lab (where the book's Pangaea mechanics fit)

- **Enhanced Input world:** enhanced-input, input-action, input-mapping-context, input-trigger, input-modifier, etriggerevent, finputactionvalue, enhanced-input-component, setup-player-input-component; legacy-input as a "read old code" item. Book source mechanic: the attack button from Chapter 7, rebuilt in Enhanced Input.
- **Transforms and movement:** fvector, frotator, fquat, ftransform, character-movement-component, spring-arm-component, camera-component, projectile-movement-component. Book source mechanics: top-down camera rig, spinning pickup, manual projectile flight.
- **Collision:** capsule-component, box-component, sphere-component, collision-channel, collision-response, collision-preset, generate-overlap-events, overlap-event, hit-event. Book source mechanics: weapon pickup and drop, tower aggro sphere.
- **Spawning and timers:** spawnactor, tsubclassof, timer-manager, timer-handle, object-pool, destroy. Book source mechanics: tower firing, enemy weapon spawn, fireball pool (rebuilt with a UPROPERTY array and a timer).
- **Tracing:** line-trace, sweep, fhitresult, collision-query-params. Book source mechanic: fireball hit check.
- **Delegates:** delegate, multicast-delegate, dynamic-multicast-delegate, broadcast, unbinding-delegates, blueprintassignable. Book source mechanics: use-item delegate, game state timer and win and lose events.

Pack 4 sources from the book: AI perception and behavior (ai-controller, pawn-sensing, ai-perception, nav-mesh, behavior-tree, blackboard; the book's chasing enemy as a starting point), interaction (uinterface), save and load (savegame), abilities (gameplay-tags, gas pointer). Networking (replication, replicated-property, repnotify, server-rpc, client-rpc, netmulticast-rpc, has-authority, net-mode, listen-server, dedicated-server, play-in-editor) and UI (umg, user-widget, bindwidget, widget-component) have no pack of their own in `docs/product.md` yet; the book's Chapters 10 and 11 are a ready outline if one is added.

---

## Part 4. Ten common beginner mistakes in Unreal C++

1. **Storing a UObject pointer in a member without UPROPERTY.** The garbage collector cannot see it, so the object may be freed while you still point at it, and the crash shows up far from the cause.
   Fix: give every UObject member a UPROPERTY, using `TObjectPtr<T>` in UE5. For a reference you do not own, use `TWeakObjectPtr<T>` and check it before use.

2. **Binding a handler that is not a UFUNCTION, or has the wrong parameters.** `AddDynamic` on an overlap or hit event finds the function by name through reflection; a plain function, or one with a different parameter list, never gets called.
   Fix: mark the handler `UFUNCTION()` and copy the exact signature the delegate expects. Bind in `BeginPlay`, not the constructor.

3. **Doing gameplay setup in the constructor.** The constructor builds the class default object, often before any world exists, so finding actors, starting timers, or reading the game mode there fails or does nothing.
   Fix: create components and set default values in the constructor; do runtime setup in `BeginPlay`.

4. **Using a pointer without checking it.** A failed `Cast`, an unassigned Blueprint field, or an actor destroyed this frame all give you a pointer that is null or about to be invalid.
   Fix: check `Cast` results against nullptr, use `IsValid()` on anything you did not just create, and use `ensure` for "a designer forgot to assign this" cases so the editor logs it instead of crashing.

5. **Forgetting `Super::` in overrides.** Skipping `Super::BeginPlay()` or `Super::Tick(DeltaTime)` silently breaks parent behavior, including Blueprint BeginPlay events, ticking setup, and input bindings.
   Fix: make the `Super` call the first line of every override of an engine function, and mark the declaration `override`.

6. **Moving things by a fixed amount per frame.** `Location += Speed` makes the game run faster on faster machines.
   Fix: multiply by `DeltaTime`, and prefer movement components or timers over hand-written Tick counters where they fit.

7. **Doing everything in Tick.** Polling for state every frame, running firing logic each tick, or leaving ticking on for idle actors wastes frame time and causes bugs like a tower firing sixty times a second.
   Fix: react to events with delegates, use `SetTimer` for repeats and delays, and set `PrimaryActorTick.bCanEverTick = false` on actors that never need it.

8. **Hardcoding asset paths in C++.** `ConstructorHelpers` with a content path breaks the moment someone moves or renames the asset, sometimes only in a packaged build.
   Fix: expose a `UPROPERTY(EditDefaultsOnly) TSubclassOf<T>` or `TObjectPtr<T>` and assign it in a Blueprint child or the class defaults.

9. **Breaking the header rules.** Putting an include after the `.generated.h` line, forgetting `GENERATED_BODY()`, or missing a module in Build.cs produces long error lists that do not point at the real cause.
   Fix: in every reflected header, include `CoreMinimal.h` first, then the base class header, then other needed headers, then the generated header last; forward declare where you can; add the module (for example `EnhancedInput`, `UMG`, `AIModule`) to Build.cs when you use its classes.

10. **Changing replicated state on a client.** Setting health or spawning an actor on a client works in single-player tests and then desyncs or vanishes online, because only the server's changes replicate.
    Fix: change authoritative state only where `HasAuthority()` is true; clients send requests through Server RPCs; show results through replicated properties with RepNotify; test early with two players in Play In Editor.
