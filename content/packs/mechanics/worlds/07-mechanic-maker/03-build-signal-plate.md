---
id: m7-signal-plate
title: A plate that announces when it is pressed
order: 3
kind: build
scaffold: worked
difficulty: 2
patterns: [observer]
skills: [collision, delegates]
terms: [dynamic-multicast-delegate, broadcast, blueprintassignable, get-overlapping-actors, overlap-event, adddynamic]
prerequisites: [m7-pitch-and-pieces, m3-checkpoint, m3-scale-plate]
xp: 60
estimatedMinutes: 15
concepts:
  - A plate announces only the change between empty and occupied, not every arrival
  - One event type can carry the plate, so one listener can serve many plates
---

# Brief

When you place a signal plate with a lamp watching it and press Play, the plate reads 0 and the lamp DARK; a crate set on the plate makes it read 1 and lights the lamp, a runner joining makes it read 2 with no second press heard, and only when the last of them steps off does the plate read 0 and the lamp go DARK, having heard exactly one release.

Most of the code is written for you. Explain the marked lines, then fill the two gaps:

1. `ADojoM7SignalPlate::Recount`: once the count and the label are up to date, announce a press only when the plate has gone from empty to occupied, and a release only when it has gone back to empty. Each announcement carries the plate.
2. `ADojoM7PlateLamp::BeginPlay`: listen to the plate's press with `HandlePlatePressed` and to its release with `HandlePlateReleased`.

Why a new plate: the reuse audit from the last card. World 3's plate counts well but says nothing when its count changes, so anything that wanted to react would have to ask it every frame. This plate keeps World 3's way of counting and adds two events. The runner and the crate from World 3 are reused as they are.

Dependency direction: the plate holds no pointer to lamps or gates and only broadcasts; the lamp holds a pointer to its plate only to subscribe. Every announcement carries the plate, so one listener can watch many plates and still tell them apart.

This plate is the first piece of the Shrine Gate boss.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`) and m3-scale-plate (`Quests/m3-scale-plate/DojoM3Crate.h`), in the tests only.

## See it in the editor

Place a `DojoM7SignalPlate` at the origin and a `DojoM7PlateLamp` at Y 400, and set the lamp's Plate to the plate in Details. Place a `DojoM3Crate` at Y -800 and a `DojoM3Runner` at Y -500. Type `show Collision` and press Play: the plate reads 0 and the lamp DARK. In the level Blueprint, create a reference to the crate, the runner and the lamp (select each in the level, right-click the graph, and choose Create a Reference to it). On the 1 and 2 keys, add Set Actor Location for the crate to X -50, Y 0 and for the runner to X 50, Y 0; on the 3 and 4 keys, send each back where it started; on the 5 key, Print String the lamp's Get Presses and Get Releases. Press 1, 2, 3, 4, then 5: the lamp lit once and went dark once, though two things arrived and two left.

# Files

## DojoM7SignalPlate.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7SignalPlate.generated.h"

class ADojoM7SignalPlate; // @explain: The delegate below names the plate class before the class itself is declared, so it needs a forward declaration.
class UBoxComponent;
class UTextRenderComponent;

/** Broadcast when a plate changes between empty and occupied, with the plate that changed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM7OnPlateChanged, ADojoM7SignalPlate*, Plate); // @explain: One event type with one parameter, the plate, serves both the press and the release, and tells a listener which plate spoke.

/** A pressure plate that counts the things standing on it and announces only the changes between empty and occupied; it knows nothing about who listens. */
UCLASS()
class ADojoM7SignalPlate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the trigger zone as the root and the label above it. */
	ADojoM7SignalPlate();

	/** The space above the plate; whatever overlaps it stands on the plate. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Signal Plate")
	TObjectPtr<UBoxComponent> Zone;

	/** Floating text that shows how many things stand on the plate. */
	UPROPERTY(VisibleAnywhere, Category = "Signal Plate")
	TObjectPtr<UTextRenderComponent> Label;

	/** Fires when the first thing arrives on an empty plate. */
	UPROPERTY(BlueprintAssignable, Category = "Signal Plate")
	FDojoM7OnPlateChanged OnPlatePressed;

	/** Fires when the last thing leaves the plate. */
	UPROPERTY(BlueprintAssignable, Category = "Signal Plate")
	FDojoM7OnPlateChanged OnPlateReleased;

	/** True while at least one thing stands on the plate. */
	UFUNCTION(BlueprintPure, Category = "Signal Plate")
	bool IsPressed() const;

	/** How many things stand on the plate now. */
	UFUNCTION(BlueprintPure, Category = "Signal Plate")
	int32 GetCount() const;

protected:
	/** Starts listening to the zone and writes the first label. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Runs when a shape stops overlapping the zone. */
	UFUNCTION()
	void HandleZoneEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex);

	/** Brings Count up to date, refreshes the label, and announces a change between empty and occupied. */
	void Recount();

	/** How many actors other than the plate overlap the zone now, each counted once. */
	int32 CountThingsOnZone();

	/** How many things stood on the plate at the last recount. */
	int32 Count = 0;
};
```

