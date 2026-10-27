#include "DojoS1WorldItem.h"

#include "Components/TextRenderComponent.h"
#include "DojoS1ItemData.h"

ADojoS1WorldItem::ADojoS1WorldItem()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoS1WorldItem::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoS1WorldItem::Setup(UDojoS1ItemData* NewItem, int32 NewCount)
{
	Item = NewItem;
	Count = FMath::Max(0, NewCount);
	RefreshLabel();
}

int32 ADojoS1WorldItem::Take(int32 Amount)
{
	const int32 Given = FMath::Clamp(Amount, 0, Count);
	Count -= Given;
	RefreshLabel();

	if (Given > 0 && Count == 0)
	{
		Destroy();
	}

	return Given;
}

UDojoS1ItemData* ADojoS1WorldItem::GetItem() const
{
	return Item;
}

int32 ADojoS1WorldItem::GetCount() const
{
	return Count;
}

void ADojoS1WorldItem::RefreshLabel()
{
	const FString ItemName = Item ? Item->DisplayName.ToString() : FString(TEXT("?"));
	Label->SetText(FText::FromString(FString::Printf(TEXT("%s x%d"), *ItemName, Count)));
}
