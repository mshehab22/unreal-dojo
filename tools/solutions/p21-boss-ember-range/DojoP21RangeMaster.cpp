#include "DojoP21RangeMaster.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "TimerManager.h"

ADojoP21RangeMaster::ADojoP21RangeMaster()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP21RangeMaster::BeginPlay()
{
	Super::BeginPlay();

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::One, IE_Pressed, this, &ADojoP21RangeMaster::HandleKey);
		InputComponent->BindKey(EKeys::Two, IE_Pressed, this, &ADojoP21RangeMaster::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP21RangeMaster::HandleKey);
	}

	StartRound();
}

void ADojoP21RangeMaster::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(RoundTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoP21RangeMaster::PressFire(int32 Number)
{
	const int32 LauncherIndex = Number - 1;
	if (!bRunning || !Launchers.IsValidIndex(LauncherIndex)) return;
	if (!IsValid(Launchers[LauncherIndex]) || GetShotsLeft(LauncherIndex) <= 0) return;

	ADojoP21Bolt* Bolt = Launchers[LauncherIndex]->Fire();
	if (Bolt == nullptr) return;

	if (ADojoP21Critter* Target = FindTarget(Bolt->GetActorLocation()))
	{
		Target->Health -= Bolt->Damage;

		if (Target->Health <= 0)
		{
			Critters.Remove(Target);
			Target->Destroy();
			DefeatedCount++;
		}
	}

	Bolt->Destroy();

	if (CritterTotal > 0 && Critters.IsEmpty())
	{
		EndRound(true);
		return;
	}

	UpdateLabel();
}

void ADojoP21RangeMaster::RestartRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoP21RangeMaster::IsRunning() const
{
	return bRunning;
}

TArray<ADojoP21Critter*> ADojoP21RangeMaster::GetCritters() const
{
	TArray<ADojoP21Critter*> Result;
	for (ADojoP21Critter* Alive : Critters) Result.Add(Alive);
	return Result;
}

TArray<ADojoP21Launcher*> ADojoP21RangeMaster::GetLaunchers() const
{
	TArray<ADojoP21Launcher*> Result;
	for (ADojoP21Launcher* Built : Launchers) Result.Add(Built);
	return Result;
}

int32 ADojoP21RangeMaster::GetDefeatedCount() const
{
	return DefeatedCount;
}

int32 ADojoP21RangeMaster::GetShotsLeft(int32 LauncherIndex) const
{
	if (!Launchers.IsValidIndex(LauncherIndex) || !IsValid(Launchers[LauncherIndex])) return 0;

	return FMath::Max(0, AmmoPerLauncher - Launchers[LauncherIndex]->ShotsFired);
}

float ADojoP21RangeMaster::GetWinSeconds() const
{
	return WinSeconds;
}

void ADojoP21RangeMaster::StartRound()
{
	ClearRange();

	UWorld* LevelWorld = GetWorld();
	if (LevelWorld == nullptr) return;

	for (const TSubclassOf<ADojoP21Launcher>& LauncherClass : LauncherClasses)
	{
		if (LauncherClass.Get() == nullptr) continue;

		const FVector Place = GetActorLocation() + FVector(0.f, 100.f * Launchers.Num(), 0.f);
		ADojoP21Launcher* Built = LevelWorld->SpawnActor<ADojoP21Launcher>(LauncherClass, Place, FRotator::ZeroRotator);
		if (Built != nullptr) Launchers.Add(Built);
	}

	WaveSpawner = LevelWorld->SpawnActor<ADojoP21Spawner>(GetActorLocation() + FVector(300.f, 0.f, 0.f), FRotator::ZeroRotator);
	if (WaveSpawner != nullptr)
	{
		WaveSpawner->Wave = Wave;
		WaveSpawner->Spacing = 150.f;
		for (ADojoP21Critter* Made : WaveSpawner->SpawnWave()) Critters.Add(Made);
	}

	CritterTotal = Critters.Num();
	DefeatedCount = 0;

	bRunning = true;
	RoundStartSeconds = LevelWorld->GetTimeSeconds();
	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP21RangeMaster::HandleTimeUp, RoundSeconds, false);

	UpdateLabel();
}

void ADojoP21RangeMaster::EndRound(bool bWon)
{
	bRunning = false;
	GetWorldTimerManager().ClearTimer(RoundTimer);

	if (!bWon)
	{
		Label->SetText(FText::FromString(TEXT("TIME UP")));
		return;
	}

	WinSeconds = GetWorld()->GetTimeSeconds() - RoundStartSeconds;

	int32 ShotsUsed = 0;
	for (const ADojoP21Launcher* Built : Launchers) ShotsUsed += Built->ShotsFired;

	Label->SetText(FText::FromString(FString::Printf(TEXT("WIN %.1f s  Shots used %d"), WinSeconds, ShotsUsed)));
}

void ADojoP21RangeMaster::ClearRange()
{
	for (ADojoP21Launcher* Built : Launchers)
	{
		if (IsValid(Built)) Built->Destroy();
	}
	Launchers.Reset();

	for (ADojoP21Critter* Alive : Critters)
	{
		if (IsValid(Alive)) Alive->Destroy();
	}
	Critters.Reset();

	if (IsValid(WaveSpawner)) WaveSpawner->Destroy();
	WaveSpawner = nullptr;
}

void ADojoP21RangeMaster::UpdateLabel()
{
	FString ShotsLeft;
	for (int32 Index = 0; Index < Launchers.Num(); Index++)
	{
		ShotsLeft += FString::Printf(TEXT(" %d"), GetShotsLeft(Index));
	}

	Label->SetText(FText::FromString(FString::Printf(TEXT("Critters %d/%d  Shots left%s"), Critters.Num(), CritterTotal, *ShotsLeft)));
}

ADojoP21Critter* ADojoP21RangeMaster::FindTarget(const FVector& From) const
{
	ADojoP21Critter* Nearest = nullptr;
	float NearestDistance = 0.f;

	for (ADojoP21Critter* Alive : Critters)
	{
		if (!IsValid(Alive) || Alive->GetActorLocation().X <= From.X) continue;

		const float Distance = FVector::Dist(From, Alive->GetActorLocation());
		if (Nearest == nullptr || Distance < NearestDistance)
		{
			Nearest = Alive;
			NearestDistance = Distance;
		}
	}

	return Nearest;
}

void ADojoP21RangeMaster::HandleTimeUp()
{
	if (bRunning) EndRound(false);
}

void ADojoP21RangeMaster::HandleKey(FKey Key)
{
	if (Key == EKeys::One) PressFire(1);
	else if (Key == EKeys::Two) PressFire(2);
	else if (Key == EKeys::R) RestartRound();
}
