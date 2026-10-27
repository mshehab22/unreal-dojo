---
id: s1-bag
title: A bag with stacks, slots, and a weight limit
order: 3
kind: build
scaffold: faded
difficulty: 3
patterns: [component, observer]
skills: [components, delegates, containers]
terms: [actor-component, tarray, ustruct, dynamic-multicast-delegate, broadcast, adddynamic, unbinding-delegates]
prerequisites: [s1-item-data]
xp: 80
estimatedMinutes: 25
concepts:
  - Stacks that fill before a new slot opens, under a slot limit and a weight limit
  - Add and Remove that report how many items really moved
  - One announcement per change, sent after the bag holds its new contents
---

# Brief

When you give an actor a bag with four slots and a weight limit of 20, add 3 potions and then 4 more, the bag holds two piles, 5 and 2; adding stones until the weight limit says stop gives only as many as fit; and a listener hears exactly one notice per change, after the bag already holds the new contents.

Compiles against earlier quests: s1-item-data (`Quests/s1-item-data/DojoS1ItemData.h`, `Quests/s1-item-data/DojoS1ItemStack.h`).

The room rule, the counting functions, and the listener are written for you. Fill the two bodies that are left:

1. `Add`: the room is already worked out, so top up the piles of this item that exist, in slot order, before opening new slots; each new pile holds at most the item's stack limit. Then announce the change, once.
2. `Remove`: take items from the newest pile of the item first, then the one before it, so older piles stay full. A pile that reaches zero must leave the bag, so the bag never holds empty piles. Announce once, and only if something came out.

Both return how many items really moved, which can be fewer than asked. The bag holds no pointer to any listener: listeners subscribe to `OnInventoryChanged`, and the notice carries the bag itself. `UDojoS1BagSpy` is a ready-made listener that the tests use to count notices and to read the bag's weight at the moment each one arrives.

This is the second piece of the Expedition Pack boss.

## See it in the editor

Make a Blueprint actor `BP_Carrier` with a `DojoS1InventoryComponent`, set Slot Count 4 and Max Weight 20 in Details, and place one in the level. In the level Blueprint, with it selected, get the component with Get Component by Class. On BeginPlay bind a custom event to the component's On Inventory Changed that prints Get Total Weight, and on the 1 key call Add with `DA_Potion` and 3. Press Play and press the key seven times: the weight rises by 3 per press up to 18, the seventh press adds only 2 to reach the limit of 20, and further presses add nothing. Print the Get Slots array to see the piles.

# Files

## DojoS1InventoryComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Quests/s1-item-data/DojoS1ItemStack.h"
#include "DojoS1InventoryComponent.generated.h"

class UDojoS1InventoryComponent;
class UDojoS1ItemData;

/** Broadcast after the bag's contents changed, with the bag itself so one handler can serve many bags. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS1OnInventoryChanged, UDojoS1InventoryComponent*, Inventory);

/** A bag any actor can carry (the Component pattern): stacks of items in a limited number of slots under a weight limit, announcing every change like the sender in the Observer pattern and knowing nothing about who listens. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS1InventoryComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the bag only reacts to calls. */
	UDojoS1InventoryComponent();

	/** How many different piles the bag can hold. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Inventory", meta = (ClampMin = "1"))
	int32 SlotCount = 4;

	/** The most the bag can weigh in total. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Inventory", meta = (ClampMin = "0"))
	int32 MaxWeight = 20;

	/** Fires once per Add or Remove that changed the bag, after the bag holds its new contents. */
	UPROPERTY(BlueprintAssignable, Category = "Inventory")
	FDojoS1OnInventoryChanged OnInventoryChanged;

	/** How many of this item the bag could take right now, given free room in its piles, free slots, and the weight limit. */
	UFUNCTION(BlueprintPure, Category = "Inventory")
	int32 GetRoomFor(UDojoS1ItemData* Item) const;

	/** Adds up to Count items, topping up existing piles before opening new slots; returns how many went in. */
	UFUNCTION(BlueprintCallable, Category = "Inventory")
	int32 Add(UDojoS1ItemData* Item, int32 Count);

	/** Removes up to Count items, emptying the newest pile first and dropping piles that run out; returns how many came out. */
	UFUNCTION(BlueprintCallable, Category = "Inventory")
	int32 Remove(UDojoS1ItemData* Item, int32 Count);

	/** How many of this item the bag holds across all its piles. */
	UFUNCTION(BlueprintPure, Category = "Inventory")
	int32 CountOf(UDojoS1ItemData* Item) const;

	/** What everything in the bag weighs. */
	UFUNCTION(BlueprintPure, Category = "Inventory")
	int32 GetTotalWeight() const;

	/** The piles in slot order; empty slots are not listed. */
	UFUNCTION(BlueprintPure, Category = "Inventory")
	TArray<FDojoS1ItemStack> GetSlots() const;

