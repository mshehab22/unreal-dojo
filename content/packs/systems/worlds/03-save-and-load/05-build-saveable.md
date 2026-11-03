---
id: s3-saveable
title: A component that saves its owner's marked properties
order: 5
kind: build
scaffold: faded
difficulty: 3
patterns: [component]
skills: [saving, components, interfaces]
terms: [savegame-property, actor-component, uinterface, iinterface, fname]
prerequisites: [s3-savegame-properties, s3-save-record, s1-item-data]
xp: 80
estimatedMinutes: 25
concepts:
  - One component that saves any actor it sits on, through the actor's SaveGame properties
  - Writing and reading with the same archive setup in both directions
  - Telling the owner, through an interface, that its state is back
---

# Brief

When a lantern that is lit with 4 oil and a red tint is captured, and a fresh lantern restores those bytes, the fresh lantern is lit with 4 oil, keeps its own white tint, and hears once that it was restored; empty bytes are refused and change nothing.

Compiles against earlier quests: s1-item-data (`Quests/s1-item-data/DojoS1WorldItem.h`), only for the tests. The component stands alone, so any actor can carry one; the tests prove it on the loose pile from World 1, `ADojoS1WorldItem`, which knows nothing about saving.

The constructor, the restorable interface, and a test lantern are written for you. Fill the two bodies that are left:

1. `CaptureState`: write the owner's SaveGame properties into the bytes it returns, and nothing else of the owner.
2. `RestoreState`: refuse empty bytes or a missing owner. Otherwise read the bytes back into the owner's SaveGame properties, then, if the owner implements `UDojoS3Restorable`, call its `OnRestoredFromSave` through the interface. Return whether the bytes were read.

`ADojoS3Lantern` has three SaveGame properties (`bLit`, `Oil`, and `Keeper`, a reference to another actor), one that is not (`Tint`), and counts how often it hears `OnRestoredFromSave`. The tests use it.

A first version could copy each field into a struct by hand: `State.bLit = Lantern->bLit;` and back. That works for one class and has to be written again for every other one; the archive reads the SaveGame marks through reflection, so the same two functions serve a lantern, a door, and anything later.

Dependency direction: the component points at its owner through `GetOwner` and knows nothing about records, slots, or who saves. The owner knows the interface, not the component's internals.

This is the second piece of the Vault Checkpoint boss.

## See it in the editor

Place a `DojoS3Lantern` and select it: its Saveable component shows a Save Id field; set it to `Lantern1`. In the level Blueprint, on the 1 key, call Capture State on its Saveable and keep the result in a variable; on the 2 key set the lantern's Lit to false and Oil to 0; on the 3 key call Restore State with the variable and print Lit and Oil. Press Play, press 1, 2, 3: it prints the values from when you pressed 1.

# Files

## DojoS3SaveableComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoS3SaveableComponent.generated.h"

/** Makes its owner saveable (the Component pattern): it names the owner with a save id and turns the owner's SaveGame properties into bytes and back, knowing nothing about slots or who saves. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS3SaveableComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the component only reacts to calls. */
	UDojoS3SaveableComponent();

	/** The name this actor is saved under; unique in the level, and the same every time the level loads. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Save")
	FName SaveId;

	/** The owner's SaveGame properties, written into bytes; empty when there is no owner. */
	UFUNCTION(BlueprintCallable, Category = "Save")
	TArray<uint8> CaptureState() const;

	/** Reads bytes from CaptureState back into the owner's SaveGame properties, then tells a restorable owner; false for empty bytes or no owner. */
	UFUNCTION(BlueprintCallable, Category = "Save")
	bool RestoreState(const TArray<uint8>& Bytes);
};
```

## DojoS3SaveableComponent.cpp

```cpp
#include "DojoS3SaveableComponent.h"

#include "DojoS3Restorable.h"
#include "GameFramework/Actor.h"
#include "Serialization/MemoryReader.h"
#include "Serialization/MemoryWriter.h"
#include "Serialization/ObjectAndNameAsStringProxyArchive.h"

UDojoS3SaveableComponent::UDojoS3SaveableComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

TArray<uint8> UDojoS3SaveableComponent::CaptureState() const
{
	TArray<uint8> Bytes;
	AActor* Owner = GetOwner();

	if (Owner == nullptr)
	{
		return Bytes;
	}

	// Your code: write the owner's SaveGame properties into Bytes: a memory writer over Bytes, wrapped in the proxy archive, with only SaveGame properties allowed through and every one of them written, even when it equals its default.
	return Bytes;
}

