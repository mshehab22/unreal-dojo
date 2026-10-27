#include "DojoS1PackDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Quests/s1-bag-view/DojoS1BagView.h"
#include "Quests/s1-bag/DojoS1InventoryComponent.h"
#include "Quests/s1-equipment/DojoS1EquipmentComponent.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"
#include "Quests/s1-item-data/DojoS1WorldItem.h"

ADojoS1PackDirector::ADojoS1PackDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	RootComponent = Board;
}

void ADojoS1PackDirector::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Hero))
	{
		return;
	}

	HeroBag = Hero->FindComponentByClass<UDojoS1InventoryComponent>();
	HeroEquipment = Hero->FindComponentByClass<UDojoS1EquipmentComponent>();

	if (HeroBag == nullptr || HeroEquipment == nullptr)
	{
		return;
	}

	HeroBag->OnInventoryChanged.AddUniqueDynamic(this, &ADojoS1PackDirector::HandleInventoryChanged);
	HeroEquipment->OnEquipmentChanged.AddUniqueDynamic(this, &ADojoS1PackDirector::HandleEquipmentChanged);

	BagView = GetWorld()->SpawnActor<ADojoS1BagView>(GetActorLocation() + ViewOffset, FRotator::ZeroRotator);

	if (BagView != nullptr)
	{
		BagView->Show(HeroBag, HeroEquipment);
	}

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);

		for (const FKey& Key : { EKeys::E, EKeys::G, EKeys::U, EKeys::Q, EKeys::R, EKeys::One, EKeys::Two, EKeys::Three, EKeys::Four })
		{
			InputComponent->BindKey(Key, IE_Pressed, this, &ADojoS1PackDirector::HandleKey);
		}
	}

	StartRound();
}

void ADojoS1PackDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (HeroBag != nullptr)
	{
		HeroBag->OnInventoryChanged.RemoveDynamic(this, &ADojoS1PackDirector::HandleInventoryChanged);
	}

	if (HeroEquipment != nullptr)
	{
		HeroEquipment->OnEquipmentChanged.RemoveDynamic(this, &ADojoS1PackDirector::HandleEquipmentChanged);
	}

	if (IsValid(BagView))
	{
		BagView->Destroy();
	}

	Super::EndPlay(EndPlayReason);
}

void ADojoS1PackDirector::SelectSlot(int32 SlotIndex)
{
	SelectedSlot = FMath::Max(0, SlotIndex);
	RefreshBoard();
}

void ADojoS1PackDirector::PressPickUp()
{
	if (!bRunning || !IsValid(Hero) || HeroBag == nullptr)
	{
		return;
	}

	ADojoS1WorldItem* Nearest = nullptr;
	float NearestDistance = PickUpRange;

	for (ADojoS1WorldItem* Pile : WorldItems)
	{
		if (!IsValid(Pile))
		{
			continue;
		}

		const float Distance = FVector::Dist(Hero->GetActorLocation(), Pile->GetActorLocation());

		if (Distance <= PickUpRange && (Nearest == nullptr || Distance < NearestDistance))
		{
			Nearest = Pile;
			NearestDistance = Distance;
		}
	}

	if (Nearest == nullptr)
	{
		return;
	}

	// Take only what the bag accepted; the rest stays lying where it was.
	const int32 Accepted = HeroBag->Add(Nearest->GetItem(), Nearest->GetCount());
	Nearest->Take(Accepted);
}

void ADojoS1PackDirector::PressDrop()
{
	UDojoS1ItemData* Selected = GetSelectedItem();

	if (!bRunning || !IsValid(Hero) || Selected == nullptr || HeroBag->Remove(Selected, 1) == 0)
	{
		return;
	}

	SpawnPile(Selected, 1, Hero->GetActorLocation() + Hero->GetActorForwardVector() * DropDistance);
}

void ADojoS1PackDirector::PressUse()
{
	UDojoS1ItemData* Selected = GetSelectedItem();

	if (!bRunning || Selected == nullptr || !Selected->IsConsumable() || CurrentHealth >= MaxHealth)
	{
		return;
	}

	if (HeroBag->Remove(Selected, 1) == 0)
	{
		return;
	}

	CurrentHealth = FMath::Min(MaxHealth, CurrentHealth + Selected->HealAmount);
	RefreshBoard();
}

void ADojoS1PackDirector::PressEquip()
{
	UDojoS1ItemData* Selected = GetSelectedItem();

	if (!bRunning || Selected == nullptr || !Selected->IsEquippable())
	{
		return;
	}

	HeroEquipment->Equip(Selected);
}

void ADojoS1PackDirector::RestartRound()
{
	if (bRunning || HeroBag == nullptr || HeroEquipment == nullptr)
	{
		return;
	}

	StartRound();
}

bool ADojoS1PackDirector::IsRunning() const
{
	return bRunning;
}

float ADojoS1PackDirector::GetFinishSeconds() const
{
	return FinishSeconds;
}

int32 ADojoS1PackDirector::GetHealth() const
{
	return CurrentHealth;
}

