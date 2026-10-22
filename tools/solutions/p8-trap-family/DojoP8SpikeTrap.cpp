#include "DojoP8SpikeTrap.h"

void ADojoP8SpikeTrap::Trigger()
{
	PlayCue(TEXT("SpikesUp"));
	DamageFightersInRadius(SpikeRadius, SpikeDamage);
}
