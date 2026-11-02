#include "DojoS1InventoryComponent.h"

#include "Quests/s1-item-data/DojoS1ItemData.h"

UDojoS1InventoryComponent::UDojoS1InventoryComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

int32 UDojoS1InventoryComponent::GetRoomFor(UDojoS1ItemData* Item) const
{
	if (Item == nullptr)
	{
		return 0;
	}

	int32 Room = FMath::Max(0, SlotCount - Slots.Num()) * Item->GetStackLimit();

	for (const FDojoS1ItemStack& Pile : Slots)
	{
		if (Pile.Item == Item)
		{
			Room += Pile.SpaceLeft();
		}
	}

	if (Item->Weight > 0)
	{
		Room = FMath::Min(Room, (MaxWeight - GetTotalWeight()) / Item->Weight);
	}

	return FMath::Max(0, Room);
}

int32 UDojoS1InventoryComponent::Add(UDojoS1ItemData* Item, int32 Count)
{
	const int32 ToAdd = FMath::Min(Count, GetRoomFor(Item));

	if (ToAdd <= 0)
	{
		return 0;
	}

	int32 Left = ToAdd;

	// Top up the piles of this item that already exist, in slot order.
	for (FDojoS1ItemStack& Pile : Slots)
	{
		if (Pile.Item != Item)
		{
			continue;
		}

		const int32 Moved = FMath::Min(Left, Pile.SpaceLeft());
		Pile.Count += Moved;
		Left -= Moved;
	}

	// Whatever is left opens new slots, one full pile at a time.
	while (Left > 0)
	{
		FDojoS1ItemStack NewPile;
		NewPile.Item = Item;
		NewPile.Count = FMath::Min(Left, Item->GetStackLimit());
		Slots.Add(NewPile);
		Left -= NewPile.Count;
	}

	OnInventoryChanged.Broadcast(this);
	return ToAdd;
}

int32 UDojoS1InventoryComponent::Remove(UDojoS1ItemData* Item, int32 Count)
{
	if (Item == nullptr || Count <= 0)
	{
		return 0;
	}

	int32 Left = Count;

	// Walk from the newest pile back, so the older piles stay full.
	for (int32 Index = Slots.Num() - 1; Index >= 0 && Left > 0; --Index)
	{
		if (Slots[Index].Item != Item)
		{
			continue;
		}

		const int32 Taken = FMath::Min(Left, Slots[Index].Count);
		Slots[Index].Count -= Taken;
		Left -= Taken;

		if (Slots[Index].Count == 0)
		{
			Slots.RemoveAt(Index);
		}
	}

	const int32 Removed = Count - Left;

	if (Removed > 0)
	{
		OnInventoryChanged.Broadcast(this);
	}

	return Removed;
}

int32 UDojoS1InventoryComponent::CountOf(UDojoS1ItemData* Item) const
{
	int32 Total = 0;

	for (const FDojoS1ItemStack& Pile : Slots)
	{
		if (Pile.Item == Item)
		{
			Total += Pile.Count;
		}
	}

	return Total;
}

int32 UDojoS1InventoryComponent::GetTotalWeight() const
{
	int32 Total = 0;

	for (const FDojoS1ItemStack& Pile : Slots)
	{
		if (Pile.Item != nullptr)
		{
			Total += Pile.Item->Weight * Pile.Count;
		}
	}

	return Total;
}

TArray<FDojoS1ItemStack> UDojoS1InventoryComponent::GetSlots() const
{
	return Slots;
}