## DojoM7SignalPlate.cpp

```cpp
#include "DojoM7SignalPlate.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM7SignalPlate::ADojoM7SignalPlate()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<UBoxComponent>(TEXT("Zone"));
	Zone->SetBoxExtent(FVector(100.f, 100.f, 100.f));
	Zone->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Zone;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Zone);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 150.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM7SignalPlate::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM7SignalPlate::HandleZoneBeginOverlap);
	Zone->OnComponentEndOverlap.AddDynamic(this, &ADojoM7SignalPlate::HandleZoneEndOverlap);
	Recount();
}

bool ADojoM7SignalPlate::IsPressed() const
{
	return Count > 0;
}

int32 ADojoM7SignalPlate::GetCount() const
{
	return Count;
}

void ADojoM7SignalPlate::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	Recount();
}

void ADojoM7SignalPlate::HandleZoneEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex)
{
	Recount();
}

void ADojoM7SignalPlate::Recount()
{
	const bool bWasPressed = IsPressed(); // @explain: The state before the recount is kept, because an announcement is about a change, and a change needs the old state and the new one.
	Count = CountThingsOnZone();
	Label->SetText(FText::AsNumber(Count));

	// Your code: announce a press only on the change from empty to occupied, and a release only on the change back to empty, each with this plate.
}

int32 ADojoM7SignalPlate::CountThingsOnZone()
{
	TArray<AActor*> OnPlate;
	Zone->GetOverlappingActors(OnPlate); // @explain: The zone lists each overlapping actor once, so a crate whose body and handle both touch the zone still counts as one thing.
	OnPlate.Remove(this);
	return OnPlate.Num();
}
```

## DojoM7PlateLamp.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7PlateLamp.generated.h"

class ADojoM7SignalPlate;
class UTextRenderComponent;

/** A lamp that lights while its plate is pressed and counts the presses and releases it heard; it only subscribes, and the plate never knows it exists. */
UCLASS()
class ADojoM7PlateLamp : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label as the root and turns ticking off. */
	ADojoM7PlateLamp();

	/** Floating text that reads LIT or DARK. */
	UPROPERTY(VisibleAnywhere, Category = "Plate Lamp")
	TObjectPtr<UTextRenderComponent> Label;

	/** The plate this lamp follows; set it in Details. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Plate Lamp")
	TObjectPtr<ADojoM7SignalPlate> Plate;

	/** True between a press and the next release. */
	UFUNCTION(BlueprintPure, Category = "Plate Lamp")
	bool IsLit() const;

	/** How many presses the lamp has heard. */
	UFUNCTION(BlueprintPure, Category = "Plate Lamp")
	int32 GetPresses() const;

	/** How many releases the lamp has heard. */
	UFUNCTION(BlueprintPure, Category = "Plate Lamp")
	int32 GetReleases() const;

	/** The plate named by the last press or release the lamp heard, or null before any. */
	UFUNCTION(BlueprintPure, Category = "Plate Lamp")
	ADojoM7SignalPlate* GetLastPlate() const;

protected:
	/** Starts in the plate's current state, subscribes to its events, and writes the first label. */
	virtual void BeginPlay() override;

