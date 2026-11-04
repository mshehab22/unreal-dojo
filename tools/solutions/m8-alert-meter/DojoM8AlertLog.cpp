#include "DojoM8AlertLog.h"

#include "DojoM8AlertMeter.h"

ADojoM8AlertLog::ADojoM8AlertLog()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM8AlertLog::Listen(ADojoM8AlertMeter* Meter)
{
	if (!IsValid(Meter)) return;

	Meter->OnCaught.AddUniqueDynamic(this, &ADojoM8AlertLog::HandleCaught);
}

int32 ADojoM8AlertLog::GetCaughtCount() const
{
	return CaughtCount;
}

void ADojoM8AlertLog::HandleCaught()
{
	CaughtCount++;
}