bool UDojoS3SaveableComponent::RestoreState(const TArray<uint8>& Bytes)
{
	// Your code: refuse when there is no owner or the bytes are empty.
	// Your code: read the bytes back into the owner's SaveGame properties, the same way they were written but with a memory reader.
	// Your code: if the owner implements UDojoS3Restorable, tell it through the interface that its state is back.
	return false;
}
```

## DojoS3Restorable.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "DojoS3Restorable.generated.h"

/** The reflected half of the restorable interface; it only exists so the engine can find the interface. */
UINTERFACE(Blueprintable)
class UDojoS3Restorable : public UInterface
{
	GENERATED_BODY()
};

/** An actor that wants to hear when its saved state has just been put back. */
class IDojoS3Restorable
{
	GENERATED_BODY()

public:
	/** Called after the actor's SaveGame properties were read back from a save. */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Save")
	void OnRestoredFromSave();
};
```

## DojoS3Lantern.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoS3Restorable.h"
#include "GameFramework/Actor.h"
#include "DojoS3Lantern.generated.h"

class UDojoS3SaveableComponent;

/** A lantern used to try saving: three properties are marked SaveGame and one is not, and it counts how often it was told it was restored. */
UCLASS()
class ADojoS3Lantern : public AActor, public IDojoS3Restorable
{
	GENERATED_BODY()

public:
	/** Creates the scene root and the saveable component and turns ticking off. */
	ADojoS3Lantern();

	/** The part that saves this lantern. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Lantern")
	TObjectPtr<UDojoS3SaveableComponent> Saveable;

	/** Whether the lantern is lit; saved. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, SaveGame, Category = "Lantern")
	bool bLit = false;

	/** Oil left; saved. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, SaveGame, Category = "Lantern")
	int32 Oil = 10;

	/** The actor that tends this lantern; saved as a reference, which only the proxy archive can write. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, SaveGame, Category = "Lantern")
	TObjectPtr<AActor> Keeper;

	/** The glass color; a look, not progress, so not saved. */
	UPROPERTY(EditAnywhere, Category = "Lantern")
	FLinearColor Tint = FLinearColor::White;

	/** How many times the lantern heard it was restored. */
	int32 RestoreCount = 0;

	/** The oil the lantern had when it last heard it was restored, or -1. */
	int32 OilWhenRestored = -1;

	/** Counts the restore and notes the oil at that moment. */
	virtual void OnRestoredFromSave_Implementation() override;
};
```

## DojoS3Lantern.cpp

```cpp
#include "DojoS3Lantern.h"

#include "Components/SceneComponent.h"
#include "DojoS3SaveableComponent.h"

ADojoS3Lantern::ADojoS3Lantern()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	Saveable = CreateDefaultSubobject<UDojoS3SaveableComponent>(TEXT("Saveable"));
}

