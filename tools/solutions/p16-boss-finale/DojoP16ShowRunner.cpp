#include "DojoP16ShowRunner.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Quests/p16-rocket-rack/DojoP16Rocket.h"
#include "Quests/p16-rocket-rack/DojoP16RocketRack.h"
#include "Quests/p16-shell-fuse/DojoP16Shell.h"
#include "Quests/p16-shell-fuse/DojoP16ShellPool.h"
#include "TimerManager.h"

ADojoP16ShowRunner::ADojoP16ShowRunner()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP16ShowRunner::BeginPlay()
{
	Super::BeginPlay();

	// Every spawn of the evening happens here: the rack and the pool fill themselves as they begin play.
	const FTransform Here = GetActorTransform();
	Rack = GetWorld()->SpawnActorDeferred<ADojoP16RocketRack>(ADojoP16RocketRack::StaticClass(), Here);
	if (Rack)
	{
		Rack->RocketCount = RocketsInRack;
		Rack->FinishSpawning(Here);
	}

	ShellPool = GetWorld()->SpawnActorDeferred<ADojoP16ShellPool>(ADojoP16ShellPool::StaticClass(), Here);
	if (ShellPool)
	{
		ShellPool->PoolSize = ShellsInPool;
		ShellPool->FinishSpawning(Here);
	}

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP16ShowRunner::HandleKey);
		InputComponent->BindKey(EKeys::X, IE_Pressed, this, &ADojoP16ShowRunner::HandleKey);
	}

	StartShow();
}

void ADojoP16ShowRunner::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(CueTimer);
	RocketsOut.Empty();
	ShellsOut.Empty();

	if (IsValid(Rack)) Rack->Destroy();
	if (IsValid(ShellPool)) ShellPool->Destroy();

	Super::EndPlay(EndPlayReason);
}

bool ADojoP16ShowRunner::StartShow()
{
	if (bRunning) return false;

	bRunning = true;
	NextCue = 0;
	Bursts = 0;
	Duds = 0;

	FireCue();
	GetWorldTimerManager().SetTimer(CueTimer, this, &ADojoP16ShowRunner::FireCue, SecondsBetweenCues, true);
	UpdateLabel();
	return true;
}

bool ADojoP16ShowRunner::AbortShow()
{
	if (!bRunning) return false;

	GetWorldTimerManager().ClearTimer(CueTimer);
	TakeBackEverything();
	bRunning = false;

	Label->SetText(FText::FromString(FString::Printf(TEXT("ABORTED: %d bursts, %d duds"), Bursts, Duds)));
	return true;
}

bool ADojoP16ShowRunner::IsRunning() const
{
	return bRunning;
}

int32 ADojoP16ShowRunner::GetBurstCount() const
{
	return Bursts;
}

int32 ADojoP16ShowRunner::GetDudCount() const
{
	return Duds;
}

ADojoP16RocketRack* ADojoP16ShowRunner::GetRack() const
{
	return Rack;
}

ADojoP16ShellPool* ADojoP16ShowRunner::GetShellPool() const
{
	return ShellPool;
}

void ADojoP16ShowRunner::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bRunning) return;

	TakeBackBursts();

	const bool bEveryCueFired = NextCue >= CueCount;
	const bool bNothingOut = RocketsOut.Num() == 0 && ShellsOut.Num() == 0;
	if (bEveryCueFired && bNothingOut)
	{
		bRunning = false;
		Label->SetText(FText::FromString(FString::Printf(TEXT("SHOW OVER: %d bursts, %d duds"), Bursts, Duds)));
		return;
	}

	UpdateLabel();
}

void ADojoP16ShowRunner::FireCue()
{
	if (!bRunning || NextCue >= CueCount)
	{
		GetWorldTimerManager().ClearTimer(CueTimer);
		return;
	}

	const int32 Cue = NextCue;
	NextCue++;

	if (Cue % 2 == 0)
	{
		ADojoP16Rocket* Rocket = IsValid(Rack) ? Rack->Acquire(GetActorLocation()) : nullptr;
		if (!Rocket)
		{
			Duds++;
			return;
		}

		Rocket->Launch(LaunchVelocity, RocketFuseSeconds);
		RocketsOut.Add(Rocket);
		return;
	}

	ADojoP16Shell* Shell = IsValid(ShellPool) ? ShellPool->Acquire(GetActorLocation()) : nullptr;
	if (!Shell)
	{
		Duds++;
		return;
	}

	Shell->Fire(ShellFuseSeconds);
	ShellsOut.Add(Shell);
}

void ADojoP16ShowRunner::TakeBackBursts()
{
	for (int32 Index = RocketsOut.Num() - 1; Index >= 0; --Index)
	{
		ADojoP16Rocket* Rocket = RocketsOut[Index];
		if (IsValid(Rocket) && !Rocket->HasBurst()) continue;

		if (IsValid(Rocket))
		{
			Bursts++;
			Rack->Release(Rocket);
		}
		RocketsOut.RemoveAt(Index);
	}

	for (int32 Index = ShellsOut.Num() - 1; Index >= 0; --Index)
	{
		ADojoP16Shell* Shell = ShellsOut[Index];
		if (IsValid(Shell) && !Shell->HasBurst()) continue;

		if (IsValid(Shell))
		{
			Bursts++;
			ShellPool->Release(Shell);
		}
		ShellsOut.RemoveAt(Index);
	}
}

void ADojoP16ShowRunner::TakeBackEverything()
{
	for (ADojoP16Rocket* Rocket : RocketsOut)
	{
		if (IsValid(Rocket) && IsValid(Rack)) Rack->Release(Rocket);
	}

	for (ADojoP16Shell* Shell : ShellsOut)
	{
		if (IsValid(Shell) && IsValid(ShellPool)) ShellPool->Release(Shell);
	}

	RocketsOut.Empty();
	ShellsOut.Empty();
}

void ADojoP16ShowRunner::UpdateLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("SHOW: cue %d of %d, %d bursts, %d duds"), NextCue, CueCount, Bursts, Duds)));
}

void ADojoP16ShowRunner::HandleKey(FKey Key)
{
	if (Key == EKeys::R) StartShow();
	else if (Key == EKeys::X) AbortShow();
}
