#include "DojoP4DrumPad.h"

#include "Components/TextRenderComponent.h"

ADojoP4DrumPad::ADojoP4DrumPad()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP4DrumPad::BeginPlay()
{
	Super::BeginPlay();

	FrameHits.Init(0, LaneCount);
	IncomingHits.Init(0, LaneCount);
	Label->SetText(FText::AsNumber(Score));
}

void ADojoP4DrumPad::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	BeginFrame();
	ScoreFrame();
}

void ADojoP4DrumPad::Hit(int32 Lane)
{
	if (!IncomingHits.IsValidIndex(Lane)) return;

	IncomingHits[Lane]++;
}

void ADojoP4DrumPad::BeginFrame()
{
	Swap(FrameHits, IncomingHits);

	// After the swap the incoming copy holds the snapshot from the frame before; empty it or old hits come back.
	for (int32& LaneHits : IncomingHits) LaneHits = 0;
}

int32 ADojoP4DrumPad::GetHitsThisFrame(int32 Lane) const
{
	return FrameHits.IsValidIndex(Lane) ? FrameHits[Lane] : 0;
}

int32 ADojoP4DrumPad::GetScore() const
{
	return Score;
}

void ADojoP4DrumPad::ScoreFrame()
{
	for (const int32 LaneHits : FrameHits) Score += LaneHits * PointsPerHit;

	Label->SetText(FText::AsNumber(Score));
}
