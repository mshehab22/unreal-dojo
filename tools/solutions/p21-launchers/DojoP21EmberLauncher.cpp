#include "DojoP21EmberLauncher.h"

#include "DojoP21EmberBolt.h"
#include "Engine/World.h"

ADojoP21Bolt* ADojoP21EmberLauncher::CreateBolt(const FTransform& Muzzle)
{
	return GetWorld()->SpawnActorDeferred<ADojoP21EmberBolt>(ADojoP21EmberBolt::StaticClass(), Muzzle); // @explain: A deferred spawn builds the bolt but holds back its begin play, so the launcher gets a window to set the shooter first and then finish it.
}
