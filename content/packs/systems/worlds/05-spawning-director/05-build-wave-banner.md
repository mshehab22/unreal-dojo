---
id: s5-wave-banner
title: A banner that only listens to the director
order: 5
kind: build
scaffold: blank
difficulty: 3
patterns: [observer]
skills: [delegates, text]
terms: [dynamic-multicast-delegate, adddynamic, unbinding-delegates, endplay, ftext, tobjectptr]
prerequisites: [s5-wave-director, s5-pool, s5-wave-plan]
xp: 90
estimatedMinutes: 25
concepts:
  - A view that subscribes to three events and rewrites one line, with no Tick
  - Following one director at a time, and leaving no binding behind
---

# Brief

When a director starts wave 2 with 6 beetles, the banner over the pit reads `Wave 2: 6 beetles` in the same frame; when the wave is cleared and a rest of 2.5 seconds begins, it reads `Rest: wave 3 in 3 s`; and when the banner is removed from the level, the director has no listener left.

Write `ADojoS5WaveBanner` from nothing. It is an actor with a text display. The director knows nothing about it: the banner only subscribes.

The tests use this public interface, so keep these names:

- `UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> Display;` holds the line.
- `void Watch(ADojoS5WaveDirector* Director)` starts following that director's three events. It stops following whatever it followed before and clears the line. With null it follows nothing and the line stays empty.

The line is exactly one of these, rewritten by each event:

- `OnWaveStarted`: `Wave 2: 6 beetles`, or `Wave 4: 1 beetle` for a single beetle.
- `OnWaveCleared`: `Wave 2 cleared`.
- `OnRestStarted`: `Rest: wave 3 in 3 s`, with the seconds rounded up to a whole number.

Watching the same director twice must not bind twice, and a banner that leaves play, or watches another director, must leave no binding on the old one.

Compiles against earlier quests: s5-wave-director (`Quests/s5-wave-director/DojoS5WaveDirector.h`), s5-pool (`Quests/s5-pool/DojoS5PoolComponent.h`, `Quests/s5-pool/DojoS5Beetle.h`), and s5-wave-plan (`Quests/s5-wave-plan/DojoS5WavePlan.h`, `Quests/s5-wave-plan/DojoS5Hatch.h`).

This is the last piece of the Beetle Pit boss.

## See it in the editor

Place a `DojoS5WaveBanner` above the pit beside the director from the last quest. In the level Blueprint, select the banner and the director in the level, right-click the graph and choose Create References to Selected Actors; on BeginPlay call Watch on the banner with the director before Start Night. Press Play: the banner shows wave 1 with its count; swat the beetles with the 1 key and it shows the rest, then wave 2. On the 2 key call Destroy Actor on the banner, then keep swatting: the night goes on and nothing errors.

# Files

## DojoS5WaveBanner.h

```cpp
// Declare ADojoS5WaveBanner here.
```

## DojoS5WaveBanner.cpp

