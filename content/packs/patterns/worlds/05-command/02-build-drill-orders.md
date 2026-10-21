---
id: p5-drill-orders
title: Orders that wait for the beat
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [command]
skills: [command]
terms: [ustruct, uenum, tweakobjectptr, tarray, timer-manager]
prerequisites: [p5-actions-as-values]
xp: 50
estimatedMinutes: 15
concepts:
  - An order stored as a value can be given now and carried out later, by a separate piece of code
  - The order names its own target, so one queue can drive any dummy
  - An order that waits must check its target when it runs, because the target may be gone
---

# Brief

When you press Play and run `ke * QueueRoutine`, the dummy does nothing at first, then on every beat it steps left, blocks, steps right twice, and blocks again, and the sergeant's label counts the waiting orders down to 0.

The drill sergeant does not tell dummies what to do directly. It writes each order down as an `FDojoP5DrillOrder`, a small value holding the move and the dummy it is for, and puts it at the back of a queue. A looping timer calls `Beat` every three quarters of a second, and each beat carries out one order. Giving an order and carrying it out now happen at different times, in different functions, and the sergeant can hold orders for several dummies in one queue.

Most of the code is written, including `FDojoP5DrillOrder::CarryOut`, which performs the move and returns false if the dummy is gone. First read the marked lines and say in a sentence why each one is there. Then fill the one gap in `Beat`: take orders off the front of the queue one at a time, drop any whose dummy is gone, carry out the first one whose dummy is still there, count it, and stop.

Naive first: carry out `Queue[0]` and remove it, without looking at the result. Run the tests: the one that destroys a dummy with orders still waiting shows a beat spent on nobody.

## See it in the editor

Place a `DojoP5DrillDummy` and a `DojoP5DrillSergeant`, and pick the dummy as the sergeant's Floor Dummy in the Details panel. Press Play, open the console, and run `ke * QueueRoutine`: the sergeant's label reads Orders waiting: 5, and the dummy moves once per beat, its label showing the lane and blocks. Run `ke * QueueRoutine` twice in a row: ten orders queue up and play out in order. Place a second dummy and point Floor Dummy at it before playing: the same routine drives the other dummy with no change to the orders.

# Files

## DojoP5DrillDummy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP5DrillDummy.generated.h"

class UTextRenderComponent;

/** A sparring dummy that steps between three lanes and raises its guard when told to. */
UCLASS()
class ADojoP5DrillDummy : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP5DrillDummy();

	/** Floating text that shows the lane and the blocks so far. */
	UPROPERTY(VisibleAnywhere, Category = "Dummy")
	TObjectPtr<UTextRenderComponent> Label;

	/** Steps one lane in Direction (negative for left, positive for right), never past the outer lanes. */
	UFUNCTION(BlueprintCallable, Category = "Dummy")
	void Step(int32 Direction);

	/** Raises the guard once. */
	UFUNCTION(BlueprintCallable, Category = "Dummy")
	void Block();

	/** The lane the dummy stands in: 0, 1, or 2. */
	UFUNCTION(BlueprintPure, Category = "Dummy")
	int32 GetLane() const;

	/** How many times the dummy has blocked. */
	UFUNCTION(BlueprintPure, Category = "Dummy")
	int32 GetBlocks() const;

protected:
	/** Remembers where the middle lane is and shows the starting lane. */
	virtual void BeginPlay() override;

private:
	/** Moves the actor to its lane and writes the label. */
	void Refresh();

	FVector MiddleLocation = FVector::ZeroVector;
	int32 Lane = 1;
	int32 Blocks = 0;
};
```

## DojoP5DrillDummy.cpp

```cpp
#include "DojoP5DrillDummy.h"

#include "Components/TextRenderComponent.h"

ADojoP5DrillDummy::ADojoP5DrillDummy()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP5DrillDummy::BeginPlay()
{
	Super::BeginPlay();

	MiddleLocation = GetActorLocation();
	Refresh();
}

void ADojoP5DrillDummy::Step(int32 Direction)
{
	Lane = FMath::Clamp(Lane + FMath::Sign(Direction), 0, 2);
	Refresh();
}

void ADojoP5DrillDummy::Block()
{
	Blocks++;
	Refresh();
}

int32 ADojoP5DrillDummy::GetLane() const
{
	return Lane;
}

int32 ADojoP5DrillDummy::GetBlocks() const
{
	return Blocks;
}

