---
id: p8-interactables
title: Chests and levers from one Blueprint-friendly base
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [subclass-sandbox]
skills: [subclass-sandbox, blueprint-bridge]
terms: [blueprintnativeevent, blueprintcallable, blueprint-protected, abstract-specifier, fname, tarray]
prerequisites: [p8-subclass-sandbox-card]
xp: 110
estimatedMinutes: 30
concepts:
  - The base decides when an interaction may happen and calls a BlueprintNativeEvent hook that C++ and Blueprint children override
  - Provided operations marked BlueprintProtected are callable from Blueprint children but not from outside graphs
  - A provided operation reports whether it worked, and the subclass must act on that answer
---

# Brief

When you press Play and run `ke * Interact` with the visitor carrying an ArenaKey, the chest's label reads Opened, the key is gone, and a GoldMedal is in the visitor's pack. Without a key the chest reads "Locked: needs a key" and gives nothing.

Around the arena stand chests, levers, terminals, and more coming. Each one does something different when a visitor uses it, but they all need the same few tools: show a prompt, take an item from the visitor, give one, record a quest flag, and refuse further use once spent. `ADojoP8InteractableBase` holds those tools as protected functions, marked `BlueprintProtected` so a designer's Blueprint child can call them too. The base also owns the one public entry, `Interact`, which ignores an empty visitor or a used-up interactable, counts the interaction, and calls the hook `OnInteract`. `OnInteract` is a `BlueprintNativeEvent`: C++ children override `OnInteract_Implementation`, and Blueprint children override the event.

The declarations, the visitor, the constructor, the getters, and the base's default hook ("Nothing happens") are given. Yours:

- The base's `Interact`, as described above.
- The provided operations: `ShowPrompt` sets the prompt and the label; `TakeItem` removes one item through the visitor and reports whether there was one to take; `GiveItem` and `SetQuestFlag` pass to the visitor; `MarkUsedUp` stops further interactions. Each ignores an empty visitor.
- The key chest's hook: for a visitor holding `KeyItem`, take the key, give `RewardItem`, show "Opened", and mark the chest used up; otherwise show "Locked: needs a key".
- The lever's hook: record `FlagName` on the visitor and show "Clunk", every time.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP8KeyChest`, a `DojoP8Lever`, and a `DojoP8Visitor` with ArenaKey in its Items. In the Level Blueprint, on Begin Play, call Interact on the chest with the visitor. Press Play: the chest reads Opened, and the visitor's label still reads Carrying 1, because the key went and the medal came. Remove the key from the visitor's Items and play again: Locked. Then right-click `DojoP8InteractableBase` in the Content Browser, create a Blueprint child, and override On Interact. The Show Prompt and Give Item nodes are there for you to use inside it, but a separate actor's Blueprint graph cannot call them.

# Files

## DojoP8Visitor.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8Visitor.generated.h"

class UTextRenderComponent;

/** A visitor walking the arena grounds, carrying items and collecting quest flags. */
UCLASS()
class ADojoP8Visitor : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8Visitor();

	/** Floating text that lists what the visitor carries. */
	UPROPERTY(VisibleAnywhere, Category = "Visitor")
	TObjectPtr<UTextRenderComponent> Label;

	/** Items the visitor carries, one entry per item. */
	UPROPERTY(EditAnywhere, Category = "Visitor")
	TArray<FName> Items;

	/** Quest flags the visitor has earned. */
	UPROPERTY(VisibleInstanceOnly, Category = "Visitor")
	TArray<FName> QuestFlags;

	/** True when the visitor carries at least one Item. */
	UFUNCTION(BlueprintPure, Category = "Visitor")
	bool HasItem(FName Item) const;

	/** Adds one Item. */
	UFUNCTION(BlueprintCallable, Category = "Visitor")
	void AddItem(FName Item);

	/** Removes one Item; returns false, changing nothing, when the visitor has none. */
	UFUNCTION(BlueprintCallable, Category = "Visitor")
	bool RemoveItem(FName Item);

	/** True once the visitor has earned Flag. */
	UFUNCTION(BlueprintPure, Category = "Visitor")
	bool HasFlag(FName Flag) const;

	/** Records Flag once. */
	UFUNCTION(BlueprintCallable, Category = "Visitor")
	void SetFlag(FName Flag);

protected:
	/** Shows what the visitor carries. */
	virtual void BeginPlay() override;

private:
	/** Writes the item count into the label. */
	void RefreshLabel();
};
```

## DojoP8Visitor.cpp

```cpp
#include "DojoP8Visitor.h"

#include "Components/TextRenderComponent.h"

ADojoP8Visitor::ADojoP8Visitor()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8Visitor::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

bool ADojoP8Visitor::HasItem(FName Item) const
{
	return Items.Contains(Item);
}

