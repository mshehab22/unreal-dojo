---
id: p21-launchers
title: A launcher that never names its bolt
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [factory-method]
skills: [factory-method, spawning]
terms: [spawn-actor-deferred, spawnactor, abstract-specifier, uclass, tobjectptr]
prerequisites: [p21-ask-for-a-result]
xp: 60
estimatedMinutes: 20
concepts:
  - One Fire function in a base launcher asks a virtual function to make the bolt, and each kind of launcher answers with its own kind of bolt
  - A bolt spawned in deferred form can be given its shooter before it begins play, and is brought to life by finishing the spawn
  - The base launcher knows the bolt base class and nothing about ember or frost
  - A launcher that cannot make a bolt returns nothing and counts nothing
---

# Brief

When you press Play with the setup below, firing the ember launcher makes an ember bolt that hits for 12 and firing the frost launcher makes a frost bolt that hits for 7; each bolt appears 50 units in front of its launcher and already knows who shot it when it begins play; and a launcher that has run out of bolts returns nothing and counts no shot.

`ADojoP21Bolt` is the base of every bolt. It has a `Damage`, a `Shooter`, and a note, `bShooterKnownAtBeginPlay`, that it fills in at the moment it begins play. `ADojoP21EmberBolt` and `ADojoP21FrostBolt` set the damage. `ADojoP21Launcher` is the base of every launcher and cannot be placed in a level on its own: its `Fire` makes a bolt, hands it its shooter, and counts the shot, and it asks a virtual function, `CreateBolt`, which kind of bolt to make. The ember, frost, and dud launchers each answer that question for themselves. A `CreateBolt` returns a bolt that is built but has not begun play yet, so the caller has a moment to prepare it, or returns nothing.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `Fire`. It works out the muzzle, which is the launcher's rotation and a point `MuzzleDistance` units in front of the launcher, asks `CreateBolt` for a bolt at the muzzle, and gives up with `nullptr` when there is none. Otherwise it sets the bolt's `Shooter` to the launcher, brings the bolt to life, adds one to `ShotsFired`, and returns the bolt. `Fire` must not name `ADojoP21EmberBolt` or `ADojoP21FrostBolt`: the launcher base knows only what a bolt is.

## See it in the editor

Place a `DojoP21EmberLauncher`, a `DojoP21FrostLauncher`, and a `DojoP21DudLauncher` in the level, a few hundred units apart, all facing the same way. In the Level Blueprint, on Begin Play call Fire on each launcher and print the Damage of the bolt it returns: 12 and 7, and the dud returns nothing, so print Is Valid for it: false. Then print `Shots Fired` on each launcher: 1, 1, and 0. Select a bolt in the World Outliner: its `Shooter` names the launcher that made it, and `Shooter Known At Begin Play` is checked. Add a fourth launcher by making a Blueprint child of `DojoP21Launcher`: nothing in the class asks you to touch Fire.

# Files

## DojoP21Bolt.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP21Bolt.generated.h"

/** A bolt on the Ember Range: it knows who shot it and how hard it hits, and notes whether it knew the shooter when it began play. */
UCLASS()
class ADojoP21Bolt : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Bolt();

	/** How much health a critter loses when this bolt hits it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bolt")
	int32 Damage = 5;

	/** The launcher that made this bolt; set by the launcher before the bolt begins play. */
	UPROPERTY(BlueprintReadWrite, Category = "Bolt")
	TObjectPtr<AActor> Shooter;

	/** True when the shooter was already set at the moment this bolt began play. */
	UPROPERTY(BlueprintReadOnly, Category = "Bolt")
	bool bShooterKnownAtBeginPlay = false;

protected:
	/** Notes whether a shooter was set at this moment. */
	virtual void BeginPlay() override;
};
```

## DojoP21Bolt.cpp

```cpp
#include "DojoP21Bolt.h"

#include "Components/SceneComponent.h"

ADojoP21Bolt::ADojoP21Bolt()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP21Bolt::BeginPlay()
{
	Super::BeginPlay();

	bShooterKnownAtBeginPlay = IsValid(Shooter); // @explain: Begin play is the moment a bolt could first act on its shooter, so this note shows whether the launcher finished setting it up before then.
}
```

## DojoP21EmberBolt.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Bolt.h"
#include "DojoP21EmberBolt.generated.h"

/** A heavy bolt of fire that hits for 12. */
UCLASS()
class ADojoP21EmberBolt : public ADojoP21Bolt
{
	GENERATED_BODY()

public:
	/** Sets the ember damage. */
	ADojoP21EmberBolt();
};
```

## DojoP21EmberBolt.cpp

