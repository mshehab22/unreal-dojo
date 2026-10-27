---
id: s1-equipment
title: Equipment slots that swap with the bag
order: 4
kind: build
scaffold: stub
difficulty: 4
patterns: [component, observer]
skills: [components, delegates, data]
terms: [actor-component, tmap, uenum, dynamic-multicast-delegate, broadcast, tobjectptr]
prerequisites: [s1-bag, s1-item-data]
xp: 100
estimatedMinutes: 30
concepts:
  - Equipment that moves items between the bag and the body, with the bag knowing nothing about it
  - Moving items between the bag and the body in both directions
  - Power added up from what is worn
---

# Brief

When a hero holds a sword in the bag and equips it, the sword is in the hand and no longer in the bag; equipping a dagger then swaps them, so the sword is back in the bag; taking the helmet off puts it back; and a listener hears one notice per change, after both the bag and the slots hold their new contents.

Compiles against earlier quests: s1-bag (`Quests/s1-bag/DojoS1InventoryComponent.h`) and s1-item-data (`Quests/s1-item-data/DojoS1ItemData.h`).

The class declaration is given, and so is a ready-made listener, `UDojoS1EquipmentSpy`. Every function body in `DojoS1EquipmentComponent.cpp` is yours:

- `UseBag` chooses the bag that items come from and go back to.
- `Equip` wears one of the item from the bag; the item goes in the slot named by its `EquipSlot`, and whatever was worn there goes back into the bag. It returns whether the item was worn. Items with no slot, items the bag does not hold, and a missing bag all give false.
- `Unequip` moves the item worn in a slot back into the bag and returns whether it did.
- `GetEquipped` answers what is worn in a slot, and `GetTotalPower` adds up the power bonus of everything worn.
- `OnEquipmentChanged` is broadcast once for each change.

Dependency direction: equipment holds a pointer to the bag. The bag knows nothing about equipment, so it can be reused on a chest.

Write it the obvious way first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

This is the third piece of the Expedition Pack boss.

## See it in the editor

Make a Blueprint actor `BP_Carrier` with a `DojoS1InventoryComponent` and a `DojoS1EquipmentComponent`, and place one in the level. In the level Blueprint, with it selected, get its two components with Get Component by Class. On BeginPlay call Use Bag on the equipment with the bag, then Add `DA_Sword` and `DA_Dagger` to the bag. On the 1 key call Equip with `DA_Sword` and print Get Total Power; on the 2 key do the same with `DA_Dagger`. Press Play: 1 prints 7, 2 prints 3, and Get Slots on the bag shows the sword back in it.

# Files

## DojoS1EquipmentComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"
#include "DojoS1EquipmentComponent.generated.h"

class UDojoS1EquipmentComponent;
class UDojoS1InventoryComponent;

/** Broadcast after the worn items changed, with the component itself so one handler can serve many wearers. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS1OnEquipmentChanged, UDojoS1EquipmentComponent*, Equipment);

/** The slots an actor wears items in (the Component pattern); it moves items between its bag and its slots and announces each change like the sender in the Observer pattern, while the bag knows nothing about it. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS1EquipmentComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; equipment only reacts to calls. */
	UDojoS1EquipmentComponent();

	/** Fires once per successful Equip or Unequip, after both the bag and the slots hold their new contents. */
	UPROPERTY(BlueprintAssignable, Category = "Equipment")
	FDojoS1OnEquipmentChanged OnEquipmentChanged;

	/** Chooses the bag that items are taken from and returned to. */
	UFUNCTION(BlueprintCallable, Category = "Equipment")
	void UseBag(UDojoS1InventoryComponent* NewBag);

	/** Wears one of this item from the bag, putting back whatever was in its slot; false if the item cannot be worn. */
	UFUNCTION(BlueprintCallable, Category = "Equipment")
	bool Equip(UDojoS1ItemData* Item);

	/** Moves the item worn in this slot back into the bag; false if the slot is empty. */
	UFUNCTION(BlueprintCallable, Category = "Equipment")
	bool Unequip(EDojoS1EquipSlot Slot);

	/** The item worn in this slot, or null. */
	UFUNCTION(BlueprintPure, Category = "Equipment")
	UDojoS1ItemData* GetEquipped(EDojoS1EquipSlot Slot) const;

	/** The power bonuses of everything worn, added up. */
	UFUNCTION(BlueprintPure, Category = "Equipment")
	int32 GetTotalPower() const;

