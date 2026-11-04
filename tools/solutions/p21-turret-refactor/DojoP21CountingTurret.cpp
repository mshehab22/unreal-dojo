#include "DojoP21CountingTurret.h"

ADojoP21Bolt* ADojoP21CountingTurret::MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle)
{
	MakeCalls++;
	AskedFor.Add(BoltClass);

	if (bRefuse) return nullptr;

	return Super::MakeBolt(BoltClass, Muzzle);
}
