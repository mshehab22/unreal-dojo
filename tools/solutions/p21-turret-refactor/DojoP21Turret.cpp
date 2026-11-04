#include "DojoP21Turret.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/p21-launchers/DojoP21EmberBolt.h"
#include "Quests/p21-launchers/DojoP21FrostBolt.h"

ADojoP21Turret::ADojoP21Turret()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

ADojoP21Bolt* ADojoP21Turret::FireEmber()
{
	const FTransform Muzzle(GetActorRotation(), GetActorLocation() + GetActorForwardVector() * MuzzleDistance);

	return MakeBolt(ADojoP21EmberBolt::StaticClass(), Muzzle);
}

ADojoP21Bolt* ADojoP21Turret::FireFrost()
{
	const FTransform Muzzle(GetActorRotation(), GetActorLocation() + GetActorForwardVector() * MuzzleDistance);

	return MakeBolt(ADojoP21FrostBolt::StaticClass(), Muzzle);
}

TArray<ADojoP21Bolt*> ADojoP21Turret::FireSpread()
{
	TArray<ADojoP21Bolt*> Fired;

	for (const float Offset : { -FanDegrees, 0.f, FanDegrees })
	{
		const FTransform Muzzle(GetActorRotation() + FRotator(0.f, Offset, 0.f), GetActorLocation() + GetActorForwardVector() * MuzzleDistance);
		ADojoP21Bolt* Bolt = MakeBolt(ADojoP21EmberBolt::StaticClass(), Muzzle);

		if (Bolt != nullptr)
		{
			Fired.Add(Bolt);
		}
	}

	return Fired;
}

ADojoP21Bolt* ADojoP21Turret::MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle)
{
	ADojoP21Bolt* Bolt = GetWorld()->SpawnActorDeferred<ADojoP21Bolt>(BoltClass, Muzzle);
	if (Bolt == nullptr) return nullptr;

	Bolt->Shooter = this;
	Bolt->FinishSpawning(Muzzle);

	ShotsFired++;
	return Bolt;
}
