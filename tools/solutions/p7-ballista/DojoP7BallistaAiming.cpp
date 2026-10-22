#include "DojoP7BallistaAiming.h"

#include "DojoP7Ballista.h"
#include "DojoP7BallistaIdle.h"
#include "DojoP7BallistaReloading.h"

void UDojoP7BallistaAiming::Enter(ADojoP7Ballista* Ballista)
{
	// The same Aiming object is reused every time, so a fresh aim must clear what the last one left behind.
	AimProgress = 0.f;
}

void UDojoP7BallistaAiming::TickState(ADojoP7Ballista* Ballista, float DeltaSeconds)
{
	AimProgress = FMath::Min(1.f, AimProgress + DeltaSeconds / Ballista->AimSeconds);
}

void UDojoP7BallistaAiming::OnTargetLost(ADojoP7Ballista* Ballista)
{
	Ballista->ChangeState(Ballista->IdleState);
}

void UDojoP7BallistaAiming::OnFireOrder(ADojoP7Ballista* Ballista)
{
	if (AimProgress < 1.f) return;

	Ballista->LaunchBolt();
	Ballista->ChangeState(Ballista->ReloadingState);
}

FString UDojoP7BallistaAiming::GetLabelText() const
{
	return FString::Printf(TEXT("Aiming %d%%"), FMath::RoundToInt(AimProgress * 100.f));
}

float UDojoP7BallistaAiming::GetAimProgress() const
{
	return AimProgress;
}
