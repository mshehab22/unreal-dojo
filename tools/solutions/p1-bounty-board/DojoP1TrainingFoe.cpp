#include "DojoP1TrainingFoe.h"

#include "Components/TextRenderComponent.h"

ADojoP1TrainingFoe::ADojoP1TrainingFoe()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1TrainingFoe::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP1TrainingFoe::TakeHit()
{
	if (IsDefeated()) return;

	HitsTaken++;
	RefreshLabel();

	if (IsDefeated()) OnDefeated.Broadcast(this);
}

bool ADojoP1TrainingFoe::IsDefeated() const
{
	return HitsTaken >= HitsToDefeat;
}

void ADojoP1TrainingFoe::RefreshLabel()
{
	const FText Text = IsDefeated() ? FText::FromString(TEXT("DOWN")) : FText::AsNumber(HitsToDefeat - HitsTaken);
	Label->SetText(Text);
}
