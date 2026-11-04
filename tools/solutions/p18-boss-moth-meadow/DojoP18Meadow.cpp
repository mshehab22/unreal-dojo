#include "DojoP18Meadow.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/p18-lantern-grid/DojoP18Lantern.h"
#include "Quests/p18-moth-swarm/DojoP18MothSwarm.h"

ADojoP18Meadow::ADojoP18Meadow()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP18Meadow::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Keeper)) Keeper = UGameplayStatics::GetPlayerPawn(this, 0);

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::E, IE_Pressed, this, &ADojoP18Meadow::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP18Meadow::HandleKey);
	}

	StartRound();
}

void ADojoP18Meadow::StartRound()
{
	ClearMeadow();

	UWorld* World = GetWorld();
	const FVector Middle = GetActorLocation();

	LanternGrid = FDojoP18Grid(LanternCellSize);
	const FRandomStream Stream(LanternSeed);
	for (int32 Index = 0; Index < LanternCount; ++Index)
	{
		const FVector Spot(Middle.X + Stream.FRandRange(-HalfSize, HalfSize), Middle.Y + Stream.FRandRange(-HalfSize, HalfSize), Middle.Z);
		ADojoP18Lantern* Lantern = World->SpawnActor<ADojoP18Lantern>(Spot, FRotator::ZeroRotator);
		if (!Lantern) continue;

		Lanterns.Add(Lantern);
		LitAt.Add(0.f);
		LanternGrid.Add(Lantern);
	}

	const FTransform SwarmSpot(Middle);
	Swarm = World->SpawnActorDeferred<ADojoP18MothSwarm>(ADojoP18MothSwarm::StaticClass(), SwarmSpot);
	if (Swarm)
	{
		Swarm->Count = MothCount;
		Swarm->Seed = MothSeed;
		Swarm->HalfSize = HalfSize;
		Swarm->FinishSpawning(SwarmSpot);
		Swarm->SetActorTickEnabled(false);
	}

	Score = 0;
	LastDrawn = 0;
	ScoredSeconds = 0;
	Elapsed = 0.f;
	bRunning = true;
	UpdateLabel();
}

void ADojoP18Meadow::ClearMeadow()
{
	for (ADojoP18Lantern* Lantern : Lanterns)
	{
		if (IsValid(Lantern)) Lantern->Destroy();
	}

	if (IsValid(Swarm)) Swarm->Destroy();

	Lanterns.Reset();
	LitAt.Reset();
	Swarm = nullptr;
	LanternGrid = FDojoP18Grid(LanternCellSize);
}

void ADojoP18Meadow::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bRunning) return;

	if (IsValid(Swarm)) Swarm->Step(DeltaSeconds);
	Elapsed += DeltaSeconds;

	for (int32 Index = 0; Index < Lanterns.Num(); ++Index)
	{
		if (IsValid(Lanterns[Index]) && Lanterns[Index]->bLit && Elapsed - LitAt[Index] >= BurnSeconds) Lanterns[Index]->bLit = false;
	}

	while (bRunning && Elapsed >= static_cast<float>(ScoredSeconds + 1))
	{
		ScoreSecond();
		if (static_cast<float>(ScoredSeconds) >= RoundSeconds) bRunning = false;
	}

	if (Elapsed >= RoundSeconds) bRunning = false;

	UpdateLabel();
}

void ADojoP18Meadow::ScoreSecond()
{
	int32 Drawn = 0;

	if (IsValid(Swarm))
	{
		TArray<bool> Counted;
		Counted.Init(false, Swarm->GetMoths().Num());

		TArray<int32> Near;
		for (ADojoP18Lantern* Lantern : Lanterns)
		{
			if (!IsValid(Lantern) || !Lantern->bLit) continue;

			const FVector Spot = Lantern->GetActorLocation();
			Swarm->FindNear(FVector2D(Spot.X, Spot.Y), DrawRange, Near);
			for (const int32 Moth : Near)
			{
				if (Counted[Moth]) continue;

				Counted[Moth] = true;
				++Drawn;
			}
		}
	}

	LastDrawn = Drawn;
	Score += Drawn;
	++ScoredSeconds;
}

void ADojoP18Meadow::PressLight()
{
	if (!bRunning || !IsValid(Keeper)) return;

	const FVector From = Keeper->GetActorLocation();
	TArray<AActor*> Near;
	LanternGrid.FindNear(From, UseRange, Near);

	int32 Best = INDEX_NONE;
	double BestDistance = TNumericLimits<double>::Max();
	for (AActor* Candidate : Near)
	{
		ADojoP18Lantern* Lantern = Cast<ADojoP18Lantern>(Candidate);
		if (!Lantern || Lantern->bLit) continue;

		const int32 Index = Lanterns.IndexOfByKey(Lantern);
		const double Distance = FVector::Dist2D(Lantern->GetActorLocation(), From);
		if (Distance < BestDistance || (Distance == BestDistance && Index < Best))
		{
			Best = Index;
			BestDistance = Distance;
		}
	}

	if (Best == INDEX_NONE) return;

	Lanterns[Best]->bLit = true;
	LitAt[Best] = Elapsed;
	UpdateLabel();
}

void ADojoP18Meadow::RestartRound()
{
	if (bRunning) return;

	StartRound();
}

void ADojoP18Meadow::HandleKey(FKey Key)
{
	if (Key == EKeys::E) PressLight();
	else if (Key == EKeys::R) RestartRound();
}

void ADojoP18Meadow::UpdateLabel()
{
	if (!Label) return;

	if (!bRunning)
	{
		Label->SetText(FText::FromString(FString::Printf(TEXT("DUSK  SCORE %d"), Score)));
		return;
	}

	int32 Burning = 0;
	for (const ADojoP18Lantern* Lantern : Lanterns)
	{
		if (IsValid(Lantern) && Lantern->bLit) ++Burning;
	}

	const int32 SecondsLeft = FMath::Max(0, FMath::CeilToInt32(RoundSeconds - Elapsed));
	Label->SetText(FText::FromString(FString::Printf(TEXT("SCORE %d  LIT %d  %d s"), Score, Burning, SecondsLeft)));
}

bool ADojoP18Meadow::IsRunning() const
{
	return bRunning;
}

int32 ADojoP18Meadow::GetScore() const
{
	return Score;
}

int32 ADojoP18Meadow::GetLastDrawn() const
{
	return LastDrawn;
}

int32 ADojoP18Meadow::GetScoredSeconds() const
{
	return ScoredSeconds;
}

float ADojoP18Meadow::GetElapsed() const
{
	return Elapsed;
}

TArray<ADojoP18Lantern*> ADojoP18Meadow::GetLanterns() const
{
	TArray<ADojoP18Lantern*> Result;
	for (ADojoP18Lantern* Lantern : Lanterns) Result.Add(Lantern);
	return Result;
}

ADojoP18MothSwarm* ADojoP18Meadow::GetSwarm() const
{
	return Swarm;
}
