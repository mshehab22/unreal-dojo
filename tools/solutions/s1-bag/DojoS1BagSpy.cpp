#include "DojoS1BagSpy.h"

#include "DojoS1InventoryComponent.h"

void UDojoS1BagSpy::Watch(UDojoS1InventoryComponent* Bag)
{
	if (Bag == nullptr)
	{
		return;
	}

	Bag->OnInventoryChanged.AddUniqueDynamic(this, &UDojoS1BagSpy::HandleChanged);
}

int32 UDojoS1BagSpy::GetNoticeCount() const
{
	return NoticeCount;
}

int32 UDojoS1BagSpy::GetWeightAtLastNotice() const
{
	return WeightAtLastNotice;
}

void UDojoS1BagSpy::HandleChanged(UDojoS1InventoryComponent* Inventory)
{
	++NoticeCount;
	WeightAtLastNotice = Inventory->GetTotalWeight();
}
