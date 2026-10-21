#include "DojoExLanternSwitch.h"

#include "Components/PointLightComponent.h"
#include "Quests/example-build-worked-lantern/DojoExLantern.h"

ADojoExLanternSwitch::ADojoExLanternSwitch()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoExLanternSwitch::BeginPlay()
{
	Super::BeginPlay();

	ApplyToAll();
}

void ADojoExLanternSwitch::Toggle()
{
	bIsOn = !bIsOn;
	ApplyToAll();
}

bool ADojoExLanternSwitch::IsOn() const
{
	return bIsOn;
}

void ADojoExLanternSwitch::ApplyToAll()
{
	for (ADojoExLantern* Lantern : Lanterns)
	{
		if (!IsValid(Lantern)) continue;

		Lantern->Light->SetIntensity(bIsOn ? Lantern->Brightness : 0.f);
	}
}