void ADojoP5DrillDummy::Refresh()
{
	SetActorLocation(MiddleLocation + FVector(0.f, (Lane - 1) * 150.f, 0.f));
	Label->SetText(FText::FromString(FString::Printf(TEXT("Lane %d, blocks %d"), Lane, Blocks)));
}
```

## DojoP5DrillSergeant.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP5DrillSergeant.generated.h"

class ADojoP5DrillDummy;
class UTextRenderComponent;

/** The moves a drill order can ask for. */
UENUM(BlueprintType)
enum class EDojoP5DrillMove : uint8
{
	EDM_StepLeft UMETA(DisplayName = "Step Left"),
	EDM_StepRight UMETA(DisplayName = "Step Right"),
	EDM_Block UMETA(DisplayName = "Block")
};

/** One order: which move, and which dummy it is for. A plain value, so it can wait in a queue until its beat. */
USTRUCT(BlueprintType)
struct FDojoP5DrillOrder
{
	GENERATED_BODY()

	/** The dummy that will carry the order out; weak, because the dummy may be gone before the order's beat comes. */
	UPROPERTY()
	TWeakObjectPtr<ADojoP5DrillDummy> Dummy; // @explain: A weak pointer does not keep the dummy alive and reads as empty once the dummy is destroyed, so an order can safely outlive its dummy.

	/** What the dummy will do. */
	UPROPERTY()
	EDojoP5DrillMove Move = EDojoP5DrillMove::EDM_Block;

	/** Performs the move on the dummy. Returns false, doing nothing, when the dummy is gone. */
	bool CarryOut() const;
};

/** A drill sergeant that queues orders for any dummy and carries out one per beat. */
UCLASS()
class ADojoP5DrillSergeant : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP5DrillSergeant();

	/** Floating text that shows how many orders are waiting. */
	UPROPERTY(VisibleAnywhere, Category = "Drill")
	TObjectPtr<UTextRenderComponent> Label;

	/** The dummy the console routine is ordered for, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Drill")
	TObjectPtr<ADojoP5DrillDummy> FloorDummy;

	/** Seconds between beats during play. */
	UPROPERTY(EditAnywhere, Category = "Drill", meta = (ClampMin = "0.1"))
	float BeatSeconds = 0.75f;

	/** Queues one order for a dummy; it runs on a later beat. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void Order(ADojoP5DrillDummy* Dummy, EDojoP5DrillMove Move);

	/** Queues a short routine for the floor dummy: step left, block, step right, step right, block. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void QueueRoutine();

	/** One beat: drops orders whose dummy is gone and carries out the first order whose dummy is still there. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void Beat();

	/** Orders still in the queue. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	int32 GetOrdersWaiting() const;

	/** Orders carried out so far. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	int32 GetOrdersCarriedOut() const;

protected:
	/** Starts the beat timer. */
	virtual void BeginPlay() override;

private:
	/** Writes the waiting count into the label. */
	void RefreshLabel();

	/** Orders waiting for their beat, oldest first. */
	UPROPERTY()
	TArray<FDojoP5DrillOrder> Queue;

	int32 OrdersCarriedOut = 0;
	FTimerHandle BeatTimer;
};
```

## DojoP5DrillSergeant.cpp

