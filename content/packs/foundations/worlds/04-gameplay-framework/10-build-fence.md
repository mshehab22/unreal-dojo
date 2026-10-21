---
id: f4-fence
title: A fence that lays out its own posts
order: 10
kind: build
scaffold: blank
difficulty: 3
patterns: []
skills: [lifecycle, components]
terms: [on-construction, newobject, register-component, scene-component, super]
prerequisites: [f4-registry, f4-actor-lifecycle]
xp: 120
estimatedMinutes: 30
concepts:
  - OnConstruction lays out parts from editable values, in the editor and at spawn
  - Components made at run time are created, attached, and registered by hand
---

# Brief

When you place a fence in the editor and change Post Count from 4 to 7, seven numbered posts appear along the fence's forward direction while you edit, with no Play needed; turn the fence and the posts turn with it.

Write `ADojoF4Fence` from nothing. It has a scene root. Every time it is constructed (placed, moved, edited, or spawned in play) it rebuilds its posts: one text render post per count, numbered from 1, the first at the fence's own location and each next one `Spacing` further along the fence's forward axis. A rebuild leaves no old posts behind. `Rebuild` is also BlueprintCallable, so gameplay can rebuild the fence after changing its numbers.

The tests use this public interface, so keep these names:

- `UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 PostCount = 4;` clamped from 0 to 20.
- `UPROPERTY(EditAnywhere, BlueprintReadWrite) float Spacing = 200.f;` clamped at 10 or more.
- `UFUNCTION(BlueprintCallable) void Rebuild();`
- `UFUNCTION(BlueprintPure) int32 GetBuiltPostCount() const;`
- `UFUNCTION(BlueprintPure) FVector GetPostLocation(int32 Index) const;` the post's world location, or the fence's location for an index that does not exist.
- The posts are `UTextRenderComponent`s owned by the fence, and they are the only text render components it has.

## See it in the editor

Place a `DojoF4Fence`. Four posts labeled 1 to 4 appear at once. Change Post Count and Spacing in Details and watch the posts follow without pressing Play. Rotate the fence by 90 degrees: the row turns with it. Lower Post Count back to 2 and check the Outliner's component list for the fence: only two posts remain.

# Files

## DojoF4Fence.h

```cpp
// Declare ADojoF4Fence here.
```

## DojoF4Fence.cpp

```cpp
// Define ADojoF4Fence here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f4-fence/DojoF4Fence.h"
#include "Support/DojoTestWorld.h"

namespace DojoF4FenceTest
{
	/** Counts the text render components the fence actually owns, to catch posts left behind by a rebuild. */
	int32 CountPostComponents(const AActor* Fence)
	{
		TArray<UTextRenderComponent*> Found;
		Fence->GetComponents<UTextRenderComponent>(Found);
		return Found.Num();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F4_Fence_BuiltOnConstruction, "Dojo.F4.Fence.BuiltOnConstruction", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spawns a turned fence with designer numbers set before construction and checks the posts, their places, and their labels. */
bool FDojo_F4_Fence_BuiltOnConstruction::RunTest(const FString& Parameters)
{
	using namespace DojoF4FenceTest;

	FDojoTestWorld TestWorld;

	const FTransform Placement(FRotator(0.f, 90.f, 0.f), FVector(100.f, 0.f, 0.f));
	ADojoF4Fence* Fence = TestWorld.GetWorld()->SpawnActorDeferred<ADojoF4Fence>(ADojoF4Fence::StaticClass(), Placement);
	if (!TestNotNull(TEXT("Fence spawned"), Fence)) return false;

	Fence->PostCount = 5;
	Fence->Spacing = 100.f;
	Fence->FinishSpawning(Placement);

	TestEqual(TEXT("Five posts built during construction"), Fence->GetBuiltPostCount(), 5);
	TestEqual(TEXT("Five post components on the actor"), CountPostComponents(Fence), 5);
	TestTrue(TEXT("The first post stands at the fence"), Fence->GetPostLocation(0).Equals(FVector(100.f, 0.f, 0.f), 0.01));
	TestTrue(TEXT("The posts follow the fence's turn, along +Y"), Fence->GetPostLocation(4).Equals(FVector(100.f, 400.f, 0.f), 0.01));

	TArray<UTextRenderComponent*> Posts;
	Fence->GetComponents<UTextRenderComponent>(Posts);
	bool bFoundFive = false;
	for (const UTextRenderComponent* Post : Posts) bFoundFive |= Post->Text.ToString() == TEXT("5");
	TestTrue(TEXT("The last post is labeled 5"), bFoundFive);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F4_Fence_RebuildLeavesNothingBehind, "Dojo.F4.Fence.RebuildLeavesNothingBehind", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Rebuilds with fewer and then more posts and checks no old post is left on the actor. */
bool FDojo_F4_Fence_RebuildLeavesNothingBehind::RunTest(const FString& Parameters)
{
	using namespace DojoF4FenceTest;

	FDojoTestWorld TestWorld;

	ADojoF4Fence* Fence = TestWorld.SpawnActor<ADojoF4Fence>();
	if (!TestNotNull(TEXT("Fence spawned"), Fence)) return false;

	TestEqual(TEXT("Default fence has 4 posts"), Fence->GetBuiltPostCount(), 4);

	Fence->PostCount = 2;
	Fence->Rebuild();
	TestEqual(TEXT("Two posts after shrinking"), Fence->GetBuiltPostCount(), 2);
	TestEqual(TEXT("No leftover post components"), CountPostComponents(Fence), 2);

	Fence->PostCount = 7;
	Fence->Rebuild();
	TestEqual(TEXT("Seven posts after growing"), CountPostComponents(Fence), 7);
	TestTrue(TEXT("Post spacing defaults to 200"), Fence->GetPostLocation(6).Equals(FVector(1200.f, 0.f, 0.f), 0.01));
	TestTrue(TEXT("A post that does not exist reports the fence's location"), Fence->GetPostLocation(9).Equals(Fence->GetActorLocation(), 0.01));

	return true;
}

#endif
```

# Hints

- Split it into two jobs: clearing whatever the last construction made, then making the new posts; OnConstruction only calls Rebuild.
- Each post is made with NewObject using the fence as its outer, attached under the root, placed with a relative location, given its number, and then registered; keep them in an array so the next rebuild can destroy them.
- `UActorComponent::RegisterComponent` and `DestroyComponent` are in `Components/ActorComponent.h`; `AActor::OnConstruction` and `AddInstanceComponent` are in `GameFramework/Actor.h`.

# Rubric

- OnConstruction calls Super::OnConstruction and then Rebuild, so the posts update in the editor and at spawn.
- Rebuild destroys the previous posts before making new ones, so no rebuild leaves posts behind.
- Each post is created with NewObject, attached under the root, given a relative location along forward, labeled from 1, and registered.
- The posts are kept in a UPROPERTY array, and GetPostLocation answers in world space.
- PostCount and Spacing are editable, clamped, and BlueprintReadWrite with the given defaults.
- Nothing ticks, and no post is made in the constructor.

# Alternative

A Blueprint child of the fence with an Add Text Render Component node in its construction script does the same with no C++, and is a fine choice for a designer prototyping a layout. Components made by a construction script are cleaned up automatically on each rerun, which is why the Blueprint version needs no clearing step. Doing it in C++ means clearing by hand, but the layout rules live in one place that other C++ code (a boss director, a level generator) can call through Rebuild.
