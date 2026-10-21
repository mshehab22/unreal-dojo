#include "DojoF1ScoreKeeper.h"

#include "Components/TextRenderComponent.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"

ADojoF1ScoreKeeper::ADojoF1ScoreKeeper()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

int32 ADojoF1ScoreKeeper::CountScore() const
{
	int32 Score = 0;

	for (AActor* Target : Targets)
	{
		if (const ADojoF1TrainingDummy* Dummy = Cast<ADojoF1TrainingDummy>(Target))
		{
			Score += Dummy->GetHitsTaken() * PointsPerDummyHit;
		}
		else if (const ADojoF1PopupTarget* Popup = Cast<ADojoF1PopupTarget>(Target))
		{
			if (Popup->GetState() == EDojoF1TargetState::Broken) Score += PointsPerBrokenTarget;
		}
	}

	return Score;
}

int32 ADojoF1ScoreKeeper::CountPopupTargets() const
{
	int32 Count = 0;

	for (AActor* Target : Targets)
	{
		if (IsValid(Target) && Target->IsA<ADojoF1PopupTarget>()) Count++;
	}

	return Count;
}

void ADojoF1ScoreKeeper::ShowScore()
{
	Label->SetText(FText::AsNumber(CountScore()));
}