void ADojoP8Visitor::AddItem(FName Item)
{
	Items.Add(Item);
	RefreshLabel();
}

bool ADojoP8Visitor::RemoveItem(FName Item)
{
	const int32 Index = Items.Find(Item);
	if (Index == INDEX_NONE) return false;

	Items.RemoveAt(Index);
	RefreshLabel();
	return true;
}

bool ADojoP8Visitor::HasFlag(FName Flag) const
{
	return QuestFlags.Contains(Flag);
}

void ADojoP8Visitor::SetFlag(FName Flag)
{
	QuestFlags.AddUnique(Flag);
}

void ADojoP8Visitor::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Carrying %d"), Items.Num())));
}
```

## DojoP8InteractableBase.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8InteractableBase.generated.h"

class ADojoP8Visitor;
class UTextRenderComponent;

/** The base for every arena interactable: it owns when an interaction may happen, and hands subclasses, in C++ or Blueprint, a protected toolbox for items, flags, and prompts. */
UCLASS(Abstract, Blueprintable)
class ADojoP8InteractableBase : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8InteractableBase();

	/** Floating text that shows the interactable's prompt. */
	UPROPERTY(VisibleAnywhere, Category = "Interactable")
	TObjectPtr<UTextRenderComponent> Label;

	/** A visitor uses this interactable; ignored for an empty visitor or once the interactable is used up. */
	UFUNCTION(BlueprintCallable, Category = "Interactable")
	void Interact(ADojoP8Visitor* Visitor);

	/** The prompt currently shown. */
	UFUNCTION(BlueprintPure, Category = "Interactable")
	FText GetPrompt() const;

	/** True once the interactable will take no more interactions. */
	UFUNCTION(BlueprintPure, Category = "Interactable")
	bool IsUsedUp() const;

	/** Interactions that reached the subclass's OnInteract. */
	UFUNCTION(BlueprintPure, Category = "Interactable")
	int32 GetInteractionCount() const;

protected:
	/** What this kind of interactable does when used. C++ subclasses override OnInteract_Implementation; Blueprint children override the event. The default shows "Nothing happens". */
	UFUNCTION(BlueprintNativeEvent, Category = "Interactable")
	void OnInteract(ADojoP8Visitor* Visitor);

	/** Shows Text as the prompt. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	void ShowPrompt(const FText& Text);

	/** Takes one Item from the visitor; returns false, taking nothing, when the visitor has none. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	bool TakeItem(ADojoP8Visitor* Visitor, FName Item);

	/** Gives the visitor one Item. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	void GiveItem(ADojoP8Visitor* Visitor, FName Item);

	/** Records a quest flag on the visitor. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	void SetQuestFlag(ADojoP8Visitor* Visitor, FName Flag);

	/** Stops the interactable from taking any further interaction. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	void MarkUsedUp();

private:
	FText Prompt;
	bool bUsedUp = false;
	int32 InteractionCount = 0;
};
```

## DojoP8InteractableBase.cpp

```cpp
#include "DojoP8InteractableBase.h"

#include "Components/TextRenderComponent.h"
#include "DojoP8Visitor.h"

ADojoP8InteractableBase::ADojoP8InteractableBase()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8InteractableBase::Interact(ADojoP8Visitor* Visitor)
{
}

void ADojoP8InteractableBase::OnInteract_Implementation(ADojoP8Visitor* Visitor)
{
	ShowPrompt(FText::FromString(TEXT("Nothing happens")));
}

FText ADojoP8InteractableBase::GetPrompt() const
{
	return Prompt;
}

bool ADojoP8InteractableBase::IsUsedUp() const
{
	return bUsedUp;
}

int32 ADojoP8InteractableBase::GetInteractionCount() const
{
	return InteractionCount;
}

void ADojoP8InteractableBase::ShowPrompt(const FText& Text)
{
}

bool ADojoP8InteractableBase::TakeItem(ADojoP8Visitor* Visitor, FName Item)
{
	return false;
}

void ADojoP8InteractableBase::GiveItem(ADojoP8Visitor* Visitor, FName Item)
{
}

void ADojoP8InteractableBase::SetQuestFlag(ADojoP8Visitor* Visitor, FName Flag)
{
}

void ADojoP8InteractableBase::MarkUsedUp()
{
}
```

## DojoP8KeyChest.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP8InteractableBase.h"
#include "DojoP8KeyChest.generated.h"

/** A prize chest that opens once, for a visitor who hands over the right key. */
UCLASS()
class ADojoP8KeyChest : public ADojoP8InteractableBase
{
	GENERATED_BODY()

public:
	/** The item that unlocks the chest. */
	UPROPERTY(EditAnywhere, Category = "Chest")
	FName KeyItem = TEXT("ArenaKey");

