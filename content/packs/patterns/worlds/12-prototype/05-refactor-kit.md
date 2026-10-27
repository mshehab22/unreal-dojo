---
id: p12-kit-refactor
title: A copy function that lists every field
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [prototype]
skills: [prototype, refactoring]
terms: [duplicate-object, newobject, createdefaultsubobject, tobjectptr]
prerequisites: [p12-trial-rows]
xp: 100
estimatedMinutes: 20
concepts:
  - A copy function that lists every field by hand falls behind the first time a field is added
  - DuplicateObject copies every saved property and also copies the objects the source owns
  - Objects the source only points at stay shared between the source and the copy
  - The function's name, signature, and results for the fields it already handled stay the same
---

# Brief

After the refactor, `Clone` gives a challenger kit a separate copy with every saved value of the original, including the ones added after `Clone` was written, and everything else about it behaves as before.

`UDojoP12Kit` is what a challenger carries into a trial: a label, `Health`, `Stamina`, `LuckBonus`, a `Charm` the kit owns, and a `Favor` charm that belongs to someone else and that the kit only points at. `Clone` makes a copy for the next challenger. It was written by hand, one field at a time, back when the kit had fewer fields, and the kit has grown since.

Refactor `Clone` onto `DuplicateObject`:

- `Clone` becomes a single `DuplicateObject` call into the source's own outer.
- Remove the field-by-field copying. `Clone` keeps its name and signature, and the kit's fields and constructor stay as they are.
- The copy owns its own copy of the charm, and still points at the very same favor as the source.

Two of the three tests pass on the starter and must pass after; one does not. Read its message.

## See it in the editor

Make a Blueprint function library or use the Level Blueprint. On Begin Play, Construct Object from Class with Class set to `DojoP12Kit`, set its Luck Bonus to 0.3 and its Health to 70, then call Clone on it and print the clone's Luck Bonus. Before the refactor it prints 0; after, 0.3. Compare the two kits' Charm with an Equal (Object) node: false, because the clone owns its own charm. Set Favor on the first kit only, before you call Clone, then compare the clone's Favor with the first kit's Favor: true, because the favor is shared.

# Files

## DojoP12Charm.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP12Charm.generated.h"

/** A small charm a challenger carries: one number saying how strong its bonus is. */
UCLASS(Blueprintable, BlueprintType)
class UDojoP12Charm : public UObject
{
	GENERATED_BODY()

public:
	/** How strong the charm's bonus is. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Charm")
	float Strength = 1.f;
};
```

## DojoP12Kit.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP12Charm.h"
#include "UObject/Object.h"
#include "DojoP12Kit.generated.h"

/** What a challenger carries into a trial: a few numbers, a charm of its own, and a favor shared with others. Prototype pattern, object form. */
UCLASS(Blueprintable, BlueprintType)
class UDojoP12Kit : public UObject
{
	GENERATED_BODY()

public:
	/** Creates the kit's own charm. */
	UDojoP12Kit();

