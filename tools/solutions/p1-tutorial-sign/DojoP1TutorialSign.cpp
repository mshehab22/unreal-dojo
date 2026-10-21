#include "DojoP1TutorialSign.h"

#include "Components/TextRenderComponent.h"
#include "DojoP1PracticeLever.h"

ADojoP1TutorialSign::ADojoP1TutorialSign()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1TutorialSign::BeginPlay()
{
	Super::BeginPlay();

	Watch(Lever);
	RefreshLabel();
}

void ADojoP1TutorialSign::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	StopWatching();

	Super::EndPlay(EndPlayReason);
}

void ADojoP1TutorialSign::Watch(ADojoP1PracticeLever* LeverToWatch)
{
	if (!IsValid(LeverToWatch) || IsFinished()) return;

	if (WatchedLever != LeverToWatch) StopWatching();

	WatchedLever = LeverToWatch;
	WatchedLever->OnPulled.AddUniqueDynamic(this, &ADojoP1TutorialSign::HandleLeverPulled);
}

int32 ADojoP1TutorialSign::GetPullsHeard() const
{
	return PullsHeard;
}

bool ADojoP1TutorialSign::IsFinished() const
{
	return PullsHeard >= PullsToFinish;
}

void ADojoP1TutorialSign::HandleLeverPulled(ADojoP1PracticeLever* PulledLever, int32 PullCount)
{
	PullsHeard++;
	RefreshLabel();

	if (IsFinished()) StopWatching();
}

void ADojoP1TutorialSign::StopWatching()
{
	if (IsValid(WatchedLever)) WatchedLever->OnPulled.RemoveDynamic(this, &ADojoP1TutorialSign::HandleLeverPulled);

	WatchedLever = nullptr;
}

void ADojoP1TutorialSign::RefreshLabel()
{
	const FString Text = IsFinished() ? FString(TEXT("Well done")) : FString::Printf(TEXT("Pull the lever: %d left"), PullsToFinish - PullsHeard);
	Label->SetText(FText::FromString(Text));
}