UDojoS1ItemData* ADojoS1PackDirector::GetSelectedItem() const
{
	if (HeroBag == nullptr)
	{
		return nullptr;
	}

	const TArray<FDojoS1ItemStack> Piles = HeroBag->GetSlots();
	return Piles.IsValidIndex(SelectedSlot) ? Piles[SelectedSlot].Item.Get() : nullptr;
}

TArray<ADojoS1WorldItem*> ADojoS1PackDirector::GetWorldItems() const
{
	TArray<ADojoS1WorldItem*> Result;

	for (ADojoS1WorldItem* Pile : WorldItems)
	{
		if (IsValid(Pile))
		{
			Result.Add(Pile);
		}
	}

	return Result;
}

ADojoS1BagView* ADojoS1PackDirector::GetBagView() const
{
	return BagView;
}

void ADojoS1PackDirector::HandleInventoryChanged(UDojoS1InventoryComponent* Inventory)
{
	RefreshBoard();
}

void ADojoS1PackDirector::HandleEquipmentChanged(UDojoS1EquipmentComponent* Equipment)
{
	RefreshBoard();
}

void ADojoS1PackDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::E) PressPickUp();
	if (Key == EKeys::G) PressDrop();
	if (Key == EKeys::U) PressUse();
	if (Key == EKeys::Q) PressEquip();
	if (Key == EKeys::R) RestartRound();
	if (Key == EKeys::One) SelectSlot(0);
	if (Key == EKeys::Two) SelectSlot(1);
	if (Key == EKeys::Three) SelectSlot(2);
	if (Key == EKeys::Four) SelectSlot(3);
}

void ADojoS1PackDirector::StartRound()
{
	bRunning = false;
	bFinished = false;
	FinishSeconds = 0.f;

	for (ADojoS1WorldItem* Pile : WorldItems)
	{
		if (IsValid(Pile))
		{
			Pile->Destroy();
		}
	}

	WorldItems.Reset();
	ClearHero();

	CurrentHealth = FMath::Clamp(StartHealth, 0, MaxHealth);
	SelectedSlot = 0;

	for (const FDojoS1LootSpot& Spot : LootSpots)
	{
		SpawnPile(Spot.Item, Spot.Count, Spot.Location);
	}

	bRunning = true;
	StartSeconds = GetWorld()->GetTimeSeconds();
	RefreshBoard();
}

void ADojoS1PackDirector::ClearHero()
{
	// Empty the bag before each worn item comes off, so every one has room, and again after the last.
	EmptyBag();
	HeroEquipment->Unequip(EDojoS1EquipSlot::EES_Head);
	EmptyBag();
	HeroEquipment->Unequip(EDojoS1EquipSlot::EES_Hand);
	EmptyBag();
}

void ADojoS1PackDirector::EmptyBag()
{
	for (const FDojoS1ItemStack& Pile : HeroBag->GetSlots())
	{
		HeroBag->Remove(Pile.Item, Pile.Count);
	}
}

void ADojoS1PackDirector::SpawnPile(UDojoS1ItemData* Item, int32 Count, const FVector& Where)
{
	ADojoS1WorldItem* Pile = GetWorld()->SpawnActor<ADojoS1WorldItem>(Where, FRotator::ZeroRotator);

	if (Pile == nullptr)
	{
		return;
	}

	Pile->Setup(Item, Count);
	WorldItems.Add(Pile);
}

void ADojoS1PackDirector::RefreshBoard()
{
	if (HeroBag == nullptr || HeroEquipment == nullptr)
	{
		return;
	}

	if (bRunning && IsPackReady())
	{
		bRunning = false;
		bFinished = true;
		FinishSeconds = GetWorld()->GetTimeSeconds() - StartSeconds;
	}

	TArray<FString> Lines;
	Lines.Add(FString::Printf(TEXT("Health %d/%d"), CurrentHealth, MaxHealth));

	const TArray<FDojoS1ItemStack> Piles = HeroBag->GetSlots();

	if (Piles.IsValidIndex(SelectedSlot))
	{
		Lines.Add(FString::Printf(TEXT("Selected: %s x%d"), *Piles[SelectedSlot].Item->DisplayName.ToString(), Piles[SelectedSlot].Count));
	}
	else
	{
		Lines.Add(TEXT("Selected: none"));
	}

	if (bFinished)
	{
		Lines.Add(FString::Printf(TEXT("READY in %.1f s"), FinishSeconds));
	}

	Board->SetText(FText::FromString(FString::Join(Lines, TEXT("\n"))));
}

bool ADojoS1PackDirector::IsPackReady() const
{
	if (ReadyWeapon == nullptr || ReadyHelmet == nullptr || PotionItem == nullptr)
	{
		return false;
	}

	return HeroEquipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == ReadyWeapon
		&& HeroEquipment->GetEquipped(EDojoS1EquipSlot::EES_Head) == ReadyHelmet
		&& HeroBag->CountOf(PotionItem) >= PotionsNeeded;
}
