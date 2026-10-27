---
id: m6-checkpoints
title: A course that counts gates in order
order: 3
kind: build
scaffold: faded
difficulty: 3
patterns: [observer]
skills: [delegates]
terms: [adddynamic, unbinding-delegates, endplay, tarray]
prerequisites: [m6-quest-item]
xp: 70
estimatedMinutes: 18
concepts:
  - One handler bound to many senders, told apart by the pointer it receives
  - Bind once with AddUniqueDynamic, leave with RemoveAll
---

# Brief

When you place three gates and a course that lists them, and walk through gate 2 before gate 1, nothing counts; walking 1, 2, 3 in order counts each gate once and announces the finish once.

The gates and the course's header are written for you. Fill in `DojoM6Course.cpp`:

1. `BindCheckpoints`: listen to every gate's OnReached with one handler. It must be safe to call again, such as after a designer adds a gate while playing, so each gate is bound only once.
2. `HandleReached`: count the gate only if it is the next one in the list; then announce the new count, and announce the finish when the last gate is passed. A finished course ignores further gates until it is reset.
3. `EndPlay`: stop listening to every gate before the course leaves, in one call per gate.

Dependency direction: the course holds the gates and listens to them; a gate knows nothing about courses, so the same gate can belong to two courses or to none.

## See it in the editor

Place three `DojoM6Checkpoint` actors and a `DojoM6Course`, and add the three gates to its Checkpoints list in order. In the level Blueprint, on the 1, 2, and 3 keys, call Touch on each gate with the player pawn. Also on BeginPlay, bind a custom event with a Print String of Passed Count to the course's On Passed, and another printing Finished to On Finished. Press Play and press 2, 1, 2, 3: nothing prints for the first 2, then 1, 2, 3, and Finished.

# Files

## DojoM6Checkpoint.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM6Checkpoint.generated.h"

class ADojoM6Checkpoint;
class UTextRenderComponent;

/** Broadcast when something reaches a checkpoint. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM6OnCheckpointReached, ADojoM6Checkpoint*, Checkpoint, AActor*, Racer);

/** A gate that announces whoever reaches it; it does not know about courses, order, or quests. */
UCLASS()
class ADojoM6Checkpoint : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoM6Checkpoint();

	/** Floating text over the gate. */
	UPROPERTY(VisibleAnywhere, Category = "Checkpoint")
	TObjectPtr<UTextRenderComponent> Label;

	/** Fires every time something reaches the gate. */
	UPROPERTY(BlueprintAssignable, Category = "Checkpoint")
	FDojoM6OnCheckpointReached OnReached;

	/** Announces that Racer reached the gate; an overlap or a distance check calls it. */
	UFUNCTION(BlueprintCallable, Category = "Checkpoint")
	void Touch(AActor* Racer);
};
```

## DojoM6Checkpoint.cpp

```cpp
#include "DojoM6Checkpoint.h"

#include "Components/TextRenderComponent.h"

ADojoM6Checkpoint::ADojoM6Checkpoint()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("GATE")));
}

void ADojoM6Checkpoint::Touch(AActor* Racer)
{
	OnReached.Broadcast(this, Racer);
}
```

## DojoM6Course.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM6Course.generated.h"

class ADojoM6Checkpoint;

/** Broadcast each time the next gate in order is passed, with how many are passed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM6OnCoursePassed, int32, PassedCount);

/** Broadcast when the last gate is passed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoM6OnCourseFinished);

/** Turns gates reached in any order into a course run in one order, by listening to every gate's event. */
UCLASS()
class ADojoM6Course : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoM6Course();

	/** The gates, in the order they must be passed. */
	UPROPERTY(EditAnywhere, Category = "Course")
	TArray<TObjectPtr<ADojoM6Checkpoint>> Checkpoints; // @explain: The order of this list is the order of the course; the gates themselves have no number.

	/** Fires when the next gate in order is passed. */
	UPROPERTY(BlueprintAssignable, Category = "Course")
	FDojoM6OnCoursePassed OnPassed;

	/** Fires when the last gate is passed. */
	UPROPERTY(BlueprintAssignable, Category = "Course")
	FDojoM6OnCourseFinished OnFinished;

	/** Listens to every gate; safe to call again after gates are added, because each gate is bound only once. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void BindCheckpoints();

	/** Starts the course again from the first gate. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void ResetCourse();

	/** Gates passed in order so far. */
	UFUNCTION(BlueprintPure, Category = "Course")
	int32 GetPassedCount() const;

protected:
	/** Listens to the gates set in the editor. */
	virtual void BeginPlay() override;

	/** Stops listening to every gate. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Counts the gate if it is the next one in order; any other gate is ignored. */
	UFUNCTION()
	void HandleReached(ADojoM6Checkpoint* Checkpoint, AActor* Racer);

	int32 PassedCount = 0;
};
```

