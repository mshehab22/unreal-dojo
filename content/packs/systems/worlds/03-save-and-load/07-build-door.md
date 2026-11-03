---
id: s3-door
title: A door that survives a reload
order: 7
kind: build
scaffold: blank
difficulty: 3
patterns: [component]
skills: [saving, actors]
terms: [savegame-property, actor-component, createdefaultsubobject, frotator, uproperty]
prerequisites: [s3-save-system, s3-saveable, s3-save-record]
xp: 90
estimatedMinutes: 25
concepts:
  - An actor that is saveable by carrying the saveable component and marking one property
  - A door whose open state and swinging panel always agree
  - A door saved in one world and loaded into another
---

# Brief

When a door is opened and saved, and the checkpoint is loaded into a fresh level where the same door stands closed, that door is open there: `IsOpen` says so and its panel stands swung at a yaw of 90.

Write `ADojoS3Door` from nothing. The tests use this public interface, so keep these names:

- `UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> Panel;`, the part that swings, attached to the door's root. Its relative yaw is 90 when the door is open and 0 when it is closed.
- `UPROPERTY(VisibleAnywhere) TObjectPtr<UDojoS3SaveableComponent> Saveable;`, created in the constructor, so the door can be saved by its id.
- `void Open()`, `void Close()`, and `void Toggle()`, each a `UFUNCTION(BlueprintCallable)`, change the state and swing the panel to match; `bool IsOpen() const` and `float GetPanelYaw() const` answer about the present, and the tests read the panel's own rotation too.
- The open state is a `bool bOpen` marked `UPROPERTY(SaveGame)`, so the saveable component saves it.
- When play begins, the panel matches the state the door was placed with.

Compiles against earlier quests: s3-saveable (`Quests/s3-saveable/DojoS3SaveableComponent.h`), s3-save-system (`Quests/s3-save-system/DojoS3SaveSystem.h`), and s3-save-record (`Quests/s3-save-record/DojoS3SaveRecord.h`).

Dependency direction: the door owns its saveable component and its panel. The save system finds the door through the component and knows nothing else about it.

Write it the obvious way first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

This is the last piece of the Vault Checkpoint boss.

## See it in the editor

Place a `DojoS3Door` and set its Saveable's Save Id to `Door1`. In the level Blueprint, get the save subsystem with Get Dojo S3 Save System; on the 1 key call Toggle on the door, on the 2 key Save To Slot with `Gate`, and on the 3 key Load From Slot with `Gate`. Press Play, press 1 to open the door, 2 to save, and stop. Play again and press 3: the door swings open, the way it was when you saved.

# Files

## DojoS3Door.h

```cpp
// Declare ADojoS3Door here.
```

## DojoS3Door.cpp

