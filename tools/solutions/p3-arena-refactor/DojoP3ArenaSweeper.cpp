#include "DojoP3ArenaSweeper.h"

#include "Components/TextRenderComponent.h"

ADojoP3ArenaSweeper::ADojoP3ArenaSweeper()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("--|--")));
}

void ADojoP3ArenaSweeper::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	SetAngle(FMath::Fmod(Angle + DegreesPerSecond * DeltaSeconds, 360.f));
}

void ADojoP3ArenaSweeper::SetAngle(float NewAngle)
{
	Angle = NewAngle;
	SetActorRotation(FRotator(0.f, Angle, 0.f));
}

float ADojoP3ArenaSweeper::GetAngle() const
{
	return Angle;
}
