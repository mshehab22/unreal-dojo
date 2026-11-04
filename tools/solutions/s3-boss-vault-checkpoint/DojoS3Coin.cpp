#include "DojoS3Coin.h"

#include "Components/SceneComponent.h"
#include "Quests/s3-saveable/DojoS3SaveableComponent.h"

ADojoS3Coin::ADojoS3Coin()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	Saveable = CreateDefaultSubobject<UDojoS3SaveableComponent>(TEXT("Saveable"));
}

int32 ADojoS3Coin::Take()
{
	if (IsActorBeingDestroyed())
	{
		return 0;
	}

	Destroy();
	return 1;
}
