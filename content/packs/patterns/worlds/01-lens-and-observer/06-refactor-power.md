---
id: p1-power-refactor
title: Unplug the generator from its devices
order: 6
kind: refactor
scaffold: stub
difficulty: 3
patterns: [observer]
skills: [delegates, observer, refactoring]
terms: [dynamic-multicast-delegate, blueprintassignable, adddynamic, unbinding-delegates, endplay, forward-declaration]
prerequisites: [p1-tutorial-sign]
xp: 90
estimatedMinutes: 25
concepts:
  - A subject that holds one list per listener type must change for every new listener
  - Turning those lists into one announcement reverses the dependency arrow without changing behavior
  - Each device's reaction moves out of the subject and into the device
---

# Brief

When you press Play and run `ke * Toggle` twice, the lamps still go ON and then OFF and the alarm still reads ALARM 1, exactly as before, but the generator no longer knows that lamps or alarms exist.

The starter works. Every behavior test passes on it. Read it first and count what the generator knows: a list of lamps, a list of alarms, both headers, and the alarm's own rule ("sound when power drops"). The lamp and the alarm each reach into the generator to add themselves to its lists, so every file includes every other. A designer has asked for a fan that spins while power is on. In this code that is a third list, a third include, and a third loop in the generator, plus one more class the generator's readers must load.

Refactor it into Observer:

- The generator announces every change of state through a dynamic multicast delegate in a `BlueprintAssignable` property named `OnPowerChanged`, carrying the new running state. Its lists of devices and its includes of their headers go away.
- Each device binds its own reaction in `ConnectTo` and removes it in `EndPlay`. Connecting the same device twice must still leave one binding, as it leaves one entry in the starter's lists. The rule "the alarm sounds when power drops" moves into the alarm.
- The public functions keep their names and meaning, so the behavior tests still read the same results.

Dependency direction after the refactor: the lamp and the alarm include the generator's header and bind themselves; the generator includes neither, and adding the fan touches only the fan.

## See it in the editor

Place a `DojoP1Generator`, two `DojoP1PowerLamp` actors, and one `DojoP1PowerAlarm`. On each lamp and the alarm pick the generator as their Generator in Details. Press Play: the generator reads STOPPED, the lamps OFF, the alarm Quiet. Run `ke * Toggle`: RUNNING and both lamps ON. Run it again: STOPPED, lamps OFF, alarm ALARM 1. After the refactor, add the generator's On Power Changed event in the Level Blueprint and print the value: it fires on every toggle, with no C++ change.

# Files

## DojoP1Generator.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1Generator.generated.h"

class ADojoP1PowerAlarm;
class ADojoP1PowerLamp;
class UTextRenderComponent;

/** A generator the player switches on and off; it tells every lamp and alarm wired to it. */
UCLASS()
class ADojoP1Generator : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1Generator();

	/** Floating text that shows RUNNING or STOPPED. */
	UPROPERTY(VisibleAnywhere, Category = "Power")
	TObjectPtr<UTextRenderComponent> Label;

	/** Lamps that connected themselves to this generator. */
	UPROPERTY(VisibleInstanceOnly, Category = "Power")
	TArray<TObjectPtr<ADojoP1PowerLamp>> Lamps;

	/** Alarms that connected themselves to this generator. */
	UPROPERTY(VisibleInstanceOnly, Category = "Power")
	TArray<TObjectPtr<ADojoP1PowerAlarm>> Alarms;

	/** Starts or stops the generator and updates every connected device; does nothing if the state is unchanged. */
	UFUNCTION(BlueprintCallable, Category = "Power")
	void SetRunning(bool bNewRunning);

	/** Flips between running and stopped. */
	UFUNCTION(BlueprintCallable, Category = "Power")
	void Toggle();

	/** True while the generator runs. */
	UFUNCTION(BlueprintPure, Category = "Power")
	bool IsRunning() const;

protected:
	/** Shows the starting state on the label. */
	virtual void BeginPlay() override;