private:
	UPROPERTY()
	TArray<FDojoS1ItemStack> Slots;
};
```

## DojoS1InventoryComponent.cpp

```cpp
#include "DojoS1InventoryComponent.h"

#include "Quests/s1-item-data/DojoS1ItemData.h"

UDojoS1InventoryComponent::UDojoS1InventoryComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

int32 UDojoS1InventoryComponent::GetRoomFor(UDojoS1ItemData* Item) const
{
	if (Item == nullptr)
	{
		return 0;
	}

	int32 Room = FMath::Max(0, SlotCount - Slots.Num()) * Item->GetStackLimit();

	for (const FDojoS1ItemStack& Pile : Slots)
	{
		if (Pile.Item == Item)
		{
			Room += Pile.SpaceLeft();
		}
	}

	if (Item->Weight > 0)
	{
		Room = FMath::Min(Room, (MaxWeight - GetTotalWeight()) / Item->Weight);
	}

	return FMath::Max(0, Room);
}

int32 UDojoS1InventoryComponent::Add(UDojoS1ItemData* Item, int32 Count)
{
	const int32 ToAdd = FMath::Min(Count, GetRoomFor(Item));

	if (ToAdd <= 0)
	{
		return 0;
	}

	int32 Left = ToAdd;

	// Your code: top up the piles of this item that already exist, in slot order, before opening anything new.
	// Your code: whatever is left opens new slots, one pile at a time, each no larger than the item's stack limit.
	// Your code: announce the change to the listeners, once, now that the bag holds everything.
	return ToAdd;
}

int32 UDojoS1InventoryComponent::Remove(UDojoS1ItemData* Item, int32 Count)
{
	if (Item == nullptr || Count <= 0)
	{
		return 0;
	}

	int32 Left = Count;

	// Your code: take items from the newest pile of this item first, then the one before it, so older piles stay full. A pile that reaches zero must leave the bag.
	// Your code: announce the change once, and only if at least one item came out.
	return 0;
}

int32 UDojoS1InventoryComponent::CountOf(UDojoS1ItemData* Item) const
{
	int32 Total = 0;

	for (const FDojoS1ItemStack& Pile : Slots)
	{
		if (Pile.Item == Item)
		{
			Total += Pile.Count;
		}
	}

	return Total;
}

int32 UDojoS1InventoryComponent::GetTotalWeight() const
{
	int32 Total = 0;

	for (const FDojoS1ItemStack& Pile : Slots)
	{
		if (Pile.Item != nullptr)
		{
			Total += Pile.Item->Weight * Pile.Count;
		}
	}

	return Total;
}

TArray<FDojoS1ItemStack> UDojoS1InventoryComponent::GetSlots() const
{
	return Slots;
}
```

## DojoS1BagSpy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS1BagSpy.generated.h"

class UDojoS1InventoryComponent;

/** A listener that counts a bag's change notices and remembers what the bag weighed when the last one arrived; it only subscribes. */
UCLASS()
class UDojoS1BagSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the bag's changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Bag Spy")
	void Watch(UDojoS1InventoryComponent* Bag);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Bag Spy")
	int32 GetNoticeCount() const;

	/** The bag's total weight, read at the moment the last notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Bag Spy")
	int32 GetWeightAtLastNotice() const;

private:
	/** Counts the notice and reads the weight from the bag that sent it. */
	UFUNCTION()
	void HandleChanged(UDojoS1InventoryComponent* Inventory);

	int32 NoticeCount = 0;
	int32 WeightAtLastNotice = 0;
};
```

