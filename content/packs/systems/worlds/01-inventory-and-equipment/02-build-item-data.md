---
id: s1-item-data
title: Item kinds as assets and piles in the world
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [type-object]
skills: [data, assets]
terms: [data-asset, uenum, ustruct, tobjectptr, ftext, destroy]
prerequisites: [s1-inventory-plan, p10-type-object-when-not, p1-observer-when-not]
xp: 60
estimatedMinutes: 15
concepts:
  - One asset per kind of item, shared by every pile that points at it
  - A pile hands out only what it has and leaves the world when it is empty
---

# Brief

When you make a Potion asset that stacks to 5 and a Sword asset that never stacks, put a pile of four potions in the level, and take three from it, the pile's label reads `Potion x1`; ask for more than is left and the pile gives what is left and leaves the world.

Most of the code is written for you. Explain the marked lines, then fill the two gaps:

1. `UDojoS1ItemData::GetStackLimit`: how many fit in one slot, which is `MaxStack` but never less than 1.
2. `ADojoS1WorldItem::Take`: hand out up to `Amount` items and return how many were given. Never give a negative number or more than the pile holds, show the new count on the label, and remove the pile from the world when this call emptied it.

Dependency direction: the asset knows nothing about piles, and the pile knows nothing about bags. A pile only points at its kind and counts.

This is the first piece of the Expedition Pack boss.

## See it in the editor

In the Content Browser choose Add, Miscellaneous, Data Asset, pick `DojoS1ItemData`, and make `DA_Potion` (Display Name Potion, Max Stack 5, Weight 1, Heal Amount 25) and `DA_Sword` (Max Stack 1, Weight 6, Equip Slot Hand, Power Bonus 7). Place a `DojoS1WorldItem` in the level. In the level Blueprint, on BeginPlay call Setup on it with `DA_Potion` and 4, and on the 1 key call Take with 3 and print the result. Press Play and press 1: it prints 3 and the label reads `Potion x1`. Press 1 again: it prints 1 and the pile disappears.

# Files

## DojoS1ItemData.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoS1ItemData.generated.h"

/** Where an item can be worn; None means it cannot be equipped. */
UENUM(BlueprintType)
enum class EDojoS1EquipSlot : uint8
{
	EES_None UMETA(DisplayName = "None"),
	EES_Head UMETA(DisplayName = "Head"),
	EES_Hand UMETA(DisplayName = "Hand")
};

/** One kind of item, kept in an asset so designers add kinds without code; every stack and world item points at one (the Type Object pattern). */
UCLASS(BlueprintType)
class UDojoS1ItemData : public UDataAsset // @explain: A data asset is an object saved as a file in the Content Browser, so a designer adds a new kind of item by making a file, with no code.
{
	GENERATED_BODY()

public:
	/** The name shown to the player. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item")
	FText DisplayName;

	/** How many of this item fit in one bag slot; 1 means the item never stacks. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item", meta = (ClampMin = "1")) // @explain: ClampMin only limits what can be typed in the Details panel; code and assets saved before the limit existed can still hold 0, which is why the stack limit is guarded.
	int32 MaxStack = 1;

	/** Weight of one item; the bag has a weight limit. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item", meta = (ClampMin = "0"))
	int32 Weight = 1;

	/** Where the item is worn; None for items that are not equipment. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item")
	EDojoS1EquipSlot EquipSlot = EDojoS1EquipSlot::EES_None;

	/** Power added to the wearer while the item is equipped. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item")
	int32 PowerBonus = 0;

	/** Health restored when the item is used; 0 means it cannot be used. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item", meta = (ClampMin = "0"))
	int32 HealAmount = 0;

	/** How many fit in one slot: MaxStack, but never below 1, even when an old asset or code leaves it at 0 or less. */
	UFUNCTION(BlueprintPure, Category = "Item")
	int32 GetStackLimit() const;

	/** True when the item has a slot to be worn in. */
	UFUNCTION(BlueprintPure, Category = "Item")
	bool IsEquippable() const;

	/** True when using the item restores health. */
	UFUNCTION(BlueprintPure, Category = "Item")
	bool IsConsumable() const;
};
```

## DojoS1ItemData.cpp

```cpp
#include "DojoS1ItemData.h"

