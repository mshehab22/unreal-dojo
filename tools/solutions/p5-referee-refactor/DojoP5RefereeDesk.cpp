#include "DojoP5RefereeDesk.h"

#include "Components/TextRenderComponent.h"

ADojoP5RefereeDesk::ADojoP5RefereeDesk()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP5RefereeDesk::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP5RefereeDesk::RecordGoal(int32 Team)
{
	if (!Scores.IsValidIndex(Team)) return;

	Scores[Team] += GoalPoints;
	RefreshLabel();
}

void ADojoP5RefereeDesk::AdjustScore(int32 Team, int32 Points)
{
	if (!Scores.IsValidIndex(Team) || Points == 0) return;

	FDojoP5ScoreAdjustment Adjustment;
	Adjustment.Team = Team;
	Adjustment.Points = Points;
	Adjustments.Add(Adjustment);

	Scores[Team] += Points;
	RefreshLabel();
}

void ADojoP5RefereeDesk::UndoAdjustment()
{
	if (Adjustments.Num() == 0) return;

	// Take back only what the correction added; goals scored since then stay.
	const FDojoP5ScoreAdjustment Adjustment = Adjustments.Pop();
	Scores[Adjustment.Team] -= Adjustment.Points;
	RefreshLabel();
}

int32 ADojoP5RefereeDesk::GetScore(int32 Team) const
{
	return Scores.IsValidIndex(Team) ? Scores[Team] : 0;
}

void ADojoP5RefereeDesk::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("%d : %d"), GetScore(0), GetScore(1))));
}
