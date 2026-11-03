#include "DojoP20Turret.h"

#include "Components/SceneComponent.h"

ADojoP20Turret::ADojoP20Turret()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

FName ADojoP20Turret::PickTarget() const
{
	if (!IsValid(Rule)) return NAME_None;

	const int32 Index = Rule->ChooseTarget(GetActorLocation(), Candidates);
	return Candidates.IsValidIndex(Index) ? Candidates[Index].Name : NAME_None;
}

FName ADojoP20Turret::Fire()
{
	LastTarget = PickTarget();
	ShotCount++;
	return LastTarget;
}

FName ADojoP20Turret::GetLastTarget() const
{
	return LastTarget;
}

int32 ADojoP20Turret::GetShotCount() const
{
	return ShotCount;
}