	/** The label shown for this kit. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit")
	FName KitLabel = NAME_None;

	/** Hit points the challenger starts with. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit", meta = (ClampMin = "1"))
	int32 Health = 100;

	/** Stamina the challenger starts with. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit", meta = (ClampMin = "0.0"))
	float Stamina = 50.f;

	/** Extra luck added to every roll; added to the kit after the first version. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit")
	float LuckBonus = 0.f;

	/** The charm this kit owns; every kit has its own. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Instanced, Category = "Kit")
	TObjectPtr<UDojoP12Charm> Charm;

	/** A charm owned by someone else that this kit only points at. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit")
	TObjectPtr<UDojoP12Charm> Favor;

	/** Makes a separate kit with the same values and its own copy of the charm; the favor stays shared. */
	UFUNCTION(BlueprintCallable, Category = "Kit")
	UDojoP12Kit* Clone() const;
};
```

## DojoP12Kit.cpp

```cpp
#include "DojoP12Kit.h"

UDojoP12Kit::UDojoP12Kit()
{
	Charm = CreateDefaultSubobject<UDojoP12Charm>(TEXT("Charm"));
}

UDojoP12Kit* UDojoP12Kit::Clone() const
{
	UDojoP12Kit* Copy = NewObject<UDojoP12Kit>(GetOuter());
	Copy->KitLabel = KitLabel;
	Copy->Health = Health;
	Copy->Stamina = Stamina;
	Copy->Charm->Strength = Charm->Strength;
	Copy->Favor = Favor;
	return Copy;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p12-kit-refactor/DojoP12Charm.h"
#include "Quests/p12-kit-refactor/DojoP12Kit.h"
#include "UObject/UnrealType.h"

namespace DojoP12KitTest
{
	/** A kit with a distinct non-default value in every field, a charm of strength 3, and a favor owned by someone else. */
	UDojoP12Kit* MakeKit(UDojoP12Charm* SharedFavor)
	{
		UDojoP12Kit* Kit = NewObject<UDojoP12Kit>(GetTransientPackage());
		Kit->KitLabel = TEXT("Veteran");
		Kit->Health = 70;
		Kit->Stamina = 30.f;
		Kit->LuckBonus = 0.25f;
		Kit->Charm->Strength = 3.f;
		Kit->Favor = SharedFavor;
		return Kit;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_KitRefactor_CloneKeepsEveryValue, "Dojo.P12.KitRefactor.CloneKeepsEveryValue", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The clone is a separate kit whose every plain property equals the source's, checked through reflection so a field added later is covered. */
bool FDojo_P12_KitRefactor_CloneKeepsEveryValue::RunTest(const FString& Parameters)
{
	using namespace DojoP12KitTest;

	UDojoP12Charm* Favor = NewObject<UDojoP12Charm>(GetTransientPackage());
	UDojoP12Kit* Source = MakeKit(Favor);
	UDojoP12Kit* Copy = Source->Clone();
	if (!TestNotNull(TEXT("Clone returns a kit"), Copy)) return false;

	TestTrue(TEXT("It is a different object"), Copy != Source);
	TestEqual(TEXT("Same outer"), Copy->GetOuter(), Source->GetOuter());

	for (TFieldIterator<FProperty> It(UDojoP12Kit::StaticClass()); It; ++It)
	{
		const FProperty* Property = *It;
		if (CastField<FObjectPropertyBase>(Property)) continue;

		if (!Property->Identical_InContainer(Source, Copy)) AddError(FString::Printf(TEXT("Property %s differs between the kit and its clone"), *Property->GetName()));
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_KitRefactor_CloneOwnsItsCharm, "Dojo.P12.KitRefactor.CloneOwnsItsCharm", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The clone has its own copy of the charm with the same strength; changing one kit's charm leaves the other alone. */
bool FDojo_P12_KitRefactor_CloneOwnsItsCharm::RunTest(const FString& Parameters)
{
	using namespace DojoP12KitTest;

	UDojoP12Kit* Source = MakeKit(nullptr);
	UDojoP12Kit* Copy = Source->Clone();
	if (!TestNotNull(TEXT("Clone returns a kit"), Copy) || !TestNotNull(TEXT("The clone has a charm"), Copy->Charm.Get())) return false;

	TestTrue(TEXT("The clone's charm is not the source's"), Copy->Charm != Source->Charm);
	TestEqual(TEXT("But it has the same strength"), Copy->Charm->Strength, 3.f);

	Copy->Charm->Strength = 9.f;
	Copy->Health = 10;
	TestEqual(TEXT("Changing the clone's charm leaves the source's alone"), Source->Charm->Strength, 3.f);
	TestEqual(TEXT("Changing the clone's health leaves the source's alone"), Source->Health, 70);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_KitRefactor_CloneSharesTheFavor, "Dojo.P12.KitRefactor.CloneSharesTheFavor", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The favor belongs to someone else, so the clone points at the very same object. */
bool FDojo_P12_KitRefactor_CloneSharesTheFavor::RunTest(const FString& Parameters)
{
	using namespace DojoP12KitTest;

	UDojoP12Charm* Favor = NewObject<UDojoP12Charm>(GetTransientPackage());
	UDojoP12Kit* Source = MakeKit(Favor);
	UDojoP12Kit* Copy = Source->Clone();
	if (!TestNotNull(TEXT("Clone returns a kit"), Copy)) return false;

	TestTrue(TEXT("The clone points at the same favor"), Copy->Favor == Favor);

	return true;
}

#endif
```

# Hints

- `CloneKeepsEveryValue` walks the kit's properties and names the ones that differ. Which field is it, and where in `Clone` would you have had to add a line for it?
- `DuplicateObject<UDojoP12Kit>(SourceObject, Outer)` returns the new kit. The source is `this`, and the kit's own outer is `GetOuter()`.
- Delete every line that sets a field. The constructor that makes the kit's charm still runs for the copy, and the duplicate replaces its values with the source's.

# Rubric

- Clone is one DuplicateObject call with the kit as the source and its own outer as the outer; no field-by-field copying remains.
- Every saved (non-Transient) property of the source, including ones added later, is in the copy.
- The copy owns its own charm, with the source's strength, and changing one kit's charm leaves the other alone.
- The favor, which the kit only points at, is shared by the source and the copy.
- Clone keeps its name and signature, and the kit's fields and constructor are unchanged.

# Alternative

A copy constructor or a hand-written `Clone` is the right tool when only some fields should travel: a kit that must start fresh, with `Health` reset and the label cleared, is better built field by field, on purpose. Another option is to keep the starting kits as Data Assets and build each challenger's kit from one with `NewObject` and a short, explicit setup. Duplication is best when "same as that one, all of it" is exactly what you want.
