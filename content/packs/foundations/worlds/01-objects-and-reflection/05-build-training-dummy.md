---
id: f1-training-dummy
title: A training dummy the console can strike
order: 5
kind: build
scaffold: worked
difficulty: 1
patterns: []
skills: [reflection, actors]
terms: [uproperty, ufunction, blueprintcallable, blueprintpure, editanywhere, visibleanywhere, createdefaultsubobject, beginplay]
prerequisites: [f1-ufunction-specifiers]
xp: 40
estimatedMinutes: 12
concepts:
  - UFUNCTION makes a function reachable by name from Blueprint and the console
  - UPROPERTY with EditAnywhere puts a tuning value in the Details panel
---

# Brief

When you press Play and run `ke * Strike` in the console three times, the number floating above the dummy counts down 3, 2, 1 and then reads DOWN.

Most of `ADojoF1TrainingDummy` is written for you. First read the marked lines and say in a sentence why each one is there. Then fill the two gaps:

1. In the header, make `Strike` a function Blueprint and the console can call.
2. In the source file, write `Strike`: count one strike and refresh the label, unless the dummy is already down.

The console command `ke` (short for KismetEvent) finds a function by name through reflection, so it only works once `Strike` is a UFUNCTION. Try it before the first gap and after it: that difference is the whole lesson.

## See it in the editor

Drag `DojoF1TrainingDummy` from the Content Browser's C++ Classes folder into the sandbox map, set Hits To Knock Down to 5 in its Details panel, and press Play. The label reads 5. Press the backtick key to open the console and run `ke * Strike` five times: the label counts down to 1 and then reads DOWN, and a sixth strike changes nothing.

# Files

## DojoF1TrainingDummy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF1TrainingDummy.generated.h" // @explain: The header tool's generated code comes in through this include, and it must be the last one.

class UTextRenderComponent;

/** A practice dummy that counts strikes and tips over after a set number of them. */
UCLASS()
class ADojoF1TrainingDummy : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF1TrainingDummy();

	/** Floating text above the dummy that shows the strikes left. */
	UPROPERTY(VisibleAnywhere, Category = "Dummy") // @explain: VisibleAnywhere shows the label in Details and keeps the garbage collector aware of it, without letting anyone swap it out.
	TObjectPtr<UTextRenderComponent> Label;

	/** How many strikes knock the dummy down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Dummy", meta = (ClampMin = "1")) // @explain: Designers tune the count per dummy, Blueprint may read it, and ClampMin stops a zero that would make the dummy start knocked down.
	int32 HitsToKnockDown = 3;

	// Your code: let Blueprint and the console call Strike.
	void Strike();

	/** Strikes counted so far. */
	UFUNCTION(BlueprintPure, Category = "Dummy")
	int32 GetHitsTaken() const;

	/** True once the dummy has taken HitsToKnockDown strikes. */
	UFUNCTION(BlueprintPure, Category = "Dummy") // @explain: A getter that changes nothing becomes a pure node without execution pins, and const promises the same in C++.
	bool IsKnockedDown() const;

protected:
	/** Shows the starting count on the label. */
	virtual void BeginPlay() override;

private:
	/** Writes the strikes left, or DOWN, into the label. */
	void RefreshLabel();

	int32 HitsTaken = 0;
};
```

## DojoF1TrainingDummy.cpp

```cpp
#include "DojoF1TrainingDummy.h"

#include "Components/TextRenderComponent.h"

ADojoF1TrainingDummy::ADojoF1TrainingDummy()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label")); // @explain: Components every dummy always has are created in the constructor, so they exist on the class default object too.
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF1TrainingDummy::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoF1TrainingDummy::Strike()
{
	// Your code: do nothing if the dummy is already down; otherwise count the strike and refresh the label.
}

int32 ADojoF1TrainingDummy::GetHitsTaken() const
{
	return HitsTaken;
}

bool ADojoF1TrainingDummy::IsKnockedDown() const
{
	return HitsTaken >= HitsToKnockDown;
}