private:
	/** Writes RUNNING or STOPPED into the label. */
	void RefreshLabel();

	bool bRunning = false;
};
```

## DojoP1Generator.cpp

```cpp
#include "DojoP1Generator.h"

#include "Components/TextRenderComponent.h"
#include "DojoP1PowerAlarm.h"
#include "DojoP1PowerLamp.h"

ADojoP1Generator::ADojoP1Generator()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1Generator::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP1Generator::SetRunning(bool bNewRunning)
{
	if (bNewRunning == bRunning) return;

	bRunning = bNewRunning;
	RefreshLabel();

	for (ADojoP1PowerLamp* Lamp : Lamps)
	{
		if (IsValid(Lamp)) Lamp->SetLit(bRunning);
	}

	for (ADojoP1PowerAlarm* Alarm : Alarms)
	{
		if (IsValid(Alarm) && !bRunning) Alarm->Sound();
	}
}

void ADojoP1Generator::Toggle()
{
	SetRunning(!bRunning);
}

bool ADojoP1Generator::IsRunning() const
{
	return bRunning;
}

void ADojoP1Generator::RefreshLabel()
{
	Label->SetText(FText::FromString(bRunning ? TEXT("RUNNING") : TEXT("STOPPED")));
}
```

## DojoP1PowerLamp.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1PowerLamp.generated.h"

class ADojoP1Generator;
class UTextRenderComponent;

/** A lamp that is lit while its generator runs. */
UCLASS()
class ADojoP1PowerLamp : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1PowerLamp();

	/** Floating text that shows ON or OFF. */
	UPROPERTY(VisibleAnywhere, Category = "Lamp")
	TObjectPtr<UTextRenderComponent> Label;

	/** The generator this lamp connects to when play starts, picked in the level. May be empty. */
	UPROPERTY(EditAnywhere, Category = "Lamp")
	TObjectPtr<ADojoP1Generator> Generator;

	/** Connects this lamp to a generator and matches its current state. */
	UFUNCTION(BlueprintCallable, Category = "Lamp")
	void ConnectTo(ADojoP1Generator* NewGenerator);

	/** Turns the lamp on or off. */
	UFUNCTION(BlueprintCallable, Category = "Lamp")
	void SetLit(bool bNewLit);

	/** True while the lamp is on. */
	UFUNCTION(BlueprintPure, Category = "Lamp")
	bool IsLit() const;

protected:
	/** Connects to the generator picked in the level, if any, and shows the starting state. */
	virtual void BeginPlay() override;

private:
	/** Writes ON or OFF into the label. */
	void RefreshLabel();

	bool bLit = false;
};
```

## DojoP1PowerLamp.cpp

```cpp
#include "DojoP1PowerLamp.h"

#include "Components/TextRenderComponent.h"
#include "DojoP1Generator.h"

ADojoP1PowerLamp::ADojoP1PowerLamp()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1PowerLamp::BeginPlay()
{
	Super::BeginPlay();

	ConnectTo(Generator);
	RefreshLabel();
}

void ADojoP1PowerLamp::ConnectTo(ADojoP1Generator* NewGenerator)
{
	if (!IsValid(NewGenerator)) return;

	NewGenerator->Lamps.AddUnique(this);
	SetLit(NewGenerator->IsRunning());
}

void ADojoP1PowerLamp::SetLit(bool bNewLit)
{
	bLit = bNewLit;
	RefreshLabel();
}

bool ADojoP1PowerLamp::IsLit() const
{
	return bLit;
}

void ADojoP1PowerLamp::RefreshLabel()
{
	Label->SetText(FText::FromString(bLit ? TEXT("ON") : TEXT("OFF")));
}
```

## DojoP1PowerAlarm.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1PowerAlarm.generated.h"

class ADojoP1Generator;
class UTextRenderComponent;

