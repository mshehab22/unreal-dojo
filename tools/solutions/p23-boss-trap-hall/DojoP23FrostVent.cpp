#include "DojoP23FrostVent.h"

void ADojoP23FrostVent::Trigger()
{
	PlayCue(TEXT("FrostBurst"));
	DamageFightersInRadius(FrostRadius, FrostDamage);
}
