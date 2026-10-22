#include "DojoP7BallistaIdle.h"

#include "DojoP7Ballista.h"
#include "DojoP7BallistaAiming.h"

void UDojoP7BallistaIdle::OnTargetSpotted(ADojoP7Ballista* Ballista)
{
	Ballista->ChangeState(Ballista->AimingState);
}

FString UDojoP7BallistaIdle::GetLabelText() const
{
	return TEXT("Idle");
}
