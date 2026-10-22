#include "DojoP7BallistaReloading.h"

#include "DojoP7Ballista.h"
#include "DojoP7BallistaAiming.h"
#include "DojoP7BallistaIdle.h"

void UDojoP7BallistaReloading::Enter(ADojoP7Ballista* Ballista)
{
	SecondsLeft = Ballista->ReloadSeconds;
}

void UDojoP7BallistaReloading::TickState(ADojoP7Ballista* Ballista, float DeltaSeconds)
{
	SecondsLeft -= DeltaSeconds;
	if (SecondsLeft > 0.f) return;

	if (Ballista->HasTarget()) Ballista->ChangeState(Ballista->AimingState);
	else Ballista->ChangeState(Ballista->IdleState);
}

FString UDojoP7BallistaReloading::GetLabelText() const
{
	return TEXT("Reloading");
}

float UDojoP7BallistaReloading::GetSecondsLeft() const
{
	return SecondsLeft;
}
