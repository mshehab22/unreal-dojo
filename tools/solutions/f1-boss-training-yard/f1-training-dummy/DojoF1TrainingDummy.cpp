#include "DojoF1TrainingDummy.h"

#include "Components/TextRenderComponent.h"

ADojoF1TrainingDummy::ADojoF1TrainingDummy()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF1TrainingDummy::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoF1TrainingDummy::Strike()
{
	if (IsKnockedDown()) return;

	HitsTaken++;
	RefreshLabel();
}

int32 ADojoF1TrainingDummy::GetHitsTaken() const
{
	return HitsTaken;
}

bool ADojoF1TrainingDummy::IsKnockedDown() const
{
	return HitsTaken >= HitsToKnockDown;
}

void ADojoF1TrainingDummy::ResetHits()
{
	HitsTaken = 0;
	RefreshLabel();
}

void ADojoF1TrainingDummy::RefreshLabel()
{
	const FText Text = IsKnockedDown() ? FText::FromString(TEXT("DOWN")) : FText::AsNumber(HitsToKnockDown - HitsTaken);
	Label->SetText(Text);
}
