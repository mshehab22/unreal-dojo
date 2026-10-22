#include "DojoP8NetLauncher.h"

ADojoP8NetLauncher::ADojoP8NetLauncher()
{
	CooldownSeconds = 4.f;
}

void ADojoP8NetLauncher::OnUnleash()
{
	DamageFightersInRadius(NetRadius, NetDamage);
	PlayCue(TEXT("Whoosh"));
}
