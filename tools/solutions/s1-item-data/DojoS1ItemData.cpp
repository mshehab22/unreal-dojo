#include "DojoS1ItemData.h"

int32 UDojoS1ItemData::GetStackLimit() const
{
	return FMath::Max(1, MaxStack);
}

bool UDojoS1ItemData::IsEquippable() const
{
	return EquipSlot != EDojoS1EquipSlot::EES_None;
}

bool UDojoS1ItemData::IsConsumable() const
{
	return HealAmount > 0;
}
