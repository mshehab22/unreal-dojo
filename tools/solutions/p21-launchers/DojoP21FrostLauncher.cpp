#include "DojoP21FrostLauncher.h"

#include "DojoP21FrostBolt.h"
#include "Engine/World.h"

ADojoP21Bolt* ADojoP21FrostLauncher::CreateBolt(const FTransform& Muzzle)
{
	return GetWorld()->SpawnActorDeferred<ADojoP21FrostBolt>(ADojoP21FrostBolt::StaticClass(), Muzzle);
}