private:
	/** Lights the lamp and counts the press. */
	UFUNCTION() // @explain: A dynamic delegate finds its handler by name through reflection, so every handler bound to it must be a UFUNCTION.
	void HandlePlatePressed(ADojoM7SignalPlate* ChangedPlate);

	/** Darkens the lamp and counts the release. */
	UFUNCTION()
	void HandlePlateReleased(ADojoM7SignalPlate* ChangedPlate);

	/** Writes LIT or DARK. */
	void RefreshLabel();

	bool bLit = false;

	int32 Presses = 0;

	int32 Releases = 0;

	/** The plate the last announcement carried. */
	UPROPERTY()
	TObjectPtr<ADojoM7SignalPlate> LastPlate;
};
```

## DojoM7PlateLamp.cpp

```cpp
#include "DojoM7PlateLamp.h"

#include "Components/TextRenderComponent.h"
#include "DojoM7SignalPlate.h"

ADojoM7PlateLamp::ADojoM7PlateLamp()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM7PlateLamp::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(Plate))
	{
		bLit = Plate->IsPressed();

		// Your code: listen to the plate's press with HandlePlatePressed and to its release with HandlePlateReleased.
	}

	RefreshLabel();
}

bool ADojoM7PlateLamp::IsLit() const
{
	return bLit;
}

int32 ADojoM7PlateLamp::GetPresses() const
{
	return Presses;
}

int32 ADojoM7PlateLamp::GetReleases() const
{
	return Releases;
}

ADojoM7SignalPlate* ADojoM7PlateLamp::GetLastPlate() const
{
	return LastPlate;
}

void ADojoM7PlateLamp::HandlePlatePressed(ADojoM7SignalPlate* ChangedPlate)
{
	LastPlate = ChangedPlate;
	bLit = true;
	Presses++;
	RefreshLabel();
}

void ADojoM7PlateLamp::HandlePlateReleased(ADojoM7SignalPlate* ChangedPlate)
{
	LastPlate = ChangedPlate;
	bLit = false;
	Releases++;
	RefreshLabel();
}

