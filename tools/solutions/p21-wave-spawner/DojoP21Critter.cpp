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
	Health = HealthPerLevel * Level; // @explain: Health is worked out here, once, from whatever the level is at this moment, so a level given after begin play is too late to count.
}
