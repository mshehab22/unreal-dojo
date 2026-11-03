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
}
