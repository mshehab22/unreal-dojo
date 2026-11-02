#include "DojoS1EquipmentComponent.h"

#include "Quests/s1-bag/DojoS1InventoryComponent.h"

UDojoS1EquipmentComponent::UDojoS1EquipmentComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoS1EquipmentComponent::UseBag(UDojoS1InventoryComponent* NewBag)
{
	Bag = NewBag;
}

bool UDojoS1EquipmentComponent::Equip(UDojoS1ItemData* Item)
{
	if (Item == nullptr || !Item->IsEquippable() || Bag == nullptr || Bag->CountOf(Item) == 0)
	{
		return false;
	}

	const EDojoS1EquipSlot Slot = Item->EquipSlot;
	UDojoS1ItemData* Replaced = GetEquipped(Slot);

	Bag->Remove(Item, 1);

	// The replaced item goes back where the new one came from; if it does not fit, undo the removal so nothing is lost.
	if (Replaced != nullptr && Bag->Add(Replaced, 1) == 0)
	{
		Bag->Add(Item, 1);
		return false;
	}

	Worn.Add(Slot, Item);
	OnEquipmentChanged.Broadcast(this);
	return true;
}

bool UDojoS1EquipmentComponent::Unequip(EDojoS1EquipSlot Slot)
{
	UDojoS1ItemData* Item = GetEquipped(Slot);

	if (Item == nullptr || Bag == nullptr || Bag->GetRoomFor(Item) == 0)
	{
		return false;
	}

	Worn.Remove(Slot);
	Bag->Add(Item, 1);
	OnEquipmentChanged.Broadcast(this);
	return true;
}

UDojoS1ItemData* UDojoS1EquipmentComponent::GetEquipped(EDojoS1EquipSlot Slot) const
{
	const TObjectPtr<UDojoS1ItemData>* Found = Worn.Find(Slot);
	return Found != nullptr ? Found->Get() : nullptr;
}

int32 UDojoS1EquipmentComponent::GetTotalPower() const
{
	int32 Total = 0;

	for (const TPair<EDojoS1EquipSlot, TObjectPtr<UDojoS1ItemData>>& Entry : Worn)
	{
		if (Entry.Value != nullptr)
		{
			Total += Entry.Value->PowerBonus;
		}
	}

	return Total;
}
