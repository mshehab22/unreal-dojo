---
id: m6-quest-tracker
title: A quest tracker that announces every change
order: 5
kind: build
scaffold: stub
difficulty: 4
patterns: [observer, state]
skills: [delegates, time, data]
terms: [world-subsystem, dynamic-multicast-delegate, timer-delegate, data-asset, uenum, tmap]
prerequisites: [m6-timers-with-payloads]
xp: 90
estimatedMinutes: 25
concepts:
  - One owner of every quest's state, announcing each change so nobody polls
  - Chained quests unlock when the quest they need is completed
  - Each timed quest runs on its own clock
---

# Brief

When you add three quest assets to the tracker (a collect quest, a goal quest that needs the first, and a secret quest) and report items as they are found, the first completes after its count, the second unlocks the same moment, the secret starts itself when its first item turns up, and a timed quest finished in time stays done when its time runs out.

The quest asset, the states, and the tracker's declarations are given; every body in `DojoM6QuestTracker.cpp` is yours. The tracker is a world subsystem, so any actor finds it with `GetWorld()->GetSubsystem<UDojoM6QuestTracker>()`:

- `AddQuest` adds a quest once: Locked while its Requires quest is not completed, otherwise Available. Every state change, including this first one, is announced on `OnQuestStateChanged`.
- `StartQuest` starts an Available or Failed quest with no progress and, when it has a time limit, starts that quest's own clock with a timer delegate carrying the quest. Other states are refused.
- `ReportItem` counts one item for every Active collect quest with that tag, announcing `OnQuestProgress`, and completes it at its Count. A secret quest is never offered: when it is Available and its tag is reported, it starts first and then counts.
- `CompleteGoal` completes an Active goal quest. Completing any quest makes every Locked quest that requires it Available.
- When a clock runs out, its quest fails.
- `WantsItem`, `GetState` (Locked for an unknown quest), `GetProgress`, and `GetQuests` (in the order added) answer questions; `ResetQuests` puts every quest back to its first state with no progress and no clocks; `Deinitialize` clears every clock.

Write it the obvious way first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

## See it in the editor

Make two Dojo M6 Quest Data assets: Lost Tools (Collect, Tool, count 3) and Courier Run (Goal, time limit 20, requires Lost Tools). In the level Blueprint, on BeginPlay, get the Dojo M6 Quest Tracker subsystem, bind a custom event with a Print String of the quest's title and the new state to On Quest State Changed, and only then call Add Quest for both. Press Play: two lines print, Available and Locked. Start Lost Tools and call Report Item with Tool three times from key presses: Completed prints, then Available for the courier run.

# Files

## DojoM6QuestData.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoM6QuestData.generated.h"

/** What a quest asks for. */
UENUM(BlueprintType)
enum class EDojoM6QuestKind : uint8
{
	EQK_Collect UMETA(DisplayName = "Collect"),
	EQK_Goal UMETA(DisplayName = "Goal")
};

/** Where a quest stands. */
UENUM(BlueprintType)
enum class EDojoM6QuestState : uint8
{
	EQS_Locked UMETA(DisplayName = "Locked"),
	EQS_Available UMETA(DisplayName = "Available"),
	EQS_Active UMETA(DisplayName = "Active"),
	EQS_Completed UMETA(DisplayName = "Completed"),
	EQS_Failed UMETA(DisplayName = "Failed")
};