int32 UDojoS1ItemData::GetStackLimit() const
{
	// Your code: return MaxStack, but never less than 1, even when an old asset or other code holds 0 or less.
	return 0;
}

bool UDojoS1ItemData::IsEquippable() const
{
	return EquipSlot != EDojoS1EquipSlot::EES_None;
}

bool UDojoS1ItemData::IsConsumable() const
{
	return HealAmount > 0;
}
```

## DojoS1ItemStack.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoS1ItemData.h"
#include "DojoS1ItemStack.generated.h"

/** A pile of one kind of item, as it sits in a bag slot. */
USTRUCT(BlueprintType)
struct FDojoS1ItemStack
{
	GENERATED_BODY()

	/** What kind of item the pile holds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stack")
	TObjectPtr<UDojoS1ItemData> Item = nullptr; // @explain: A pile points at the shared asset instead of copying its numbers, so changing the asset changes every pile of that kind.

	/** How many are in the pile. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stack")
	int32 Count = 0;

	/** True when the pile has no item or no count. */
	bool IsEmpty() const
	{
		return Item == nullptr || Count <= 0;
	}

	/** How many more of the same item this pile can take before its slot is full. */
	int32 SpaceLeft() const
	{
		return Item == nullptr ? 0 : FMath::Max(0, Item->GetStackLimit() - Count);
	}
};
```

## DojoS1WorldItem.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS1WorldItem.generated.h"

class UDojoS1ItemData;
class UTextRenderComponent;

/** A pile of loose items lying in the world; it knows what it holds and how many, and nothing about bags. */
UCLASS()
class ADojoS1WorldItem : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoS1WorldItem();

	/** Floating text that shows the item's name and count. */
	UPROPERTY(VisibleAnywhere, Category = "World Item")
	TObjectPtr<UTextRenderComponent> Label;

	/** Sets what the pile holds and how many, and updates the label. */
	UFUNCTION(BlueprintCallable, Category = "World Item")
	void Setup(UDojoS1ItemData* NewItem, int32 NewCount);

	/** Hands out up to Amount items, returning how many were given; the pile removes itself when it runs out. */
	UFUNCTION(BlueprintCallable, Category = "World Item")
	int32 Take(int32 Amount);

	/** The kind of item in the pile. */
	UFUNCTION(BlueprintPure, Category = "World Item")
	UDojoS1ItemData* GetItem() const;

	/** How many are still in the pile. */
	UFUNCTION(BlueprintPure, Category = "World Item")
	int32 GetCount() const;

protected:
	/** Shows the starting contents on the label. */
	virtual void BeginPlay() override;

private:
	/** Rewrites the label as the item's name and the count, such as "Potion x3". */
	void RefreshLabel();

	UPROPERTY()
	TObjectPtr<UDojoS1ItemData> Item = nullptr;

	int32 Count = 0;
};
```

## DojoS1WorldItem.cpp

```cpp
#include "DojoS1WorldItem.h"

#include "Components/TextRenderComponent.h"
#include "DojoS1ItemData.h"

ADojoS1WorldItem::ADojoS1WorldItem()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoS1WorldItem::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoS1WorldItem::Setup(UDojoS1ItemData* NewItem, int32 NewCount)
{
	Item = NewItem;
	Count = FMath::Max(0, NewCount); // @explain: A pile never holds a negative count, whatever the caller passes.
	RefreshLabel();
}

int32 ADojoS1WorldItem::Take(int32 Amount)
{
	// Your code: work out how many can be given (never negative, never more than the pile holds), take them out of the pile, and show the new count on the label.
	// Your code: when this call emptied the pile, remove the pile from the world.
	return 0;
}

UDojoS1ItemData* ADojoS1WorldItem::GetItem() const
{
	return Item;
}

int32 ADojoS1WorldItem::GetCount() const
{
	return Count;
}