private:
	UPROPERTY()
	TObjectPtr<UDojoS1InventoryComponent> Bag;

	UPROPERTY()
	TMap<EDojoS1EquipSlot, TObjectPtr<UDojoS1ItemData>> Worn;
};
```

## DojoS1EquipmentComponent.cpp

```cpp
#include "DojoS1EquipmentComponent.h"

#include "Quests/s1-bag/DojoS1InventoryComponent.h"

/** Turns ticking off; equipment only reacts to calls. */
UDojoS1EquipmentComponent::UDojoS1EquipmentComponent()
{
}

/** Chooses the bag that items are taken from and returned to. */
void UDojoS1EquipmentComponent::UseBag(UDojoS1InventoryComponent* NewBag)
{
}

/** Wears one of this item from the bag, putting back whatever was in its slot. */
bool UDojoS1EquipmentComponent::Equip(UDojoS1ItemData* Item)
{
	return false;
}

/** Moves the item worn in this slot back into the bag. */
bool UDojoS1EquipmentComponent::Unequip(EDojoS1EquipSlot Slot)
{
	return false;
}

/** The item worn in this slot, or null. */
UDojoS1ItemData* UDojoS1EquipmentComponent::GetEquipped(EDojoS1EquipSlot Slot) const
{
	return nullptr;
}

/** The power bonuses of everything worn, added up. */
int32 UDojoS1EquipmentComponent::GetTotalPower() const
{
	return 0;
}
```

## DojoS1EquipmentSpy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS1EquipmentSpy.generated.h"

class UDojoS1EquipmentComponent;

/** A listener that counts an equipment component's change notices and remembers the power it read at the last one; it only subscribes. */
UCLASS()
class UDojoS1EquipmentSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the equipment's changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Equipment Spy")
	void Watch(UDojoS1EquipmentComponent* Wearer);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Equipment Spy")
	int32 GetNoticeCount() const;

	/** The total power read from the equipment at the moment the last notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Equipment Spy")
	int32 GetPowerAtLastNotice() const;

private:
	/** Counts the notice and reads the power from the equipment that sent it. */
	UFUNCTION()
	void HandleChanged(UDojoS1EquipmentComponent* Equipment);

	int32 NoticeCount = 0;
	int32 PowerAtLastNotice = 0;
};
```

## DojoS1EquipmentSpy.cpp

