#include "DojoP3CryptSweeper.h"

#include "Components/TextRenderComponent.h"

ADojoP3CryptSweeper::ADojoP3CryptSweeper()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("--|--")));
}

void ADojoP3CryptSweeper::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	SetAngle(FMath::Fmod(Angle + DegreesPerSecond * DeltaSeconds, 360.f));
}

void ADojoP3CryptSweeper::SetAngle(float NewAngle)
{
	Angle = NewAngle;
	SetActorRotation(FRotator(0.f, Angle, 0.f));
}

float ADojoP3CryptSweeper::GetAngle() const
{
	return Angle;
}
