#include "DojoP3ArenaBrazier.h"

#include "Components/TextRenderComponent.h"

ADojoP3ArenaBrazier::ADojoP3ArenaBrazier()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP3ArenaBrazier::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Phase += WaverSpeed * DeltaSeconds;
	SetFlameHeight(BaseHeight + Waver * FMath::Sin(Phase));
}

void ADojoP3ArenaBrazier::SetFlameHeight(float NewHeight)
{
	FlameHeight = NewHeight;
	Label->SetText(FText::AsNumber(FMath::RoundToInt(FlameHeight)));
}

float ADojoP3ArenaBrazier::GetFlameHeight() const
{
	return FlameHeight;
}
