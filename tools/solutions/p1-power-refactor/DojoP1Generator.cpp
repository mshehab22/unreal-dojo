#include "DojoP1Generator.h"

#include "Components/TextRenderComponent.h"

ADojoP1Generator::ADojoP1Generator()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1Generator::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP1Generator::SetRunning(bool bNewRunning)
{
	if (bNewRunning == bRunning) return;

	bRunning = bNewRunning;
	RefreshLabel();

	OnPowerChanged.Broadcast(bRunning);
}

void ADojoP1Generator::Toggle()
{
	SetRunning(!bRunning);
}

bool ADojoP1Generator::IsRunning() const
{
	return bRunning;
}

void ADojoP1Generator::RefreshLabel()
{
	Label->SetText(FText::FromString(bRunning ? TEXT("RUNNING") : TEXT("STOPPED")));
}
