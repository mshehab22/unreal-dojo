#include "DojoP20Launcher.h"

#include "Components/SceneComponent.h"

ADojoP20Launcher::ADojoP20Launcher()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

FName ADojoP20Launcher::PickTarget() const
{
	if (!IsValid(Rule)) return NAME_None;

	const int32 Index = Rule->ChooseTarget(GetActorLocation(), Candidates);
	return Candidates.IsValidIndex(Index) ? Candidates[Index].Name : NAME_None;
}

FName ADojoP20Launcher::Fire()
{
	LastTarget = PickTarget(); // @explain: Fire asks PickTarget and never names a rule class, so a new rule needs no change here.
	ShotCount++;
	return LastTarget;
}

FName ADojoP20Launcher::GetLastTarget() const
{
	return LastTarget;
}

int32 ADojoP20Launcher::GetShotCount() const
{
	return ShotCount;
}
