---
id: f6-showcase
title: A showcase that loads what it shows
order: 10
kind: build
scaffold: blank
difficulty: 3
patterns: []
skills: [data, memory]
terms: [tsoftobjectptr, static-mesh-component, log-category, beginplay]
prerequisites: [f6-soft-references, f6-level-curve]
xp: 120
estimatedMinutes: 30
concepts:
  - A soft reference holds a path; loading turns it into an object
  - Asking for a path that is empty or wrong must be reported, not crash
---

# Brief

When you place a showcase, set its Starting Mesh to the engine's cube, and press Play, the cube appears on the pedestal; calling ShowMesh with the sphere swaps it, and calling it with nothing or with a path to a mesh that does not exist leaves the sphere in place and writes a warning to the Output Log.

Write `ADojoF6Showcase` from nothing. Its root is a static mesh component that displays the mesh. It holds meshes only as soft references, so nothing it might show is loaded until it shows it. It logs under its own category.

The tests use this public interface, so keep these names:

- `UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Display;` the root, showing the current mesh.
- `UPROPERTY(EditAnywhere) TSoftObjectPtr<UStaticMesh> StartingMesh;` shown in BeginPlay when set.
- `UFUNCTION(BlueprintCallable) bool ShowMesh(TSoftObjectPtr<UStaticMesh> Mesh);` loads the mesh if needed and shows it. An unset mesh logs a warning containing "was given nothing to show"; a path that does not load logs one containing "could not load". Both return false and change nothing.
- `UFUNCTION(BlueprintPure) UStaticMesh* GetShownMesh() const;` the mesh on show, or nullptr.

## See it in the editor

Place a `DojoF6Showcase` and set Starting Mesh to /Engine/BasicShapes/Cube. Notice the Details panel shows a path picker, not a loaded object. Press Play: the cube appears. In the level Blueprint, on a key press, call Show Mesh with /Engine/BasicShapes/Sphere: the sphere replaces it. Type `obj list class=StaticMesh` in the console before and after to see which meshes are in memory.

# Files

## DojoF6Showcase.h

```cpp
// Declare ADojoF6Showcase here.
```

## DojoF6Showcase.cpp

