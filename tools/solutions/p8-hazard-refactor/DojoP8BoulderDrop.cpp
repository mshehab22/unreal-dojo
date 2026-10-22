#include "DojoP8BoulderDrop.h"

ADojoP8BoulderDrop::ADojoP8BoulderDrop()
{
	CooldownSeconds = 3.f;
}

void ADojoP8BoulderDrop::OnUnleash()
{
	DamageFightersInRadius(DropRadius, DropDamage);
	PlayCue(TEXT("Rumble"));
}
