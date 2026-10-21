---
id: example-build-worked-lantern
title: A lantern that starts lit
order: 2
kind: build
scaffold: worked
difficulty: 1
patterns: [component]
skills: [actors, components]
terms: [actor, createdefaultsubobject, beginplay, uproperty]
prerequisites: [example-concept-uproperty]
xp: 40
estimatedMinutes: 12
concepts:
  - Components are created in the constructor
  - Editable defaults come from UPROPERTY fields
---

# Brief

When you press Play, the lantern glows orange at the brightness you set in its Details panel.

Most of `ADojoExLantern` is written for you. Read the marked lines and explain each one in a sentence, then fill the one gap: apply `Brightness` to the light when the game starts.

The lantern holds a reference to its own light component; nothing else knows about the lantern.

## See it in the editor

Drag `DojoExLantern` from the Content Browser into the sandbox map, set Brightness to 20 in its Details panel, and press Play. The point light should be visibly brighter than a lantern left at the default.

# Files

## DojoExLantern.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExLantern.generated.h"

class UPointLightComponent;

/** A lantern actor whose point light glows at an editable brightness. */
UCLASS()
class ADojoExLantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the light component and turns ticking off. */
	ADojoExLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern") // @explain: VisibleAnywhere shows the component in Details without letting anyone replace it.
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern", meta = (ClampMin = "0.0"))
	float Brightness = 8.f;

protected:
	/** Applies Brightness to the light when play starts. */
	virtual void BeginPlay() override;
};
```

## DojoExLantern.cpp

```cpp
#include "DojoExLantern.h"

#include "Components/PointLightComponent.h"

/** Creates the light as the root component with a warm color. */
ADojoExLantern::ADojoExLantern()
{
	PrimaryActorTick.bCanEverTick = false; // @explain: The lantern never changes on its own, so it should cost nothing per frame.

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light")); // @explain: Components that always exist are made in the constructor so they appear on the class default.
	RootComponent = Light;
	Light->SetLightColor(FLinearColor(1.f, 0.55f, 0.2f));
}

/** Applies the editable brightness once play starts. */
void ADojoExLantern::BeginPlay()
{
	Super::BeginPlay(); // @explain: The parent BeginPlay registers components and runs Blueprint BeginPlay, so it comes first.

	// Your code: give the light the Brightness set in the Details panel.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/PointLightComponent.h"
#include "Quests/example-build-worked-lantern/DojoExLantern.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_Examples_Lantern_StartsLit, "Dojo.Examples.Lantern.StartsLit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spawns a lantern and checks that BeginPlay applied the editable brightness to the light. */
bool FDojo_Examples_Lantern_StartsLit::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoExLantern* Lantern = TestWorld.SpawnActor<ADojoExLantern>();
	if (!TestNotNull(TEXT("Lantern spawned"), Lantern)) return false;
	if (!TestNotNull(TEXT("Lantern has a light"), Lantern->Light.Get())) return false;

	TestEqual(TEXT("Light intensity equals Brightness after BeginPlay"), Lantern->Light->Intensity, Lantern->Brightness);

	return true;
}

#endif
```

# Hints

- Look at what BeginPlay already has and where the comment sits.
- The light component has a setter for its brightness; it is named after the property you see in its Details panel.
- The setter is declared in `Components/LightComponent.h`, which the point light inherits from.

# Rubric

- BeginPlay calls Super::BeginPlay before anything else.
- The light's intensity is set from Brightness, not from a number typed in the code.
- No Tick is used.
- The light component is created once, in the constructor.
- The lantern knows nothing about any other actor.

# Alternative

You could set the intensity in the constructor instead of BeginPlay. That works for the class default, but a value typed into a placed lantern's Details panel arrives after the constructor runs, so the constructor would always use 8. Applying it in BeginPlay (or in `OnConstruction`, which also updates the editor viewport) is the idiomatic Unreal choice.

# Parsons

```yaml
- id: lantern-begin-play
  prompt: Put BeginPlay in order.
  lines:
    - "void ADojoExLantern::BeginPlay()"
    - "{"
    - "	Super::BeginPlay();"
    - "	Light->SetIntensity(Brightness);"
    - "}"
  distractors:
    - line: "	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT(\"Light\"));"
      mistake: CreateDefaultSubobject only works inside the constructor.
- id: lantern-constructor
  prompt: Put the constructor in order.
  lines:
    - "ADojoExLantern::ADojoExLantern()"
    - "{"
    - "	PrimaryActorTick.bCanEverTick = false;"
    - "	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT(\"Light\"));"
    - "	RootComponent = Light;"
    - "}"
  distractors:
    - line: "	Super::BeginPlay();"
      mistake: The constructor does not call BeginPlay; the engine calls it later when play starts.
```
