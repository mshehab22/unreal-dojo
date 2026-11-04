---
id: s1-bag-view
title: A panel that follows the bag by listening
order: 5
kind: build
scaffold: blank
difficulty: 3
patterns: [observer]
skills: [delegates, ui]
terms: [dynamic-multicast-delegate, adddynamic, unbinding-delegates, endplay, ftext, tobjectptr]
prerequisites: [s1-equipment, s1-bag, s1-item-data]
xp: 90
estimatedMinutes: 25
concepts:
  - A view that redraws only when told something changed
  - Binding to two senders and unbinding from both when the view leaves
  - Moving a view from one bag to another
---

# Brief

When a bag and its equipment change, a text panel rewrites itself at once, with no Tick, and when the panel is removed from the level, the bag and the equipment have no listener left.

Write `ADojoS1BagView` from nothing. It is an actor with a text display. Nothing outside it knows how it works, and the bag and the equipment know nothing about it: it only subscribes.

The tests use this public interface, so keep these names:

- `UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> Display;` holds the text.
- `void Show(UDojoS1InventoryComponent* Bag, UDojoS1EquipmentComponent* Wearer)` starts showing that bag and equipment. It stops showing and listening to whatever it showed before. If either argument is null, nothing is listened to and the display is empty.

The text is exactly these lines joined by a newline, with no newline at the end:

- `Weight 15/20`: the bag's total weight and its weight limit.
- One line per bag slot, from `1.` up to the bag's slot count: `1. Potion x3` for a pile, and `3. -` for an empty slot. Piles show in the bag's slot order.
- `Head: Helmet` and `Hand: Sword`, using `none` when the slot is empty.
- `Power: 9`, the equipment's total power.

Every change to the bag and every change to the equipment rewrites the whole text. Showing the same bag twice must not make it rewrite twice per change.

Compiles against earlier quests: s1-bag (`Quests/s1-bag/DojoS1InventoryComponent.h`), s1-equipment (`Quests/s1-equipment/DojoS1EquipmentComponent.h`), and s1-item-data (`Quests/s1-item-data/DojoS1ItemData.h`).

This is the last piece of the Expedition Pack boss.

## See it in the editor

Place a `DojoS1BagView` in the level, and a Blueprint actor `BP_Carrier` with a bag and equipment. In the level Blueprint, get the carrier's components with Get Component by Class, and on BeginPlay call Use Bag on the equipment and Show on the view with the bag and the equipment. On the 1 key call Add on the bag with `DA_Sword`, on the 2 key call Add with `DA_Potion`, on the 3 key call Equip on the equipment with `DA_Sword`, and on the 4 key call Destroy Actor on the view. Press Play: the view shows an empty bag; press 1 and the sword's line appears in the same frame; press 2 and the potion's line appears; press 3 and the sword moves from its slot line to `Hand: Sword`. Then press 4 and check that keys 1 to 3 still work without errors.

# Files

## DojoS1BagView.h

```cpp
// Declare ADojoS1BagView here.
```

## DojoS1BagView.cpp