/** One quest's definition, kept in an asset so designers add quests without code. */
UCLASS(BlueprintType)
class UDojoM6QuestData : public UDataAsset
{
	GENERATED_BODY()

public:
	/** The name shown on the quest board. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	FText Title;

	/** Collect items, or reach a goal some other piece reports. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	EDojoM6QuestKind Kind = EDojoM6QuestKind::EQK_Collect;

	/** For a collect quest: the tag of the items it wants. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	FName ItemTag;

	/** For a collect quest: how many items finish it. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest", meta = (ClampMin = "1"))
	int32 Count = 1;

	/** Seconds from the start before the quest fails; 0 means no limit. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest", meta = (ClampMin = "0.0"))
	float TimeLimitSeconds = 0.f;

	/** A quest that must be completed before this one is offered; empty for none. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	TObjectPtr<UDojoM6QuestData> Requires;

	/** A secret quest is never offered; it starts itself when its first item is found. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	bool bSecret = false;
};
```

## DojoM6QuestTracker.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoM6QuestData.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoM6QuestTracker.generated.h"

/** Broadcast whenever a quest changes state, including when it is first added. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM6OnQuestStateChanged, UDojoM6QuestData*, ChangedQuest, EDojoM6QuestState, NewState);

/** Broadcast whenever a collect quest counts an item. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FDojoM6OnQuestProgress, UDojoM6QuestData*, ChangedQuest, int32, Current, int32, Target);

/** Owns every quest's state for one world and announces each change, so givers, boards, and finales only listen. */
UCLASS()
class UDojoM6QuestTracker : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Fires on every state change. */
	UPROPERTY(BlueprintAssignable, Category = "Quests")
	FDojoM6OnQuestStateChanged OnQuestStateChanged;

	/** Fires on every counted item. */
	UPROPERTY(BlueprintAssignable, Category = "Quests")
	FDojoM6OnQuestProgress OnQuestProgress;

	/** Adds a quest: Locked while its required quest is unfinished, otherwise Available. Adding it again does nothing. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	void AddQuest(UDojoM6QuestData* Quest);

	/** Starts an Available or Failed quest from zero and starts its time limit; false for any other state. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	bool StartQuest(UDojoM6QuestData* Quest);

	/** Counts one item for every Active collect quest that wants this tag, starting a waiting secret quest first. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	void ReportItem(FName ItemTag);

	/** Completes an Active goal quest; false otherwise. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	bool CompleteGoal(UDojoM6QuestData* Quest);

	/** True when ReportItem with this tag would count for some quest. */
	UFUNCTION(BlueprintPure, Category = "Quests")
	bool WantsItem(FName ItemTag) const;

	/** The quest's state; Locked for a quest never added. */
	UFUNCTION(BlueprintPure, Category = "Quests")
	EDojoM6QuestState GetState(UDojoM6QuestData* Quest) const;

	/** Items counted toward the quest this attempt. */
	UFUNCTION(BlueprintPure, Category = "Quests")
	int32 GetProgress(UDojoM6QuestData* Quest) const;

	/** Every added quest, in the order added. */
	UFUNCTION(BlueprintPure, Category = "Quests")
	TArray<UDojoM6QuestData*> GetQuests() const;

	/** Puts every quest back to its first state with no progress and no timers. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	void ResetQuests();

	/** Clears every time limit before the world goes away. */
	virtual void Deinitialize() override;

private:
	/** Stores and announces a new state. */
	void SetState(UDojoM6QuestData* Quest, EDojoM6QuestState NewState);

	/** Completes a quest and offers every quest that was waiting for it. */
	void Complete(UDojoM6QuestData* Quest);

	/** A time limit ran out; the payload says which quest. */
	void HandleTimeUp(UDojoM6QuestData* Quest);

	/** The state a quest starts in: Locked while its required quest is unfinished. */
	EDojoM6QuestState FirstState(const UDojoM6QuestData* Quest) const;

	UPROPERTY()
	TArray<TObjectPtr<UDojoM6QuestData>> Quests;

	UPROPERTY()
	TMap<TObjectPtr<UDojoM6QuestData>, EDojoM6QuestState> States;

	UPROPERTY()
	TMap<TObjectPtr<UDojoM6QuestData>, int32> Progress;

	TMap<TObjectPtr<UDojoM6QuestData>, FTimerHandle> TimeLimits;
};
```

## DojoM6QuestTracker.cpp

```cpp
#include "DojoM6QuestTracker.h"

#include "Engine/World.h"
#include "TimerManager.h"

void UDojoM6QuestTracker::AddQuest(UDojoM6QuestData* Quest)
{
}

bool UDojoM6QuestTracker::StartQuest(UDojoM6QuestData* Quest)
{
	return false;
}

void UDojoM6QuestTracker::ReportItem(FName ItemTag)
{
}

bool UDojoM6QuestTracker::CompleteGoal(UDojoM6QuestData* Quest)
{
	return false;
}

