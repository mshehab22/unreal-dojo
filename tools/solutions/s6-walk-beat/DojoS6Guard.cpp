#include "DojoS6Guard.h"

#include "AIController.h"
#include "Components/SceneComponent.h"

/** Gives the guard a root and has an AI controller possess it as soon as it is placed or spawned. */
ADojoS6Guard::ADojoS6Guard()
{
	PrimaryActorTick.bCanEverTick = false;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	AIControllerClass = AAIController::StaticClass();
	AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
}

/** Writes the next point of the beat into OutPoint; false when the beat is empty. */
bool ADojoS6Guard::GetNextPoint(FVector& OutPoint) const
{
	if (Beat.Num() == 0)
	{
		return false;
	}

	OutPoint = Beat[NextPointIndex % Beat.Num()];
	return true;
}

/** Moves on to the point after the next one, going back to the first after the last. */
void ADojoS6Guard::AdvancePoint()
{
	if (Beat.Num() == 0)
	{
		return;
	}

	NextPointIndex = (NextPointIndex + 1) % Beat.Num();
}

/** Which point of the beat comes next, counted from 0. */
int32 ADojoS6Guard::GetNextPointIndex() const
{
	return NextPointIndex;
}
