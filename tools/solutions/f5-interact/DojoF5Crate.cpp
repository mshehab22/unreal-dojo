#include "DojoF5Crate.h"

#include "Components/TextRenderComponent.h"

ADojoF5Crate::ADojoF5Crate()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("SHUT")));
}

bool ADojoF5Crate::IsOpen() const
{
	return bOpen;
}

bool ADojoF5Crate::Interact_Implementation(AActor* Instigator)
{
	if (bOpen) return false;

	bOpen = true;
	Label->SetText(FText::FromString(TEXT("OPEN")));
	return true;
}