void ADojoS3Lantern::OnRestoredFromSave_Implementation()
{
	++RestoreCount;
	OilWhenRestored = Oil;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s1-item-data/DojoS1WorldItem.h"
#include "Quests/s3-saveable/DojoS3Lantern.h"
#include "Quests/s3-saveable/DojoS3SaveableComponent.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_Saveable_OnlySaveGameTravels, "Dojo.S3.Saveable.OnlySaveGameTravels", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Captures a lit lantern and restores it into a fresh one, checking which properties travel and that the owner is told once. */
bool FDojo_S3_Saveable_OnlySaveGameTravels::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoS3Lantern* Source = TestWorld.SpawnActor<ADojoS3Lantern>();
	ADojoS3Lantern* Fresh = TestWorld.SpawnActor<ADojoS3Lantern>();
	if (!TestNotNull(TEXT("Lanterns spawned"), Source) || !TestNotNull(TEXT("Second lantern spawned"), Fresh)) return false;

	ADojoS3Lantern* KeeperActor = TestWorld.SpawnActor<ADojoS3Lantern>();
	Source->bLit = true;
	Source->Oil = 4;
	Source->Keeper = KeeperActor;
	Source->Tint = FLinearColor::Red;

	const TArray<uint8> Bytes = Source->Saveable->CaptureState();
	TestTrue(TEXT("Capturing writes some bytes"), Bytes.Num() > 0);
	TestEqual(TEXT("Capturing tells nobody anything"), Source->RestoreCount, 0);

	TestTrue(TEXT("The fresh lantern reads the bytes"), Fresh->Saveable->RestoreState(Bytes));
	TestTrue(TEXT("Lit came back"), Fresh->bLit);
	TestEqual(TEXT("Oil came back"), Fresh->Oil, 4);
	TestTrue(TEXT("The saved reference finds the same keeper again"), Fresh->Keeper == KeeperActor);
	TestTrue(TEXT("Tint is not saved, so the fresh lantern keeps its own"), Fresh->Tint.Equals(FLinearColor::White));
	TestEqual(TEXT("The fresh lantern heard once that it was restored"), Fresh->RestoreCount, 1);
	TestEqual(TEXT("When it heard, its oil was already back"), Fresh->OilWhenRestored, 4);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_Saveable_RestoreUndoesLaterChanges, "Dojo.S3.Saveable.RestoreUndoesLaterChanges", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Captures a lantern, changes it, and restores it, twice, checks the capture itself left the lantern alone, and restores a lantern saved at its default values. */
bool FDojo_S3_Saveable_RestoreUndoesLaterChanges::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoS3Lantern* Lantern = TestWorld.SpawnActor<ADojoS3Lantern>();
	if (!TestNotNull(TEXT("Lantern spawned"), Lantern)) return false;

	Lantern->bLit = true;
	Lantern->Oil = 7;
	const TArray<uint8> Bytes = Lantern->Saveable->CaptureState();
	TestTrue(TEXT("Capturing leaves the lantern lit"), Lantern->bLit);
	TestEqual(TEXT("Capturing leaves the oil"), Lantern->Oil, 7);

	ADojoS3Lantern* Plain = TestWorld.SpawnActor<ADojoS3Lantern>();
	const TArray<uint8> DefaultBytes = Plain->Saveable->CaptureState();
	Plain->bLit = true;
	Plain->Oil = 3;
	Plain->Saveable->RestoreState(DefaultBytes);
	TestFalse(TEXT("A lantern saved at its defaults goes out again"), Plain->bLit);
	TestEqual(TEXT("And its oil goes back to the default 10"), Plain->Oil, 10);

	for (int32 Pass = 1; Pass <= 2; ++Pass)
	{
		Lantern->bLit = false;
		Lantern->Oil = 0;
		Lantern->Tint = FLinearColor::Blue;

		TestTrue(FString::Printf(TEXT("Pass %d: the bytes are read"), Pass), Lantern->Saveable->RestoreState(Bytes));
		TestTrue(FString::Printf(TEXT("Pass %d: lit again"), Pass), Lantern->bLit);
		TestEqual(FString::Printf(TEXT("Pass %d: oil back to 7"), Pass), Lantern->Oil, 7);
		TestTrue(FString::Printf(TEXT("Pass %d: the tint change stays"), Pass), Lantern->Tint.Equals(FLinearColor::Blue));
		TestEqual(FString::Printf(TEXT("Pass %d: told once per restore"), Pass), Lantern->RestoreCount, Pass);
		TestEqual(FString::Printf(TEXT("Pass %d: told after the oil was back"), Pass), Lantern->OilWhenRestored, 7);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_Saveable_RefusesWhatItCannotRead, "Dojo.S3.Saveable.RefusesWhatItCannotRead", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Empty bytes and a missing owner are refused, and an owner without the interface still saves. */
bool FDojo_S3_Saveable_RefusesWhatItCannotRead::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoS3Lantern* Lantern = TestWorld.SpawnActor<ADojoS3Lantern>();
	if (!TestNotNull(TEXT("Lantern spawned"), Lantern)) return false;

	Lantern->bLit = true;
	TestFalse(TEXT("Empty bytes are refused"), Lantern->Saveable->RestoreState(TArray<uint8>()));
	TestTrue(TEXT("A refusal changes nothing"), Lantern->bLit);
	TestEqual(TEXT("A refusal tells nobody"), Lantern->RestoreCount, 0);

	UDojoS3SaveableComponent* Loose = NewObject<UDojoS3SaveableComponent>();
	TestEqual(TEXT("A component with no owner captures nothing"), Loose->CaptureState().Num(), 0);
	TestFalse(TEXT("A component with no owner restores nothing"), Loose->RestoreState({ 1, 2, 3 }));

	ADojoS1WorldItem* Pile = TestWorld.SpawnActor<ADojoS1WorldItem>();
	UDojoS3SaveableComponent* PileSaveable = TestWorld.AddComponent<UDojoS3SaveableComponent>(Pile);
	if (!TestNotNull(TEXT("World 1's pile got a saveable component"), PileSaveable)) return false;

	TestTrue(TEXT("An owner that is not restorable, World 1's pile, can still be restored"), PileSaveable->RestoreState(PileSaveable->CaptureState()));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_Saveable_DesignersSetIds, "Dojo.S3.Saveable.DesignersSetIds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that designers set the save id and which lantern properties are marked SaveGame. */
bool FDojo_S3_Saveable_DesignersSetIds::RunTest(const FString& Parameters)
{
	const FProperty* SaveId = UDojoS3SaveableComponent::StaticClass()->FindPropertyByName(TEXT("SaveId"));
	if (TestNotNull(TEXT("SaveId is a UPROPERTY"), SaveId))
	{
		TestTrue(TEXT("SaveId is editable in Details"), SaveId->HasAnyPropertyFlags(CPF_Edit));
	}

	TestFalse(TEXT("The component does not tick"), GetDefault<UDojoS3SaveableComponent>()->PrimaryComponentTick.bCanEverTick);

	TestTrue(TEXT("bLit is marked SaveGame"), ADojoS3Lantern::StaticClass()->FindPropertyByName(TEXT("bLit"))->HasAnyPropertyFlags(CPF_SaveGame));
	TestTrue(TEXT("Oil is marked SaveGame"), ADojoS3Lantern::StaticClass()->FindPropertyByName(TEXT("Oil"))->HasAnyPropertyFlags(CPF_SaveGame));
	TestFalse(TEXT("Tint is not"), ADojoS3Lantern::StaticClass()->FindPropertyByName(TEXT("Tint"))->HasAnyPropertyFlags(CPF_SaveGame));

	return true;
}

#endif
```

# Hints

- Both bodies build the same three things in the same order: a memory archive over the bytes, a proxy archive around it, and the flag that lets only SaveGame properties through. Only the first one differs between the two.
- `FMemoryWriter` and `FMemoryReader` take the byte array and `true` for a persistent archive; `FObjectAndNameAsStringProxyArchive` takes the inner archive and `true`; its `ArIsSaveGame` member is the SaveGame flag and `ArNoDelta` the write-every-value flag; `AActor::Serialize` takes the archive.
- `Implements<UDojoS3Restorable>()` asks whether an object implements the interface, and `IDojoS3Restorable::Execute_OnRestoredFromSave(Owner)` calls a BlueprintNativeEvent on it; the headers are `Serialization/MemoryReader.h` and `Serialization/ObjectAndNameAsStringProxyArchive.h`.

# Rubric

- `CaptureState` writes the owner's SaveGame properties, all of them and nothing else, and capturing changes nothing on the owner.
- `RestoreState` puts back exactly the SaveGame properties and leaves the others as they are.
- A restorable owner is told once per successful restore, through the interface, after its properties are back.
- Empty bytes and a missing owner are refused, and a refusal changes nothing and tells nobody.
- The component knows nothing about records, slots, or who saves; any actor can carry it.

# Alternative

The owner could implement two functions of its own, `WriteState(FDojoS3State&)` and `ReadState(const FDojoS3State&)`, copying each field into a struct. That gives each class full control and makes the saved format explicit, which helps when old saves must keep loading after the class changes, but every field is written twice and a new field forgotten in `WriteState` is silently never saved. The SaveGame mark puts the decision next to the property, and one component serves every class; the cost is that the bytes follow the property names, so a renamed property loses its old value unless you add a redirect. The component itself is the Component pattern from Pack 2's "Actors built from parts" world: one part, one job, any owner.

# Parsons

```yaml
- id: saveable-restore-tail
  prompt: Put the end of RestoreState in order, after the archive is set up.
  lines:
    - "Owner->Serialize(Archive);"
    - "if (Owner->Implements<UDojoS3Restorable>())"
    - "{"
    - "	IDojoS3Restorable::Execute_OnRestoredFromSave(Owner);"
    - "}"
    - "return true;"
  distractors:
    - line: "if (Owner->Implements<IDojoS3Restorable>())"
      mistake: Implements takes the reflected U class of the interface, UDojoS3Restorable; the I class is the C++ side that holds the functions.
    - line: "	Cast<IDojoS3Restorable>(Owner)->OnRestoredFromSave_Implementation();"
      mistake: Calling the native version directly skips a Blueprint override of the event and crashes on an owner that implements the interface only in Blueprint, where the cast returns null; Execute_ calls whichever version the owner has.
```
