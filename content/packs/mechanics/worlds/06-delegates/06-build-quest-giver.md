---
id: m6-quest-giver
title: A quest giver whose label keeps itself current
order: 6
kind: build
scaffold: blank
difficulty: 3
patterns: [observer]
skills: [delegates]
terms: [world-subsystem, adddynamic, unbinding-delegates, endplay, beginplay]
prerequisites: [m6-quest-tracker]
xp: 120
estimatedMinutes: 30
concepts:
  - A listener filters a shared event down to the one thing it cares about
  - Subscribe in BeginPlay, unsubscribe in EndPlay
---

# Brief

When you place a giver for the courier run and press Play, its label reads LOCKED; the moment the tools quest is completed it reads QUEST without anyone touching the giver, talking to it makes it read ACTIVE, and when the run's time is up it reads RETRY.

Write `ADojoM6QuestGiver` from nothing. It shows its quest's state above its head with a text render component as its root, and it finds the quest tracker through the world, listens to its state event, and stops listening when it leaves play. It reacts only to its own quest's changes. It never polls and never ticks.

The tests use this public interface, so keep these names:

- `UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> Label;` reading `LOCKED`, `QUEST` (Available), `ACTIVE`, `DONE` (Completed), or `RETRY` (Failed).
- `UPROPERTY(EditAnywhere, BlueprintReadOnly) TObjectPtr<UDojoM6QuestData> Quest;` the quest it offers.
- `UFUNCTION(BlueprintCallable) bool Interact();` starts the quest through the tracker; false when the tracker refuses.
- The handler bound to the tracker is a UFUNCTION named `HandleQuestStateChanged`.

Compiles against earlier quests: m6-quest-tracker (`Quests/m6-quest-tracker/DojoM6QuestData.h`, `Quests/m6-quest-tracker/DojoM6QuestTracker.h`).

## See it in the editor

With the two quest assets from the tracker quest, place two `DojoM6QuestGiver` actors and give each one a quest. In the level Blueprint, on BeginPlay, add both quests to the tracker; on the 1 key call Interact on the first giver, on the 2 key report a Tool. Press Play: the second giver reads LOCKED. Press 1, then 2 three times: the first giver reads DONE and the second changes to QUEST by itself.

# Files

## DojoM6QuestGiver.h

```cpp
// Declare ADojoM6QuestGiver here.
```

## DojoM6QuestGiver.cpp

