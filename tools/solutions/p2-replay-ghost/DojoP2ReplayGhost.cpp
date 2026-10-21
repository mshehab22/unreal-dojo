#include "DojoP2ReplayGhost.h"

#include "Components/TextRenderComponent.h"

ADojoP2ReplayGhost::ADojoP2ReplayGhost()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	// A sample run for the editor: four seconds that speed up, then slow down.
	for (int32 Step = 0; Step < 64; ++Step) RecordedSpeeds.Add(Step < 32 ? 100.f + Step * 10.f : 420.f - (Step - 32) * 10.f);
}

void ADojoP2ReplayGhost::BeginPlay()
{
	Super::BeginPlay();

	StartLocation = GetActorLocation();
	RefreshLabel();
}

void ADojoP2ReplayGhost::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Advance(DeltaSeconds);
	SetActorLocation(StartLocation + FVector(GetDisplayDistance(), 0.f, 0.f));
}

void ADojoP2ReplayGhost::SetPlaybackRate(float NewRate)
{
	PlaybackRate = FMath::Max(0.f, NewRate);
}

void ADojoP2ReplayGhost::Advance(float DeltaSeconds)
{
	if (IsFinished()) return;

	Lag += DeltaSeconds * PlaybackRate;

	int32 StepsThisAdvance = 0;
	while (Lag >= StepSeconds && StepsThisAdvance < MaxStepsPerAdvance && !IsFinished())
	{
		PlayStep();
		Lag -= StepSeconds;
		StepsThisAdvance++;
	}

	// A hitch longer than the cap is dropped, so the replay slows down for a moment instead of racing to catch up.
	if (Lag >= StepSeconds || IsFinished()) Lag = 0.f;

	RefreshLabel();
}

void ADojoP2ReplayGhost::PlayStep()
{
	PreviousDistance = Distance;
	Distance += RecordedSpeeds[StepIndex] * StepSeconds;
	StepIndex++;
}

float ADojoP2ReplayGhost::GetDistance() const
{
	return Distance;
}

int32 ADojoP2ReplayGhost::GetStepIndex() const
{
	return StepIndex;
}

bool ADojoP2ReplayGhost::IsFinished() const
{
	return StepIndex >= RecordedSpeeds.Num();
}

float ADojoP2ReplayGhost::GetAlpha() const
{
	return Lag / StepSeconds;
}

float ADojoP2ReplayGhost::GetDisplayDistance() const
{
	return FMath::Lerp(PreviousDistance, Distance, GetAlpha());
}

void ADojoP2ReplayGhost::RefreshLabel()
{
	const FString Text = IsFinished() ? FString(TEXT("DONE")) : FString::Printf(TEXT("Step %d / %d"), StepIndex, RecordedSpeeds.Num());
	Label->SetText(FText::FromString(Text));
}
