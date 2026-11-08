#include "DojoP23GhostDrill.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Quests/p4-drum-pad/DojoP4DrumPad.h"
#include "Quests/p5-drill-orders/DojoP5DrillDummy.h"
#include "TimerManager.h"

ADojoP23GhostDrill::ADojoP23GhostDrill()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP23GhostDrill::BeginPlay()
{
	Super::BeginPlay();

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::A, IE_Pressed, this, &ADojoP23GhostDrill::HandleKey);
		InputComponent->BindKey(EKeys::D, IE_Pressed, this, &ADojoP23GhostDrill::HandleKey);
		InputComponent->BindKey(EKeys::SpaceBar, IE_Pressed, this, &ADojoP23GhostDrill::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP23GhostDrill::HandleKey);
	}

	StartRound();
}

void ADojoP23GhostDrill::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(RoundTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoP23GhostDrill::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bRunning) return;

	Accumulator += DeltaSeconds;

	int32 StepsRun = 0;
	while (Accumulator >= FixedStepSeconds && StepsRun < MaxStepsPerFrame && StepCount < 2 * LiveSteps)
	{
		Accumulator -= FixedStepSeconds;
		RunStep();
		StepsRun++;
	}

	// A long frame may owe more steps than are allowed; the debt is forgotten instead of being paid off over the next frames.
	Accumulator = FMath::Min(Accumulator, static_cast<double>(FixedStepSeconds));

	if (StepsRun > 0) UpdateLabel();
}

void ADojoP23GhostDrill::PressMove(EDojoP5DrillMove Move)
{
	if (!IsLive()) return;

	Pending.Add(Move);
}

void ADojoP23GhostDrill::PressNextRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoP23GhostDrill::IsRunning() const
{
	return bRunning;
}

bool ADojoP23GhostDrill::IsLive() const
{
	return bRunning && StepCount < LiveSteps;
}

int32 ADojoP23GhostDrill::GetRoundNumber() const
{
	return RoundNumber;
}

int32 ADojoP23GhostDrill::GetStepCount() const
{
	return StepCount;
}

FString ADojoP23GhostDrill::GetResult() const
{
	return Result;
}

const TArray<FDojoP23RecordedCommand>& ADojoP23GhostDrill::GetRecording() const
{
	return Recording;
}

ADojoP5DrillDummy* ADojoP23GhostDrill::GetLiveDummy() const
{
	return LiveDummy.Get();
}

ADojoP5DrillDummy* ADojoP23GhostDrill::GetGhostDummy() const
{
	return GhostDummy.Get();
}

ADojoP4DrumPad* ADojoP23GhostDrill::GetLivePad() const
{
	return LivePad.Get();
}

ADojoP4DrumPad* ADojoP23GhostDrill::GetGhostPad() const
{
	return GhostPad.Get();
}

void ADojoP23GhostDrill::StartRound()
{
	ClearActors();

	RoundNumber++;
	StepCount = 0;
	Accumulator = 0.0;
	Pending.Reset();
	Recording.Reset();
	Result.Reset();

	const FVector Home = GetActorLocation();
	LiveDummy = GetWorld()->SpawnActor<ADojoP5DrillDummy>(Home + FVector(-500.f, 0.f, 0.f), FRotator::ZeroRotator);
	GhostDummy = GetWorld()->SpawnActor<ADojoP5DrillDummy>(Home + FVector(500.f, 0.f, 0.f), FRotator::ZeroRotator);
	LivePad = GetWorld()->SpawnActor<ADojoP4DrumPad>(Home + FVector(-500.f, 0.f, 300.f), FRotator::ZeroRotator);
	GhostPad = GetWorld()->SpawnActor<ADojoP4DrumPad>(Home + FVector(500.f, 0.f, 300.f), FRotator::ZeroRotator);

	bRunning = true;
	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP23GhostDrill::HandleTimeUp, 2.f * LiveSteps * FixedStepSeconds + 0.5f, false);

	UpdateLabel();
}

void ADojoP23GhostDrill::EndRound()
{
	bRunning = false;
	GetWorldTimerManager().ClearTimer(RoundTimer);

	const bool bSameLane = IsValid(LiveDummy) && IsValid(GhostDummy) && LiveDummy->GetLane() == GhostDummy->GetLane();
	const bool bSameBlocks = IsValid(LiveDummy) && IsValid(GhostDummy) && LiveDummy->GetBlocks() == GhostDummy->GetBlocks();
	const bool bSameScore = IsValid(LivePad) && IsValid(GhostPad) && LivePad->GetScore() == GhostPad->GetScore();
	Result = bSameLane && bSameBlocks && bSameScore ? TEXT("GHOST MATCHES") : TEXT("GHOST DRIFTED");

	UpdateLabel();
}

void ADojoP23GhostDrill::RunStep()
{
	StepCount++;

	if (StepCount <= LiveSteps)
	{
		for (const EDojoP5DrillMove Move : Pending)
		{
			FDojoP23RecordedCommand Command;
			Command.Step = StepCount;
			Command.Move = Move;
			Recording.Add(Command);

			Perform(Move, LiveDummy, LivePad);
		}

		Pending.Reset();
		return;
	}

	const int32 ReplayStep = StepCount - LiveSteps;
	for (const FDojoP23RecordedCommand& Command : Recording)
	{
		if (Command.Step == ReplayStep) Perform(Command.Move, GhostDummy, GhostPad);
	}
}

void ADojoP23GhostDrill::Perform(EDojoP5DrillMove Move, ADojoP5DrillDummy* Dummy, ADojoP4DrumPad* Pad)
{
	if (!IsValid(Dummy) || !IsValid(Pad)) return;

	FDojoP5DrillOrder Order;
	Order.Dummy = Dummy;
	Order.Move = Move;
	Order.CarryOut();

	Pad->Hit(Dummy->GetLane());
}

void ADojoP23GhostDrill::HandleTimeUp()
{
	if (bRunning) EndRound();
}

void ADojoP23GhostDrill::HandleKey(FKey Key)
{
	if (Key == EKeys::A) PressMove(EDojoP5DrillMove::EDM_StepLeft);
	else if (Key == EKeys::D) PressMove(EDojoP5DrillMove::EDM_StepRight);
	else if (Key == EKeys::SpaceBar) PressMove(EDojoP5DrillMove::EDM_Block);
	else if (Key == EKeys::R) PressNextRound();
}

void ADojoP23GhostDrill::UpdateLabel()
{
	const TCHAR* Phase = TEXT("LIVE");
	if (StepCount >= 2 * LiveSteps) Phase = TEXT("DONE");
	else if (StepCount >= LiveSteps) Phase = TEXT("REPLAY");

	const int32 LiveScore = IsValid(LivePad) ? LivePad->GetScore() : 0;
	const int32 GhostScore = IsValid(GhostPad) ? GhostPad->GetScore() : 0;

	FString Text = FString::Printf(TEXT("Round %d  %s  Live %d  Ghost %d"), RoundNumber, Phase, LiveScore, GhostScore);
	if (!Result.IsEmpty()) Text += TEXT("  ") + Result;

	Label->SetText(FText::FromString(Text));
}

void ADojoP23GhostDrill::ClearActors()
{
	if (IsValid(LiveDummy)) LiveDummy->Destroy();
	if (IsValid(GhostDummy)) GhostDummy->Destroy();
	if (IsValid(LivePad)) LivePad->Destroy();
	if (IsValid(GhostPad)) GhostPad->Destroy();
}