void ADojoS1WorldItem::RefreshLabel()
{
	const FString ItemName = Item ? Item->DisplayName.ToString() : FString(TEXT("?"));
	Label->SetText(FText::FromString(FString::Printf(TEXT("%s x%d"), *ItemName, Count)));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"
#include "Quests/s1-item-data/DojoS1ItemStack.h"
#include "Quests/s1-item-data/DojoS1WorldItem.h"
#include "Support/DojoTestWorld.h"

namespace DojoS1ItemDataTest
{
	/** Makes an item asset in memory, the way a designer would fill one in. */
	UDojoS1ItemData* MakeItem(const TCHAR* Name, int32 MaxStack, int32 Weight)
	{
		UDojoS1ItemData* Item = NewObject<UDojoS1ItemData>();
		Item->DisplayName = FText::FromString(Name);
		Item->MaxStack = MaxStack;
		Item->Weight = Weight;
		return Item;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_ItemData_StackLimit, "Dojo.S1.ItemData.StackLimit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the stack limit, the two helper questions, and how much room a pile has left. */
bool FDojo_S1_ItemData_StackLimit::RunTest(const FString& Parameters)
{
	using namespace DojoS1ItemDataTest;

	UDojoS1ItemData* Potion = MakeItem(TEXT("Potion"), 5, 1);
	Potion->HealAmount = 25;
	UDojoS1ItemData* Sword = MakeItem(TEXT("Sword"), 1, 6);
	Sword->EquipSlot = EDojoS1EquipSlot::EES_Hand;
	UDojoS1ItemData* Broken = MakeItem(TEXT("Broken"), 0, 1);
	UDojoS1ItemData* Negative = MakeItem(TEXT("Negative"), -4, 1);

	TestEqual(TEXT("A potion stacks to its MaxStack"), Potion->GetStackLimit(), 5);
	TestEqual(TEXT("A sword holds one per slot"), Sword->GetStackLimit(), 1);
	TestEqual(TEXT("A zero MaxStack still holds one"), Broken->GetStackLimit(), 1);
	TestEqual(TEXT("A negative MaxStack still holds one"), Negative->GetStackLimit(), 1);

	TestTrue(TEXT("A sword can be worn"), Sword->IsEquippable());
	TestFalse(TEXT("A potion cannot be worn"), Potion->IsEquippable());
	TestTrue(TEXT("A potion can be used"), Potion->IsConsumable());
	TestFalse(TEXT("A sword cannot be used"), Sword->IsConsumable());

	FDojoS1ItemStack Pile;
	TestTrue(TEXT("A new pile is empty"), Pile.IsEmpty());
	TestEqual(TEXT("A pile with no item has no room"), Pile.SpaceLeft(), 0);

	Pile.Item = Potion;
	Pile.Count = 3;
	TestFalse(TEXT("A pile with potions is not empty"), Pile.IsEmpty());
	TestEqual(TEXT("A pile of 3 in a 5 stack has room for 2"), Pile.SpaceLeft(), 2);

	Pile.Item = Broken;
	Pile.Count = 1;
	TestEqual(TEXT("A full pile has no room, whatever the asset says"), Pile.SpaceLeft(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_ItemData_WorldItemTake, "Dojo.S1.ItemData.WorldItemTake", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Takes from a pile of four in two bites and checks the count, the label, and that the empty pile leaves the world. */
bool FDojo_S1_ItemData_WorldItemTake::RunTest(const FString& Parameters)
{
	using namespace DojoS1ItemDataTest;

	FDojoTestWorld TestWorld;

	UDojoS1ItemData* Potion = MakeItem(TEXT("Potion"), 5, 1);
	ADojoS1WorldItem* Pile = TestWorld.SpawnActor<ADojoS1WorldItem>();
	if (!TestNotNull(TEXT("Pile spawned"), Pile)) return false;

	Pile->Setup(Potion, 4);
	TestEqual(TEXT("The pile holds four"), Pile->GetCount(), 4);
	TestTrue(TEXT("The pile knows its item"), Pile->GetItem() == Potion);
	TestEqual(TEXT("The label shows the name and count"), Pile->Label->Text.ToString(), FString(TEXT("Potion x4")));

	TestEqual(TEXT("Taking nothing gives nothing"), Pile->Take(0), 0);
	TestEqual(TEXT("A negative take gives nothing"), Pile->Take(-2), 0);
	TestEqual(TEXT("Nothing was lost"), Pile->GetCount(), 4);
	TestFalse(TEXT("The pile stays while it has items"), Pile->IsActorBeingDestroyed());

	TestEqual(TEXT("Taking three gives three"), Pile->Take(3), 3);
	TestEqual(TEXT("One is left"), Pile->GetCount(), 1);
	TestEqual(TEXT("The label follows the count"), Pile->Label->Text.ToString(), FString(TEXT("Potion x1")));
	TestFalse(TEXT("The pile stays while one is left"), Pile->IsActorBeingDestroyed());

	TestEqual(TEXT("Asking for more than is left gives what is left"), Pile->Take(9), 1);
	TestEqual(TEXT("The pile is empty"), Pile->GetCount(), 0);
	TestTrue(TEXT("An empty pile leaves the world"), Pile->IsActorBeingDestroyed());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_ItemData_DesignersCanEdit, "Dojo.S1.ItemData.DesignersCanEdit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the item is a data asset and that designers can edit its numbers. */
bool FDojo_S1_ItemData_DesignersCanEdit::RunTest(const FString& Parameters)
{
	TestTrue(TEXT("The item kind is a data asset"), UDojoS1ItemData::StaticClass()->IsChildOf(UDataAsset::StaticClass()));

	for (const TCHAR* Name : { TEXT("MaxStack"), TEXT("Weight"), TEXT("EquipSlot"), TEXT("PowerBonus"), TEXT("HealAmount"), TEXT("DisplayName") })
	{
		const FProperty* Property = UDojoS1ItemData::StaticClass()->FindPropertyByName(Name);
		if (!TestNotNull(FString::Printf(TEXT("%s is a UPROPERTY"), Name), Property)) continue;

		TestTrue(FString::Printf(TEXT("%s is editable in Details"), Name), Property->HasAnyPropertyFlags(CPF_Edit));
	}

	return true;
}

#endif
```

# Hints

- Take has two jobs after the numbers: keep the label true, and tidy up when the pile is empty. Do them in the order that leaves the label showing the final count.
- `FMath::Clamp` keeps a number between two limits, which is what a safe amount to give needs, and `FMath::Max` picks the larger of two numbers, which is what a stack limit of at least 1 needs.
- `AActor::Destroy` removes the actor from the world; only call it when this call took the last items, not when someone asked for nothing from an empty pile.

# Rubric

- The item kind is a data asset, so a designer adds a kind by making a file, and every number a pile needs is read from it.
- `GetStackLimit` never returns less than 1, whatever the asset holds.
- `Take` gives at most what the pile holds and never a negative number, and returns exactly what it gave.
- The label always shows the pile's current count.
- A pile that is emptied by a call leaves the world; asking for nothing never removes it.
- The asset knows nothing about piles, and a pile knows nothing about bags.

# Alternative

Each kind of item could be its own class, `ADojoS1Potion` and `ADojoS1Sword`, with the numbers written in code. That reads simply at first, but every new kind needs a programmer and a recompile, and a designer can no longer tune a potion by editing a file. One class and one asset per kind keeps the numbers in data: the pile and the bag treat every kind the same way and only the asset differs. This is the Type Object pattern from Pack 2's "Kinds as data" world, with `UDataAsset` as Unreal's ready-made home for the type object.

# Parsons

```yaml
- id: world-item-take
  prompt: Put Take in order. The label is refreshed before the pile may leave the world.
  lines:
    - "int32 ADojoS1WorldItem::Take(int32 Amount)"
    - "{"
    - "	const int32 Given = FMath::Clamp(Amount, 0, Count);"
    - "	Count -= Given;"
    - "	RefreshLabel();"
    - "	if (Given > 0 && Count == 0)"
    - "	{"
    - "		Destroy();"
    - "	}"
    - "	return Given;"
    - "}"
  distractors:
    - line: "	Count -= Amount;"
      mistake: Subtracts what was asked for, not what was given, so asking for more than the pile holds leaves a negative count.
    - line: "		GetWorld()->DestroyActor();"
      mistake: UWorld::DestroyActor takes the actor to remove as its argument; the actor removes itself with its own Destroy().
```
