#include "DojoP12Blade.h"

#include "Components/SceneComponent.h"

ADojoP12Blade::ADojoP12Blade()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP12Blade::Park()
{
	SetActorHiddenInGame(true);
	SetActorEnableCollision(false);
}

void ADojoP12Blade::Wake()
{
	SetActorHiddenInGame(false);
	SetActorEnableCollision(true);
}

bool ADojoP12Blade::IsParked() const
{
	return IsHidden() && !GetActorEnableCollision();
}
