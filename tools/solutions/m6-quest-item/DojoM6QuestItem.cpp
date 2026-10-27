#include "DojoM6QuestItem.h"

#include "Components/TextRenderComponent.h"

ADojoM6QuestItem::ADojoM6QuestItem()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM6QuestItem::BeginPlay()
{
	Super::BeginPlay();

	Label->SetText(FText::FromName(ItemTag));
}

bool ADojoM6QuestItem::Collect(AActor* Taker)
{
	if (bCollected) return false;

	bCollected = true;
	OnCollected.Broadcast(this, Taker);
	Destroy();
	return true;
}

bool ADojoM6QuestItem::IsCollected() const
{
	return bCollected;
}