```cpp
#include "DojoS1EquipmentSpy.h"

#include "DojoS1EquipmentComponent.h"

void UDojoS1EquipmentSpy::Watch(UDojoS1EquipmentComponent* Wearer)
{
	if (Wearer == nullptr)
	{
		return;
	}

	Wearer->OnEquipmentChanged.AddUniqueDynamic(this, &UDojoS1EquipmentSpy::HandleChanged);
}

int32 UDojoS1EquipmentSpy::GetNoticeCount() const
{
	return NoticeCount;
}

int32 UDojoS1EquipmentSpy::GetPowerAtLastNotice() const
{
	return PowerAtLastNotice;
}

void UDojoS1EquipmentSpy::HandleChanged(UDojoS1EquipmentComponent* Equipment)
{
	++NoticeCount;
	PowerAtLastNotice = Equipment->GetTotalPower();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s1-bag/DojoS1InventoryComponent.h"
#include "Quests/s1-equipment/DojoS1EquipmentComponent.h"
#include "Quests/s1-equipment/DojoS1EquipmentSpy.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS1EquipmentTest
{
	/** Makes an item asset in memory. */
	UDojoS1ItemData* MakeItem(const TCHAR* Name, int32 MaxStack, int32 Weight, EDojoS1EquipSlot Slot, int32 Power)
	{
		UDojoS1ItemData* Item = NewObject<UDojoS1ItemData>();
		Item->DisplayName = FText::FromString(Name);
		Item->MaxStack = MaxStack;
		Item->Weight = Weight;
		Item->EquipSlot = Slot;
		Item->PowerBonus = Power;
		return Item;
	}

	/** A wearer with a bag, wired together the way a designer would. */
	struct FWearer
	{
		UDojoS1InventoryComponent* Bag = nullptr;
		UDojoS1EquipmentComponent* Equipment = nullptr;
	};

	/** Puts a bag and equipment on a fresh actor and connects them. */
	FWearer MakeWearer(FDojoTestWorld& TestWorld, int32 SlotCount, int32 MaxWeight)
	{
		FWearer Wearer;
		ADojoTestActor* Carrier = TestWorld.SpawnActor<ADojoTestActor>();
		Wearer.Bag = TestWorld.AddComponent<UDojoS1InventoryComponent>(Carrier);
		Wearer.Bag->SlotCount = SlotCount;
		Wearer.Bag->MaxWeight = MaxWeight;
		Wearer.Equipment = TestWorld.AddComponent<UDojoS1EquipmentComponent>(Carrier);
		Wearer.Equipment->UseBag(Wearer.Bag);
		return Wearer;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Equipment_WearsAndReturns, "Dojo.S1.Equipment.WearsAndReturns", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Equips, swaps, and unequips when everything fits, and checks the slots, the bag, the power, and one notice per change. */
bool FDojo_S1_Equipment_WearsAndReturns::RunTest(const FString& Parameters)
{
	using namespace DojoS1EquipmentTest;

	FDojoTestWorld TestWorld;

	UDojoS1ItemData* Sword = MakeItem(TEXT("Sword"), 1, 6, EDojoS1EquipSlot::EES_Hand, 7);
	UDojoS1ItemData* Dagger = MakeItem(TEXT("Dagger"), 1, 2, EDojoS1EquipSlot::EES_Hand, 3);
	UDojoS1ItemData* Helmet = MakeItem(TEXT("Helmet"), 1, 4, EDojoS1EquipSlot::EES_Head, 2);
	UDojoS1ItemData* Potion = MakeItem(TEXT("Potion"), 5, 1, EDojoS1EquipSlot::EES_None, 0);

	FWearer Wearer = MakeWearer(TestWorld, 4, 20);
	if (!TestNotNull(TEXT("Wearer created"), Wearer.Equipment)) return false;

	TStrongObjectPtr<UDojoS1EquipmentSpy> Spy(NewObject<UDojoS1EquipmentSpy>());
	Spy->Watch(Wearer.Equipment);
	Spy->Watch(Wearer.Equipment);

	Wearer.Bag->Add(Sword, 1);
	Wearer.Bag->Add(Helmet, 1);
	Wearer.Bag->Add(Potion, 3);

	TestTrue(TEXT("The sword goes on"), Wearer.Equipment->Equip(Sword));
	TestTrue(TEXT("The sword is in the hand"), Wearer.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Sword);
	TestEqual(TEXT("The sword left the bag"), Wearer.Bag->CountOf(Sword), 0);
	TestEqual(TEXT("The wearer has the sword's power"), Wearer.Equipment->GetTotalPower(), 7);
	TestEqual(TEXT("One notice, sent after the slots changed"), Spy->GetNoticeCount(), 1);
	TestEqual(TEXT("The power read at that notice includes the sword"), Spy->GetPowerAtLastNotice(), 7);

	TestTrue(TEXT("The helmet goes on"), Wearer.Equipment->Equip(Helmet));
	TestEqual(TEXT("Power adds up over slots"), Wearer.Equipment->GetTotalPower(), 9);
	TestEqual(TEXT("Two notices so far"), Spy->GetNoticeCount(), 2);

	TestFalse(TEXT("A potion cannot be worn"), Wearer.Equipment->Equip(Potion));
	TestFalse(TEXT("An item that is not in the bag cannot be worn"), Wearer.Equipment->Equip(Dagger));
	TestFalse(TEXT("No item cannot be worn"), Wearer.Equipment->Equip(nullptr));
	TestEqual(TEXT("Refused calls send no notice"), Spy->GetNoticeCount(), 2);
	TestEqual(TEXT("The potions are untouched"), Wearer.Bag->CountOf(Potion), 3);

	Wearer.Bag->Add(Dagger, 1);
	TestTrue(TEXT("The dagger replaces the sword"), Wearer.Equipment->Equip(Dagger));
	TestTrue(TEXT("The dagger is in the hand"), Wearer.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Dagger);
	TestEqual(TEXT("The sword came back to the bag"), Wearer.Bag->CountOf(Sword), 1);
	TestEqual(TEXT("The dagger left the bag"), Wearer.Bag->CountOf(Dagger), 0);
	TestEqual(TEXT("Power follows the swap"), Wearer.Equipment->GetTotalPower(), 5);
	TestEqual(TEXT("A swap is one notice"), Spy->GetNoticeCount(), 3);
	TestEqual(TEXT("The power read at the swap notice is the final power"), Spy->GetPowerAtLastNotice(), 5);

	TestTrue(TEXT("The helmet comes off"), Wearer.Equipment->Unequip(EDojoS1EquipSlot::EES_Head));
	TestTrue(TEXT("The head is empty"), Wearer.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Head) == nullptr);
	TestEqual(TEXT("The helmet is back in the bag"), Wearer.Bag->CountOf(Helmet), 1);
	TestEqual(TEXT("Power drops"), Wearer.Equipment->GetTotalPower(), 3);
	TestEqual(TEXT("Unequipping is one notice"), Spy->GetNoticeCount(), 4);
	TestFalse(TEXT("An empty slot has nothing to take off"), Wearer.Equipment->Unequip(EDojoS1EquipSlot::EES_Head));
	TestFalse(TEXT("The None slot has nothing to take off"), Wearer.Equipment->Unequip(EDojoS1EquipSlot::EES_None));
	TestEqual(TEXT("Refused calls send no notice"), Spy->GetNoticeCount(), 4);

	ADojoTestActor* Loner = TestWorld.SpawnActor<ADojoTestActor>();
	UDojoS1EquipmentComponent* WithoutBag = TestWorld.AddComponent<UDojoS1EquipmentComponent>(Loner);
	TestFalse(TEXT("Equipment with no bag wears nothing"), WithoutBag->Equip(Sword));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Equipment_TightBags, "Dojo.S1.Equipment.TightBags", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Equips and unequips with bags that are nearly full by weight or by slots, and checks where every item is afterwards. */
bool FDojo_S1_Equipment_TightBags::RunTest(const FString& Parameters)
{
	using namespace DojoS1EquipmentTest;

	FDojoTestWorld TestWorld;

	UDojoS1ItemData* Sword = MakeItem(TEXT("Sword"), 1, 6, EDojoS1EquipSlot::EES_Hand, 7);
	UDojoS1ItemData* Dagger = MakeItem(TEXT("Dagger"), 1, 2, EDojoS1EquipSlot::EES_Hand, 3);
	UDojoS1ItemData* Helmet = MakeItem(TEXT("Helmet"), 1, 4, EDojoS1EquipSlot::EES_Head, 2);
	UDojoS1ItemData* Potion = MakeItem(TEXT("Potion"), 5, 1, EDojoS1EquipSlot::EES_None, 0);
	UDojoS1ItemData* Stone = MakeItem(TEXT("Stone"), 10, 2, EDojoS1EquipSlot::EES_None, 0);

	// A swap that would push the bag over its weight limit.
	FWearer Heavy = MakeWearer(TestWorld, 4, 20);
	Heavy.Bag->Add(Sword, 1);
	Heavy.Equipment->Equip(Sword);
	Heavy.Bag->Add(Stone, 7);
	Heavy.Bag->Add(Dagger, 1);
	Heavy.Bag->Add(Potion, 2);
	TStrongObjectPtr<UDojoS1EquipmentSpy> Spy(NewObject<UDojoS1EquipmentSpy>());
	Spy->Watch(Heavy.Equipment);

	TestEqual(TEXT("Setup: the bag weighs 18"), Heavy.Bag->GetTotalWeight(), 18);
	TestFalse(TEXT("Swapping a 2 for a 6 would put the bag at 22 of 20, so it is refused"), Heavy.Equipment->Equip(Dagger));
	TestTrue(TEXT("The sword is still in the hand"), Heavy.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Sword);
	TestEqual(TEXT("The dagger is still in the bag"), Heavy.Bag->CountOf(Dagger), 1);
	TestEqual(TEXT("The sword was not also put in the bag"), Heavy.Bag->CountOf(Sword), 0);
	TestEqual(TEXT("The stones are untouched"), Heavy.Bag->CountOf(Stone), 7);
	TestEqual(TEXT("The potions are untouched"), Heavy.Bag->CountOf(Potion), 2);
	TestEqual(TEXT("The bag still weighs 18"), Heavy.Bag->GetTotalWeight(), 18);
	TestEqual(TEXT("The power did not change"), Heavy.Equipment->GetTotalPower(), 7);
	TestEqual(TEXT("A refused swap sends no equipment notice"), Spy->GetNoticeCount(), 0);

	Heavy.Bag->Remove(Stone, 2);
	TestTrue(TEXT("With 4 less weight the same swap works"), Heavy.Equipment->Equip(Dagger));
	TestTrue(TEXT("The dagger is in the hand"), Heavy.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Dagger);
	TestEqual(TEXT("The sword is in the bag"), Heavy.Bag->CountOf(Sword), 1);
	TestEqual(TEXT("Exactly one sword and one dagger exist"), Heavy.Bag->CountOf(Sword) + Heavy.Bag->CountOf(Dagger), 1);

	// Taking an item off when it would not fit back in the bag, by weight.
	FWearer ByWeight = MakeWearer(TestWorld, 4, 20);
	ByWeight.Bag->Add(Sword, 1);
	ByWeight.Equipment->Equip(Sword);
	ByWeight.Bag->Add(Stone, 10);
	TestFalse(TEXT("A sword of 6 does not fit into a bag at 20 of 20"), ByWeight.Equipment->Unequip(EDojoS1EquipSlot::EES_Hand));
	TestTrue(TEXT("The sword is still worn"), ByWeight.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Sword);
	TestEqual(TEXT("The bag is unchanged"), ByWeight.Bag->GetTotalWeight(), 20);
	ByWeight.Bag->Remove(Stone, 3);
	TestTrue(TEXT("With room it comes off"), ByWeight.Equipment->Unequip(EDojoS1EquipSlot::EES_Hand));
	TestEqual(TEXT("The sword is in the bag"), ByWeight.Bag->CountOf(Sword), 1);

	// Taking an item off when the bag has no free slot.
	FWearer BySlots = MakeWearer(TestWorld, 2, 100);
	BySlots.Bag->Add(Helmet, 1);
	BySlots.Bag->Add(Dagger, 1);
	BySlots.Equipment->Equip(Helmet);
	BySlots.Bag->Add(Stone, 1);
	TestFalse(TEXT("A full bag cannot take the helmet back"), BySlots.Equipment->Unequip(EDojoS1EquipSlot::EES_Head));
	TestTrue(TEXT("The helmet is still worn"), BySlots.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Head) == Helmet);
	BySlots.Bag->Remove(Stone, 1);
	TestTrue(TEXT("With a free slot it comes off"), BySlots.Equipment->Unequip(EDojoS1EquipSlot::EES_Head));

	// Swaps that only fit because the new item leaves the bag as the old one comes back.
	FWearer Exact = MakeWearer(TestWorld, 4, 20);
	Exact.Bag->Add(Sword, 1);
	Exact.Equipment->Equip(Sword);
	Exact.Bag->Add(Stone, 7);
	Exact.Bag->Add(Dagger, 1);
	TestEqual(TEXT("Setup: the bag weighs 16"), Exact.Bag->GetTotalWeight(), 16);
	TestTrue(TEXT("Swapping a 2 for a 6 lands exactly on the limit of 20, so it works"), Exact.Equipment->Equip(Dagger));
	TestTrue(TEXT("The dagger is in the hand"), Exact.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Dagger);
	TestEqual(TEXT("The sword is in the bag"), Exact.Bag->CountOf(Sword), 1);
	TestEqual(TEXT("The bag weighs exactly 20"), Exact.Bag->GetTotalWeight(), 20);

	FWearer Crowded = MakeWearer(TestWorld, 2, 100);
	Crowded.Bag->Add(Sword, 1);
	Crowded.Equipment->Equip(Sword);
	Crowded.Bag->Add(Dagger, 1);
	Crowded.Bag->Add(Stone, 1);
	TestEqual(TEXT("Setup: both slots are taken"), Crowded.Bag->GetSlots().Num(), 2);
	TestTrue(TEXT("The dagger's slot is freed for the sword, so the swap works"), Crowded.Equipment->Equip(Dagger));
	TestTrue(TEXT("The dagger is in the hand"), Crowded.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Dagger);
	TestEqual(TEXT("The sword is in the bag"), Crowded.Bag->CountOf(Sword), 1);
	TestEqual(TEXT("The stone is still in the bag"), Crowded.Bag->CountOf(Stone), 1);

	return true;
}

#endif
```

