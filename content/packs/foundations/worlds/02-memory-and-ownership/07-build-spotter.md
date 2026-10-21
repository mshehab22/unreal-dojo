---
id: f2-spotter
title: A spotter that lets go when its target is gone
order: 7
kind: build
scaffold: stub
difficulty: 3
patterns: []
skills: [memory, references]
terms: [tweakobjectptr, isvalid, tobjectptr, garbage-collection, destroy]
prerequisites: [f2-weak-and-soft-references, f2-clay-disc]
xp: 80
estimatedMinutes: 20
concepts:
  - A weak pointer never keeps its object alive
  - A destroyed actor's pointer is not null until garbage collection runs
---

# Brief

When you press Play and point the spotter at a clay disc, `ke * Report` shows TRACKING and the disc's name; once the disc shatters or falls, `ke * Report` shows LOST.

The declarations are given; every body is yours, and so is one more line: the member that remembers the watched actor. The spotter must not keep the actor alive and must notice when it is gone. The spotter works with any actor, so it only knows `AActor`; the tests use your clay disc from the last quest as the thing to watch.

Dependency direction: the spotter refers to its target; the target knows nothing about the spotter and never has to tell it anything.

Write the first version with the member you would reach for from World 1, checked against nullptr, and run the tests. This one fails on purpose the first time for most people. Read which assertion failed and work out why before you open the hints.

Compiles against earlier quests: f2-clay-disc, in the tests only (`Quests/f2-clay-disc/DojoF2ClayDisc.h`).

## See it in the editor

Place a `DojoF2Spotter` and a `DojoF2ClayDisc` with Flight Seconds set to 20. Open the level Blueprint, and on BeginPlay call Watch on the spotter with the disc as the target (drag both in from the Outliner). Press Play and run `ke * Report`: the label reads TRACKING and the disc's name. Run `ke * Shatter`, then `ke * Report` again: LOST.

# Files

## DojoF2Spotter.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF2Spotter.generated.h"

class UTextRenderComponent;

/** Watches one actor without keeping it alive and reports whether it is still there. */
UCLASS()
class ADojoF2Spotter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF2Spotter();

	/** Floating text that shows what the spotter sees. */
	UPROPERTY(VisibleAnywhere, Category = "Spotter")
	TObjectPtr<UTextRenderComponent> Label;

	/** Starts watching Target; nullptr stops watching. */
	UFUNCTION(BlueprintCallable, Category = "Spotter")
	void Watch(AActor* Target);

	/** True while the watched actor exists and is not being destroyed. */
	UFUNCTION(BlueprintPure, Category = "Spotter")
	bool HasTarget() const;

	/** The watched actor, or nullptr once it is gone. */
	UFUNCTION(BlueprintPure, Category = "Spotter")
	AActor* GetTarget() const;

	/** Writes TRACKING and the target's name, or LOST, into the label. */
	UFUNCTION(BlueprintCallable, CallInEditor, Category = "Spotter")
	void Report();

private:
	// Your code: a member that remembers the watched actor without keeping it alive.
};
```

## DojoF2Spotter.cpp

```cpp
#include "DojoF2Spotter.h"

#include "Components/TextRenderComponent.h"

ADojoF2Spotter::ADojoF2Spotter()
{
}

void ADojoF2Spotter::Watch(AActor* Target)
{
}

bool ADojoF2Spotter::HasTarget() const
{
	return false;
}

AActor* ADojoF2Spotter::GetTarget() const
{
	return nullptr;
}

