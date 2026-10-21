#include "DojoP5CoursePlanner.h"

#include "Components/TextRenderComponent.h"

ADojoP5CoursePlanner::ADojoP5CoursePlanner()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	Slots.Init(EDojoP5Obstacle::EO_None, SlotCount);
	RefreshLabel();
}

void ADojoP5CoursePlanner::Place(int32 Slot, EDojoP5Obstacle Obstacle)
{
	if (!Slots.IsValidIndex(Slot) || Slots[Slot] == Obstacle) return;

	FDojoP5CourseEdit Edit;
	Edit.Slot = Slot;
	Edit.Before = Slots[Slot];
	Edit.After = Obstacle;
	Perform(Edit);
}

void ADojoP5CoursePlanner::Clear(int32 Slot)
{
	Place(Slot, EDojoP5Obstacle::EO_None);
}

void ADojoP5CoursePlanner::Perform(const FDojoP5CourseEdit& Edit)
{
	// A new edit after an undo starts a new line of history: the edits that were taken back can no longer be redone.
	History.SetNum(AppliedCount);

	History.Add(Edit);
	AppliedCount = History.Num();

	Slots[Edit.Slot] = Edit.After;
	RefreshLabel();
}

void ADojoP5CoursePlanner::Undo()
{
	if (AppliedCount == 0) return;

	AppliedCount--;
	const FDojoP5CourseEdit& Edit = History[AppliedCount];
	Slots[Edit.Slot] = Edit.Before;

	RefreshLabel();
}

void ADojoP5CoursePlanner::Redo()
{
	if (AppliedCount >= History.Num()) return;

	const FDojoP5CourseEdit& Edit = History[AppliedCount];
	Slots[Edit.Slot] = Edit.After;
	AppliedCount++;

	RefreshLabel();
}

EDojoP5Obstacle ADojoP5CoursePlanner::GetObstacle(int32 Slot) const
{
	return Slots.IsValidIndex(Slot) ? Slots[Slot] : EDojoP5Obstacle::EO_None;
}

int32 ADojoP5CoursePlanner::GetHistoryLength() const
{
	return History.Num();
}

int32 ADojoP5CoursePlanner::GetAppliedCount() const
{
	return AppliedCount;
}

void ADojoP5CoursePlanner::RefreshLabel()
{
	FString Course;
	for (const EDojoP5Obstacle Obstacle : Slots)
	{
		switch (Obstacle)
		{
		case EDojoP5Obstacle::EO_Hurdle:
			Course += TEXT("H");
			break;
		case EDojoP5Obstacle::EO_Wall:
			Course += TEXT("W");
			break;
		case EDojoP5Obstacle::EO_Pit:
			Course += TEXT("P");
			break;
		default:
			Course += TEXT("_");
			break;
		}
	}

	Label->SetText(FText::FromString(Course));
}