void ADojoM7PlateLamp::RefreshLabel()
{
	Label->SetText(FText::FromString(bLit ? TEXT("LIT") : TEXT("DARK")));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"
#include "Quests/m7-signal-plate/DojoM7PlateLamp.h"
#include "Quests/m7-signal-plate/DojoM7SignalPlate.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM7SignalPlateTest
{
	/** Spawns an actor of a quest class at a spot. */
	template<typename TActor>
	TActor* SpawnAt(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<TActor>(Where, FRotator::ZeroRotator);
	}

	/** Spawns a lamp that follows the plate, the way a designer sets Plate in Details. */
	ADojoM7PlateLamp* PlaceLamp(FDojoTestWorld& TestWorld, ADojoM7SignalPlate* Followed, const FVector& Where)
	{
		const FTransform Spot(Where);
		ADojoM7PlateLamp* Lamp = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM7PlateLamp>(ADojoM7PlateLamp::StaticClass(), Spot);
		Lamp->Plate = Followed;
		Lamp->FinishSpawning(Spot);
		return Lamp;
	}

	/** The plate's label text. */
	FString LabelOf(const ADojoM7SignalPlate* Plate)
	{
		return Plate->Label->Text.ToString();
	}

	/** The lamp's label text. */
	FString LabelOf(const ADojoM7PlateLamp* Lamp)
	{
		return Lamp->Label->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_SignalPlate_AnnouncesOnlyTheEdges, "Dojo.M7.SignalPlate.AnnouncesOnlyTheEdges", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Steps a crate and a runner on and off a plate and checks the lamp hears one press when the first arrives and one release when the last leaves. */
bool FDojo_M7_SignalPlate_AnnouncesOnlyTheEdges::RunTest(const FString& Parameters)
{
	using namespace DojoM7SignalPlateTest;

	FDojoTestWorld TestWorld;

	ADojoM7SignalPlate* Plate = SpawnAt<ADojoM7SignalPlate>(TestWorld, FVector(0.0, 1000.0, 0.0));
	ADojoM7PlateLamp* Lamp = PlaceLamp(TestWorld, Plate, FVector(0.0, 1400.0, 0.0));
	ADojoM3Crate* Crate = SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, -1000.0, 0.0));
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector(300.0, -1000.0, 0.0));
	if (!TestNotNull(TEXT("Plate, lamp, crate, and runner spawned"), Runner) || !Crate || !Lamp || !Plate) return false;

	TestEqual(TEXT("An empty plate reads 0"), LabelOf(Plate), FString(TEXT("0")));
	TestFalse(TEXT("An empty plate is not pressed"), Plate->IsPressed());
	TestEqual(TEXT("The lamp starts DARK"), LabelOf(Lamp), FString(TEXT("DARK")));

	Crate->SetActorLocation(FVector(-50.0, 1000.0, 0.0));
	TestEqual(TEXT("A crate on the plate counts as one thing"), Plate->GetCount(), 1);
	TestTrue(TEXT("and presses it"), Plate->IsPressed());
	TestEqual(TEXT("The lamp heard one press"), Lamp->GetPresses(), 1);
	TestTrue(TEXT("The press carried the plate itself"), Lamp->GetLastPlate() == Plate);
	TestEqual(TEXT("and reads LIT"), LabelOf(Lamp), FString(TEXT("LIT")));

	Runner->SetActorLocation(FVector(50.0, 1000.0, 0.0));
	TestEqual(TEXT("A runner joining makes two"), Plate->GetCount(), 2);
	TestEqual(TEXT("and the plate reads 2"), LabelOf(Plate), FString(TEXT("2")));
	TestEqual(TEXT("A second arrival is not a second press"), Lamp->GetPresses(), 1);

	Crate->SetActorLocation(FVector(0.0, -1000.0, 0.0));
	TestTrue(TEXT("With the crate gone and the runner still on, the plate stays pressed"), Plate->IsPressed());
	TestEqual(TEXT("and nothing was released"), Lamp->GetReleases(), 0);
	TestTrue(TEXT("so the lamp stays lit"), Lamp->IsLit());

	Runner->SetActorLocation(FVector(300.0, -1000.0, 0.0));
	TestFalse(TEXT("When the last one leaves, the plate is released"), Plate->IsPressed());
	TestEqual(TEXT("The lamp heard exactly one release"), Lamp->GetReleases(), 1);
	TestTrue(TEXT("The release carried the plate itself"), Lamp->GetLastPlate() == Plate);
	TestEqual(TEXT("and reads DARK"), LabelOf(Lamp), FString(TEXT("DARK")));
	TestEqual(TEXT("The plate reads 0 again"), LabelOf(Plate), FString(TEXT("0")));

	Crate->SetActorLocation(FVector(-50.0, 1000.0, 0.0));
	TestEqual(TEXT("Pressing again is a second press"), Lamp->GetPresses(), 2);
	TestEqual(TEXT("and still only one release"), Lamp->GetReleases(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_SignalPlate_EveryListenerHearsOnce, "Dojo.M7.SignalPlate.EveryListenerHearsOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Gives one plate two lamps and a neighbour plate one lamp, destroys a crate standing on the first plate, and checks who heard what. */
bool FDojo_M7_SignalPlate_EveryListenerHearsOnce::RunTest(const FString& Parameters)
{
	using namespace DojoM7SignalPlateTest;

	FDojoTestWorld TestWorld;

	ADojoM7SignalPlate* Plate = SpawnAt<ADojoM7SignalPlate>(TestWorld, FVector(0.0, 1000.0, 0.0));
	ADojoM7SignalPlate* Other = SpawnAt<ADojoM7SignalPlate>(TestWorld, FVector(0.0, 3000.0, 0.0));
	ADojoM7PlateLamp* First = PlaceLamp(TestWorld, Plate, FVector(0.0, 1400.0, 0.0));
	ADojoM7PlateLamp* Second = PlaceLamp(TestWorld, Plate, FVector(300.0, 1400.0, 0.0));
	ADojoM7PlateLamp* Elsewhere = PlaceLamp(TestWorld, Other, FVector(0.0, 3400.0, 0.0));
	ADojoM3Crate* Crate = SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, -1000.0, 0.0));
	if (!TestNotNull(TEXT("Plates, lamps, and crate spawned"), Crate) || !Elsewhere || !Second || !First || !Other || !Plate) return false;

	Crate->SetActorLocation(FVector(0.0, 1000.0, 0.0));
	TestEqual(TEXT("The first lamp heard the press"), First->GetPresses(), 1);
	TestEqual(TEXT("The second lamp on the same plate heard it too"), Second->GetPresses(), 1);
	TestEqual(TEXT("A lamp on another plate heard nothing"), Elsewhere->GetPresses(), 0);
	TestTrue(TEXT("The second lamp was told which plate was pressed"), Second->GetLastPlate() == Plate);

	Crate->Destroy();
	TestFalse(TEXT("A crate destroyed on the plate counts as leaving"), Plate->IsPressed());
	TestEqual(TEXT("The first lamp heard one release, though the crate had two shapes"), First->GetReleases(), 1);
	TestEqual(TEXT("The second lamp heard one release"), Second->GetReleases(), 1);
	TestEqual(TEXT("The lamp on the other plate still heard nothing"), Elsewhere->GetReleases(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_SignalPlate_BlueprintCanListen, "Dojo.M7.SignalPlate.BlueprintCanListen", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that Blueprints can bind to both plate events and read the plate's state. */
bool FDojo_M7_SignalPlate_BlueprintCanListen::RunTest(const FString& Parameters)
{
	for (const TCHAR* EventName : { TEXT("OnPlatePressed"), TEXT("OnPlateReleased") })
	{
		const FProperty* Event = ADojoM7SignalPlate::StaticClass()->FindPropertyByName(EventName);
		if (!TestNotNull(*FString::Printf(TEXT("%s is a UPROPERTY"), EventName), Event)) return false;
		TestTrue(*FString::Printf(TEXT("%s is a multicast delegate"), EventName), Event->IsA<FMulticastDelegateProperty>());
		TestTrue(*FString::Printf(TEXT("Blueprints can bind to %s"), EventName), Event->HasAnyPropertyFlags(CPF_BlueprintAssignable));
	}

	const UFunction* IsPressed = ADojoM7SignalPlate::StaticClass()->FindFunctionByName(TEXT("IsPressed"));
	if (!TestNotNull(TEXT("IsPressed is a UFUNCTION"), IsPressed)) return false;
	TestTrue(TEXT("IsPressed is BlueprintPure"), IsPressed->HasAnyFunctionFlags(FUNC_BlueprintPure));

	return true;
}

#endif
```

# Hints

- The old state is still in hand just before the count changes, so compare it with the new one.
- Each event is announced with the one value its type was declared with.
- In the lamp, give each event its own handler and bind them in a way that ignores a repeat, using what Pack 1's binding card taught.

# Rubric

- The plate fires its press event only when it goes from empty to occupied, and its release event only when it goes back to empty.
- Each announcement carries the plate itself, so one listener can tell plates apart.
- A crate counts as one thing, and something destroyed on the plate counts as leaving.
- The lamp binds both handlers, which are UFUNCTIONs with the event's exact parameter list.
- The plate holds no pointer to any listener; the lamp holds its plate only to subscribe.
- Both events are BlueprintAssignable, so a Blueprint can listen without C++.

# Alternative

The plate could broadcast one `OnCountChanged` with the new count on every arrival and departure, and let each listener decide what matters. That is more general (a scale that shows a number would want it), but every gate and lamp then repeats the same "was it zero, is it zero now" test, and a listener that gets it wrong opens on the second arrival. Announcing only the two edges puts that rule in one place, the plate, at the cost of a plate that cannot report counts to listeners; a listener that needs the count can still call `GetCount` when it hears an edge. The plate is the subject of an Observer, as in World 6: it announces, and lamps and gates subscribe.

# Parsons

```yaml
- id: plate-recount
  prompt: Put Recount in order.
  lines:
    - "void ADojoM7SignalPlate::Recount()"
    - "{"
    - "	const bool bWasPressed = IsPressed();"
    - "	Count = CountThingsOnZone();"
    - "	Label->SetText(FText::AsNumber(Count));"
    - "	if (bWasPressed == IsPressed()) return;"
    - "	if (IsPressed()) OnPlatePressed.Broadcast(this);"
    - "	else OnPlateReleased.Broadcast(this);"
    - "}"
  distractors:
    - line: "	OnPlatePressed.Broadcast();"
      mistake: The event type was declared with one parameter, the plate, so Broadcast must pass it.
    - line: "	Count++;"
      mistake: Adding one per arrival counts shapes, and a crate brings two shapes; the zone's list of overlapping actors counts each thing once.
```
