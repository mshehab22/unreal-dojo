---
id: p11-torch-refactor
title: Forty torches, forty components, one mesh
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [flyweight]
skills: [flyweight, refactoring]
terms: [instanced-static-mesh, static-mesh-component, createdefaultsubobject, newobject, register-component]
prerequisites: [p11-stand-seats]
xp: 100
estimatedMinutes: 20
concepts:
  - A component per identical mesh is per-copy overhead the shared mesh does not need
  - One instanced static mesh component made in the constructor replaces the runtime-made components
  - The line's public functions stay, reading from the instances instead of from components
---

# Brief

When you press Play after the refactor, the wall shows the same twelve torches, 150 units apart, and the same functions report them. What changed is that the line now has one component instead of twelve.

`ADojoP11TorchLine` was written to make one `UStaticMeshComponent` per torch at runtime, each with the same mesh, and the arena now has a dozen lines of up to forty torches. Every torch is a whole component: registered, transformed, attached, and drawn on its own, though only its location differs from the others.

Refactor the line onto one `UInstancedStaticMeshComponent`:

- Create it in the constructor with `CreateDefaultSubobject`, as the root, in a `Torches` property.
- `BuildTorches` sets its mesh to `TorchMesh`, clears it, and adds one instance per torch at its location.
- `GetTorchCount` and `GetTorchLocation` read the instances.
- Remove the per-torch components and the array that held them. `TorchMesh`, `TorchCount`, `TorchSpacing`, and the public functions keep their names.

## See it in the editor

Before the refactor, place a `DojoP11TorchLine`, set Torch Mesh to Shape_Cylinder from Engine Content, and press Play: select the line while playing and its component list shows twelve static mesh components. After it, the same line shows one Torches component with twelve instances, and looks the same.

# Files

## DojoP11TorchLine.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP11TorchLine.generated.h"

class UStaticMesh;
class UStaticMeshComponent;

/** A line of torches along the arena wall, each torch its own static mesh component. */
UCLASS()
class ADojoP11TorchLine : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP11TorchLine();

	/** The mesh each torch uses. */
	UPROPERTY(EditAnywhere, Category = "Torches")
	TObjectPtr<UStaticMesh> TorchMesh;

	/** How many torches the line holds. */
	UPROPERTY(EditAnywhere, Category = "Torches", meta = (ClampMin = "0"))
	int32 TorchCount = 12;

	/** Distance between neighboring torches. */
	UPROPERTY(EditAnywhere, Category = "Torches", meta = (ClampMin = "1.0"))
	float TorchSpacing = 150.f;

	/** Clears the line and places TorchCount torches, TorchSpacing apart along X. */
	UFUNCTION(BlueprintCallable, Category = "Torches")
	void BuildTorches();

	/** Torches drawn. */
	UFUNCTION(BlueprintPure, Category = "Torches")
	int32 GetTorchCount() const;

	/** Where torch Index stands, relative to the line; zero for an index with no torch. */
	UFUNCTION(BlueprintPure, Category = "Torches")
	FVector GetTorchLocation(int32 Index) const;

protected:
	/** Places the torches. */
	virtual void BeginPlay() override;

private:
	/** One mesh component per torch, made at runtime. */
	UPROPERTY()
	TArray<TObjectPtr<UStaticMeshComponent>> TorchMeshes;
};
```

## DojoP11TorchLine.cpp

```cpp
#include "DojoP11TorchLine.h"

#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"

ADojoP11TorchLine::ADojoP11TorchLine()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP11TorchLine::BeginPlay()
{
	Super::BeginPlay();

	BuildTorches();
}

void ADojoP11TorchLine::BuildTorches()
{
	for (UStaticMeshComponent* Torch : TorchMeshes)
	{
		if (IsValid(Torch)) Torch->DestroyComponent();
	}
	TorchMeshes.Reset();

	for (int32 Index = 0; Index < TorchCount; Index++)
	{
		UStaticMeshComponent* Torch = NewObject<UStaticMeshComponent>(this);
		Torch->SetStaticMesh(TorchMesh);
		Torch->SetupAttachment(RootComponent);
		Torch->SetRelativeLocation(FVector(Index * TorchSpacing, 0.f, 0.f));
		Torch->RegisterComponent();
		TorchMeshes.Add(Torch);
	}
}