```cpp
// Define ADojoS3Door here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Kismet/GameplayStatics.h"
#include "Quests/s3-door/DojoS3Door.h"
#include "Quests/s3-save-system/DojoS3SaveSystem.h"
#include "Quests/s3-saveable/DojoS3SaveableComponent.h"
#include "Support/DojoTestWorld.h"

namespace DojoS3DoorTest
{
	/** Places a door with a save id. */
	ADojoS3Door* PlaceDoor(FDojoTestWorld& TestWorld, const TCHAR* Id)
	{
		ADojoS3Door* Door = TestWorld.SpawnActor<ADojoS3Door>();

		if (Door != nullptr && Door->Saveable != nullptr)
		{
			Door->Saveable->SaveId = Id;
		}

		return Door;
	}

	/** The yaw the panel component itself stands at, relative to the door. */
	double PanelYaw(const ADojoS3Door* Door)
	{
		return Door->Panel != nullptr ? Door->Panel->GetRelativeRotation().Yaw : -1.0;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_Door_OpensAndCloses, "Dojo.S3.Door.OpensAndCloses", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Opens, toggles, and closes a door and checks the state and the panel agree at every step. */
bool FDojo_S3_Door_OpensAndCloses::RunTest(const FString& Parameters)
{
	using namespace DojoS3DoorTest;

	FDojoTestWorld TestWorld;
	ADojoS3Door* Door = PlaceDoor(TestWorld, TEXT("Door1"));
	if (!TestNotNull(TEXT("Door spawned"), Door)) return false;

	TestFalse(TEXT("A new door is closed"), Door->IsOpen());
	TestEqual(TEXT("A closed door's panel stands at 0"), PanelYaw(Door), 0.0, 0.5);

	Door->Open();
	TestTrue(TEXT("Open opens it"), Door->IsOpen());
	TestEqual(TEXT("An open door's panel stands at 90"), PanelYaw(Door), 90.0, 0.5);
	TestEqual(TEXT("GetPanelYaw reports the panel"), Door->GetPanelYaw(), 90.f, 0.5f);
	TestEqual(TEXT("The panel is what turned, not the door"), Door->GetActorRotation().Yaw, 0.0, 0.5);

	Door->Open();
	TestTrue(TEXT("Opening an open door keeps it open"), Door->IsOpen());

	Door->Toggle();
	TestFalse(TEXT("Toggle closes an open door"), Door->IsOpen());
	TestEqual(TEXT("The panel follows the toggle"), PanelYaw(Door), 0.0, 0.5);

	Door->Toggle();
	Door->Close();
	TestFalse(TEXT("Close closes it"), Door->IsOpen());
	TestEqual(TEXT("The panel follows the close"), PanelYaw(Door), 0.0, 0.5);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_Door_CopiedState, "Dojo.S3.Door.CopiedState", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Copies one door's saved state onto another through the saveable component, both ways. */
bool FDojo_S3_Door_CopiedState::RunTest(const FString& Parameters)
{
	using namespace DojoS3DoorTest;

	FDojoTestWorld TestWorld;
	ADojoS3Door* Source = PlaceDoor(TestWorld, TEXT("Door1"));
	ADojoS3Door* Copy = PlaceDoor(TestWorld, TEXT("Door2"));
	if (!TestNotNull(TEXT("Doors spawned"), Source) || !TestNotNull(TEXT("Second door spawned"), Copy)) return false;

	Source->Open();
	TestTrue(TEXT("The closed copy reads the open door's state"), Copy->Saveable->RestoreState(Source->Saveable->CaptureState()));
	TestTrue(TEXT("The copy is open"), Copy->IsOpen());
	TestEqual(TEXT("The copy's panel stands at 90"), PanelYaw(Copy), 90.0, 0.5);

	Source->Close();
	Copy->Saveable->RestoreState(Source->Saveable->CaptureState());
	TestFalse(TEXT("The copy closes from a closed door's state"), Copy->IsOpen());
	TestEqual(TEXT("The copy's panel is back at 0"), PanelYaw(Copy), 0.0, 0.5);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_Door_ThroughASlot, "Dojo.S3.Door.ThroughASlot", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Saves an open door in one world and loads it into a fresh world where the same door stands closed. */
bool FDojo_S3_Door_ThroughASlot::RunTest(const FString& Parameters)
{
	using namespace DojoS3DoorTest;

	const FString Slot = TEXT("DojoS3DoorTest");
	UGameplayStatics::DeleteGameInSlot(Slot, 0);

	{
		FDojoTestWorld FirstWorld;
		ADojoS3Door* Door = PlaceDoor(FirstWorld, TEXT("Door1"));
		if (!TestNotNull(TEXT("First door spawned"), Door)) return false;

		Door->Open();
		TestTrue(TEXT("The save works"), FirstWorld.GetWorld()->GetSubsystem<UDojoS3SaveSystem>()->SaveToSlot(Slot));
	}

	{
		FDojoTestWorld SecondWorld;
		ADojoS3Door* Door = PlaceDoor(SecondWorld, TEXT("Door1"));
		if (!TestNotNull(TEXT("Second door spawned"), Door)) return false;

		TestFalse(TEXT("The fresh door starts closed"), Door->IsOpen());
		TestTrue(TEXT("The load works"), SecondWorld.GetWorld()->GetSubsystem<UDojoS3SaveSystem>()->LoadFromSlot(Slot));
		TestTrue(TEXT("The loaded door is open"), Door->IsOpen());
		TestEqual(TEXT("The loaded door's panel stands at 90"), PanelYaw(Door), 90.0, 0.5);
	}

	UGameplayStatics::DeleteGameInSlot(Slot, 0);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_Door_Shape, "Dojo.S3.Door.Shape", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection and on placed doors that the parts and the saved flag are where the brief puts them, and that a door placed open starts open. */
bool FDojo_S3_Door_Shape::RunTest(const FString& Parameters)
{
	using namespace DojoS3DoorTest;

	FDojoTestWorld TestWorld;
	ADojoS3Door* Door = PlaceDoor(TestWorld, TEXT("Door1"));
	if (!TestNotNull(TEXT("Door spawned"), Door)) return false;

	TestNotNull(TEXT("The door has its saveable part"), Door->FindComponentByClass<UDojoS3SaveableComponent>());
	if (TestNotNull(TEXT("The door has a panel"), Door->Panel.Get()))
	{
		TestTrue(TEXT("The panel is attached to the root"), Door->Panel->GetAttachParent() == Door->GetRootComponent());
	}

	const FProperty* Open = ADojoS3Door::StaticClass()->FindPropertyByName(TEXT("bOpen"));
	if (TestNotNull(TEXT("bOpen is a UPROPERTY"), Open))
	{
		TestTrue(TEXT("bOpen is marked SaveGame"), Open->HasAnyPropertyFlags(CPF_SaveGame));
	}

	TestFalse(TEXT("The door does not tick"), Door->PrimaryActorTick.bCanEverTick);

	// A door a designer placed open: the flag is set before play begins, the way the Details panel would.
	ADojoS3Door* PlacedOpen = TestWorld.GetWorld()->SpawnActorDeferred<ADojoS3Door>(ADojoS3Door::StaticClass(), FTransform::Identity);
	const FBoolProperty* OpenFlag = CastField<FBoolProperty>(Open);
	if (TestNotNull(TEXT("A second door is being placed"), PlacedOpen) && TestNotNull(TEXT("bOpen is a bool"), OpenFlag))
	{
		OpenFlag->SetPropertyValue_InContainer(PlacedOpen, true);
		PlacedOpen->FinishSpawning(FTransform::Identity);
		TestTrue(TEXT("A door placed open is open"), PlacedOpen->IsOpen());
		TestEqual(TEXT("And its panel stands at 90 from the start"), PanelYaw(PlacedOpen), 90.0, 0.5);
	}

	return true;
}

#endif
```

