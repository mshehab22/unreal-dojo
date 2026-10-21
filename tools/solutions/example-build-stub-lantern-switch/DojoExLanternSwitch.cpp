#include "DojoExLanternSwitch.h"

#include "Components/PointLightComponent.h"
#include "Quests/example-build-worked-lantern/DojoExLantern.h"

/** Turns ticking off; the switch only reacts to Toggle. */
ADojoExLanternSwitch::ADojoExLanternSwitch()
{
	PrimaryActorTick.bCanEverTick = false;
}

/** Applies the starting state to every wired lantern. */
void ADojoExLanternSwitch::BeginPlay()
{
	Super::BeginPlay();

	ApplyToAll();
}

/** Flips the switch and applies the new state to every lantern. */
void ADojoExLanternSwitch::Toggle()
{
	bIsOn = !bIsOn;
	ApplyToAll();
}

/** Whether the switch is currently on. */
bool ADojoExLanternSwitch::IsOn() const
{
	return bIsOn;
}

/** Sets every wired lantern's light to match the switch, skipping empty slots. */
void ADojoExLanternSwitch::ApplyToAll()
{
	for (ADojoExLantern* Lantern : Lanterns)
	{
		if (!IsValid(Lantern)) continue;

		Lantern->Light->SetIntensity(bIsOn ? Lantern->Brightness : 0.f);
	}
}
