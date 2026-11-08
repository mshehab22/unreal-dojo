#include "DojoP21CountingTurret.h"

#include "Engine/World.h"

ADojoP21Bolt* ADojoP21CountingTurret::MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle)
{
	MakeCalls++;
	AskedFor.Add(BoltClass);

	if (bRefuse) return nullptr;

	if (bSkipCounting)
	{
		ADojoP21Bolt* Bolt = GetWorld()->SpawnActorDeferred<ADojoP21Bolt>(BoltClass, Muzzle);
		if (Bolt == nullptr) return nullptr;

		Bolt->Shooter = this;
		Bolt->FinishSpawning(Muzzle);
		return Bolt;
	}

	return Super::MakeBolt(BoltClass, Muzzle);
}