/** An alarm that sounds whenever its generator stops. */
UCLASS()
class ADojoP1PowerAlarm : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1PowerAlarm();

	/** Floating text that shows how often the alarm sounded. */
	UPROPERTY(VisibleAnywhere, Category = "Alarm")
	TObjectPtr<UTextRenderComponent> Label;

	/** The generator this alarm connects to when play starts, picked in the level. May be empty. */
	UPROPERTY(EditAnywhere, Category = "Alarm")
	TObjectPtr<ADojoP1Generator> Generator;

	/** Connects this alarm to a generator. */
	UFUNCTION(BlueprintCallable, Category = "Alarm")
	void ConnectTo(ADojoP1Generator* NewGenerator);

	/** Sounds the alarm once. */
	UFUNCTION(BlueprintCallable, Category = "Alarm")
	void Sound();

	/** How many times the alarm has sounded. */
	UFUNCTION(BlueprintPure, Category = "Alarm")
	int32 GetTimesSounded() const;

protected:
	/** Connects to the generator picked in the level, if any, and shows the starting state. */
	virtual void BeginPlay() override;

private:
	/** Writes Quiet, or ALARM and the count, into the label. */
	void RefreshLabel();

	int32 TimesSounded = 0;
};
```

## DojoP1PowerAlarm.cpp

```cpp
#include "DojoP1PowerAlarm.h"

#include "Components/TextRenderComponent.h"
#include "DojoP1Generator.h"

ADojoP1PowerAlarm::ADojoP1PowerAlarm()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1PowerAlarm::BeginPlay()
{
	Super::BeginPlay();

	ConnectTo(Generator);
	RefreshLabel();
}

void ADojoP1PowerAlarm::ConnectTo(ADojoP1Generator* NewGenerator)
{
	if (!IsValid(NewGenerator)) return;

	NewGenerator->Alarms.AddUnique(this);
}

void ADojoP1PowerAlarm::Sound()
{
	TimesSounded++;
	RefreshLabel();
}

int32 ADojoP1PowerAlarm::GetTimesSounded() const
{
	return TimesSounded;
}

