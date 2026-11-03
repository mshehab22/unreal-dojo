#include "DojoP13VaultMaster.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/p13-door-conditions/DojoP13VaultDoor.h"
#include "Quests/p13-potion-recipes/DojoP13Potion.h"
#include "TimerManager.h"

ADojoP13VaultMaster::ADojoP13VaultMaster()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	StartingStats.Health = 50;
	StartingStats.Stamina = 20;
}

void ADojoP13VaultMaster::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Champion)) Champion = UGameplayStatics::GetPlayerPawn(this, 0);

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::E, IE_Pressed, this, &ADojoP13VaultMaster::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP13VaultMaster::HandleKey);
	}

	StartRound();
}

void ADojoP13VaultMaster::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(RoundTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoP13VaultMaster::PressUse()
{
	if (!bRunning || !IsValid(Champion)) return;

	int32 Nearest = INDEX_NONE;
	float NearestDistance = UseRange;

	for (int32 Index = 0; Index < Stations.Num(); Index++)
	{
		if (!IsValid(Stations[Index]) || Used[Index]) continue;

		// Strictly nearer only, so the earlier entry keeps a tie.
		const float Distance = FVector::Dist(Champion->GetActorLocation(), Stations[Index]->GetActorLocation());
		if (Distance > NearestDistance || (Nearest != INDEX_NONE && Distance == NearestDistance)) continue;

		Nearest = Index;
		NearestDistance = Distance;
	}

	if (Nearest == INDEX_NONE) return;

	if (ADojoP13Potion* Potion = Cast<ADojoP13Potion>(Stations[Nearest]))
	{
		Used[Nearest] = true;
		if (!Potion->Drink(ChampionStats)) FizzleCount++;
	}
	else if (ADojoP13VaultDoor* Door = Cast<ADojoP13VaultDoor>(Stations[Nearest]))
	{
		if (Door->TryOpen(ChampionStats))
		{
			Used[Nearest] = true;
			OpenDoorCount++;
		}
	}

	if (DoorCount > 0 && OpenDoorCount == DoorCount)
	{
		EndRound(true);
		return;
	}

	UpdateLabel();
}

void ADojoP13VaultMaster::RestartRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoP13VaultMaster::IsRunning() const
{
	return bRunning;
}

TArray<AActor*> ADojoP13VaultMaster::GetStations() const
{
	TArray<AActor*> Result;
	for (AActor* Station : Stations) Result.Add(Station);
	return Result;
}

FDojoP13Stats ADojoP13VaultMaster::GetChampionStats() const
{
	return ChampionStats;
}

int32 ADojoP13VaultMaster::GetDoorCount() const
{
	return DoorCount;
}

int32 ADojoP13VaultMaster::GetOpenDoorCount() const
{
	return OpenDoorCount;
}

int32 ADojoP13VaultMaster::GetFizzleCount() const
{
	return FizzleCount;
}

float ADojoP13VaultMaster::GetWinSeconds() const
{
	return WinSeconds;
}

void ADojoP13VaultMaster::StartRound()
{
	ClearStations();

	ChampionStats = StartingStats;
	DoorCount = 0;
	OpenDoorCount = 0;
	FizzleCount = 0;

	for (const FDojoP13ModEntry& Entry : Mod)
	{
		Stations.Add(BuildStation(Entry));
		if (Entry.Kind == EDojoP13StationKind::ESK_Door) DoorCount++;
	}
	Used.Init(false, Stations.Num());

	bRunning = true;
	RoundStartSeconds = GetWorld()->GetTimeSeconds();
	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP13VaultMaster::HandleTimeUp, RoundSeconds, false);

	UpdateLabel();
}

void ADojoP13VaultMaster::EndRound(bool bWon)
{
	bRunning = false;
	GetWorldTimerManager().ClearTimer(RoundTimer);

	if (bWon) WinSeconds = GetWorld()->GetTimeSeconds() - RoundStartSeconds;

	if (bWon) Label->SetText(FText::FromString(FString::Printf(TEXT("WIN %.1f s  Health %d  Gold %d"), WinSeconds, ChampionStats.Health, ChampionStats.Gold)));
	else Label->SetText(FText::FromString(TEXT("TIME UP")));
}

AActor* ADojoP13VaultMaster::BuildStation(const FDojoP13ModEntry& Entry)
{
	UWorld* LevelWorld = GetWorld();
	if (!LevelWorld) return nullptr;

	if (Entry.Kind == EDojoP13StationKind::ESK_Potion)
	{
		ADojoP13Potion* Potion = LevelWorld->SpawnActor<ADojoP13Potion>(Entry.Spot, FRotator::ZeroRotator);
		if (Potion) Potion->Recipe = Entry.Recipe;
		return Potion;
	}

	ADojoP13VaultDoor* Door = LevelWorld->SpawnActor<ADojoP13VaultDoor>(Entry.Spot, FRotator::ZeroRotator);
	if (Door) Door->Condition = Entry.Condition;
	return Door;
}

void ADojoP13VaultMaster::ClearStations()
{
	for (AActor* Station : Stations)
	{
		if (IsValid(Station)) Station->Destroy();
	}
	Stations.Reset();
	Used.Reset();
}

void ADojoP13VaultMaster::UpdateLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Doors %d/%d  Health %d  Gold %d  Keys %d  Fizzled %d"), OpenDoorCount, DoorCount, ChampionStats.Health, ChampionStats.Gold, ChampionStats.Keys, FizzleCount)));
}

void ADojoP13VaultMaster::HandleTimeUp()
{
	if (bRunning) EndRound(false);
}

void ADojoP13VaultMaster::HandleKey(FKey Key)
{
	if (Key == EKeys::E) PressUse();
	else if (Key == EKeys::R) RestartRound();
}