void ADojoF1TrainingDummy::RefreshLabel()
{
	const FText Text = IsKnockedDown() ? FText::FromString(TEXT("DOWN")) : FText::AsNumber(HitsToKnockDown - HitsTaken);
	Label->SetText(Text);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F1_TrainingDummy_StrikeIsReflected, "Dojo.F1.TrainingDummy.StrikeIsReflected", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Asks reflection for Strike and HitsToKnockDown and checks Blueprint and the Details panel can reach them. */
bool FDojo_F1_TrainingDummy_StrikeIsReflected::RunTest(const FString& Parameters)
{
	const UFunction* StrikeFunction = ADojoF1TrainingDummy::StaticClass()->FindFunctionByName(TEXT("Strike"));
	if (!TestNotNull(TEXT("Strike is a UFUNCTION"), StrikeFunction)) return false;
	TestTrue(TEXT("Strike is BlueprintCallable"), StrikeFunction->HasAnyFunctionFlags(FUNC_BlueprintCallable));

	const FProperty* HitsProperty = FindFProperty<FProperty>(ADojoF1TrainingDummy::StaticClass(), TEXT("HitsToKnockDown"));
	if (!TestNotNull(TEXT("HitsToKnockDown is a UPROPERTY"), HitsProperty)) return false;
	TestTrue(TEXT("HitsToKnockDown is editable in Details"), HitsProperty->HasAnyPropertyFlags(CPF_Edit));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F1_TrainingDummy_KnockedDownAfterThree, "Dojo.F1.TrainingDummy.KnockedDownAfterThree", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Strikes a dummy four times and checks it goes down on the third and ignores the fourth. */
bool FDojo_F1_TrainingDummy_KnockedDownAfterThree::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF1TrainingDummy* Dummy = TestWorld.SpawnActor<ADojoF1TrainingDummy>();
	if (!TestNotNull(TEXT("Dummy spawned"), Dummy)) return false;

	Dummy->Strike();
	Dummy->Strike();
	TestEqual(TEXT("Two strikes counted"), Dummy->GetHitsTaken(), 2);
	TestFalse(TEXT("Still standing after two strikes"), Dummy->IsKnockedDown());

	Dummy->Strike();
	TestTrue(TEXT("Down after the third strike"), Dummy->IsKnockedDown());

	Dummy->Strike();
	TestEqual(TEXT("A downed dummy ignores more strikes"), Dummy->GetHitsTaken(), 3);

	return true;
}

#endif
```

# Hints

- Compare the declaration of Strike with the two getters below it: one line above them is missing above Strike.
- Strike changes state, so it wants the specifier that gives a node with execution pins; its body only needs the knocked-down check, the counter, and the existing label helper.
- The function flags the test reads are listed in `UObject/Script.h`; the specifier you need is the one that sets the callable flag.

# Rubric

- Strike is a UFUNCTION with BlueprintCallable and a Category.
- A downed dummy ignores further strikes, so the count never passes HitsToKnockDown.
- The label is refreshed through the existing helper, not by writing text in two places.
- The knock-down count comes from the editable property, never from a number typed in Strike.
- No Tick is used and the label component is created once, in the constructor.

# Alternative

Instead of a counter going up, the dummy could store HitsRemaining and count down, which makes the label line shorter. The catch is that HitsToKnockDown can be changed in Details after the dummy is placed, so HitsRemaining would have to be copied in BeginPlay and kept in step. Counting hits taken and comparing against the editable limit keeps one source of truth, which is why the starter is shaped this way.

# Parsons

```yaml
- id: dummy-strike
  prompt: Put Strike in order.
  lines:
    - "void ADojoF1TrainingDummy::Strike()"
    - "{"
    - "	if (IsKnockedDown()) return;"
    - "	HitsTaken++;"
    - "	RefreshLabel();"
    - "}"
  distractors:
    - line: "	Super::Strike();"
      mistake: Strike is a new function on this class, not an override, so there is no parent version to call.
- id: dummy-constructor
  prompt: Put the constructor in order.
  lines:
    - "ADojoF1TrainingDummy::ADojoF1TrainingDummy()"
    - "{"
    - "	PrimaryActorTick.bCanEverTick = false;"
    - "	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT(\"Label\"));"
    - "	RootComponent = Label;"
    - "}"
  distractors:
    - line: "	Label = NewObject<UTextRenderComponent>(this);"
      mistake: Components every instance owns from the start are made with CreateDefaultSubobject in the constructor, so they exist on the class default object.
```
