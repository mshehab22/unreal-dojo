#include "DojoF5Lever.h"

#include "Components/TextRenderComponent.h"

ADojoF5Lever::ADojoF5Lever()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF5Lever::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoF5Lever::Pull()
{
	bIsOn = !bIsOn;
	RefreshLabel();

	OnPulled.Broadcast(bIsOn);
}

bool ADojoF5Lever::IsOn() const
{
	return bIsOn;
}

void ADojoF5Lever::RefreshLabel()
{
	Label->SetText(FText::FromString(bIsOn ? TEXT("ON") : TEXT("OFF")));
}
