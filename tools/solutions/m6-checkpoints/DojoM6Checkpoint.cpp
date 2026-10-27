#include "DojoM6Checkpoint.h"

#include "Components/TextRenderComponent.h"

ADojoM6Checkpoint::ADojoM6Checkpoint()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("GATE")));
}

void ADojoM6Checkpoint::Touch(AActor* Racer)
{
	OnReached.Broadcast(this, Racer);
}