```cpp
// Define ADojoF6Showcase here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Quests/f6-showcase/DojoF6Showcase.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoF6ShowcaseTest
{
	/** A soft reference to one of the engine's basic shapes, by path. */
	TSoftObjectPtr<UStaticMesh> Shape(const TCHAR* Path)
	{
		return TSoftObjectPtr<UStaticMesh>(FSoftObjectPath(Path));
	}

	/** The name of the mesh on show, or None. */
	FString ShownName(const ADojoF6Showcase* Showcase)
	{
		const UStaticMesh* Mesh = Showcase->GetShownMesh();
		return Mesh ? Mesh->GetName() : FString(TEXT("None"));
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_Showcase_LoadsWhatItShows, "Dojo.F6.Showcase.LoadsWhatItShows", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Shows a starting cube, swaps to a sphere, then asks for nothing and for a missing mesh, which must both be refused with a warning. */
bool FDojo_F6_Showcase_LoadsWhatItShows::RunTest(const FString& Parameters)
{
	using namespace DojoF6ShowcaseTest;

	AddExpectedMessage(TEXT("was given nothing to show"), ELogVerbosity::Warning, EAutomationExpectedMessageFlags::Contains, 1);
	AddExpectedMessage(TEXT("could not load"), ELogVerbosity::Warning, EAutomationExpectedMessageFlags::Contains, 1);
	AddExpectedMessage(TEXT("NoSuchShape"), ELogVerbosity::Warning, EAutomationExpectedMessageFlags::Contains, -1);

	FDojoTestWorld TestWorld;

	ADojoF6Showcase* Showcase = TestWorld.GetWorld()->SpawnActorDeferred<ADojoF6Showcase>(ADojoF6Showcase::StaticClass(), FTransform::Identity);
	if (!TestNotNull(TEXT("Showcase spawned"), Showcase)) return false;
	Showcase->StartingMesh = Shape(TEXT("/Engine/BasicShapes/Cube.Cube"));
	Showcase->FinishSpawning(FTransform::Identity);

	TestTrue(TEXT("The display is the root"), Showcase->GetRootComponent() == Showcase->Display);
	TestEqual(TEXT("The starting cube is shown at BeginPlay"), ShownName(Showcase), FString(TEXT("Cube")));

	TestTrue(TEXT("Showing the sphere succeeds"), Showcase->ShowMesh(Shape(TEXT("/Engine/BasicShapes/Sphere.Sphere"))));
	TestEqual(TEXT("The sphere is shown"), ShownName(Showcase), FString(TEXT("Sphere")));

	TestFalse(TEXT("Showing nothing is refused"), Showcase->ShowMesh(TSoftObjectPtr<UStaticMesh>()));
	TestFalse(TEXT("Showing a missing mesh is refused"), Showcase->ShowMesh(Shape(TEXT("/Engine/BasicShapes/NoSuchShape.NoSuchShape"))));
	TestEqual(TEXT("The sphere stays after both refusals"), ShownName(Showcase), FString(TEXT("Sphere")));

	ADojoF6Showcase* Empty = TestWorld.SpawnActor<ADojoF6Showcase>();
	if (!TestNotNull(TEXT("Empty showcase spawned"), Empty)) return false;
	TestNull(TEXT("A showcase with no starting mesh shows nothing"), Empty->GetShownMesh());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_Showcase_HoldsOnlyPaths, "Dojo.F6.Showcase.HoldsOnlyPaths", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the starting mesh is an editable soft reference and ShowMesh is callable from Blueprint. */
bool FDojo_F6_Showcase_HoldsOnlyPaths::RunTest(const FString& Parameters)
{
	const UClass* ShowcaseClass = ADojoF6Showcase::StaticClass();

	const FProperty* StartingMesh = ShowcaseClass->FindPropertyByName(TEXT("StartingMesh"));
	if (!TestNotNull(TEXT("StartingMesh is a UPROPERTY"), StartingMesh)) return false;
	TestTrue(TEXT("The starting mesh is a soft reference"), StartingMesh->IsA<FSoftObjectProperty>());
	TestTrue(TEXT("Designers can set it"), StartingMesh->HasAnyPropertyFlags(CPF_Edit));

	const UFunction* ShowMesh = ShowcaseClass->FindFunctionByName(TEXT("ShowMesh"));
	if (!TestNotNull(TEXT("ShowMesh is a UFUNCTION"), ShowMesh)) return false;
	TestTrue(TEXT("ShowMesh is BlueprintCallable"), ShowMesh->HasAnyFunctionFlags(FUNC_BlueprintCallable));

	return true;
}

#endif
```

# Hints

- Three jobs: a constructor that makes the display the root, a BeginPlay that shows the starting mesh only when one is set, and ShowMesh with two refusals before the swap.
- A soft pointer can say whether it holds any path at all, and can load its object synchronously, returning nullptr when the path leads nowhere; the mesh component takes the loaded mesh.
- `TSoftObjectPtr::IsNull` and `LoadSynchronous` are in `UObject/SoftObjectPtr.h`; `UStaticMeshComponent::SetStaticMesh` is in `Components/StaticMeshComponent.h`.

# Rubric

- The starting mesh is a TSoftObjectPtr, so placing a showcase loads no mesh.
- ShowMesh refuses an unset pointer and a path that does not load, each with its own warning, and changes nothing.
- A loaded mesh is set on the display component, which is the root.
- BeginPlay shows the starting mesh only when it is set, and calls Super::BeginPlay.
- Warnings use the showcase's own log category, not LogTemp.
- No hard pointer to a mesh is kept in a UPROPERTY other than the component's own.

# Alternative

`LoadSynchronous` stops the game thread until the mesh is read from disk, which is fine for a small mesh on a pedestal and noticeable for a boss's textures. `FStreamableManager::RequestAsyncLoad`, reached through `UAssetManager::GetStreamableManager()`, loads in the background and calls you back when the asset is ready, so the showcase would show a placeholder until then. Blueprint has the same choice as the Async Load Asset node. Keeping the reference soft is what makes either choice possible; a hard UPROPERTY would have loaded the mesh with the level.
