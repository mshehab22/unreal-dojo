#include "DojoP8FlameJet.h"

void ADojoP8FlameJet::Trigger()
{
	PlayCue(TEXT("FlameRoar"));

	const int32 Singed = DamageFightersInRadius(FlameRadius, FlameDamage);

	if (Singed > 0) PushFightersAway(FlameRadius, PushDistance);
	else PlayCue(TEXT("FlameSputter"));
}
