---
id: m6-quest-item
title: An item that announces it was collected
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [observer]
skills: [delegates]
terms: [dynamic-multicast-delegate, broadcast, adddynamic, destroy]
prerequisites: [m6-quest-system-plan]
xp: 50
estimatedMinutes: 12
concepts:
  - Broadcast while the item still stands, then leave
  - A listener can bind to many senders and tell them apart by the pointer it receives
---

# Brief

When you place three Tool items and a satchel, tell the satchel to watch all three, and collect two of them, the satchel reads Tool 2, and every listener heard each item while the item was still in the world.

Most of the code is written for you. Explain the marked lines, then fill the two gaps:

1. `ADojoM6QuestItem::Collect`: refuse a second collection; otherwise mark it collected, announce it to every listener with the item and whoever took it, and then destroy the item.
2. `ADojoM6Satchel::Watch`: start listening to the item's collection, binding only once however many times Watch is called.

Dependency direction: the satchel holds no list of items and the items hold no pointer to the satchel; the satchel only subscribes. Each notice carries the item itself, so one handler can serve every item and read its tag.

This item is the first piece of the Quest System boss.

## See it in the editor

Place three `DojoM6QuestItem` actors and a `DojoM6Satchel`. In the level Blueprint, on BeginPlay, call Watch on the satchel for each item; on the 1, 2, and 3 keys, call Collect on the first, second, and third item with the player pawn. Right after each Collect call, add a Print String of the satchel's Get Count with Tool. Press Play and press 1: the first item disappears and 1 prints. Press 2 and 3: each item disappears and the count climbs to 2 and then 3, one handler serving all three items. The refusal of a second collection cannot be seen here, because a collected item is already gone before you could press again; the automated test asks the same item twice and checks the second answer is false.

# Files

## DojoM6QuestItem.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM6QuestItem.generated.h"

class ADojoM6QuestItem; // @explain: A forward declaration, because the delegate names the item class before the class is declared.
class UTextRenderComponent;

/** Broadcast when an item is collected, with the item and whoever collected it. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM6OnItemCollected, ADojoM6QuestItem*, Item, AActor*, Taker); // @explain: Two parameters, each a type then a name; the item comes first so one handler can serve many items.

/** A pickup that announces it was collected and then leaves the world; it knows nothing about quests or who listens. */
UCLASS()
class ADojoM6QuestItem : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoM6QuestItem();

	/** Floating text that shows the item's tag. */
	UPROPERTY(VisibleAnywhere, Category = "Quest Item")
	TObjectPtr<UTextRenderComponent> Label;

	/** What kind of item this is, such as Tool or Gem; quests ask for items by tag. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest Item")
	FName ItemTag = TEXT("Tool");

	/** Fires once, when the item is collected, while the item still stands. */
	UPROPERTY(BlueprintAssignable, Category = "Quest Item")
	FDojoM6OnItemCollected OnCollected;

	/** Announces the collection to every listener, then destroys the item; false if it was already collected. */
	UFUNCTION(BlueprintCallable, Category = "Quest Item")
	bool Collect(AActor* Taker);

	/** True once collected. */
	UFUNCTION(BlueprintPure, Category = "Quest Item")
	bool IsCollected() const;

protected:
	/** Shows the tag on the label. */
	virtual void BeginPlay() override;

private:
	bool bCollected = false;
};
```

## DojoM6QuestItem.cpp

```cpp
#include "DojoM6QuestItem.h"

#include "Components/TextRenderComponent.h"

ADojoM6QuestItem::ADojoM6QuestItem()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM6QuestItem::BeginPlay()
{
	Super::BeginPlay();

	Label->SetText(FText::FromName(ItemTag));
}

bool ADojoM6QuestItem::Collect(AActor* Taker)
{
	// Your code: refuse a second collection.
	// Your code: mark it collected, tell every listener with this item and the taker, then destroy the item.
	return false;
}