```cpp
// Define ADojoM6QuestGiver here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/m6-quest-giver/DojoM6QuestGiver.h"
#include "Quests/m6-quest-tracker/DojoM6QuestData.h"
#include "Quests/m6-quest-tracker/DojoM6QuestTracker.h"
#include "Support/DojoTestWorld.h"

namespace DojoM6QuestGiverTest
{
	/** Makes one quest asset. */
	UDojoM6QuestData* MakeQuest(EDojoM6QuestKind Kind, const TCHAR* ItemTag)
	{
		UDojoM6QuestData* Quest = NewObject<UDojoM6QuestData>();
		Quest->Kind = Kind;
		Quest->ItemTag = FName(ItemTag);
		return Quest;
	}

	/** Places a giver for Quest, the way a designer sets it in Details. */
	ADojoM6QuestGiver* PlaceGiver(FDojoTestWorld& TestWorld, UDojoM6QuestData* Quest)
	{
		ADojoM6QuestGiver* Giver = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM6QuestGiver>(ADojoM6QuestGiver::StaticClass(), FTransform::Identity);
		Giver->Quest = Quest;
		Giver->FinishSpawning(FTransform::Identity);
		return Giver;
	}

	/** The giver's label. */
	FString LabelOf(const ADojoM6QuestGiver* Giver)
	{
		return Giver->Label->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_QuestGiver_LabelFollowsItsQuest, "Dojo.M6.QuestGiver.LabelFollowsItsQuest", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks two givers' quests through every state and checks each label follows only its own quest. */
bool FDojo_M6_QuestGiver_LabelFollowsItsQuest::RunTest(const FString& Parameters)
{
	using namespace DojoM6QuestGiverTest;

	FDojoTestWorld TestWorld;
	UDojoM6QuestTracker* Tracker = TestWorld.GetWorld()->GetSubsystem<UDojoM6QuestTracker>();
	if (!TestNotNull(TEXT("The world has a quest tracker"), Tracker)) return false;

	UDojoM6QuestData* Tools = MakeQuest(EDojoM6QuestKind::EQK_Collect, TEXT("Tool"));
	UDojoM6QuestData* Courier = MakeQuest(EDojoM6QuestKind::EQK_Goal, TEXT(""));
	Courier->Requires = Tools;
	Courier->TimeLimitSeconds = 1.f;

	ADojoM6QuestGiver* ToolsGiver = PlaceGiver(TestWorld, Tools);
	ADojoM6QuestGiver* CourierGiver = PlaceGiver(TestWorld, Courier);
	if (!TestNotNull(TEXT("Givers spawned"), CourierGiver)) return false;
	TestTrue(TEXT("The label is the root"), ToolsGiver->GetRootComponent() == ToolsGiver->Label);
	TestEqual(TEXT("A quest not yet added reads LOCKED"), LabelOf(ToolsGiver), FString(TEXT("LOCKED")));

	Tracker->AddQuest(Tools);
	TestEqual(TEXT("Adding the quest updates the label by itself"), LabelOf(ToolsGiver), FString(TEXT("QUEST")));
	Tracker->AddQuest(Courier);
	TestEqual(TEXT("The courier giver reads LOCKED"), LabelOf(CourierGiver), FString(TEXT("LOCKED")));
	TestEqual(TEXT("Another quest's change leaves this label alone"), LabelOf(ToolsGiver), FString(TEXT("QUEST")));

	TestFalse(TEXT("A locked quest cannot be started by talking"), CourierGiver->Interact());
	TestTrue(TEXT("Talking starts an offered quest"), ToolsGiver->Interact());
	TestEqual(TEXT("ACTIVE once started"), LabelOf(ToolsGiver), FString(TEXT("ACTIVE")));
	TestFalse(TEXT("Talking again does nothing"), ToolsGiver->Interact());

	Tracker->ReportItem(TEXT("Tool"));
	TestEqual(TEXT("DONE when completed"), LabelOf(ToolsGiver), FString(TEXT("DONE")));
	TestEqual(TEXT("The chained giver offers its quest by itself"), LabelOf(CourierGiver), FString(TEXT("QUEST")));

	CourierGiver->Interact();
	TestWorld.Tick(70);
	TestEqual(TEXT("RETRY when its time runs out"), LabelOf(CourierGiver), FString(TEXT("RETRY")));
	TestTrue(TEXT("Talking retries a failed quest"), CourierGiver->Interact());
	TestEqual(TEXT("ACTIVE again"), LabelOf(CourierGiver), FString(TEXT("ACTIVE")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_QuestGiver_StopsListeningOnEndPlay, "Dojo.M6.QuestGiver.StopsListeningOnEndPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys one giver and checks it unbound from the tracker while the other giver still listens and updates. */
bool FDojo_M6_QuestGiver_StopsListeningOnEndPlay::RunTest(const FString& Parameters)
{
	using namespace DojoM6QuestGiverTest;

	FDojoTestWorld TestWorld;
	UDojoM6QuestTracker* Tracker = TestWorld.GetWorld()->GetSubsystem<UDojoM6QuestTracker>();
	if (!TestNotNull(TEXT("The world has a quest tracker"), Tracker)) return false;

	UDojoM6QuestData* Tools = MakeQuest(EDojoM6QuestKind::EQK_Collect, TEXT("Tool"));
	ADojoM6QuestGiver* Leaving = PlaceGiver(TestWorld, Tools);
	ADojoM6QuestGiver* Staying = PlaceGiver(TestWorld, Tools);
	if (!TestNotNull(TEXT("Givers spawned"), Staying)) return false;

	TestTrue(TEXT("A giver listens to the tracker while in play"), Tracker->OnQuestStateChanged.Contains(Leaving, TEXT("HandleQuestStateChanged")));
	Leaving->Destroy();
	TestFalse(TEXT("A destroyed giver has stopped listening"), Tracker->OnQuestStateChanged.Contains(Leaving, TEXT("HandleQuestStateChanged")));

	Tracker->AddQuest(Tools);
	TestEqual(TEXT("The other giver still updates"), LabelOf(Staying), FString(TEXT("QUEST")));

	return true;
}

#endif
```

# Hints

- Three moments matter: BeginPlay (find, listen, show the current state), the handler (check it is your quest, then show), and EndPlay (stop listening). Interact only asks the tracker.
- The world hands out its subsystems by type; the handler's parameters must match the tracker's event in type and order and the function must be a UFUNCTION, but give each parameter a name different from the giver's own members, because a parameter named like a member hides it and the Windows compiler (MSVC) refuses that; a state the tracker has never heard of reads as Locked, which is why a giver placed before its quest is added shows LOCKED.
- `UWorld::GetSubsystem` is in `Engine/World.h`; `UTextRenderComponent::SetText` is in `Components/TextRenderComponent.h`.

# Rubric

- The giver binds to the tracker's OnQuestStateChanged in BeginPlay and removes that binding in EndPlay.
- The handler ignores every quest but the giver's own.
- The label is set from the tracker's current state at BeginPlay, so a giver placed late is still right.
- Interact asks the tracker to start the quest; the giver keeps no state of its own about the quest.
- The giver never ticks or polls.
- The tracker knows nothing about givers; any number of them can listen.

# Alternative

The giver could ask the tracker for its quest's state every frame in Tick and set the label. It would always be right, but it costs a lookup per giver per frame, and a giver can only show what it saw on its last tick; anything that should happen at the moment of change, such as a sound or a bounce, needs the event anyway. A Blueprint version of the same giver binds to On Quest State Changed with Bind Event in BeginPlay and unbinds in End Play; the shape is identical, and choosing C++ or Blueprint for it is a team decision, not a technical one.
