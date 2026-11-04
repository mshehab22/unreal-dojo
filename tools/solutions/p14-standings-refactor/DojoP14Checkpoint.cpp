#include "DojoP14Checkpoint.h"

#include "Components/SceneComponent.h"
#include "DojoP14Standings.h"
#include "Engine/World.h"

ADojoP14Checkpoint::ADojoP14Checkpoint()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

bool ADojoP14Checkpoint::Touch(FName Driver)
{
	UDojoP14Standings* Standings = GetStandings();
	if (!Standings) return false;

	return Standings->Pass(Driver, Index);
}

UDojoP14Standings* ADojoP14Checkpoint::GetStandings() const
{
	const UWorld* World = GetWorld();
	if (!World) return nullptr;

	return World->GetSubsystem<UDojoP14Standings>();
}
