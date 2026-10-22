#include "DojoP8Fighter.h"

#include "Components/TextRenderComponent.h"

ADojoP8Fighter::ADojoP8Fighter()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8Fighter::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP8Fighter::TakeHit(float Amount)
{
	Health = FMath::Max(0.f, Health - Amount);
	RefreshLabel();
}

float ADojoP8Fighter::GetHealth() const
{
	return Health;
}

bool ADojoP8Fighter::IsDown() const
{
	return Health <= 0.f;
}

void ADojoP8Fighter::RefreshLabel()
{
	Label->SetText(FText::AsNumber(FMath::RoundToInt(Health)));
}
