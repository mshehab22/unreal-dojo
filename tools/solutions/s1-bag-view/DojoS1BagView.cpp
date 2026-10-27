#include "DojoS1BagView.h"

#include "Components/TextRenderComponent.h"
#include "Quests/s1-bag/DojoS1InventoryComponent.h"
#include "Quests/s1-equipment/DojoS1EquipmentComponent.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"

namespace
{
	/** The name of a worn item, or "none" for an empty slot. */
	FString WornName(const UDojoS1EquipmentComponent* Wearer, EDojoS1EquipSlot Slot)
	{
		const UDojoS1ItemData* Item = Wearer->GetEquipped(Slot);
		return Item != nullptr ? Item->DisplayName.ToString() : FString(TEXT("none"));
	}
}

ADojoS1BagView::ADojoS1BagView()
{
	PrimaryActorTick.bCanEverTick = false;

	Display = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Display"));
	RootComponent = Display;
}

void ADojoS1BagView::Show(UDojoS1InventoryComponent* Bag, UDojoS1EquipmentComponent* Wearer)
{
	StopListening();

	if (Bag == nullptr || Wearer == nullptr)
	{
		Refresh();
		return;
	}

	ShownBag = Bag;
	ShownEquipment = Wearer;
	ShownBag->OnInventoryChanged.AddUniqueDynamic(this, &ADojoS1BagView::HandleBagChanged);
	ShownEquipment->OnEquipmentChanged.AddUniqueDynamic(this, &ADojoS1BagView::HandleEquipmentChanged);
	Refresh();
}

void ADojoS1BagView::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	StopListening();

	Super::EndPlay(EndPlayReason);
}

void ADojoS1BagView::HandleBagChanged(UDojoS1InventoryComponent* Inventory)
{
	Refresh();
}

void ADojoS1BagView::HandleEquipmentChanged(UDojoS1EquipmentComponent* Equipment)
{
	Refresh();
}

void ADojoS1BagView::Refresh()
{
	if (ShownBag == nullptr || ShownEquipment == nullptr)
	{
		Display->SetText(FText::GetEmpty());
		return;
	}

	TArray<FString> Lines;
	Lines.Add(FString::Printf(TEXT("Weight %d/%d"), ShownBag->GetTotalWeight(), ShownBag->MaxWeight));

	const TArray<FDojoS1ItemStack> Piles = ShownBag->GetSlots();

	for (int32 Index = 0; Index < ShownBag->SlotCount; ++Index)
	{
		if (Piles.IsValidIndex(Index))
		{
			Lines.Add(FString::Printf(TEXT("%d. %s x%d"), Index + 1, *Piles[Index].Item->DisplayName.ToString(), Piles[Index].Count));
		}
		else
		{
			Lines.Add(FString::Printf(TEXT("%d. -"), Index + 1));
		}
	}

	Lines.Add(FString::Printf(TEXT("Head: %s"), *WornName(ShownEquipment, EDojoS1EquipSlot::EES_Head)));
	Lines.Add(FString::Printf(TEXT("Hand: %s"), *WornName(ShownEquipment, EDojoS1EquipSlot::EES_Hand)));
	Lines.Add(FString::Printf(TEXT("Power: %d"), ShownEquipment->GetTotalPower()));

	Display->SetText(FText::FromString(FString::Join(Lines, TEXT("\n"))));
}

void ADojoS1BagView::StopListening()
{
	if (ShownBag != nullptr)
	{
		ShownBag->OnInventoryChanged.RemoveDynamic(this, &ADojoS1BagView::HandleBagChanged);
	}

	if (ShownEquipment != nullptr)
	{
		ShownEquipment->OnEquipmentChanged.RemoveDynamic(this, &ADojoS1BagView::HandleEquipmentChanged);
	}

	ShownBag = nullptr;
	ShownEquipment = nullptr;
}