```cpp
// Define ADojoS1BagView here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/s1-bag-view/DojoS1BagView.h"
#include "Quests/s1-bag/DojoS1InventoryComponent.h"
#include "Quests/s1-equipment/DojoS1EquipmentComponent.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS1BagViewTest
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

	/** A bag and its equipment on one actor. */
	struct FWearer
	{
		UDojoS1InventoryComponent* Bag = nullptr;
		UDojoS1EquipmentComponent* Equipment = nullptr;
	};

	/** Puts a four slot bag with a weight limit of 20 and its equipment on a fresh actor. */
	FWearer MakeWearer(FDojoTestWorld& TestWorld)
	{
		FWearer Wearer;
		ADojoTestActor* Carrier = TestWorld.SpawnActor<ADojoTestActor>();
		Wearer.Bag = TestWorld.AddComponent<UDojoS1InventoryComponent>(Carrier);
		Wearer.Bag->SlotCount = 4;
		Wearer.Bag->MaxWeight = 20;
		Wearer.Equipment = TestWorld.AddComponent<UDojoS1EquipmentComponent>(Carrier);
		Wearer.Equipment->UseBag(Wearer.Bag);
		return Wearer;
	}

	/** The text the view currently shows. */
	FString TextOf(const ADojoS1BagView* View)
	{
		return View->Display->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_BagView_FollowsEveryChange, "Dojo.S1.BagView.FollowsEveryChange", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Shows a wearer, changes the bag and the equipment, and checks the text after every change without ticking the world once. */
bool FDojo_S1_BagView_FollowsEveryChange::RunTest(const FString& Parameters)
{
	using namespace DojoS1BagViewTest;

	FDojoTestWorld TestWorld;

	UDojoS1ItemData* Potion = MakeItem(TEXT("Potion"), 5, 1, EDojoS1EquipSlot::EES_None, 0);
	UDojoS1ItemData* Stone = MakeItem(TEXT("Stone"), 10, 2, EDojoS1EquipSlot::EES_None, 0);
	UDojoS1ItemData* Sword = MakeItem(TEXT("Sword"), 1, 6, EDojoS1EquipSlot::EES_Hand, 7);
	UDojoS1ItemData* Helmet = MakeItem(TEXT("Helmet"), 1, 4, EDojoS1EquipSlot::EES_Head, 2);

	FWearer Wearer = MakeWearer(TestWorld);
	ADojoS1BagView* View = TestWorld.SpawnActor<ADojoS1BagView>();
	if (!TestNotNull(TEXT("View spawned"), View) || !TestNotNull(TEXT("The view has a display"), View->Display.Get())) return false;

	View->Show(Wearer.Bag, Wearer.Equipment);
	TestEqual(TEXT("An empty bag and no equipment"), TextOf(View), FString(TEXT("Weight 0/20\n1. -\n2. -\n3. -\n4. -\nHead: none\nHand: none\nPower: 0")));

	Wearer.Bag->Add(Potion, 3);
	Wearer.Bag->Add(Stone, 3);
	Wearer.Bag->Add(Sword, 1);
	TestEqual(TEXT("One line per slot, in slot order"), TextOf(View), FString(TEXT("Weight 15/20\n1. Potion x3\n2. Stone x3\n3. Sword x1\n4. -\nHead: none\nHand: none\nPower: 0")));

	Wearer.Equipment->Equip(Sword);
	TestEqual(TEXT("The sword moved from the bag to the hand"), TextOf(View), FString(TEXT("Weight 9/20\n1. Potion x3\n2. Stone x3\n3. -\n4. -\nHead: none\nHand: Sword\nPower: 7")));

	Wearer.Bag->Add(Helmet, 1);
	Wearer.Equipment->Equip(Helmet);
	TestEqual(TEXT("The helmet is on and the power adds up"), TextOf(View), FString(TEXT("Weight 9/20\n1. Potion x3\n2. Stone x3\n3. -\n4. -\nHead: Helmet\nHand: Sword\nPower: 9")));

	Wearer.Bag->Remove(Potion, 3);
	TestEqual(TEXT("A removed pile closes its gap"), TextOf(View), FString(TEXT("Weight 6/20\n1. Stone x3\n2. -\n3. -\n4. -\nHead: Helmet\nHand: Sword\nPower: 9")));

	Wearer.Equipment->Unequip(EDojoS1EquipSlot::EES_Hand);
	TestEqual(TEXT("The sword is back in the bag"), TextOf(View), FString(TEXT("Weight 12/20\n1. Stone x3\n2. Sword x1\n3. -\n4. -\nHead: Helmet\nHand: none\nPower: 2")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_BagView_ShowsOneWearerAtATime, "Dojo.S1.BagView.ShowsOneWearerAtATime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moves the view from one wearer to another and checks the first is forgotten and an incomplete pair clears the text. */
bool FDojo_S1_BagView_ShowsOneWearerAtATime::RunTest(const FString& Parameters)
{
	using namespace DojoS1BagViewTest;

	FDojoTestWorld TestWorld;

	UDojoS1ItemData* Stone = MakeItem(TEXT("Stone"), 10, 2, EDojoS1EquipSlot::EES_None, 0);
	FWearer First = MakeWearer(TestWorld);
	FWearer Second = MakeWearer(TestWorld);
	ADojoS1BagView* View = TestWorld.SpawnActor<ADojoS1BagView>();
	if (!TestNotNull(TEXT("View spawned"), View)) return false;

	View->Show(First.Bag, First.Equipment);
	View->Show(Second.Bag, Second.Equipment);
	First.Bag->Add(Stone, 2);
	TestFalse(TEXT("The first bag is no longer listened to"), First.Bag->OnInventoryChanged.IsBound());
	TestFalse(TEXT("The first equipment is no longer listened to"), First.Equipment->OnEquipmentChanged.IsBound());
	TestEqual(TEXT("A change in the first bag leaves the text alone"), TextOf(View), FString(TEXT("Weight 0/20\n1. -\n2. -\n3. -\n4. -\nHead: none\nHand: none\nPower: 0")));

	Second.Bag->Add(Stone, 2);
	TestEqual(TEXT("A change in the second bag shows"), TextOf(View), FString(TEXT("Weight 4/20\n1. Stone x2\n2. -\n3. -\n4. -\nHead: none\nHand: none\nPower: 0")));

	View->Show(Second.Bag, Second.Equipment);
	Second.Bag->Add(Stone, 1);
	TestEqual(TEXT("Showing the same wearer twice still rewrites the text once per change"), TextOf(View), FString(TEXT("Weight 6/20\n1. Stone x3\n2. -\n3. -\n4. -\nHead: none\nHand: none\nPower: 0")));

	View->Show(Second.Bag, nullptr);
	TestEqual(TEXT("A missing equipment leaves the display empty"), TextOf(View), FString());
	TestFalse(TEXT("And nothing is listened to"), Second.Bag->OnInventoryChanged.IsBound());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_BagView_UnbindsWhenItLeaves, "Dojo.S1.BagView.UnbindsWhenItLeaves", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys the view and checks the bag and the equipment have no listeners left, then changes both safely. */
bool FDojo_S1_BagView_UnbindsWhenItLeaves::RunTest(const FString& Parameters)
{
	using namespace DojoS1BagViewTest;

	FDojoTestWorld TestWorld;

	UDojoS1ItemData* Sword = MakeItem(TEXT("Sword"), 1, 6, EDojoS1EquipSlot::EES_Hand, 7);
	FWearer Wearer = MakeWearer(TestWorld);
	ADojoS1BagView* View = TestWorld.SpawnActor<ADojoS1BagView>();
	if (!TestNotNull(TEXT("View spawned"), View)) return false;

	View->Show(Wearer.Bag, Wearer.Equipment);
	TestTrue(TEXT("The view listens to the bag"), Wearer.Bag->OnInventoryChanged.IsBound());
	TestTrue(TEXT("The view listens to the equipment"), Wearer.Equipment->OnEquipmentChanged.IsBound());

	View->Destroy();
	TestFalse(TEXT("Nobody listens to the bag after the view leaves"), Wearer.Bag->OnInventoryChanged.IsBound());
	TestFalse(TEXT("Nobody listens to the equipment after the view leaves"), Wearer.Equipment->OnEquipmentChanged.IsBound());

	Wearer.Bag->Add(Sword, 1);
	TestTrue(TEXT("The wearer carries on without the view"), Wearer.Equipment->Equip(Sword));

	return true;
}

#endif
```