## DojoM6Course.cpp

```cpp
#include "DojoM6Course.h"

#include "Components/SceneComponent.h"
#include "DojoM6Checkpoint.h"

ADojoM6Course::ADojoM6Course()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM6Course::BeginPlay()
{
	Super::BeginPlay();

	BindCheckpoints();
}

void ADojoM6Course::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	// Your code: stop listening to every gate, with one call per gate that removes all of this course's bindings.

	Super::EndPlay(EndPlayReason);
}

void ADojoM6Course::BindCheckpoints()
{
	// Your code: bind HandleReached to every valid gate's OnReached, only once per gate however often this runs.
}

void ADojoM6Course::HandleReached(ADojoM6Checkpoint* Checkpoint, AActor* Racer)
{
	// Your code: ignore any gate that is not the next one in the list.
	// Your code: count it, announce the new count, and announce the finish after the last gate.
}

void ADojoM6Course::ResetCourse()
{
	PassedCount = 0;
}

int32 ADojoM6Course::GetPassedCount() const
{
	return PassedCount;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m6-checkpoints/DojoM6Checkpoint.h"
#include "Quests/m6-checkpoints/DojoM6Course.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM6CheckpointsTest
{
	/** Spawns three gates and a course that lists them in order. */
	ADojoM6Course* MakeCourse(FDojoTestWorld& TestWorld, TArray<ADojoM6Checkpoint*>& OutGates)
	{
		ADojoM6Course* Course = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM6Course>(ADojoM6Course::StaticClass(), FTransform::Identity);
		for (int32 Index = 0; Index < 3; Index++)
		{
			ADojoM6Checkpoint* Gate = TestWorld.SpawnActor<ADojoM6Checkpoint>();
			OutGates.Add(Gate);
			Course->Checkpoints.Add(Gate);
		}
		Course->FinishSpawning(FTransform::Identity);
		return Course;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_Checkpoints_CountsInOrderOnly, "Dojo.M6.Checkpoints.CountsInOrderOnly", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Touches gates out of order, in order, and twice, and checks only the next gate in the list counts. */
bool FDojo_M6_Checkpoints_CountsInOrderOnly::RunTest(const FString& Parameters)
{
	using namespace DojoM6CheckpointsTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Racer = TestWorld.SpawnActor<ADojoTestActor>();
	TArray<ADojoM6Checkpoint*> Gates;
	ADojoM6Course* Course = MakeCourse(TestWorld, Gates);
	if (!TestNotNull(TEXT("Course spawned"), Course) || !TestEqual(TEXT("Three gates"), Gates.Num(), 3)) return false;

	for (ADojoM6Checkpoint* Gate : Gates)
	{
		TestTrue(TEXT("The course listens to every gate from BeginPlay"), Gate->OnReached.Contains(Course, TEXT("HandleReached")));
	}

	// A second course on its own gate listens for the first course's finish; finishing resets it, so its count shows when OnFinished fired.
	ADojoM6Course* Watcher = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM6Course>(ADojoM6Course::StaticClass(), FTransform::Identity);
	ADojoM6Checkpoint* WatcherGate = TestWorld.SpawnActor<ADojoM6Checkpoint>();
	Watcher->Checkpoints.Add(WatcherGate);
	Watcher->Checkpoints.Add(TestWorld.SpawnActor<ADojoM6Checkpoint>());
	Watcher->FinishSpawning(FTransform::Identity);
	Course->OnFinished.AddDynamic(Watcher, &ADojoM6Course::ResetCourse);
	WatcherGate->Touch(Racer);
	TestEqual(TEXT("The watcher has passed its own first gate"), Watcher->GetPassedCount(), 1);

	Gates[1]->Touch(Racer);
	TestEqual(TEXT("The second gate first does not count"), Course->GetPassedCount(), 0);

	Gates[0]->Touch(Racer);
	TestEqual(TEXT("The first gate counts"), Course->GetPassedCount(), 1);
	Gates[0]->Touch(Racer);
	TestEqual(TEXT("The first gate again does not count twice"), Course->GetPassedCount(), 1);

	Course->BindCheckpoints();
	Gates[1]->Touch(Racer);
	TestEqual(TEXT("Binding again does not make a gate count twice"), Course->GetPassedCount(), 2);

	TestEqual(TEXT("No finish is announced before the last gate"), Watcher->GetPassedCount(), 1);
	Gates[2]->Touch(Racer);
	TestEqual(TEXT("The last gate finishes the course"), Course->GetPassedCount(), 3);
	TestEqual(TEXT("The finish is announced once the last gate is passed"), Watcher->GetPassedCount(), 0);
	Gates[0]->Touch(Racer);
	TestEqual(TEXT("A finished course ignores more gates"), Course->GetPassedCount(), 3);

	Course->ResetCourse();
	Gates[0]->Touch(Racer);
	TestEqual(TEXT("After a reset the first gate counts again"), Course->GetPassedCount(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_Checkpoints_LeavesCleanly, "Dojo.M6.Checkpoints.LeavesCleanly", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys a course and checks no gate still holds its handler, while a second course on the same gates keeps listening. */
bool FDojo_M6_Checkpoints_LeavesCleanly::RunTest(const FString& Parameters)
{
	using namespace DojoM6CheckpointsTest;

	FDojoTestWorld TestWorld;

	TArray<ADojoM6Checkpoint*> Gates;
	ADojoM6Course* Leaving = MakeCourse(TestWorld, Gates);
	ADojoM6Course* Staying = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM6Course>(ADojoM6Course::StaticClass(), FTransform::Identity);
	for (ADojoM6Checkpoint* Gate : Gates) Staying->Checkpoints.Add(Gate);
	Staying->FinishSpawning(FTransform::Identity);
	if (!TestNotNull(TEXT("Courses spawned"), Staying)) return false;

	Leaving->Destroy();
	for (ADojoM6Checkpoint* Gate : Gates)
	{
		TestFalse(TEXT("A destroyed course has stopped listening"), Gate->OnReached.Contains(Leaving, TEXT("HandleReached")));
		TestTrue(TEXT("The other course still listens"), Gate->OnReached.Contains(Staying, TEXT("HandleReached")));
	}

	Gates[0]->Touch(nullptr);
	TestEqual(TEXT("The other course still counts"), Staying->GetPassedCount(), 1);

	return true;
}

#endif
```

