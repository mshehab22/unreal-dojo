#include "DojoS2RefillEffect.h"

#include "GameFramework/Actor.h"
#include "Quests/s2-energy/DojoS2EnergyComponent.h"

void UDojoS2RefillEffect::OnApply(AActor* User)
{
	// The only effect that touches energy reaches it through the user; a second one would earn a tool in the base.
	if (UDojoS2EnergyComponent* Pool = User->FindComponentByClass<UDojoS2EnergyComponent>())
	{
		Pool->Refill();
	}
}