```cpp
// Define ADojoS5WaveBanner here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/s5-pool/DojoS5Beetle.h"
#include "Quests/s5-pool/DojoS5PoolComponent.h"
#include "Quests/s5-wave-banner/DojoS5WaveBanner.h"
#include "Quests/s5-wave-director/DojoS5WaveDirector.h"
#include "Quests/s5-wave-plan/DojoS5Hatch.h"
#include "Quests/s5-wave-plan/DojoS5WavePlan.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS5BannerTest
{
	/** The banner's current line. */
	FString LineOf(const ADojoS5WaveBanner* Banner)
	{
		if (Banner == nullptr || Banner->Display == nullptr) return FString(TEXT("(the banner has no display)"));
		return Banner->Display->Text.ToString();
	}

	/** True when any of the director's three events still has a listener. */
	bool HasListeners(const ADojoS5WaveDirector* Director)
	{
		return Director->OnWaveStarted.IsBound() || Director->OnWaveCleared.IsBound() || Director->OnRestStarted.IsBound();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_WaveBanner_Lines, "Dojo.S5.WaveBanner.Lines", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Sends each announcement by hand and checks the exact line after each one. */
bool FDojo_S5_WaveBanner_Lines::RunTest(const FString& Parameters)
{
	using namespace DojoS5BannerTest;

	FDojoTestWorld TestWorld;
	ADojoS5WaveDirector* Director = TestWorld.SpawnActor<ADojoS5WaveDirector>();
	ADojoS5WaveBanner* Banner = TestWorld.SpawnActor<ADojoS5WaveBanner>();
	if (!TestNotNull(TEXT("Director spawned"), Director) || !TestNotNull(TEXT("Banner spawned"), Banner)) return false;
	if (!TestNotNull(TEXT("The banner has a display"), Banner->Display.Get())) return false;

	Banner->Watch(Director);
	TestEqual(TEXT("Watching starts with an empty line"), LineOf(Banner), FString());

	Director->OnWaveStarted.Broadcast(1, 3);
	TestEqual(TEXT("A wave start names the wave and its beetles"), LineOf(Banner), FString(TEXT("Wave 1: 3 beetles")));

	Director->OnWaveStarted.Broadcast(4, 1);
	TestEqual(TEXT("One beetle is a beetle"), LineOf(Banner), FString(TEXT("Wave 4: 1 beetle")));

	Director->OnWaveCleared.Broadcast(4);
	TestEqual(TEXT("A cleared wave"), LineOf(Banner), FString(TEXT("Wave 4 cleared")));

	Director->OnRestStarted.Broadcast(5, 2.5f);
	TestEqual(TEXT("A rest rounds its seconds up"), LineOf(Banner), FString(TEXT("Rest: wave 5 in 3 s")));

	Director->OnRestStarted.Broadcast(2, 2.2f);
	TestEqual(TEXT("A rest of 2.2 seconds rounds up too, not to the nearest"), LineOf(Banner), FString(TEXT("Rest: wave 2 in 3 s")));

	Director->OnRestStarted.Broadcast(2, 3.f);
	TestEqual(TEXT("Whole seconds stay as they are"), LineOf(Banner), FString(TEXT("Rest: wave 2 in 3 s")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_WaveBanner_OneDirectorAtATime, "Dojo.S5.WaveBanner.OneDirectorAtATime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Watches one director twice, switches to another, watches nothing, and leaves play, checking which director still has a listener after each step. */
bool FDojo_S5_WaveBanner_OneDirectorAtATime::RunTest(const FString& Parameters)
{
	using namespace DojoS5BannerTest;

	FDojoTestWorld TestWorld;
	ADojoS5WaveDirector* First = TestWorld.SpawnActor<ADojoS5WaveDirector>();
	ADojoS5WaveDirector* Second = TestWorld.SpawnActor<ADojoS5WaveDirector>();
	ADojoS5WaveBanner* Banner = TestWorld.SpawnActor<ADojoS5WaveBanner>();
	if (!TestNotNull(TEXT("Directors spawned"), Second) || !TestNotNull(TEXT("Banner spawned"), Banner) || !TestNotNull(TEXT("First spawned"), First)) return false;

	Banner->Watch(First);
	Banner->Watch(First);
	TestTrue(TEXT("The first director has the banner as a listener"), HasListeners(First));

	First->OnWaveStarted.Broadcast(1, 2);
	TestEqual(TEXT("The banner follows the first director"), LineOf(Banner), FString(TEXT("Wave 1: 2 beetles")));

	Banner->Watch(Second);
	TestFalse(TEXT("Switching leaves no binding on the first director, however often it was watched"), HasListeners(First));
	TestTrue(TEXT("The second director has the banner"), HasListeners(Second));
	TestEqual(TEXT("Switching clears the line"), LineOf(Banner), FString());

	First->OnWaveCleared.Broadcast(1);
	TestEqual(TEXT("The old director no longer reaches the banner"), LineOf(Banner), FString());

	Second->OnWaveCleared.Broadcast(3);
	TestEqual(TEXT("The new one does"), LineOf(Banner), FString(TEXT("Wave 3 cleared")));

	Banner->Watch(nullptr);
	TestFalse(TEXT("Watching nothing unbinds from the second director"), HasListeners(Second));
	TestEqual(TEXT("And clears the line"), LineOf(Banner), FString());

	Banner->Watch(Second);
	Banner->Destroy();
	TestFalse(TEXT("A banner that leaves play leaves no listener behind"), HasListeners(Second));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_WaveBanner_RealNight, "Dojo.S5.WaveBanner.RealNight", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Runs a real two wave night of one beetle each and reads the banner at every turn. */
bool FDojo_S5_WaveBanner_RealNight::RunTest(const FString& Parameters)
{
	using namespace DojoS5BannerTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Viewer = TestWorld.SpawnActor<ADojoTestActor>();
	ADojoTestActor* Burrow = TestWorld.SpawnActor<ADojoTestActor>();
	UDojoS5PoolComponent* Pool = TestWorld.AddComponent<UDojoS5PoolComponent>(Burrow);
	ADojoS5Hatch* Hatch = TestWorld.SpawnActor<ADojoS5Hatch>();
	ADojoS5WaveDirector* Director = TestWorld.SpawnActor<ADojoS5WaveDirector>();
	ADojoS5WaveBanner* Banner = TestWorld.SpawnActor<ADojoS5WaveBanner>();
	if (!TestNotNull(TEXT("Pool added"), Pool) || !TestNotNull(TEXT("Hatch spawned"), Hatch) || !TestNotNull(TEXT("Director spawned"), Director) || !TestNotNull(TEXT("Banner spawned"), Banner)) return false;

	Hatch->SetActorLocation(FVector(-800.f, 0.f, 0.f));

	UDojoS5WavePlan* Plan = NewObject<UDojoS5WavePlan>();
	Plan->BaseCount = 1;
	Plan->FinalWave = 2;
	Plan->RestSeconds = 2.5f;

	Director->Setup(Plan, Pool, Viewer, { Hatch });
	Banner->Watch(Director);
	Director->StartNight();
	TestEqual(TEXT("The night opens with wave 1"), LineOf(Banner), FString(TEXT("Wave 1: 1 beetle")));

	for (ADojoS5Beetle* Beetle : Pool->GetAwakeBeetles())
	{
		Beetle->Defeat();
	}
	TestEqual(TEXT("The rest follows the clear in the same frame"), LineOf(Banner), FString(TEXT("Rest: wave 2 in 3 s")));

	TestWorld.Tick(160);
	TestEqual(TEXT("Wave 2 after the rest"), LineOf(Banner), FString(TEXT("Wave 2: 1 beetle")));

	for (ADojoS5Beetle* Beetle : Pool->GetAwakeBeetles())
	{
		Beetle->Defeat();
	}
	TestEqual(TEXT("The last wave ends on its clear"), LineOf(Banner), FString(TEXT("Wave 2 cleared")));

	return true;
}

#endif
```

