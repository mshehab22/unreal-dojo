#include "DojoP21Launcher.h"

#include "Components/SceneComponent.h"

ADojoP21Launcher::ADojoP21Launcher()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

ADojoP21Bolt* ADojoP21Launcher::Fire()
{
	const FTransform Muzzle(GetActorRotation(), GetActorLocation() + GetActorForwardVector() * MuzzleDistance);

	ADojoP21Bolt* Bolt = CreateBolt(Muzzle);
	if (Bolt == nullptr) return nullptr;

	Bolt->Shooter = this;
	Bolt->FinishSpawning(Muzzle);

	ShotsFired++;
	return Bolt;
}