int32 ADojoP11TorchLine::GetTorchCount() const
{
	return TorchMeshes.Num();
}

FVector ADojoP11TorchLine::GetTorchLocation(int32 Index) const
{
	if (!TorchMeshes.IsValidIndex(Index) || !IsValid(TorchMeshes[Index])) return FVector::ZeroVector;

	return TorchMeshes[Index]->GetRelativeLocation();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/InstancedStaticMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Quests/p11-torch-refactor/DojoP11TorchLine.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P11_TorchRefactor_TwelveTorchesInALine, "Dojo.P11.TorchRefactor.TwelveTorchesInALine", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The line holds twelve torches 150 apart, and rebuilding with five leaves exactly five. */
bool FDojo_P11_TorchRefactor_TwelveTorchesInALine::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP11TorchLine* Line = TestWorld.SpawnActor<ADojoP11TorchLine>();
	if (!TestNotNull(TEXT("Torch line spawned"), Line)) return false;

	TestEqual(TEXT("Twelve torches"), Line->GetTorchCount(), 12);
	TestTrue(TEXT("The first stands at the start"), Line->GetTorchLocation(0).Equals(FVector::ZeroVector));
	TestTrue(TEXT("The last stands 1650 along"), Line->GetTorchLocation(11).Equals(FVector(1650.f, 0.f, 0.f)));

	Line->TorchCount = 5;
	Line->BuildTorches();
	TestEqual(TEXT("Rebuilt with five"), Line->GetTorchCount(), 5);
	TestTrue(TEXT("The fifth stands 600 along"), Line->GetTorchLocation(4).Equals(FVector(600.f, 0.f, 0.f)));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P11_TorchRefactor_OneSharedMeshComponent, "Dojo.P11.TorchRefactor.OneSharedMeshComponent", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Every torch is an instance of one instanced static mesh component; the line has no per-torch mesh components. */
bool FDojo_P11_TorchRefactor_OneSharedMeshComponent::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP11TorchLine* Line = TestWorld.SpawnActor<ADojoP11TorchLine>();
	if (!TestNotNull(TEXT("Torch line spawned"), Line)) return false;

	TArray<UStaticMeshComponent*> MeshComponents;
	Line->GetComponents<UStaticMeshComponent>(MeshComponents);

	TestEqual(TEXT("One mesh component draws the line"), MeshComponents.Num(), 1);
	TestTrue(TEXT("And it is an instanced static mesh component"), MeshComponents.Num() == 1 && MeshComponents[0]->IsA<UInstancedStaticMeshComponent>());

	return true;
}

#endif
```

# Hints

- `TwelveTorchesInALine` passes before and after; keep it passing. `OneSharedMeshComponent` is the one that says the refactor is done.
- `UInstancedStaticMeshComponent` is in `Components/InstancedStaticMeshComponent.h`. `GetInstanceTransform(Index, OutTransform)` returns false for an index with no instance.
- Clear the instances before adding them, or building twice doubles the line.

# Rubric

- One instanced static mesh component, made in the constructor, draws every torch from the one shared mesh.
- No per-torch components remain, and nothing is created with NewObject at runtime.
- Building clears the instances first, so the line never doubles.
- GetTorchCount and GetTorchLocation read the instances, with no array of their own beside them.
- The public functions and their results are unchanged.

# Alternative

A designer-placed line could also be drawn in the editor by building the instances in `OnConstruction`, so the torches show before play. That works for any instanced component; it was left out here to keep play and the tests the only place torches are made. For lines that light up one by one, each torch's own state, such as lit or out, would live in an array on the line, as the seats' did, while the component only draws.