# Hints

- Both events need the same response, so write one function that rebuilds the whole text from the bag and equipment as they are now, and let both handlers call it.
- `AddUniqueDynamic` ignores a second identical binding, and `RemoveDynamic` takes the same object and function that were bound.
- Remember what you were showing so a later `Show` can unbind from it, and keep those pointers in members named differently from the parameters, such as `ShownBag`, because a member and a parameter sharing a name is compiler error C4458 on Windows.

# Rubric

- The panel rewrites its text only from the bag's and the equipment's events, and never from Tick or a timer.
- The text matches the format exactly, including the slot lines in slot order and `none` for an empty slot.
- Showing a different bag stops listening to the old one, and showing the same one twice does not double the rewrites.
- The panel unbinds from both senders when it leaves play, and a null argument leaves it empty and listening to nothing.
- The bag and the equipment hold no pointer to the panel; the panel holds the pointers it needs to unbind.

# Alternative

A Blueprint widget bound to the bag with property bindings would poll each field every frame, which is simple but pays a small price on each frame, forever. The events cost nothing between changes and make the panel redraw exactly when it should; the price is the binding and unbinding you wrote. A third shape is a UMG widget that listens to the same events, which is what a real game screen would use: the listening code is identical, only the thing that draws the text changes. This is Observer from Pack 2's first world, with a view as the subscriber.

# Parsons

```yaml
- id: bag-view-stop-listening
  prompt: Put the unbinding in order, using the names from the reference.
  lines:
    - "void ADojoS1BagView::StopListening()"
    - "{"
    - "	if (ShownBag != nullptr)"
    - "	{"
    - "		ShownBag->OnInventoryChanged.RemoveDynamic(this, &ADojoS1BagView::HandleBagChanged);"
    - "	}"
    - "	ShownBag = nullptr;"
    - "}"
  distractors:
    - line: "		ShownBag->OnInventoryChanged.Clear();"
      mistake: Clear removes every listener on the bag, including ones that belong to other actors; remove only your own binding.
    - line: "		ShownBag->OnInventoryChanged.Remove(this);"
      mistake: Removing a binding needs the object and the function together, which RemoveDynamic builds from a function pointer; the object alone is not enough.
```