void ADojoF2Spotter::Report()
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f2-clay-disc/DojoF2ClayDisc.h"
#include "Quests/f2-spotter/DojoF2Spotter.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_Spotter_LosesDestroyedTarget, "Dojo.F2.Spotter.LosesDestroyedTarget", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Watches a disc, shatters it, and checks the spotter reports it lost straight away, before any garbage collection. */
bool FDojo_F2_Spotter_LosesDestroyedTarget::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF2Spotter* Spotter = TestWorld.SpawnActor<ADojoF2Spotter>();
	ADojoF2ClayDisc* Disc = TestWorld.SpawnActor<ADojoF2ClayDisc>();
	if (!TestNotNull(TEXT("Spotter spawned"), Spotter) || !TestNotNull(TEXT("Disc spawned"), Disc)) return false;
	if (!TestNotNull(TEXT("Spotter has a label"), Spotter->Label.Get())) return false;

	Spotter->Report();
	TestEqual(TEXT("LOST before watching anything"), Spotter->Label->Text.ToString(), FString(TEXT("LOST")));

	Spotter->Watch(Disc);
	TestTrue(TEXT("Has the disc as a target"), Spotter->HasTarget());
	TestTrue(TEXT("GetTarget returns the disc"), Spotter->GetTarget() == Disc);

	Spotter->Report();
	TestEqual(TEXT("TRACKING and the disc's name"), Spotter->Label->Text.ToString(), FString::Printf(TEXT("TRACKING %s"), *Disc->GetName()));

	Disc->Shatter();
	TestFalse(TEXT("A destroyed target is not a target"), Spotter->HasTarget());
	TestNull(TEXT("GetTarget returns nullptr for a destroyed target"), Spotter->GetTarget());

	Spotter->Report();
	TestEqual(TEXT("LOST after the disc shattered"), Spotter->Label->Text.ToString(), FString(TEXT("LOST")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_Spotter_WatchedFieldIsWeak, "Dojo.F2.Spotter.WatchedFieldIsWeak", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the spotter holds its target through a weak reference, not a strong one that claims ownership. */
bool FDojo_F2_Spotter_WatchedFieldIsWeak::RunTest(const FString& Parameters)
{
	for (TFieldIterator<FObjectPropertyBase> Property(ADojoF2Spotter::StaticClass(), EFieldIteratorFlags::ExcludeSuper); Property; ++Property)
	{
		if (Property->GetName() == TEXT("Label")) continue;

		const bool bIsWeak = Property->IsA<FWeakObjectProperty>() || Property->IsA<FSoftObjectProperty>();
		TestTrue(FString::Printf(TEXT("%s is a weak reference"), *Property->GetName()), bIsWeak);
	}

	return true;
}

#endif
```

# Hints

- The test that fails asks about the disc right after Destroy, with no garbage collection in between. Think about what your member still holds at that moment, and whether the object behind it is still alive in memory.
- There is a pointer type made for watching objects you do not own: it never keeps them alive, and its validity check also answers false for an object that is being destroyed.
- `TWeakObjectPtr` lives in `UObject/WeakObjectPtrTemplates.h`; it has `IsValid` and `Get`, and assigning an actor pointer to it just works.

# Rubric

- The watched actor is held in a TWeakObjectPtr, not a TObjectPtr or a raw pointer.
- HasTarget and GetTarget treat a destroyed or pending-destroy actor as gone.
- Report writes TRACKING and the name, or LOST, and never dereferences a dead target.
- Watch accepts nullptr and simply stops watching.
- The spotter refers to its target; the target never knows about the spotter.
- The label is created once in the constructor and nothing ticks.

# Alternative

The spotter could hold a strong `UPROPERTY` TObjectPtr and check it with `IsValid` instead of against nullptr. For actors that works: IsValid catches a destroyed actor at once, and the next garbage collection sets the reflected pointer to null. The cost is in what the code claims and what it demands: a strong reference says the spotter owns its target, which it does not, and every read must remember IsValid or it acts on a ghost until the next collection. A weak pointer says "not mine" in its type, and its own validity check is the only way to read it.

# Parsons

```yaml
- id: spotter-report
  prompt: Put Report in order.
  lines:
    - "void ADojoF2Spotter::Report()"
    - "{"
    - "	const FString Text = HasTarget() ? FString::Printf(TEXT(\"TRACKING %s\"), *Watched->GetName()) : FString(TEXT(\"LOST\"));"
    - "	Label->SetText(FText::FromString(Text));"
    - "}"
  distractors:
    - line: "	if (Watched != nullptr) Label->SetText(FText::FromString(Watched->GetName()));"
      mistake: A null check alone misses an actor that has been destroyed but not yet collected.
```