## DojoS1BagSpy.cpp

```cpp
#include "DojoS1BagSpy.h"

#include "DojoS1InventoryComponent.h"

void UDojoS1BagSpy::Watch(UDojoS1InventoryComponent* Bag)
{
	if (Bag == nullptr)
	{
		return;
	}

	Bag->OnInventoryChanged.AddUniqueDynamic(this, &UDojoS1BagSpy::HandleChanged);
}

int32 UDojoS1BagSpy::GetNoticeCount() const
{
	return NoticeCount;
}

int32 UDojoS1BagSpy::GetWeightAtLastNotice() const
{
	return WeightAtLastNotice;
}

void UDojoS1BagSpy::HandleChanged(UDojoS1InventoryComponent* Inventory)
{
	++NoticeCount;
	WeightAtLastNotice = Inventory->GetTotalWeight();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s1-bag/DojoS1BagSpy.h"
#include "Quests/s1-bag/DojoS1InventoryComponent.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS1BagTest
{
	/** Makes an item asset in memory. */
	UDojoS1ItemData* MakeItem(const TCHAR* Name, int32 MaxStack, int32 Weight)
	{
		UDojoS1ItemData* Item = NewObject<UDojoS1ItemData>();
		Item->DisplayName = FText::FromString(Name);
		Item->MaxStack = MaxStack;
		Item->Weight = Weight;
		return Item;
	}

	/** The counts of the piles in slot order, such as "5,2". */
	FString PileCounts(const UDojoS1InventoryComponent* Bag)
	{
		TArray<FString> Counts;

		for (const FDojoS1ItemStack& Pile : Bag->GetSlots())
		{
			Counts.Add(FString::FromInt(Pile.Count));
		}

		return FString::Join(Counts, TEXT(","));
	}

	/** Puts a bag on a fresh actor. */
	UDojoS1InventoryComponent* MakeBag(FDojoTestWorld& TestWorld, int32 SlotCount, int32 MaxWeight)
	{
		ADojoTestActor* Carrier = TestWorld.SpawnActor<ADojoTestActor>();
		UDojoS1InventoryComponent* Bag = TestWorld.AddComponent<UDojoS1InventoryComponent>(Carrier);
		Bag->SlotCount = SlotCount;
		Bag->MaxWeight = MaxWeight;
		return Bag;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Bag_StacksBeforeNewSlots, "Dojo.S1.Bag.StacksBeforeNewSlots", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Adds potions in three batches and checks that piles fill up before a new slot opens, and that Remove empties the newest pile first. */
bool FDojo_S1_Bag_StacksBeforeNewSlots::RunTest(const FString& Parameters)
{
	using namespace DojoS1BagTest;

	FDojoTestWorld TestWorld;

	UDojoS1ItemData* Potion = MakeItem(TEXT("Potion"), 5, 1);
	UDojoS1InventoryComponent* Bag = MakeBag(TestWorld, 4, 100);
	if (!TestNotNull(TEXT("Bag created"), Bag)) return false;

	TestEqual(TEXT("Three potions go in"), Bag->Add(Potion, 3), 3);
	TestEqual(TEXT("One pile of three"), PileCounts(Bag), FString(TEXT("3")));

	TestEqual(TEXT("Four more go in"), Bag->Add(Potion, 4), 4);
	TestEqual(TEXT("The first pile fills before a second opens"), PileCounts(Bag), FString(TEXT("5,2")));
	TestEqual(TEXT("The bag counts all seven"), Bag->CountOf(Potion), 7);

	TestEqual(TEXT("Adding nothing adds nothing"), Bag->Add(Potion, 0), 0);
	TestEqual(TEXT("Adding a negative count adds nothing"), Bag->Add(Potion, -3), 0);
	TestEqual(TEXT("Adding no item adds nothing"), Bag->Add(nullptr, 3), 0);

	TestEqual(TEXT("Removing three comes out of the newest pile first and then the older one"), Bag->Remove(Potion, 3), 3);
	TestEqual(TEXT("The newest pile is gone and the older one is down by one"), PileCounts(Bag), FString(TEXT("4")));
	TestEqual(TEXT("Removing more than the bag holds gives what it holds"), Bag->Remove(Potion, 99), 4);
	TestEqual(TEXT("The bag is empty and holds no empty piles"), Bag->GetSlots().Num(), 0);
	TestEqual(TEXT("Removing from an empty bag gives nothing"), Bag->Remove(Potion, 1), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Bag_SlotsAndWeightLimit, "Dojo.S1.Bag.SlotsAndWeightLimit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fills a bag by slots and by weight and checks what fits, what is refused, and that a partial add reports what went in. */
bool FDojo_S1_Bag_SlotsAndWeightLimit::RunTest(const FString& Parameters)
{
	using namespace DojoS1BagTest;

	FDojoTestWorld TestWorld;

	UDojoS1ItemData* Sword = MakeItem(TEXT("Sword"), 1, 6);
	UDojoS1ItemData* Helmet = MakeItem(TEXT("Helmet"), 1, 4);
	UDojoS1ItemData* Dagger = MakeItem(TEXT("Dagger"), 1, 2);
	UDojoS1ItemData* Stone = MakeItem(TEXT("Stone"), 10, 2);
	UDojoS1ItemData* Feather = MakeItem(TEXT("Feather"), 10, 0);

	UDojoS1InventoryComponent* ByWeight = MakeBag(TestWorld, 4, 10);
	TestEqual(TEXT("A sword fits"), ByWeight->Add(Sword, 1), 1);
	TestEqual(TEXT("Only two of five stones fit under the weight limit"), ByWeight->Add(Stone, 5), 2);
	TestEqual(TEXT("The bag weighs exactly its limit"), ByWeight->GetTotalWeight(), 10);
	TestEqual(TEXT("A full bag takes nothing, however light"), ByWeight->Add(Dagger, 1), 0);
	TestEqual(TEXT("Room for stones is zero"), ByWeight->GetRoomFor(Stone), 0);
	TestEqual(TEXT("Weightless items are limited only by the two free slots"), ByWeight->Add(Feather, 25), 20);
	TestEqual(TEXT("All twenty feathers are in the bag"), ByWeight->CountOf(Feather), 20);
	TestEqual(TEXT("No room is left for more feathers"), ByWeight->GetRoomFor(Feather), 0);

	UDojoS1InventoryComponent* BySlots = MakeBag(TestWorld, 2, 1000);
	TestEqual(TEXT("First slot taken"), BySlots->Add(Sword, 1), 1);
	TestEqual(TEXT("Second slot taken"), BySlots->Add(Helmet, 1), 1);
	TestEqual(TEXT("No slot is left for a dagger"), BySlots->Add(Dagger, 1), 0);
	TestEqual(TEXT("Room for a dagger is zero"), BySlots->GetRoomFor(Dagger), 0);
	TestEqual(TEXT("Stones have no free slot either"), BySlots->GetRoomFor(Stone), 0);

	TestEqual(TEXT("Taking the sword out frees its slot"), BySlots->Remove(Sword, 1), 1);
	TestEqual(TEXT("Room for stones is now one slot of ten"), BySlots->GetRoomFor(Stone), 10);
	TestEqual(TEXT("Stones fill the freed slot and no more"), BySlots->Add(Stone, 14), 10);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Bag_AnnouncesAfterChange, "Dojo.S1.Bag.AnnouncesAfterChange", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Watches a bag with a spy and checks one notice per change, none for refused changes, and a bag that already holds its new contents. */
bool FDojo_S1_Bag_AnnouncesAfterChange::RunTest(const FString& Parameters)
{
	using namespace DojoS1BagTest;

	FDojoTestWorld TestWorld;

	UDojoS1ItemData* Stone = MakeItem(TEXT("Stone"), 10, 2);
	UDojoS1ItemData* Sword = MakeItem(TEXT("Sword"), 1, 6);
	UDojoS1InventoryComponent* Bag = MakeBag(TestWorld, 2, 40);
	TStrongObjectPtr<UDojoS1BagSpy> Spy(NewObject<UDojoS1BagSpy>());
	Spy->Watch(Bag);
	Spy->Watch(Bag);

	Bag->Add(Stone, 12);
	TestEqual(TEXT("One notice for an add that spread over two piles"), Spy->GetNoticeCount(), 1);
	TestEqual(TEXT("The bag already held the new stones when the notice arrived"), Spy->GetWeightAtLastNotice(), 24);

	TestEqual(TEXT("A bag with no free slot refuses the sword"), Bag->Add(Sword, 1), 0);
	Bag->Add(nullptr, 1);
	Bag->Add(Stone, 0);
	Bag->Remove(Sword, 1);
	Bag->Remove(Stone, 0);
	TestEqual(TEXT("Calls that changed nothing send no notice"), Spy->GetNoticeCount(), 1);

	Bag->Remove(Stone, 4);
	TestEqual(TEXT("Removing sends one notice"), Spy->GetNoticeCount(), 2);
	TestEqual(TEXT("The bag had already lost the stones when the notice arrived"), Spy->GetWeightAtLastNotice(), 16);

	TestTrue(TEXT("Blueprints can bind to the event"), UDojoS1InventoryComponent::StaticClass()->FindPropertyByName(TEXT("OnInventoryChanged"))->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	return true;
}

#endif
```

