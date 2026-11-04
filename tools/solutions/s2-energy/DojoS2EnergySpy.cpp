#include "DojoS2EnergySpy.h"

#include "DojoS2EnergyComponent.h"

void UDojoS2EnergySpy::Watch(UDojoS2EnergyComponent* Pool)
{
	if (Pool == nullptr)
	{
		return;
	}

	Pool->OnEnergyChanged.AddUniqueDynamic(this, &UDojoS2EnergySpy::HandleChanged);
}

int32 UDojoS2EnergySpy::GetNoticeCount() const
{
	return NoticeCount;
}

int32 UDojoS2EnergySpy::GetEnergyAtLastNotice() const
{
	return EnergyAtLastNotice;
}

void UDojoS2EnergySpy::HandleChanged(UDojoS2EnergyComponent* EnergySource)
{
	++NoticeCount;
	EnergyAtLastNotice = EnergySource->GetEnergy();
}
