#include "DojoP14TrialDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/p14-lap-log/DojoP14FinishLine.h"
#include "Quests/p14-lap-log/DojoP14LapLog.h"
#include "Quests/p14-start-lights/DojoP14StartLights.h"
#include "TimerManager.h"

ADojoP14TrialDirector::ADojoP14TrialDirector()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP14TrialDirector::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Champion)) Champion = UGameplayStatics::GetPlayerPawn(this, 0);

	RankedLog = NewObject<UDojoP14LapLog>(this);
	PracticeLog = NewObject<UDojoP14LapLog>(this);

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP14TrialDirector::HandleKey);
		InputComponent->BindKey(EKeys::P, IE_Pressed, this, &ADojoP14TrialDirector::HandleKey);
	}

	// One frame later, every actor placed in the level has begun play, so placed lights are already running.
	GetWorldTimerManager().SetTimerForNextTick(this, &ADojoP14TrialDirector::StartRound);
}

void ADojoP14TrialDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(RoundTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoP14TrialDirector::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bRunning) return;

	if (!bRacing && IsValid(Lights) && Lights->IsGreen())
	{
		bRacing = true;
		GreenSeconds = GetWorld()->GetTimeSeconds();
		if (IsValid(Line)) Line->CrossLine(DriverName, GreenSeconds);
		UpdateLabel();
	}

	if (!IsValid(Champion)) return;

	const float ChampionX = Champion->GetActorLocation().X;
	const bool bCrossed = bHasLastChampionX && LastChampionX < LineSpot.X && ChampionX >= LineSpot.X;
	LastChampionX = ChampionX;
	bHasLastChampionX = true;

	if (bCrossed) HandleCrossing();
}

void ADojoP14TrialDirector::RestartRound()
{
	if (bRunning) return;

	StartRound();
}

void ADojoP14TrialDirector::TogglePractice()
{
	if (bRunning) return;

	bPractice = !bPractice;
	Label->SetText(FText::FromString(FString::Printf(TEXT("Next round: %s  R to start"), bPractice ? TEXT("PRACTICE") : TEXT("RANKED"))));
}

bool ADojoP14TrialDirector::IsRunning() const
{
	return bRunning;
}

bool ADojoP14TrialDirector::IsPractice() const
{
	return bPractice;
}

int32 ADojoP14TrialDirector::GetLapsThisRound() const
{
	return LapsThisRound;
}

int32 ADojoP14TrialDirector::GetFalseStarts() const
{
	return FalseStarts;
}

float ADojoP14TrialDirector::GetFinishSeconds() const
{
	return FinishSeconds;
}

UDojoP14LapLog* ADojoP14TrialDirector::GetRankedLog() const
{
	return RankedLog;
}

UDojoP14LapLog* ADojoP14TrialDirector::GetPracticeLog() const
{
	return PracticeLog;
}

ADojoP14StartLights* ADojoP14TrialDirector::GetLights() const
{
	return Lights;
}

ADojoP14FinishLine* ADojoP14TrialDirector::GetFinishLine() const
{
	return Line;
}

void ADojoP14TrialDirector::StartRound()
{
	UWorld* LevelWorld = GetWorld();
	if (!LevelWorld) return;

	// A fresh line every round, so no lap of the last round is still being timed.
	if (IsValid(Line)) Line->Destroy();
	Line = LevelWorld->SpawnActor<ADojoP14FinishLine>(LineSpot, FRotator::ZeroRotator);
	if (IsValid(Line)) Line->UseLog(bPractice ? PracticeLog : RankedLog);

	if (!IsValid(Lights)) Lights = FindOrSpawnLights();
	if (IsValid(Lights)) Lights->BeginCountdown();

	LapsThisRound = 0;
	FalseStarts = 0;
	bRacing = false;
	bHasLastChampionX = false;
	bRunning = true;

	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP14TrialDirector::HandleTimeUp, RoundSeconds, false);

	UpdateLabel();
}

void ADojoP14TrialDirector::EndRound(bool bFinished)
{
	bRunning = false;
	GetWorldTimerManager().ClearTimer(RoundTimer);

	if (!bFinished)
	{
		Label->SetText(FText::FromString(TEXT("TIME UP")));
		return;
	}

	FinishSeconds = GetWorld()->GetTimeSeconds() - GreenSeconds;
	Label->SetText(FText::FromString(FString::Printf(TEXT("FINISH %.1f s  Best ranked %.1f"), FinishSeconds, RankedLog->GetBestFor(DriverName))));
}

ADojoP14StartLights* ADojoP14TrialDirector::FindOrSpawnLights()
{
	UWorld* LevelWorld = GetWorld();

	for (TActorIterator<ADojoP14StartLights> Placed(LevelWorld); Placed; ++Placed)
	{
		if (Placed->IsRunning()) return *Placed;
	}

	return LevelWorld->SpawnActor<ADojoP14StartLights>(LightsSpot, FRotator::ZeroRotator);
}

void ADojoP14TrialDirector::HandleCrossing()
{
	if (!bRacing)
	{
		FalseStarts++;
		UpdateLabel();
		return;
	}

	if (IsValid(Line)) Line->CrossLine(DriverName, GetWorld()->GetTimeSeconds());
	LapsThisRound++;

	if (LapsThisRound >= LapsPerRound)
	{
		EndRound(true);
		return;
	}

	UpdateLabel();
}

void ADojoP14TrialDirector::UpdateLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("%s  Lap %d/%d  False starts %d  Best ranked %.1f"), bPractice ? TEXT("PRACTICE") : TEXT("RANKED"), LapsThisRound, LapsPerRound, FalseStarts, RankedLog->GetBestFor(DriverName))));
}

void ADojoP14TrialDirector::HandleTimeUp()
{
	if (bRunning) EndRound(false);
}

void ADojoP14TrialDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::R) RestartRound();
	else if (Key == EKeys::P) TogglePractice();
}
