#include "DojoP21Critter.h"

#include "Components/SceneComponent.h"

ADojoP21Critter::ADojoP21Critter()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP21Critter::BeginPlay()
{
	Super::BeginPlay();

	LevelAtBeginPlay = Level;
	Health = HealthPerLevel * Level;
}
