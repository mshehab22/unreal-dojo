#include "DojoP1BountyBoard.h"

#include "Components/TextRenderComponent.h"
#include "DojoP1TrainingFoe.h"

ADojoP1BountyBoard::ADojoP1BountyBoard()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1BountyBoard::BeginPlay()
{
	Super::BeginPlay();

	for (ADojoP1TrainingFoe* Foe : Foes)
	{
		if (!IsValid(Foe)) continue;

		Foe->OnDefeated.AddUObject(this, &ADojoP1BountyBoard::HandleFoeDefeated);
	}

	RefreshLabel();
}

void ADojoP1BountyBoard::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoP1TrainingFoe* Foe : Foes)
	{
		if (IsValid(Foe)) Foe->OnDefeated.RemoveAll(this);
	}

	Super::EndPlay(EndPlayReason);
}

int32 ADojoP1BountyBoard::GetDefeatsHeard() const
{
	return DefeatsHeard;
}

bool ADojoP1BountyBoard::IsBountyDone() const
{
	return DefeatsHeard >= DefeatsNeeded;
}

void ADojoP1BountyBoard::HandleFoeDefeated(ADojoP1TrainingFoe* Foe)
{
	DefeatsHeard++;
	RefreshLabel();
}

void ADojoP1BountyBoard::RefreshLabel()
{
	const FString Text = IsBountyDone() ? FString(TEXT("BOUNTY DONE")) : FString::Printf(TEXT("%d / %d"), DefeatsHeard, DefeatsNeeded);
	Label->SetText(FText::FromString(Text));
}
