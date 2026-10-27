#include "DojoS1EquipmentSpy.h"

#include "DojoS1EquipmentComponent.h"

void UDojoS1EquipmentSpy::Watch(UDojoS1EquipmentComponent* Wearer)
{
	if (Wearer == nullptr)
	{
		return;
	}

	Wearer->OnEquipmentChanged.AddUniqueDynamic(this, &UDojoS1EquipmentSpy::HandleChanged);
}

int32 UDojoS1EquipmentSpy::GetNoticeCount() const
{
	return NoticeCount;
}

int32 UDojoS1EquipmentSpy::GetPowerAtLastNotice() const
{
	return PowerAtLastNotice;
}

void UDojoS1EquipmentSpy::HandleChanged(UDojoS1EquipmentComponent* Equipment)
{
	++NoticeCount;
	PowerAtLastNotice = Equipment->GetTotalPower();
}
