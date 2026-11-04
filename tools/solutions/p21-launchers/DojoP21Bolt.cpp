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
