#include "DojoF3ScoreBoard.h"

#include "Components/TextRenderComponent.h"
#include "Quests/f1-score-keeper/DojoF1ScoreKeeper.h"

ADojoF3ScoreBoard::ADojoF3ScoreBoard()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF3ScoreBoard::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoF3ScoreBoard::AddScore(int32 Score)
{
	Scores.Add(Score);

	while (Scores.Num() > MaxEntries)
	{
		Scores.RemoveAt(0);
	}

	RefreshLabel();
}

void ADojoF3ScoreBoard::RecordFromKeeper()
{
	if (!IsValid(Keeper)) return;

	AddScore(Keeper->CountScore());
}

int32 ADojoF3ScoreBoard::GetBest() const
{
	int32 Best = 0;

	for (const int32 Score : Scores)
	{
		Best = FMath::Max(Best, Score);
	}

	return Best;
}

float ADojoF3ScoreBoard::GetAverage() const
{
	if (Scores.Num() == 0) return 0.f;

	int32 Total = 0;
	for (const int32 Score : Scores)
	{
		Total += Score;
	}

	return static_cast<float>(Total) / Scores.Num();
}

int32 ADojoF3ScoreBoard::GetCount() const
{
	return Scores.Num();
}

void ADojoF3ScoreBoard::Clear()
{
	Scores.Empty();
	RefreshLabel();
}

void ADojoF3ScoreBoard::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Best %d  Avg %.1f"), GetBest(), GetAverage())));
}
