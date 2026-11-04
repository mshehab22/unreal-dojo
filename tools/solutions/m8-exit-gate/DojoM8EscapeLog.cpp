#include "DojoM8EscapeLog.h"

#include "DojoM8ExitGate.h"

ADojoM8EscapeLog::ADojoM8EscapeLog()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM8EscapeLog::Listen(ADojoM8ExitGate* Gate)
{
	if (!IsValid(Gate)) return;

	Gate->OnEscaped.AddUniqueDynamic(this, &ADojoM8EscapeLog::HandleEscaped);
}

int32 ADojoM8EscapeLog::GetEscapeCount() const
{
	return EscapeCount;
}

AActor* ADojoM8EscapeLog::GetLastEscapee() const
{
	return LastEscapee.Get();
}

void ADojoM8EscapeLog::HandleEscaped(AActor* Escapee)
{
	EscapeCount++;
	LastEscapee = Escapee;
}
