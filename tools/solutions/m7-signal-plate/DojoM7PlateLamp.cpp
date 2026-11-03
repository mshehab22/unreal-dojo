#include "DojoM7PlateLamp.h"

#include "Components/TextRenderComponent.h"
#include "DojoM7SignalPlate.h"

ADojoM7PlateLamp::ADojoM7PlateLamp()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM7PlateLamp::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(Plate))
	{
		bLit = Plate->IsPressed();

		Plate->OnPlatePressed.AddUniqueDynamic(this, &ADojoM7PlateLamp::HandlePlatePressed);
		Plate->OnPlateReleased.AddUniqueDynamic(this, &ADojoM7PlateLamp::HandlePlateReleased);
	}

	RefreshLabel();
}

bool ADojoM7PlateLamp::IsLit() const
{
	return bLit;
}

int32 ADojoM7PlateLamp::GetPresses() const
{
	return Presses;
}

int32 ADojoM7PlateLamp::GetReleases() const
{
	return Releases;
}

void ADojoM7PlateLamp::HandlePlatePressed(ADojoM7SignalPlate* ChangedPlate)
{
	bLit = true;
	Presses++;
	RefreshLabel();
}

void ADojoM7PlateLamp::HandlePlateReleased(ADojoM7SignalPlate* ChangedPlate)
{
	bLit = false;
	Releases++;
	RefreshLabel();
}

void ADojoM7PlateLamp::RefreshLabel()
{
	Label->SetText(FText::FromString(bLit ? TEXT("LIT") : TEXT("DARK")));
}