# Hints

- Read the failing assertion: the door says it is open, and something about it says otherwise. Ask what happened to the door when the state came back, and what did not happen.
- Reading bytes into the door's SaveGame property sets the flag and calls none of the door's functions, so nothing swung the panel. The component already offers a way for an owner to hear that its state is back.
- Implement `IDojoS3Restorable` on the door (header `Quests/s3-saveable/DojoS3Restorable.h`) and override `OnRestoredFromSave_Implementation` to swing the panel from the restored flag, with the same function `Open` and `Close` use.

# Rubric

- The door carries a saveable component and marks only its open state SaveGame.
- `Open`, `Close`, and `Toggle` change the state and the panel together, and the panel turns, not the door.
- The state and the panel agree at every moment, including after the door is loaded into a fresh level.
- When play begins, the panel matches the state the door was placed with.
- The door knows nothing about slots or the save system; it is found through its component.

# Alternative

The door could skip the flag and save the panel's rotation itself, as a `UPROPERTY(SaveGame) FRotator PanelRotation` copied in and out. That saves exactly what is seen, but it ties the save to the look: change the swing to 110 degrees later and every old save opens the door to 90. Saving the meaning (open or closed) and deriving the look from it in one place keeps old saves correct when the art changes. That one place has to run on a load too: reading bytes sets the flag and runs none of the door's own code, which is why the first version showed an open door with a shut panel until the door listened for `OnRestoredFromSave`. A third option is to give the door no saved state at all and have a lever save whether it was pulled; that suits doors driven by switches, at the cost of a door that cannot be opened any other way. The door is one more owner for the saveable part, which is the Component pattern from Pack 2's "Actors built from parts" world at work: the saving code did not change to admit it.

# Parsons

```yaml
- id: door-constructor
  prompt: Put the door's constructor body in order.
  lines:
    - "PrimaryActorTick.bCanEverTick = false;"
    - "RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT(\"Frame\"));"
    - "Panel = CreateDefaultSubobject<USceneComponent>(TEXT(\"Panel\"));"
    - "Panel->SetupAttachment(RootComponent);"
    - "Saveable = CreateDefaultSubobject<UDojoS3SaveableComponent>(TEXT(\"Saveable\"));"
  distractors:
    - line: "Panel->AttachToComponent(RootComponent, FAttachmentTransformRules::KeepRelativeTransform);"
      mistake: AttachToComponent is for attaching at runtime; inside a constructor a default subobject is attached with SetupAttachment.
    - line: "Saveable = NewObject<UDojoS3SaveableComponent>(this);"
      mistake: A constructor makes its parts with CreateDefaultSubobject so they belong to the class defaults and every placed copy; NewObject is for runtime.
```
