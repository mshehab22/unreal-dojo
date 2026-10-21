#include "DojoF2ClayDisc.h"

#include "Components/TextRenderComponent.h"
#include "Dojo.h"

ADojoF2ClayDisc::ADojoF2ClayDisc()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("CLAY")));
}

void ADojoF2ClayDisc::BeginPlay()
{
	Super::BeginPlay();

	SetLifeSpan(FlightSeconds);
}

void ADojoF2ClayDisc::Shatter()
{
	if (IsActorBeingDestroyed()) return;

	bWasShattered = true;
	Destroy();
}

EDojoF2DiscFate ADojoF2ClayDisc::GetFate() const
{
	return Fate;
}

void ADojoF2ClayDisc::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (EndPlayReason == EEndPlayReason::Destroyed)
	{
		Fate = bWasShattered ? EDojoF2DiscFate::EDF_Shattered : EDojoF2DiscFate::EDF_Fell;
		UE_LOG(LogDojo, Log, TEXT("%s %s"), *GetName(), bWasShattered ? TEXT("shattered") : TEXT("fell"));
	}

	Super::EndPlay(EndPlayReason);
}