```cpp
#include "DojoP21EmberBolt.h"

ADojoP21EmberBolt::ADojoP21EmberBolt()
{
	Damage = 12;
}
```

## DojoP21FrostBolt.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Bolt.h"
#include "DojoP21FrostBolt.generated.h"

/** A light bolt of ice that hits for 7. */
UCLASS()
class ADojoP21FrostBolt : public ADojoP21Bolt
{
	GENERATED_BODY()

public:
	/** Sets the frost damage. */
	ADojoP21FrostBolt();
};
```

## DojoP21FrostBolt.cpp

```cpp
#include "DojoP21FrostBolt.h"

ADojoP21FrostBolt::ADojoP21FrostBolt()
{
	Damage = 7;
}
```

## DojoP21Launcher.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Bolt.h"
#include "GameFramework/Actor.h"
#include "DojoP21Launcher.generated.h"

/** The creator: it fires a bolt every time it is asked and leaves the choice of which kind of bolt to its subclasses. */
UCLASS(Abstract)
class ADojoP21Launcher : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Launcher();

	/** How far in front of the launcher a bolt appears. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Launcher")
	float MuzzleDistance = 50.f;

	/** How many bolts this launcher has fired. */
	UPROPERTY(BlueprintReadOnly, Category = "Launcher")
	int32 ShotsFired = 0;

	/** Fires one bolt from the muzzle and returns it, or returns nullptr and counts nothing when no bolt could be made. */
	UFUNCTION(BlueprintCallable, Category = "Launcher")
	ADojoP21Bolt* Fire();

protected:
	/** Makes one bolt at the muzzle, spawned but not yet begun play, or nullptr when it cannot. */
	virtual ADojoP21Bolt* CreateBolt(const FTransform& Muzzle) PURE_VIRTUAL(ADojoP21Launcher::CreateBolt, return nullptr;); // @explain: The base says that a bolt must be made here but not which kind; every subclass answers, and Fire never needs to know the answer.
};
```

## DojoP21Launcher.cpp

```cpp
#include "DojoP21Launcher.h"

#include "Components/SceneComponent.h"

ADojoP21Launcher::ADojoP21Launcher()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

ADojoP21Bolt* ADojoP21Launcher::Fire()
{
	return nullptr;
}
```

## DojoP21EmberLauncher.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Launcher.h"
#include "DojoP21EmberLauncher.generated.h"

/** A launcher whose bolts are always ember bolts. */
UCLASS()
class ADojoP21EmberLauncher : public ADojoP21Launcher
{
	GENERATED_BODY()

protected:
	/** Spawns an ember bolt at the muzzle and leaves it waiting for the launcher to finish it. */
	virtual ADojoP21Bolt* CreateBolt(const FTransform& Muzzle) override;
};
```

## DojoP21EmberLauncher.cpp

```cpp
#include "DojoP21EmberLauncher.h"

#include "DojoP21EmberBolt.h"
#include "Engine/World.h"

ADojoP21Bolt* ADojoP21EmberLauncher::CreateBolt(const FTransform& Muzzle)
{
	return GetWorld()->SpawnActorDeferred<ADojoP21EmberBolt>(ADojoP21EmberBolt::StaticClass(), Muzzle); // @explain: A deferred spawn builds the bolt but holds back its begin play, so the launcher gets a window to set the shooter first and then finish it.
}
```

## DojoP21FrostLauncher.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Launcher.h"
#include "DojoP21FrostLauncher.generated.h"

/** A launcher whose bolts are always frost bolts. */
UCLASS()
class ADojoP21FrostLauncher : public ADojoP21Launcher
{
	GENERATED_BODY()

protected:
	/** Spawns a frost bolt at the muzzle and leaves it waiting for the launcher to finish it. */
	virtual ADojoP21Bolt* CreateBolt(const FTransform& Muzzle) override;
};
```

## DojoP21FrostLauncher.cpp

```cpp
#include "DojoP21FrostLauncher.h"

#include "DojoP21FrostBolt.h"
#include "Engine/World.h"

ADojoP21Bolt* ADojoP21FrostLauncher::CreateBolt(const FTransform& Muzzle)
{
	return GetWorld()->SpawnActorDeferred<ADojoP21FrostBolt>(ADojoP21FrostBolt::StaticClass(), Muzzle);
}
```

## DojoP21DudLauncher.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Launcher.h"
#include "DojoP21DudLauncher.generated.h"

/** A launcher that is out of bolts and can never make one. */
UCLASS()
class ADojoP21DudLauncher : public ADojoP21Launcher
{
	GENERATED_BODY()

protected:
	/** Makes nothing. */
	virtual ADojoP21Bolt* CreateBolt(const FTransform& Muzzle) override;
};
```

## DojoP21DudLauncher.cpp

```cpp
#include "DojoP21DudLauncher.h"

