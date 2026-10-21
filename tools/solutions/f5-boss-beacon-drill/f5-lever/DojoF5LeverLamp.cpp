#include "DojoF5LeverLamp.h"

#include "Components/TextRenderComponent.h"
#include "DojoF5Lever.h"

ADojoF5LeverLamp::ADojoF5LeverLamp()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("DARK")));
}

void ADojoF5LeverLamp::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(Lever)) Lever->OnPulled.AddDynamic(this, &ADojoF5LeverLamp::HandlePulled);
}

void ADojoF5LeverLamp::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (IsValid(Lever)) Lever->OnPulled.RemoveDynamic(this, &ADojoF5LeverLamp::HandlePulled);

	Super::EndPlay(EndPlayReason);
}

bool ADojoF5LeverLamp::IsLit() const
{
	return bLit;
}

void ADojoF5LeverLamp::HandlePulled(bool bIsOn)
{
	bLit = bIsOn;
	Label->SetText(FText::FromString(bLit ? TEXT("LIT") : TEXT("DARK")));
}
