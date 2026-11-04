#include "DojoM8PowerLog.h"

#include "DojoM8Fuse.h"
#include "DojoM8FuseBox.h"

ADojoM8PowerLog::ADojoM8PowerLog()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM8PowerLog::Listen(ADojoM8FuseBox* Box)
{
	if (!IsValid(Box)) return;

	Box->OnPowered.AddUniqueDynamic(this, &ADojoM8PowerLog::HandlePowered);
}

void ADojoM8PowerLog::ListenToFuse(ADojoM8Fuse* Fuse)
{
	if (!IsValid(Fuse)) return;

	Fuse->OnCollected.AddUniqueDynamic(this, &ADojoM8PowerLog::HandleCollected);
}

int32 ADojoM8PowerLog::GetPoweredCount() const
{
	return PoweredCount;
}

int32 ADojoM8PowerLog::GetPickupCount() const
{
	return PickupCount;
}

int32 ADojoM8PowerLog::GetLateNotices() const
{
	return LateNotices;
}

void ADojoM8PowerLog::HandlePowered()
{
	PoweredCount++;
}

void ADojoM8PowerLog::HandleCollected(ADojoM8Fuse* Fuse, AActor* Collector)
{
	PickupCount++;
	if (!Fuse || Fuse->IsActorBeingDestroyed()) LateNotices++;
}