	/** The item the chest gives when opened. */
	UPROPERTY(EditAnywhere, Category = "Chest")
	FName RewardItem = TEXT("GoldMedal");

protected:
	/** Opens for a visitor with the key: the key is taken, the reward given, and the chest is used up; without the key it stays locked. */
	virtual void OnInteract_Implementation(ADojoP8Visitor* Visitor) override;
};
```

## DojoP8KeyChest.cpp

```cpp
#include "DojoP8KeyChest.h"

void ADojoP8KeyChest::OnInteract_Implementation(ADojoP8Visitor* Visitor)
{
}
```

## DojoP8Lever.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP8InteractableBase.h"
#include "DojoP8Lever.generated.h"

/** A lever in the arena wall; pulling it records a quest flag on the visitor, as often as they like. */
UCLASS()
class ADojoP8Lever : public ADojoP8InteractableBase
{
	GENERATED_BODY()

public:
	/** The quest flag a pull records. */
	UPROPERTY(EditAnywhere, Category = "Lever")
	FName FlagName = TEXT("GateLeverPulled");

protected:
	/** Records the flag on the visitor and shows "Clunk". */
	virtual void OnInteract_Implementation(ADojoP8Visitor* Visitor) override;
};
```

## DojoP8Lever.cpp

```cpp
#include "DojoP8Lever.h"

void ADojoP8Lever::OnInteract_Implementation(ADojoP8Visitor* Visitor)
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p8-interactables/DojoP8InteractableBase.h"
#include "Quests/p8-interactables/DojoP8KeyChest.h"
#include "Quests/p8-interactables/DojoP8Lever.h"
#include "Quests/p8-interactables/DojoP8Visitor.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P8_Interactables_ChestOpensWithAKey, "Dojo.P8.Interactables.ChestOpensWithAKey", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A visitor with the key opens the chest once: the key is taken, the reward given, and the chest takes no further use. */
bool FDojo_P8_Interactables_ChestOpensWithAKey::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP8KeyChest* Chest = TestWorld.SpawnActor<ADojoP8KeyChest>();
	ADojoP8Visitor* Visitor = TestWorld.SpawnActor<ADojoP8Visitor>();
	if (!TestNotNull(TEXT("Chest spawned"), Chest) || !TestNotNull(TEXT("Visitor spawned"), Visitor)) return false;

	Visitor->AddItem(TEXT("ArenaKey"));
	Chest->Interact(Visitor);

	TestTrue(TEXT("The reward was given"), Visitor->HasItem(TEXT("GoldMedal")));
	TestFalse(TEXT("The key was taken"), Visitor->HasItem(TEXT("ArenaKey")));
	TestEqual(TEXT("The chest says it opened"), Chest->GetPrompt().ToString(), FString(TEXT("Opened")));
	TestTrue(TEXT("The chest is used up"), Chest->IsUsedUp());

	Visitor->AddItem(TEXT("ArenaKey"));
	Chest->Interact(Visitor);
	TestEqual(TEXT("A used-up chest ignores the visitor"), Chest->GetInteractionCount(), 1);
	TestTrue(TEXT("And does not take a second key"), Visitor->HasItem(TEXT("ArenaKey")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P8_Interactables_LockedWithoutAKey, "Dojo.P8.Interactables.LockedWithoutAKey", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A visitor without the key gets nothing and the chest stays usable; once they have a key, it opens. */
bool FDojo_P8_Interactables_LockedWithoutAKey::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP8KeyChest* Chest = TestWorld.SpawnActor<ADojoP8KeyChest>();
	ADojoP8Visitor* Visitor = TestWorld.SpawnActor<ADojoP8Visitor>();
	if (!TestNotNull(TEXT("Chest spawned"), Chest) || !TestNotNull(TEXT("Visitor spawned"), Visitor)) return false;

	Chest->Interact(Visitor);
	TestFalse(TEXT("No key, no reward"), Visitor->HasItem(TEXT("GoldMedal")));
	TestEqual(TEXT("The chest says it is locked"), Chest->GetPrompt().ToString(), FString(TEXT("Locked: needs a key")));
	TestFalse(TEXT("A locked chest is not used up"), Chest->IsUsedUp());

	Visitor->AddItem(TEXT("ArenaKey"));
	Chest->Interact(Visitor);
	TestTrue(TEXT("With a key it opens"), Visitor->HasItem(TEXT("GoldMedal")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P8_Interactables_LeverAndTheHook, "Dojo.P8.Interactables.LeverAndTheHook", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The lever records its flag every time; the hook is a BlueprintNativeEvent and the tools are BlueprintProtected. */
bool FDojo_P8_Interactables_LeverAndTheHook::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP8Lever* Lever = TestWorld.SpawnActor<ADojoP8Lever>();
	ADojoP8Visitor* Visitor = TestWorld.SpawnActor<ADojoP8Visitor>();
	if (!TestNotNull(TEXT("Lever spawned"), Lever) || !TestNotNull(TEXT("Visitor spawned"), Visitor)) return false;

	Lever->Interact(nullptr);
	TestEqual(TEXT("An empty visitor is ignored"), Lever->GetInteractionCount(), 0);

	Lever->Interact(Visitor);
	Lever->Interact(Visitor);
	TestTrue(TEXT("The lever recorded its flag"), Visitor->HasFlag(TEXT("GateLeverPulled")));
	TestEqual(TEXT("The lever can be pulled again"), Lever->GetInteractionCount(), 2);
	TestEqual(TEXT("The lever says Clunk"), Lever->GetPrompt().ToString(), FString(TEXT("Clunk")));

	TestTrue(TEXT("The base is abstract"), ADojoP8InteractableBase::StaticClass()->HasAnyClassFlags(CLASS_Abstract));

	const UFunction* Hook = ADojoP8InteractableBase::StaticClass()->FindFunctionByName(TEXT("OnInteract"));
	if (!TestNotNull(TEXT("OnInteract is a UFUNCTION"), Hook)) return false;
	TestTrue(TEXT("Blueprint children can override OnInteract"), Hook->HasAnyFunctionFlags(FUNC_BlueprintEvent));
	TestTrue(TEXT("OnInteract has a C++ default"), Hook->HasAnyFunctionFlags(FUNC_Native));

	const UFunction* TakeItemFunction = ADojoP8InteractableBase::StaticClass()->FindFunctionByName(TEXT("TakeItem"));
	if (!TestNotNull(TEXT("TakeItem is a UFUNCTION"), TakeItemFunction)) return false;
	TestTrue(TEXT("TakeItem is for Blueprint children only"), TakeItemFunction->HasMetaData(TEXT("BlueprintProtected")));

	return true;
}

#endif
```