void ADojoP1PowerAlarm::RefreshLabel()
{
	const FString Text = TimesSounded == 0 ? FString(TEXT("Quiet")) : FString::Printf(TEXT("ALARM %d"), TimesSounded);
	Label->SetText(FText::FromString(Text));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p1-power-refactor/DojoP1Generator.h"
#include "Quests/p1-power-refactor/DojoP1PowerAlarm.h"
#include "Quests/p1-power-refactor/DojoP1PowerLamp.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoP1PowerRefactorTest
{
	/** Spawns a device the way a level does: its generator is picked before BeginPlay runs. */
	template<typename TDevice>
	TDevice* SpawnDevice(FDojoTestWorld& TestWorld, ADojoP1Generator* Generator)
	{
		TDevice* Device = TestWorld.GetWorld()->SpawnActorDeferred<TDevice>(TDevice::StaticClass(), FTransform::Identity);
		if (!Device) return nullptr;

		Device->Generator = Generator;
		Device->FinishSpawning(FTransform::Identity);
		return Device;
	}

	/** True when a property is, or holds, a pointer to the given class or one of its children. */
	bool PropertyRefersTo(const FProperty* Property, const UClass* Class)
	{
		if (const FArrayProperty* ArrayProperty = CastField<FArrayProperty>(Property)) return PropertyRefersTo(ArrayProperty->Inner, Class);
		if (const FObjectPropertyBase* ObjectProperty = CastField<FObjectPropertyBase>(Property)) return ObjectProperty->PropertyClass && ObjectProperty->PropertyClass->IsChildOf(Class);
		return false;
	}

	/** The objects bound to the generator's OnPowerChanged, read through reflection, including any that were destroyed. */
	TArray<UObject*> BoundObjects(const FMulticastDelegateProperty* Property, ADojoP1Generator* Generator)
	{
		const FMulticastScriptDelegate* Delegate = Property->GetMulticastDelegate(Property->ContainerPtrToValuePtr<void>(Generator));
		return Delegate ? Delegate->GetAllObjectsEvenIfUnreachable() : TArray<UObject*>();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P1_PowerRefactor_BehaviorUnchanged, "Dojo.P1.PowerRefactor.BehaviorUnchanged", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Starts, stops, and toggles the generator and checks every device, the way the working starter already behaves. */
bool FDojo_P1_PowerRefactor_BehaviorUnchanged::RunTest(const FString& Parameters)
{
	using namespace DojoP1PowerRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP1Generator* Generator = TestWorld.SpawnActor<ADojoP1Generator>();
	if (!TestNotNull(TEXT("Generator spawned"), Generator)) return false;

	ADojoP1PowerLamp* Hall = SpawnDevice<ADojoP1PowerLamp>(TestWorld, Generator);
	ADojoP1PowerLamp* Yard = SpawnDevice<ADojoP1PowerLamp>(TestWorld, Generator);
	ADojoP1PowerAlarm* Alarm = SpawnDevice<ADojoP1PowerAlarm>(TestWorld, Generator);
	if (!TestNotNull(TEXT("Lamps spawned"), Hall) || !TestNotNull(TEXT("Lamps spawned"), Yard) || !TestNotNull(TEXT("Alarm spawned"), Alarm)) return false;

	TestFalse(TEXT("Lamps start off"), Hall->IsLit());

	Generator->SetRunning(true);
	TestTrue(TEXT("Starting the generator lights the hall"), Hall->IsLit());
	TestTrue(TEXT("Starting the generator lights the yard"), Yard->IsLit());
	TestEqual(TEXT("Starting does not sound the alarm"), Alarm->GetTimesSounded(), 0);

	ADojoP1PowerLamp* Late = SpawnDevice<ADojoP1PowerLamp>(TestWorld, Generator);
	if (!TestNotNull(TEXT("Late lamp spawned"), Late)) return false;
	TestTrue(TEXT("A lamp connected while running lights at once"), Late->IsLit());

	Generator->SetRunning(false);
	TestFalse(TEXT("Stopping darkens the hall"), Hall->IsLit());
	TestFalse(TEXT("Stopping darkens the late lamp"), Late->IsLit());
	TestEqual(TEXT("Stopping sounds the alarm once"), Alarm->GetTimesSounded(), 1);

	Generator->SetRunning(false);
	TestEqual(TEXT("Stopping a stopped generator changes nothing"), Alarm->GetTimesSounded(), 1);

	Generator->Toggle();
	TestTrue(TEXT("Toggle starts it again"), Generator->IsRunning());
	TestTrue(TEXT("The yard is lit again"), Yard->IsLit());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P1_PowerRefactor_GeneratorKnowsNoDevice, "Dojo.P1.PowerRefactor.GeneratorKnowsNoDevice", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Reflection check: the generator announces through a BlueprintAssignable OnPowerChanged and holds no property that points at a lamp or an alarm. */
bool FDojo_P1_PowerRefactor_GeneratorKnowsNoDevice::RunTest(const FString& Parameters)
{
	using namespace DojoP1PowerRefactorTest;

	const FMulticastDelegateProperty* PowerChanged = FindFProperty<FMulticastDelegateProperty>(ADojoP1Generator::StaticClass(), TEXT("OnPowerChanged"));
	if (!TestNotNull(TEXT("The generator has a reflected multicast delegate named OnPowerChanged"), PowerChanged)) return false;
	TestTrue(TEXT("OnPowerChanged is BlueprintAssignable"), PowerChanged->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	for (TFieldIterator<FProperty> It(ADojoP1Generator::StaticClass(), EFieldIteratorFlags::ExcludeSuper); It; ++It)
	{
		TestFalse(FString::Printf(TEXT("The generator's %s does not point at lamps"), *It->GetName()), PropertyRefersTo(*It, ADojoP1PowerLamp::StaticClass()));
		TestFalse(FString::Printf(TEXT("The generator's %s does not point at alarms"), *It->GetName()), PropertyRefersTo(*It, ADojoP1PowerAlarm::StaticClass()));
	}

	FDojoTestWorld TestWorld;

	ADojoP1Generator* Generator = TestWorld.SpawnActor<ADojoP1Generator>();
	ADojoP1PowerLamp* Lamp = SpawnDevice<ADojoP1PowerLamp>(TestWorld, Generator);
	if (!TestNotNull(TEXT("Generator spawned"), Generator) || !TestNotNull(TEXT("Lamp spawned"), Lamp)) return false;

	TestTrue(TEXT("The lamp bound itself to OnPowerChanged"), BoundObjects(PowerChanged, Generator).Contains(Lamp));

	Lamp->ConnectTo(Generator);
	TestEqual(TEXT("Connecting twice still leaves one binding"), BoundObjects(PowerChanged, Generator).Num(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P1_PowerRefactor_DestroyedDeviceLeaves, "Dojo.P1.PowerRefactor.DestroyedDeviceLeaves", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A destroyed lamp removes its own binding, and the alarm keeps working. */
bool FDojo_P1_PowerRefactor_DestroyedDeviceLeaves::RunTest(const FString& Parameters)
{
	using namespace DojoP1PowerRefactorTest;

	const FMulticastDelegateProperty* PowerChanged = FindFProperty<FMulticastDelegateProperty>(ADojoP1Generator::StaticClass(), TEXT("OnPowerChanged"));
	if (!TestNotNull(TEXT("The generator has a reflected multicast delegate named OnPowerChanged"), PowerChanged)) return false;

	FDojoTestWorld TestWorld;

	ADojoP1Generator* Generator = TestWorld.SpawnActor<ADojoP1Generator>();
	ADojoP1PowerLamp* Lamp = SpawnDevice<ADojoP1PowerLamp>(TestWorld, Generator);
	ADojoP1PowerAlarm* Alarm = SpawnDevice<ADojoP1PowerAlarm>(TestWorld, Generator);
	if (!TestNotNull(TEXT("Generator spawned"), Generator) || !TestNotNull(TEXT("Lamp spawned"), Lamp) || !TestNotNull(TEXT("Alarm spawned"), Alarm)) return false;

	Lamp->Destroy();

	const TArray<UObject*> Bound = BoundObjects(PowerChanged, Generator);
	TestFalse(TEXT("The destroyed lamp left no binding"), Bound.Contains(Lamp));
	TestTrue(TEXT("The alarm is still bound"), Bound.Contains(Alarm));

	Generator->SetRunning(true);
	Generator->SetRunning(false);
	TestEqual(TEXT("The alarm still sounds when power drops"), Alarm->GetTimesSounded(), 1);

	return true;
}

#endif
```

# Hints

- List what the generator does that is really the lamp's or the alarm's business; each of those lines moves into the device that owns it.
- The tutorial sign already showed the shape: a delegate declared above the subject, one Broadcast after the state changes, and on the device a UFUNCTION handler, a unique bind in ConnectTo, and a remove in EndPlay.
- The reflected delegate property the tests look for is an `FMulticastDelegateProperty`, which UHT only creates for a dynamic multicast delegate inside a UPROPERTY; its declaration macros are in `Delegates/DelegateCombinations.h`.

# Rubric

- The generator declares OnPowerChanged as a dynamic multicast delegate in a BlueprintAssignable UPROPERTY and broadcasts it once per real change, after updating its state.
- The generator has no device lists and includes neither device header; dependency direction runs from each device to the generator.
- The alarm's "sound when power drops" rule lives in the alarm's handler, not in the generator.
- Each device binds a UFUNCTION handler with AddUniqueDynamic in ConnectTo, so connecting twice binds once, and removes it in EndPlay.
- Behavior is unchanged: the same public functions give the same results, and a lamp connected while running lights at once.
- No dead code is left behind: the old lists, loops, and includes are deleted, not commented out.

# Alternative

A small interface, `IDojoP1PowerListener` with `OnPowerChanged(bool)`, and one list of `TScriptInterface` in the generator would also free the generator from lamps and alarms by name. It reads well when every listener truly is a power device, and the call is direct and cheap. The cost is that the generator still owns a list and a registration function, every listener must inherit the interface, and a Level Blueprint cannot listen without a new class. The delegate puts the list in the engine's hands and lets anything with a matching function listen, which is why Unreal code reaches for it first.