# Hints

- Run the first failing test and read its message: it names an item that should be in one place and is somewhere else, or nowhere.
- Equip changes two places, the bag and the slot. Ask what has to be true of the world if the second change cannot happen after the first one has, and what a failed call should leave behind.
- `TMap::Add` replaces the value for a key that already exists, `TMap::Find` returns a pointer or null, and `UDojoS1InventoryComponent::GetRoomFor` tells you whether an item would fit, but only for the bag as it is at the moment you ask.

# Rubric

- Equip moves exactly one item from the bag into the slot named by the item and returns the replaced item to the bag.
- Equip and Unequip return true only when an item really moved between the bag and a slot.
- `OnEquipmentChanged` is broadcast once per successful change, after both the bag and the slots hold their new contents, and never for a refused call.
- `GetTotalPower` adds up the bonuses of everything worn and ignores empty slots.
- Equipment holds the pointer to the bag; the bag holds nothing about equipment.

# Alternative

Equipment could be a second set of slots inside the bag itself, so a swap is two slots trading places in one list and nothing is ever between places. That makes the unlucky cases simple, because one component owns every item, but every bag then carries body slots, and a chest or a shop has to ignore them. Keeping two components costs a careful order of operations in `Equip`: take the new item out, try to put the old one back, and if that is refused, undo the first step. Checking whether the old item fits before touching anything is the other way to be careful, and it needs the bag to answer a hypothetical question; the undo needs only the calls it already has. Either way, it is the Component pattern from Pack 2's "Actors built from parts" world doing its job: small parts, each with one responsibility, and one part, the equipment, responsible for keeping the move between them honest.

# Parsons

```yaml
- id: equipment-total-power
  prompt: Put GetTotalPower in order.
  lines:
    - "int32 UDojoS1EquipmentComponent::GetTotalPower() const"
    - "{"
    - "	int32 Total = 0;"
    - "	for (const TPair<EDojoS1EquipSlot, TObjectPtr<UDojoS1ItemData>>& Entry : Worn)"
    - "	{"
    - "		if (Entry.Value != nullptr)"
    - "		{"
    - "			Total += Entry.Value->PowerBonus;"
    - "		}"
    - "	}"
    - "	return Total;"
    - "}"
  distractors:
    - line: "	for (int32 Index = 0; Index < Worn.Num(); ++Index)"
      mistake: A TMap is not indexed by position, its operator[] takes a key, so it is walked with a range-based loop that yields key and value pairs.
    - line: "			Total += Entry.Key->PowerBonus;"
      mistake: The key is the slot, an enum with no power; the bonus is on the item in Entry.Value.
```