# Hints

- Each of the three handlers must match its delegate's parameter list in the director's header exactly, or the binding will not compile.
- Remember which director you follow in a member, so that a later watch and the end of play can unbind from it, and make binding safe to repeat.
- The line is a string you build for each event, with the seconds rounded up, and the text component takes it as text.

# Rubric

- The banner rewrites its line only from the director's three events, never from Tick or a timer.
- Each line matches its format exactly, including `1 beetle` and the rest's seconds rounded up.
- Watching a different director, or nothing, unbinds from the old one and clears the line, and watching the same one twice binds once.
- The banner unbinds from all three events when it leaves play.
- The director holds no pointer to the banner; the banner holds the one pointer it needs to unbind.

# Alternative

The director could own a pointer to the banner and call `SetText` itself. That is one less file, but then the director needs to know there is a banner, a second banner needs a second pointer, and a gate or a sound that also reacts to waves each adds another. With events the director stays the same however many things listen. A UMG widget would listen in exactly the same way and draw the line on the player's screen instead of over the pit; only the drawing changes. This is Observer from Pack 2's first world, with the banner as the subscriber.

# Parsons

```yaml
- id: banner-watch
  prompt: Put Watch in order, using the names from the reference; it stops following before it clears the line, and the other two events are bound the same way and left out here.
  lines:
    - "void ADojoS5WaveBanner::Watch(ADojoS5WaveDirector* Director)"
    - "{"
    - "	StopWatching();"
    - "	ShowLine(FString());"
    - "	if (Director == nullptr)"
    - "	{"
    - "		return;"
    - "	}"
    - "	Watched = Director;"
    - "	Watched->OnWaveStarted.AddUniqueDynamic(this, &ADojoS5WaveBanner::HandleWaveStarted);"
    - "}"
  distractors:
    - line: "	Watched->OnWaveStarted.AddUniqueDynamic(this, &HandleWaveStarted);"
      mistake: A member function pointer needs the class name, &ADojoS5WaveBanner::HandleWaveStarted; the binding macro also reads the function's name from it.
    - line: "	Watched->OnWaveStarted.Clear();"
      mistake: Clear removes every listener of the director, including ones that belong to other actors; the banner removes only its own.
```
