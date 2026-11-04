#include "DojoP16RocketRack.h"

#include "Components/SceneComponent.h"
#include "DojoP16Rocket.h"
#include "Engine/World.h"

ADojoP16RocketRack::ADojoP16RocketRack()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	RocketClass = ADojoP16Rocket::StaticClass();
}

void ADojoP16RocketRack::BeginPlay()
{
	Super::BeginPlay();

	if (!RocketClass) return;

	for (int32 Index = 0; Index < RocketCount; ++Index)
	{
		ADojoP16Rocket* Rocket = GetWorld()->SpawnActor<ADojoP16Rocket>(RocketClass, GetActorLocation(), GetActorRotation());
		if (!Rocket) continue;

		Rocket->SetActorHiddenInGame(true);
		Rocket->SetActorEnableCollision(false);
		Rocket->SetActorTickEnabled(false);
		Resting.Add(Rocket);
	}
}

void ADojoP16RocketRack::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoP16Rocket* Rocket : Resting)
	{
		if (IsValid(Rocket)) Rocket->Destroy();
	}

	for (ADojoP16Rocket* Rocket : Lent)
	{
		if (IsValid(Rocket)) Rocket->Destroy();
	}

	Resting.Empty();
	Lent.Empty();

	Super::EndPlay(EndPlayReason);
}

ADojoP16Rocket* ADojoP16RocketRack::Acquire(const FVector& Where)
{
	if (Resting.Num() == 0) return nullptr;

	ADojoP16Rocket* Rocket = Resting.Pop();
	Lent.Add(Rocket);

	Rocket->ResetForLaunch();
	Rocket->SetActorLocation(Where);
	Rocket->SetActorHiddenInGame(false);
	Rocket->SetActorEnableCollision(true);
	Rocket->SetActorTickEnabled(true);
	return Rocket;
}

bool ADojoP16RocketRack::Release(ADojoP16Rocket* Rocket)
{
	if (!Lent.Contains(Rocket)) return false;

	Lent.Remove(Rocket);

	Rocket->SetActorHiddenInGame(true);
	Rocket->SetActorEnableCollision(false);
	Rocket->SetActorTickEnabled(false);
	Resting.Add(Rocket);
	return true;
}

int32 ADojoP16RocketRack::GetRestingCount() const
{
	return Resting.Num();
}

int32 ADojoP16RocketRack::GetLentCount() const
{
	return Lent.Num();
}