bool ADojoM6QuestItem::IsCollected() const
{
	return bCollected;
}
```

## DojoM6Satchel.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM6Satchel.generated.h"

class ADojoM6QuestItem;

/** Counts collected items by tag by listening to each item it is told to watch; the items never know it exists. */
UCLASS()
class ADojoM6Satchel : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM6Satchel();

	/** Starts listening to Item's collection. */
	UFUNCTION(BlueprintCallable, Category = "Satchel")
	void Watch(ADojoM6QuestItem* Item);

	/** Items of this tag heard so far. */
	UFUNCTION(BlueprintPure, Category = "Satchel")
	int32 GetCount(FName ItemTag) const;

	/** Notices that arrived after the item had already started leaving the world. */
	UFUNCTION(BlueprintPure, Category = "Satchel")
	int32 GetLateNotices() const;

private:
	/** Counts one item of the collected item's tag. */
	UFUNCTION() // @explain: Dynamic delegates find their handler by name through reflection, so the handler must be a UFUNCTION.
	void HandleCollected(ADojoM6QuestItem* Item, AActor* Taker);

	TMap<FName, int32> Counts;

	int32 LateNotices = 0;
};
```

## DojoM6Satchel.cpp

```cpp
#include "DojoM6Satchel.h"

#include "DojoM6QuestItem.h"

ADojoM6Satchel::ADojoM6Satchel()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM6Satchel::Watch(ADojoM6QuestItem* Item)
{
	if (!IsValid(Item)) return;

	// Your code: listen to the item's collection with HandleCollected, binding only once.
}

void ADojoM6Satchel::HandleCollected(ADojoM6QuestItem* Item, AActor* Taker)
{
	if (!Item || Item->IsActorBeingDestroyed()) LateNotices++; // @explain: A notice from an item already on its way out means the item destroyed itself before telling anyone.
	if (!Item) return;

	Counts.FindOrAdd(Item->ItemTag)++;
}

int32 ADojoM6Satchel::GetCount(FName ItemTag) const
{
	const int32* Count = Counts.Find(ItemTag);
	return Count ? *Count : 0;
}

int32 ADojoM6Satchel::GetLateNotices() const
{
	return LateNotices;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m6-quest-item/DojoM6QuestItem.h"
#include "Quests/m6-quest-item/DojoM6Satchel.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM6QuestItemTest
{
	/** Spawns an item with the given tag, the way a designer sets it in Details. */
	ADojoM6QuestItem* SpawnItem(FDojoTestWorld& TestWorld, const TCHAR* ItemTag)
	{
		ADojoM6QuestItem* Item = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM6QuestItem>(ADojoM6QuestItem::StaticClass(), FTransform::Identity);
		Item->ItemTag = FName(ItemTag);
		Item->FinishSpawning(FTransform::Identity);
		return Item;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_QuestItem_ListenersHearBeforeItLeaves, "Dojo.M6.QuestItem.ListenersHearBeforeItLeaves", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Collects items watched by two satchels and checks both hear each item once, while it still stands, and that it then leaves. */
bool FDojo_M6_QuestItem_ListenersHearBeforeItLeaves::RunTest(const FString& Parameters)
{
	using namespace DojoM6QuestItemTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Hero = TestWorld.SpawnActor<ADojoTestActor>();
	ADojoM6QuestItem* Wrench = SpawnItem(TestWorld, TEXT("Tool"));
	ADojoM6QuestItem* Hammer = SpawnItem(TestWorld, TEXT("Tool"));
	ADojoM6QuestItem* Gem = SpawnItem(TestWorld, TEXT("Gem"));
	ADojoM6Satchel* Satchel = TestWorld.SpawnActor<ADojoM6Satchel>();
	ADojoM6Satchel* Ledger = TestWorld.SpawnActor<ADojoM6Satchel>();
	if (!TestNotNull(TEXT("Items spawned"), Gem) || !TestNotNull(TEXT("Satchels spawned"), Ledger)) return false;

	for (ADojoM6QuestItem* Item : { Wrench, Hammer, Gem })
	{
		Satchel->Watch(Item);
		Ledger->Watch(Item);
	}
	Satchel->Watch(Gem);

	TestTrue(TEXT("Collecting the wrench succeeds"), Wrench->Collect(Hero));
	TestTrue(TEXT("The wrench is marked collected"), Wrench->IsCollected());
	TestTrue(TEXT("The wrench leaves the world"), Wrench->IsActorBeingDestroyed());
	TestFalse(TEXT("A second collect is refused"), Wrench->Collect(Hero));

	Gem->Collect(Hero);
	TestEqual(TEXT("The satchel heard one tool"), Satchel->GetCount(TEXT("Tool")), 1);
	TestEqual(TEXT("Watching the gem twice still counts it once"), Satchel->GetCount(TEXT("Gem")), 1);
	TestEqual(TEXT("A second listener heard the same tool"), Ledger->GetCount(TEXT("Tool")), 1);
	TestEqual(TEXT("Every notice arrived while the item still stood"), Satchel->GetLateNotices() + Ledger->GetLateNotices(), 0);

	Hammer->Collect(Hero);
	TestEqual(TEXT("One handler counts every item it watches"), Satchel->GetCount(TEXT("Tool")), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_QuestItem_BlueprintCanListen, "Dojo.M6.QuestItem.BlueprintCanListen", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that Blueprints can bind to the item's event and call Collect. */
bool FDojo_M6_QuestItem_BlueprintCanListen::RunTest(const FString& Parameters)
{
	const FProperty* OnCollected = ADojoM6QuestItem::StaticClass()->FindPropertyByName(TEXT("OnCollected"));
	if (!TestNotNull(TEXT("OnCollected is a UPROPERTY"), OnCollected)) return false;
	TestTrue(TEXT("OnCollected is a multicast delegate"), OnCollected->IsA<FMulticastDelegateProperty>());
	TestTrue(TEXT("Blueprints can bind to it"), OnCollected->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	const UFunction* Collect = ADojoM6QuestItem::StaticClass()->FindFunctionByName(TEXT("Collect"));
	if (!TestNotNull(TEXT("Collect is a UFUNCTION"), Collect)) return false;
	TestTrue(TEXT("Collect is BlueprintCallable"), Collect->HasAnyFunctionFlags(FUNC_BlueprintCallable));

	return true;
}

#endif
```