```cpp
#include "DojoP5DrillSergeant.h"

#include "Components/TextRenderComponent.h"
#include "DojoP5DrillDummy.h"
#include "TimerManager.h"

bool FDojoP5DrillOrder::CarryOut() const
{
	ADojoP5DrillDummy* Target = Dummy.Get();
	if (!IsValid(Target)) return false; // @explain: The order checks its dummy at the moment it runs, not when it was queued, because time has passed in between.

	switch (Move) // @explain: The order carries everything needed to act, the move and the target, so whoever runs it needs to know nothing else.
	{
	case EDojoP5DrillMove::EDM_StepLeft:
		Target->Step(-1);
		break;
	case EDojoP5DrillMove::EDM_StepRight:
		Target->Step(1);
		break;
	case EDojoP5DrillMove::EDM_Block:
		Target->Block();
		break;
	}

	return true;
}

ADojoP5DrillSergeant::ADojoP5DrillSergeant()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP5DrillSergeant::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
	GetWorldTimerManager().SetTimer(BeatTimer, this, &ADojoP5DrillSergeant::Beat, BeatSeconds, true); // @explain: The sergeant decides when orders run, on a steady beat, separately from when they were given.
}

void ADojoP5DrillSergeant::Order(ADojoP5DrillDummy* Dummy, EDojoP5DrillMove Move)
{
	if (!IsValid(Dummy)) return;

	FDojoP5DrillOrder NewOrder;
	NewOrder.Dummy = Dummy;
	NewOrder.Move = Move;
	Queue.Add(NewOrder); // @explain: Ordering only stores the request; nothing happens to the dummy until a beat carries it out.

	RefreshLabel();
}

void ADojoP5DrillSergeant::QueueRoutine()
{
	Order(FloorDummy, EDojoP5DrillMove::EDM_StepLeft);
	Order(FloorDummy, EDojoP5DrillMove::EDM_Block);
	Order(FloorDummy, EDojoP5DrillMove::EDM_StepRight);
	Order(FloorDummy, EDojoP5DrillMove::EDM_StepRight);
	Order(FloorDummy, EDojoP5DrillMove::EDM_Block);
}

void ADojoP5DrillSergeant::Beat()
{
	// Your code: take orders off the front of the queue one at a time. Drop any whose dummy is gone; carry out the first one whose dummy is still there, count it, and stop.

	RefreshLabel();
}

int32 ADojoP5DrillSergeant::GetOrdersWaiting() const
{
	return Queue.Num();
}

int32 ADojoP5DrillSergeant::GetOrdersCarriedOut() const
{
	return OrdersCarriedOut;
}

void ADojoP5DrillSergeant::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Orders waiting: %d"), Queue.Num())));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p5-drill-orders/DojoP5DrillDummy.h"
#include "Quests/p5-drill-orders/DojoP5DrillSergeant.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P5_DrillOrders_OrdersWaitForTheBeat, "Dojo.P5.DrillOrders.OrdersWaitForTheBeat", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Orders change nothing when given; each beat carries out exactly one, in the order they were given. */
bool FDojo_P5_DrillOrders_OrdersWaitForTheBeat::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP5DrillSergeant* Sergeant = TestWorld.SpawnActor<ADojoP5DrillSergeant>();
	ADojoP5DrillDummy* Dummy = TestWorld.SpawnActor<ADojoP5DrillDummy>();
	if (!TestNotNull(TEXT("Sergeant spawned"), Sergeant) || !TestNotNull(TEXT("Dummy spawned"), Dummy)) return false;

	Sergeant->Order(Dummy, EDojoP5DrillMove::EDM_StepRight);
	Sergeant->Order(Dummy, EDojoP5DrillMove::EDM_Block);
	Sergeant->Order(Dummy, EDojoP5DrillMove::EDM_StepLeft);

	TestEqual(TEXT("Three orders wait"), Sergeant->GetOrdersWaiting(), 3);
	TestEqual(TEXT("Giving orders moves nobody"), Dummy->GetLane(), 1);

	Sergeant->Beat();
	TestEqual(TEXT("Beat 1 steps right"), Dummy->GetLane(), 2);
	TestEqual(TEXT("Beat 1 has not blocked yet"), Dummy->GetBlocks(), 0);

	Sergeant->Beat();
	TestEqual(TEXT("Beat 2 blocks"), Dummy->GetBlocks(), 1);
	TestEqual(TEXT("Beat 2 does not step"), Dummy->GetLane(), 2);

	Sergeant->Beat();
	TestEqual(TEXT("Beat 3 steps left"), Dummy->GetLane(), 1);

	Sergeant->Beat();
	TestEqual(TEXT("An empty queue does nothing"), Sergeant->GetOrdersCarriedOut(), 3);
	TestEqual(TEXT("Nothing waits"), Sergeant->GetOrdersWaiting(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P5_DrillOrders_OneQueueManyDummies, "Dojo.P5.DrillOrders.OneQueueManyDummies", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** One queue holds orders for two dummies, and each order lands on the dummy it names. */
bool FDojo_P5_DrillOrders_OneQueueManyDummies::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP5DrillSergeant* Sergeant = TestWorld.SpawnActor<ADojoP5DrillSergeant>();
	ADojoP5DrillDummy* Red = TestWorld.SpawnActor<ADojoP5DrillDummy>();
	ADojoP5DrillDummy* Blue = TestWorld.SpawnActor<ADojoP5DrillDummy>();
	if (!TestNotNull(TEXT("Sergeant spawned"), Sergeant) || !TestNotNull(TEXT("Dummies spawned"), Red) || !TestNotNull(TEXT("Dummies spawned"), Blue)) return false;

	Sergeant->Order(Red, EDojoP5DrillMove::EDM_StepLeft);
	Sergeant->Order(Blue, EDojoP5DrillMove::EDM_Block);
	Sergeant->Order(Blue, EDojoP5DrillMove::EDM_StepRight);

	Sergeant->Beat();
	Sergeant->Beat();
	Sergeant->Beat();

	TestEqual(TEXT("Red stepped left"), Red->GetLane(), 0);
	TestEqual(TEXT("Red never blocked"), Red->GetBlocks(), 0);
	TestEqual(TEXT("Blue blocked once"), Blue->GetBlocks(), 1);
	TestEqual(TEXT("Blue stepped right"), Blue->GetLane(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P5_DrillOrders_OrdersForAGoneDummyAreDropped, "Dojo.P5.DrillOrders.OrdersForAGoneDummyAreDropped", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A dummy destroyed with orders still waiting: its orders are dropped and no beat is wasted on it. */
bool FDojo_P5_DrillOrders_OrdersForAGoneDummyAreDropped::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP5DrillSergeant* Sergeant = TestWorld.SpawnActor<ADojoP5DrillSergeant>();
	ADojoP5DrillDummy* Leaving = TestWorld.SpawnActor<ADojoP5DrillDummy>();
	ADojoP5DrillDummy* Staying = TestWorld.SpawnActor<ADojoP5DrillDummy>();
	if (!TestNotNull(TEXT("Sergeant spawned"), Sergeant) || !TestNotNull(TEXT("Dummies spawned"), Leaving) || !TestNotNull(TEXT("Dummies spawned"), Staying)) return false;

	Sergeant->Order(Leaving, EDojoP5DrillMove::EDM_Block);
	Sergeant->Order(Staying, EDojoP5DrillMove::EDM_Block);
	Sergeant->Order(Leaving, EDojoP5DrillMove::EDM_Block);
	Sergeant->Order(Staying, EDojoP5DrillMove::EDM_StepRight);

	Leaving->Destroy();

	Sergeant->Beat();
	TestEqual(TEXT("The first beat goes to the dummy still on the floor"), Staying->GetBlocks(), 1);

	Sergeant->Beat();
	TestEqual(TEXT("The second beat also goes to it"), Staying->GetLane(), 2);
	TestEqual(TEXT("Two orders were carried out"), Sergeant->GetOrdersCarriedOut(), 2);
	TestEqual(TEXT("The gone dummy's orders were dropped"), Sergeant->GetOrdersWaiting(), 0);

	return true;
}

#endif
```

