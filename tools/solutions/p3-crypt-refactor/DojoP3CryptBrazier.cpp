#include "DojoP3CryptBrazier.h"

#include "Components/TextRenderComponent.h"

ADojoP3CryptBrazier::ADojoP3CryptBrazier()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP3CryptBrazier::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Phase += WaverSpeed * DeltaSeconds;
	SetFlameHeight(BaseHeight + Waver * FMath::Sin(Phase));
}

void ADojoP3CryptBrazier::SetFlameHeight(float NewHeight)
{
	FlameHeight = NewHeight;
	Label->SetText(FText::AsNumber(FMath::RoundToInt(FlameHeight)));
}

float ADojoP3CryptBrazier::GetFlameHeight() const
{
	return FlameHeight;
}