# Hints

- Collect has a guard and three steps, and their order matters: the listeners must hear about an item that still stands.
- Broadcast passes the same two values the delegate was declared with; the binding macro that ignores a second identical binding has Unique in its name.
- `Broadcast` and `AddUniqueDynamic` are covered in Pack 1's binding card; `AActor::Destroy` is in `GameFramework/Actor.h`.

# Rubric

- Collect broadcasts with the item and the taker before calling Destroy, and refuses a second collection.
- Watch binds with AddUniqueDynamic, so watching an item twice counts it once.
- The handler is a UFUNCTION with the delegate's exact parameters, and reads the tag from the item it receives.
- The item holds no pointer to any listener; listeners subscribe.
- OnCollected is BlueprintAssignable, so a Blueprint can listen without C++.

# Alternative

The item could find a quest manager and call it directly when collected. That is shorter, but every item then drags the manager along, and a satchel, a sound, or a HUD that wants to know has to be added to the item's code. The event keeps the item ignorant: anything can subscribe, including Blueprints through the Events section in Details. This shape, a sender that announces and listeners that subscribe, is the Observer pattern, as in Pack 2's first world.

# Parsons

```yaml
- id: item-collect
  prompt: Put Collect in order.
  lines:
    - "bool ADojoM6QuestItem::Collect(AActor* Taker)"
    - "{"
    - "	if (bCollected) return false;"
    - "	bCollected = true;"
    - "	OnCollected.Broadcast(this, Taker);"
    - "	Destroy();"
    - "	return true;"
    - "}"
  distractors:
    - line: "	OnCollected.Broadcast(Taker);"
      mistake: The delegate was declared with two parameters, the item and the taker, so Broadcast must pass both.
```