bool UDojoM6QuestTracker::WantsItem(FName ItemTag) const
{
	return false;
}

EDojoM6QuestState UDojoM6QuestTracker::GetState(UDojoM6QuestData* Quest) const
{
	return EDojoM6QuestState::EQS_Locked;
}

int32 UDojoM6QuestTracker::GetProgress(UDojoM6QuestData* Quest) const
{
	return 0;
}

TArray<UDojoM6QuestData*> UDojoM6QuestTracker::GetQuests() const
{
	return TArray<UDojoM6QuestData*>();
}

void UDojoM6QuestTracker::ResetQuests()
{
}

void UDojoM6QuestTracker::Deinitialize()
{
	Super::Deinitialize();
}

void UDojoM6QuestTracker::SetState(UDojoM6QuestData* Quest, EDojoM6QuestState NewState)
{
}

void UDojoM6QuestTracker::Complete(UDojoM6QuestData* Quest)
{
}

void UDojoM6QuestTracker::HandleTimeUp(UDojoM6QuestData* Quest)
{
}

EDojoM6QuestState UDojoM6QuestTracker::FirstState(const UDojoM6QuestData* Quest) const
{
	return EDojoM6QuestState::EQS_Locked;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m6-quest-tracker/DojoM6QuestData.h"
#include "Quests/m6-quest-tracker/DojoM6QuestTracker.h"
#include "Support/DojoTestWorld.h"

namespace DojoM6QuestTrackerTest
{
	/** Makes one quest asset. */
	UDojoM6QuestData* MakeQuest(EDojoM6QuestKind Kind, const TCHAR* ItemTag, int32 Count)
	{
		UDojoM6QuestData* Quest = NewObject<UDojoM6QuestData>();
		Quest->Kind = Kind;
		Quest->ItemTag = FName(ItemTag);
		Quest->Count = Count;
		return Quest;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_QuestTracker_ChainsCountsAndSecrets, "Dojo.M6.QuestTracker.ChainsCountsAndSecrets", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Adds a collect quest, a goal quest that needs it, and a secret quest, and walks them through every state. */
bool FDojo_M6_QuestTracker_ChainsCountsAndSecrets::RunTest(const FString& Parameters)
{
	using namespace DojoM6QuestTrackerTest;

	FDojoTestWorld TestWorld;
	UDojoM6QuestTracker* Tracker = TestWorld.GetWorld()->GetSubsystem<UDojoM6QuestTracker>();
	if (!TestNotNull(TEXT("The world has a quest tracker"), Tracker)) return false;

	UDojoM6QuestData* Tools = MakeQuest(EDojoM6QuestKind::EQK_Collect, TEXT("Tool"), 2);
	UDojoM6QuestData* Courier = MakeQuest(EDojoM6QuestKind::EQK_Goal, TEXT(""), 1);
	Courier->Requires = Tools;
	UDojoM6QuestData* Cache = MakeQuest(EDojoM6QuestKind::EQK_Collect, TEXT("Gem"), 1);
	Cache->bSecret = true;

	TestEqual(TEXT("An unknown quest reads Locked"), Tracker->GetState(Tools), EDojoM6QuestState::EQS_Locked);
	Tracker->AddQuest(Tools);
	Tracker->AddQuest(Courier);
	Tracker->AddQuest(Cache);
	Tracker->AddQuest(Tools);
	TestEqual(TEXT("Each quest is added once, in order"), Tracker->GetQuests().Num(), 3);
	TestTrue(TEXT("The order added is kept"), Tracker->GetQuests().Num() == 3 && Tracker->GetQuests()[1] == Courier);

	TestEqual(TEXT("A quest with no requirement is offered"), Tracker->GetState(Tools), EDojoM6QuestState::EQS_Available);
	TestEqual(TEXT("A quest whose requirement is unfinished is locked"), Tracker->GetState(Courier), EDojoM6QuestState::EQS_Locked);
	TestFalse(TEXT("A locked quest cannot start"), Tracker->StartQuest(Courier));

	TestFalse(TEXT("No quest wants tools before one starts"), Tracker->WantsItem(TEXT("Tool")));
	Tracker->ReportItem(TEXT("Tool"));
	TestEqual(TEXT("A tool before the quest starts counts for nothing"), Tracker->GetProgress(Tools), 0);

	TestTrue(TEXT("An offered quest starts"), Tracker->StartQuest(Tools));
	TestFalse(TEXT("An active quest does not start again"), Tracker->StartQuest(Tools));
	TestTrue(TEXT("An active collect quest wants its items"), Tracker->WantsItem(TEXT("Tool")));
	Tracker->ReportItem(TEXT("Tool"));
	TestEqual(TEXT("One tool counted"), Tracker->GetProgress(Tools), 1);
	Tracker->ReportItem(TEXT("Rock"));
	TestEqual(TEXT("Other tags do not count"), Tracker->GetProgress(Tools), 1);
	Tracker->ReportItem(TEXT("Tool"));
	TestEqual(TEXT("The second tool completes it"), Tracker->GetState(Tools), EDojoM6QuestState::EQS_Completed);
	TestEqual(TEXT("Completing it unlocks the courier run"), Tracker->GetState(Courier), EDojoM6QuestState::EQS_Available);

	TestTrue(TEXT("A secret quest waiting to be found wants its items"), Tracker->WantsItem(TEXT("Gem")));
	Tracker->ReportItem(TEXT("Gem"));
	TestEqual(TEXT("The first gem starts and finishes the secret"), Tracker->GetState(Cache), EDojoM6QuestState::EQS_Completed);

	TestFalse(TEXT("A goal that is not active cannot complete"), Tracker->CompleteGoal(Courier));
	Tracker->StartQuest(Courier);
	TestFalse(TEXT("A collect quest is not completed as a goal"), Tracker->CompleteGoal(Tools));
	TestTrue(TEXT("An active goal completes"), Tracker->CompleteGoal(Courier));

	Tracker->ResetQuests();
	TestEqual(TEXT("A reset offers the first quest again"), Tracker->GetState(Tools), EDojoM6QuestState::EQS_Available);
	TestEqual(TEXT("A reset clears progress"), Tracker->GetProgress(Tools), 0);
	TestEqual(TEXT("A reset locks the chained quest again"), Tracker->GetState(Courier), EDojoM6QuestState::EQS_Locked);
	TestEqual(TEXT("A reset hides the secret again"), Tracker->GetState(Cache), EDojoM6QuestState::EQS_Available);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_QuestTracker_ClocksPerQuest, "Dojo.M6.QuestTracker.ClocksPerQuest", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Runs two timed quests side by side: one finished in time must stay done, the other fails at its limit and can be retried. */
bool FDojo_M6_QuestTracker_ClocksPerQuest::RunTest(const FString& Parameters)
{
	using namespace DojoM6QuestTrackerTest;

	FDojoTestWorld TestWorld;
	UDojoM6QuestTracker* Tracker = TestWorld.GetWorld()->GetSubsystem<UDojoM6QuestTracker>();
	if (!TestNotNull(TEXT("The world has a quest tracker"), Tracker)) return false;

	UDojoM6QuestData* Sprint = MakeQuest(EDojoM6QuestKind::EQK_Goal, TEXT(""), 1);
	Sprint->TimeLimitSeconds = 2.f;
	UDojoM6QuestData* Errand = MakeQuest(EDojoM6QuestKind::EQK_Collect, TEXT("Letter"), 2);
	Errand->TimeLimitSeconds = 3.f;
	Tracker->AddQuest(Sprint);
	Tracker->AddQuest(Errand);

	Tracker->StartQuest(Sprint);
	Tracker->StartQuest(Errand);
	TestWorld.Tick(60);
	TestTrue(TEXT("The sprint is finished in time"), Tracker->CompleteGoal(Sprint));
	Tracker->ReportItem(TEXT("Letter"));

	TestWorld.Tick(60 * 3);
	TestEqual(TEXT("A quest finished in time stays completed when its time runs out"), Tracker->GetState(Sprint), EDojoM6QuestState::EQS_Completed);
	TestEqual(TEXT("The errand's own clock failed it at 3 seconds"), Tracker->GetState(Errand), EDojoM6QuestState::EQS_Failed);
	Tracker->ReportItem(TEXT("Letter"));
	TestEqual(TEXT("A failed quest counts nothing"), Tracker->GetProgress(Errand), 1);

	TestTrue(TEXT("A failed quest can be retried"), Tracker->StartQuest(Errand));
	TestEqual(TEXT("A retry starts from no progress"), Tracker->GetProgress(Errand), 0);
	TestWorld.Tick(60 * 2);
	TestEqual(TEXT("The retry has its own full time"), Tracker->GetState(Errand), EDojoM6QuestState::EQS_Active);

	Tracker->ResetQuests();
	TestEqual(TEXT("A reset offers the running quest again"), Tracker->GetState(Errand), EDojoM6QuestState::EQS_Available);

	// Start it again with no time limit, so no new clock replaces the old one: only a clock the reset left running can still fail it.
	Errand->TimeLimitSeconds = 0.f;
	TestTrue(TEXT("The quest starts again after the reset"), Tracker->StartQuest(Errand));
	TestWorld.Tick(60 * 2);
	TestEqual(TEXT("A reset stops every clock, so the old deadline cannot fail the new run"), Tracker->GetState(Errand), EDojoM6QuestState::EQS_Active);

	return true;
}

#endif
```

# Hints

- The failing assertion is about a quest completed before its time ran out: follow what is still running after the completion.
- A clock keeps running until it fires or is cleared, whatever happened to its quest, so a quest finished early still has a clock counting down: completing must clear that quest's handle in the map, and the time-up handler should act only on a quest that is still active, in case a clock slips through. Each clock is an `FTimerDelegate::CreateUObject` with the quest as the payload.
- `FTimerManager::SetTimer` and `ClearTimer` are in `TimerManager.h`; `TMap::FindOrAdd` gives a handle to fill in place.

# Rubric

- The state changes a player sees go through one function that stores the new state and broadcasts OnQuestStateChanged; nothing else broadcasts it.
- Each timed quest has its own handle in a map, set with a timer delegate whose payload is the quest.
- A timed quest finished before its time limit stays Completed.
- Completing a quest makes every Locked quest that requires it Available.
- A secret quest is never offered and starts itself on its first reported item.
- ResetQuests and Deinitialize leave no clock running.

# Alternative

Why the first run failed: a timer fires whatever became of the thing it was set for, so finishing a quest early does not stop its clock. The tracker must clear that quest's clock on completion, and a clock that still fires late must be ignored, because only a quest that is still active may be failed by time.

Each quest could be its own actor or object with its own state, clock, and event, and the tracker a list of them. That takes the tracker's split between quest state and listeners further, with the rules living inside each quest, and it suits quests that behave very differently, such as escort or defend. With two kinds of quest, one tracker holding states in maps is simpler to test and to reset, and every listener binds to one event instead of one per quest. The Gameplay Message Router plugin from Epic's Lyra sample, a message subsystem keyed by gameplay tags, is the other common shape in larger projects: senders post a message and listeners filter by tag, so even the tracker need not be known by name.

# Parsons

```yaml
- id: tracker-start-clock
  prompt: Put the start of a quest's clock in order.
  lines:
    - "if (Quest->TimeLimitSeconds > 0.f)"
    - "{"
    - "	const FTimerDelegate TimeUp = FTimerDelegate::CreateUObject(this, &UDojoM6QuestTracker::HandleTimeUp, Quest);"
    - "	GetWorld()->GetTimerManager().SetTimer(TimeLimits.FindOrAdd(Quest), TimeUp, Quest->TimeLimitSeconds, false);"
    - "}"
  distractors:
    - line: "	GetWorld()->GetTimerManager().SetTimer(Clock, this, &UDojoM6QuestTracker::HandleTimeUp, Quest->TimeLimitSeconds, false);"
      mistake: The plain member-function form passes no quest to the handler, and one shared handle lets each new clock replace the last.
    - line: "	TimeUp.BindUFunction(this, TEXT(\"HandleTimeUp\"));"
      mistake: Binding by name needs HandleTimeUp to be a UFUNCTION and carries no quest; CreateUObject with a payload does both jobs.
```