ADojoP21Bolt* ADojoP21DudLauncher::CreateBolt(const FTransform& Muzzle)
{
	return nullptr; // @explain: A creator is allowed to fail, and the answer is nullptr, so a caller such as Fire has to check for it before it touches the result.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "EngineUtils.h"
#include "Quests/p21-launchers/DojoP21Bolt.h"
#include "Quests/p21-launchers/DojoP21DudLauncher.h"
#include "Quests/p21-launchers/DojoP21EmberBolt.h"
#include "Quests/p21-launchers/DojoP21EmberLauncher.h"
#include "Quests/p21-launchers/DojoP21FrostBolt.h"
#include "Quests/p21-launchers/DojoP21FrostLauncher.h"
#include "Support/DojoTestWorld.h"

namespace DojoP21LaunchersTest
{
	/** How many bolts of any kind exist in the world. */
	int32 CountBolts(UWorld* World)
	{
		int32 Count = 0;
		for (TActorIterator<ADojoP21Bolt> Iterator(World); Iterator; ++Iterator)
		{
			Count++;
		}
		return Count;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_Launchers_EachLauncherMakesItsOwnKind, "Dojo.P21.Launchers.EachLauncherMakesItsOwnKind", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** An ember launcher fires ember bolts and a frost launcher fires frost bolts, from the one Fire function the base provides. */
bool FDojo_P21_Launchers_EachLauncherMakesItsOwnKind::RunTest(const FString& Parameters)
{
	using namespace DojoP21LaunchersTest;

	FDojoTestWorld TestWorld;

	ADojoP21Launcher* Ember = TestWorld.SpawnActor<ADojoP21EmberLauncher>();
	ADojoP21Launcher* Frost = TestWorld.SpawnActor<ADojoP21FrostLauncher>();
	if (!TestNotNull(TEXT("Ember launcher spawned"), Ember) || !TestNotNull(TEXT("Frost launcher spawned"), Frost)) return false;

	ADojoP21Bolt* EmberShot = Ember->Fire();
	ADojoP21Bolt* FrostShot = Frost->Fire();
	if (!TestNotNull(TEXT("The ember launcher made a bolt"), EmberShot) || !TestNotNull(TEXT("The frost launcher made a bolt"), FrostShot)) return false;

	TestTrue(TEXT("The ember launcher's bolt is an ember bolt"), Cast<ADojoP21EmberBolt>(EmberShot) != nullptr);
	TestEqual(TEXT("It hits for 12"), EmberShot->Damage, 12);
	TestTrue(TEXT("The frost launcher's bolt is a frost bolt"), Cast<ADojoP21FrostBolt>(FrostShot) != nullptr);
	TestEqual(TEXT("It hits for 7"), FrostShot->Damage, 7);

	Ember->Fire();
	TestEqual(TEXT("The ember launcher counts two shots"), Ember->ShotsFired, 2);
	TestEqual(TEXT("The frost launcher counts only its own"), Frost->ShotsFired, 1);
	TestEqual(TEXT("Three bolts exist"), CountBolts(TestWorld.GetWorld()), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_Launchers_BoltIsReadyBeforeItBeginsPlay, "Dojo.P21.Launchers.BoltIsReadyBeforeItBeginsPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A fired bolt knows its shooter when it begins play, has begun play, and appears at the muzzle in front of the launcher. */
bool FDojo_P21_Launchers_BoltIsReadyBeforeItBeginsPlay::RunTest(const FString& Parameters)
{
	using namespace DojoP21LaunchersTest;

	FDojoTestWorld TestWorld;

	ADojoP21Launcher* Launcher = TestWorld.SpawnActor<ADojoP21EmberLauncher>();
	if (!TestNotNull(TEXT("Launcher spawned"), Launcher)) return false;
	Launcher->SetActorLocation(FVector(100.f, 0.f, 0.f));
	Launcher->SetActorRotation(FRotator(0.f, 90.f, 0.f));

	ADojoP21Bolt* Bolt = Launcher->Fire();
	if (!TestNotNull(TEXT("A bolt was made"), Bolt)) return false;

	TestTrue(TEXT("The bolt has begun play"), Bolt->HasActorBegunPlay());
	TestTrue(TEXT("The shooter is the launcher"), Bolt->Shooter == Launcher);
	TestTrue(TEXT("And the bolt already knew it when it began play"), Bolt->bShooterKnownAtBeginPlay);
	TestTrue(TEXT("The bolt appears 50 units in front of the launcher"), Bolt->GetActorLocation().Equals(FVector(100.f, 50.f, 0.f), 0.1f));
	TestTrue(TEXT("Facing the way the launcher faces"), FMath::IsNearlyEqual(Bolt->GetActorRotation().Yaw, 90.f, 0.1f));

	Launcher->MuzzleDistance = 120.f;
	ADojoP21Bolt* Far = Launcher->Fire();
	if (!TestNotNull(TEXT("A second bolt was made"), Far)) return false;
	TestTrue(TEXT("The muzzle distance is read each shot"), Far->GetActorLocation().Equals(FVector(100.f, 120.f, 0.f), 0.1f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_Launchers_SurvivesAFailedCreate, "Dojo.P21.Launchers.SurvivesAFailedCreate", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A launcher that cannot make a bolt returns nothing, counts nothing, and leaves no bolt behind. */
bool FDojo_P21_Launchers_SurvivesAFailedCreate::RunTest(const FString& Parameters)
{
	using namespace DojoP21LaunchersTest;

	FDojoTestWorld TestWorld;

	ADojoP21Launcher* Dud = TestWorld.SpawnActor<ADojoP21DudLauncher>();
	ADojoP21Launcher* Ember = TestWorld.SpawnActor<ADojoP21EmberLauncher>();
	if (!TestNotNull(TEXT("Dud launcher spawned"), Dud) || !TestNotNull(TEXT("Ember launcher spawned"), Ember)) return false;

	TestTrue(TEXT("Firing a dud returns nothing"), Dud->Fire() == nullptr);
	TestEqual(TEXT("And counts no shot"), Dud->ShotsFired, 0);
	TestEqual(TEXT("And no bolt exists"), CountBolts(TestWorld.GetWorld()), 0);

	TestTrue(TEXT("A working launcher still works afterwards"), Ember->Fire() != nullptr);
	TestEqual(TEXT("And counts its own shot"), Ember->ShotsFired, 1);
	TestEqual(TEXT("The dud still counts none"), Dud->ShotsFired, 0);

	return true;
}

#endif
```

# Hints

- `CreateBolt` hands back a bolt that has not begun play. What has to happen to it before it can act in the world, and what would be different if the launcher did that step first and set the shooter afterwards?
- The base launcher may call only what `ADojoP21Bolt` offers. Which line of `Fire` would stop compiling, or stop working for a new launcher, if it named one kind of bolt?
- The dud launcher answers `CreateBolt` with nothing. Which two things must `Fire` skip in that case, so the dud's count stays at zero?

# Rubric

- Fire asks CreateBolt for a bolt at the muzzle, which is the launcher's rotation and a point MuzzleDistance units in front of it.
- The shooter is set before the bolt is brought to life, so the bolt knows it when it begins play.
- A launcher that cannot make a bolt returns nullptr from Fire, counts no shot, and leaves no bolt in the world.
- Fire names only the base bolt type, so a new kind of launcher and bolt needs no change to the base launcher.
- Each launcher counts only its own shots.
- The base launcher knows the bolt base class; the bolts know the launcher only as an actor named Shooter.

# Alternative

The base launcher could hold a bolt class as a property and spawn it directly, with no virtual function at all. That is shorter, and it is what a later quest in this world builds, because for a class that only differs by data it is the better tool. A subclass per kind earns its place when making the bolt takes more than choosing a class: a launcher that fires three bolts in a fan, one that takes bolts from a pool, or one whose bolts need a different setup. Another alternative is to spawn the bolt already finished and set the shooter afterwards. That works until a bolt reads its shooter in `BeginPlay`, as this one does; then it silently sees nothing.

# Parsons

```yaml
- id: fire-the-bolt
  prompt: Put Fire in order. Its first line inside the braces works out the muzzle.
  lines:
    - "ADojoP21Bolt* ADojoP21Launcher::Fire()"
    - "{"
    - "	const FTransform Muzzle(GetActorRotation(), GetActorLocation() + GetActorForwardVector() * MuzzleDistance);"
    - "	ADojoP21Bolt* Bolt = CreateBolt(Muzzle);"
    - "	if (Bolt == nullptr) return nullptr;"
    - "	Bolt->Shooter = this;"
    - "	Bolt->FinishSpawning(Muzzle);"
    - "	ShotsFired++;"
    - "	return Bolt;"
    - "}"
  distractors:
    - line: "	Bolt->Shooter = Cast<ADojoP21EmberLauncher>(this);"
      mistake: The base launcher must not name one kind of launcher or bolt; assigning this as an actor is enough and keeps the base open to new kinds.
    - line: "	GetWorld()->SpawnActor<ADojoP21EmberBolt>(Muzzle);"
      mistake: Naming the ember bolt here makes every launcher fire embers and takes the choice away from the subclasses.
```