# Hints

- The failing test sends a visitor with no key to the chest. Follow your chest's hook line by line for that visitor and ask which line should have stopped it.
- TakeItem returns whether there was a key to take. The chest's whole behavior hangs on that answer: only a true result leads to the reward and to using the chest up.
- `TArray::Find` and `INDEX_NONE` are in `Containers/Array.h` if you write your own item check, but the visitor's `RemoveItem` already reports success; the base's tool can simply pass that answer on.

# Rubric

- Interact is the only public entry and holds the shared rules: it ignores an empty visitor or a used-up interactable and counts the rest.
- OnInteract is a BlueprintNativeEvent; C++ children override OnInteract_Implementation and never call it directly.
- The provided operations are protected, BlueprintProtected, and the only way children touch the visitor's items and flags.
- The chest acts on TakeItem's answer: no key means no reward and no use-up.
- The lever records its flag on every pull and is never used up.
- Item and flag names come from editable properties, not strings in the code.

# Alternative

Each interactable could implement a small `UINTERFACE`, `IDojoInteractable`, with an Interact function, and share helpers through a function library. That allows interactables that already derive from other classes (a character, a vehicle). The cost is that the shared rules (ignore after use, count interactions) are no longer enforced anywhere: every implementer must remember them, and the helpers can be called by anyone. The base class keeps those rules in one non-virtual function and keeps the tools for its children only, which is the point of the toolbox.

# Parsons

```yaml
- id: chest-hook
  prompt: Put the chest's hook in order.
  lines:
    - "void ADojoP8KeyChest::OnInteract_Implementation(ADojoP8Visitor* Visitor)"
    - "{"
    - "	if (!TakeItem(Visitor, KeyItem))"
    - "	{"
    - "		ShowPrompt(FText::FromString(TEXT(\"Locked: needs a key\")));"
    - "		return;"
    - "	}"
    - "	GiveItem(Visitor, RewardItem);"
    - "	ShowPrompt(FText::FromString(TEXT(\"Opened\")));"
    - "	MarkUsedUp();"
    - "}"
  distractors:
    - line: "	Visitor->Items.Remove(KeyItem);"
      mistake: Reaching into the visitor's items directly bypasses the base's tool, and removes every key the visitor holds instead of one.
- id: base-interact
  prompt: Put the base's Interact in order.
  lines:
    - "void ADojoP8InteractableBase::Interact(ADojoP8Visitor* Visitor)"
    - "{"
    - "	if (!IsValid(Visitor) || bUsedUp) return;"
    - "	InteractionCount++;"
    - "	OnInteract(Visitor);"
    - "}"
  distractors:
    - line: "	OnInteract_Implementation(Visitor);"
      mistake: Calling the C++ default directly skips any Blueprint child's override of the event.
```