# Hints

- Add walks the slots forward, topping up piles of the right item, and then opens new slots for what is left; Remove walks backward from the last slot, and a slot that empties is removed from the array.
- Removing from an array while walking it is safe when you walk backward by index and do not touch the removed element again. `TArray::RemoveAt` is the call.
- The delegate's `Broadcast` goes after the last change to the slots, and the bag may only announce when at least one item moved.

# Rubric

- Existing piles of the item are topped up in slot order before any new slot opens, and no pile exceeds the item's stack limit.
- `Add` and `Remove` return how many items really moved, never more than asked and never more than the room or the stock.
- Remove empties the newest pile first, and the bag never keeps an empty pile.
- `OnInventoryChanged` is broadcast once per call that changed the bag, after the bag holds its new contents, and never for a call that changed nothing.
- The bag holds no pointer to any listener, and Blueprints can bind to the event.

# Alternative

The bag could keep a `TMap` from item to count and ignore slots. That makes counting and removing trivial, and suits games where space is not a puzzle, but it cannot say which pile an item sits in or how many slots are used, so the stack and slot limits and a panel with one line per slot become awkward. A list of piles keeps the slot order the player sees. The event is the Observer pattern from Pack 2's first world, and making the bag a component is the Component pattern: any actor, a chest or a shop as well as the hero, can carry one without changing its class.

# Parsons

```yaml
- id: bag-remove-loop
  prompt: Put the removal loop in order.
  lines:
    - "for (int32 Index = Slots.Num() - 1; Index >= 0 && Left > 0; --Index)"
    - "{"
    - "	if (Slots[Index].Item != Item) continue;"
    - "	const int32 Taken = FMath::Min(Left, Slots[Index].Count);"
    - "	Slots[Index].Count -= Taken;"
    - "	Left -= Taken;"
    - "	if (Slots[Index].Count == 0) Slots.RemoveAt(Index);"
    - "}"
  distractors:
    - line: "for (FDojoS1ItemStack& Pile : Slots)"
      mistake: A range-based loop walks forward, so it empties the oldest pile first, and removing from the array inside it is undefined.
    - line: "	Slots[Index].Count = 0;"
      mistake: Zeroing the pile throws away items that were not asked for, and it would leave an empty pile in the bag.
```
