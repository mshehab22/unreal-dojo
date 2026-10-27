#include "DojoF6Blaster.h"

#include "Components/SceneComponent.h"
#include "DojoF6WeaponData.h"

ADojoF6Blaster::ADojoF6Blaster()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoF6Blaster::BeginPlay()
{
	Super::BeginPlay();

	Reload();
}

float ADojoF6Blaster::Fire()
{
	if (!IsValid(Weapon) || Ammo <= 0) return 0.f;

	Ammo--;
	return Weapon->Damage;
}

void ADojoF6Blaster::Reload()
{
	Ammo = IsValid(Weapon) ? Weapon->ClipSize : 0;
}

void ADojoF6Blaster::SetWeapon(UDojoF6WeaponData* NewWeapon)
{
	Weapon = NewWeapon;
	Reload();
}

int32 ADojoF6Blaster::GetAmmo() const
{
	return Ammo;
}