# Hints

- The gap is a loop that ends in one of two ways: the queue runs out, or one order is carried out.
- CarryOut tells you whether the dummy was still there. Remove the front order before acting on what CarryOut returned, so a dropped order is gone either way.
- `TArray::RemoveAt` from `Containers/Array.h` removes the front order; copy it into a local first, because removing invalidates any reference to it.

# Rubric

- Ordering stores a value and changes nothing until a beat; each beat carries out at most one order, oldest first.
- Each order names its own dummy, so one queue can drive several dummies.
- Orders hold their dummy weakly and check it when they run; orders for a gone dummy are dropped without using a beat.
- No reference into the queue is held across a removal.
- The beat runs on a timer with an editable interval, not in Tick.

# Alternative

Each order could be a lambda, `TFunction<void()>`, captured with a weak pointer to its dummy, and the queue an array of functions. That is shorter and lets any code queue any action. The cost is that the queue can no longer be read: you cannot list the waiting orders on a debug screen, save them, send them over the network, or show them to a designer, because a function is opaque. A small struct naming the move and the target keeps every order inspectable, which is why the drill uses one.

# Parsons

```yaml
- id: drill-beat
  prompt: Put the heart of Beat in order.
  lines:
    - "	while (Queue.Num() > 0)"
    - "	{"
    - "		const FDojoP5DrillOrder Next = Queue[0];"
    - "		Queue.RemoveAt(0);"
    - "		if (Next.CarryOut())"
    - "		{"
    - "			OrdersCarriedOut++;"
    - "			break;"
    - "		}"
    - "	}"
  distractors:
    - line: "		const FDojoP5DrillOrder& Next = Queue[0];"
      mistake: A reference into the array points at memory that RemoveAt shifts, so after the removal it reads the wrong order.
- id: drill-carry-out
  prompt: Put the start of CarryOut in order.
  lines:
    - "bool FDojoP5DrillOrder::CarryOut() const"
    - "{"
    - "	ADojoP5DrillDummy* Target = Dummy.Get();"
    - "	if (!IsValid(Target)) return false;"
  distractors:
    - line: "	if (Target == nullptr) return true;"
      mistake: Returning true tells the sergeant the order was carried out, so a beat is spent on a dummy that is gone.
```