# Hints

- Three small bodies: a loop that binds, a guard then a count in the handler, and a loop that unbinds.
- The handler receives the gate that fired, so comparing it with the list entry at the current count tells you whether it is next; the unique form of the binding macro ignores a second identical binding, and the multicast delegate can remove every binding of one object at once.
- The `AddUniqueDynamic` macro is in `Delegates/Delegate.h`; `RemoveAll` on a dynamic multicast delegate is in `UObject/ScriptDelegates.h` (`TMulticastScriptDelegate`); `TArray::IsValidIndex` guards the lookup.

# Rubric

- BindCheckpoints uses AddUniqueDynamic, so calling it twice binds each gate once.
- HandleReached compares the gate it receives with the next entry in the list and ignores every other gate.
- OnPassed broadcasts the new count for each gate in order, and OnFinished broadcasts once after the last gate.
- EndPlay removes this course's bindings from every gate with RemoveAll before calling Super::EndPlay.
- The gates know nothing about the course; only the course holds references.
- A finished course ignores gates until ResetCourse.

# Alternative

Each gate could hold an index and a pointer to its course, and call the course itself. That is fewer bindings, but the gate then belongs to one course for ever, and a second course, a timer HUD, or a sound that also wants to hear about the gate has to be added to the gate. With events the order lives only in the course's list, so a designer reorders the course by dragging list entries. AddDynamic would also work for the binding, but calling BindCheckpoints a second time would add the handler again; the engine reports that with an ensure, and the handler would run twice per gate.

# Parsons

```yaml
- id: course-handle-reached
  prompt: Put HandleReached in order.
  lines:
    - "void ADojoM6Course::HandleReached(ADojoM6Checkpoint* Checkpoint, AActor* Racer)"
    - "{"
    - "	if (!Checkpoints.IsValidIndex(PassedCount) || Checkpoints[PassedCount] != Checkpoint) return;"
    - "	PassedCount++;"
    - "	OnPassed.Broadcast(PassedCount);"
    - "	if (PassedCount == Checkpoints.Num()) OnFinished.Broadcast();"
    - "}"
  distractors:
    - line: "	Checkpoint->OnReached.RemoveDynamic(this, &ADojoM6Course::HandleReached);"
      mistake: Unbinding a passed gate means a reset course can never count it again; the order check already ignores repeat visits.
    - line: "	OnPassed.Execute(PassedCount);"
      mistake: A multicast delegate is fired with Broadcast; Execute belongs to single-cast delegates.
```
