#include "DojoF6RangeDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "DojoF6WaveRow.h"
#include "Engine/DataTable.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Quests/f6-level-curve/DojoF6LevelComponent.h"
#include "Quests/f6-showcase/DojoF6Showcase.h"
#include "Quests/f6-target-table/DojoF6Target.h"
#include "Quests/f6-target-table/DojoF6TargetSpawner.h"
#include "Quests/f6-weapon-data/DojoF6Blaster.h"
#include "Quests/f6-weapon-data/DojoF6WeaponData.h"

DEFINE_LOG_CATEGORY_STATIC(LogDojoF6Range, Log, All);

ADojoF6RangeDirector::ADojoF6RangeDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	Progress = CreateDefaultSubobject<UDojoF6LevelComponent>(TEXT("Progress"));
}

void ADojoF6RangeDirector::BeginPlay()
{
	Super::BeginPlay();

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::F, IE_Pressed, this, &ADojoF6RangeDirector::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoF6RangeDirector::HandleKey);
	}

	StartRound();
}

void ADojoF6RangeDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::F) PressFire();
	if (Key == EKeys::R) RestartRound();
}

void ADojoF6RangeDirector::StartRound()
{
	for (ADojoF6Target* Target : StandingTargets)
	{
		if (IsValid(Target)) Target->Destroy();
	}
	StandingTargets.Reset();

	Progress->ResetProgress();
	EquipWeapon(0);

	Score = 0;
	Shots = 0;
	WaveIndex = -1;
	bRunning = true;

	StartNextWave();
}

void ADojoF6RangeDirector::StartNextWave()
{
	const TArray<FName> RowNames = IsValid(Waves) ? Waves->GetRowNames() : TArray<FName>();

	while (StandingTargets.IsEmpty())
	{
		WaveIndex++;
		if (!RowNames.IsValidIndex(WaveIndex))
		{
			EndRound();
			return;
		}

		const FDojoF6WaveRow* Wave = Waves->FindRow<FDojoF6WaveRow>(RowNames[WaveIndex], TEXT("Range wave"));
		for (int32 Index = 0; Wave && IsValid(Spawner) && Index < Wave->Count; Index++)
		{
			const FVector Location = GetActorLocation() + FVector(0.f, Index * TargetSpacing, 0.f);
			if (ADojoF6Target* Target = Spawner->SpawnTarget(Wave->TargetKind, Location)) StandingTargets.Add(Target);
		}

		if (StandingTargets.IsEmpty()) UE_LOG(LogDojoF6Range, Warning, TEXT("Wave %s spawned no targets and is skipped"), *RowNames[WaveIndex].ToString());
	}

	ShowStatus();
}

void ADojoF6RangeDirector::PressFire()
{
	if (!bRunning || !IsValid(Blaster)) return;

	// An empty clip spends the press on a reload, so a reload is never a free shot.
	if (Blaster->GetAmmo() <= 0)
	{
		Blaster->Reload();
		return;
	}

	StandingTargets.RemoveAll([](const TObjectPtr<ADojoF6Target>& Target) { return !IsValid(Target); });
	if (StandingTargets.IsEmpty()) return;

	ADojoF6Target* Oldest = StandingTargets[0];
	const int32 Points = Oldest->GetPoints();

	Shots++;
	if (Oldest->TakeShot(Blaster->Fire()))
	{
		StandingTargets.RemoveAt(0);
		Score += Points;
		Progress->AddXP(Points);

		if (WeaponIndex == 0 && Progress->GetLevel() >= UpgradeLevel) EquipWeapon(1);
	}

	if (StandingTargets.IsEmpty())
	{
		StartNextWave();
		return;
	}

	ShowStatus();
}

void ADojoF6RangeDirector::RestartRound()
{
	if (bRunning) return;

	StartRound();
}

void ADojoF6RangeDirector::EndRound()
{
	bRunning = false;
	Label->SetText(FText::FromString(FString::Printf(TEXT("CLEAR %d in %d shots"), Score, Shots)));
}

void ADojoF6RangeDirector::EquipWeapon(int32 Index)
{
	if (!Weapons.IsValidIndex(Index) || !IsValid(Weapons[Index])) return;

	WeaponIndex = Index;
	if (IsValid(Blaster)) Blaster->SetWeapon(Weapons[Index]);
	if (IsValid(Showcase)) Showcase->ShowMesh(Weapons[Index]->Mesh);
}

void ADojoF6RangeDirector::ShowStatus()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("WAVE %d SCORE %d"), WaveIndex + 1, Score)));
}

bool ADojoF6RangeDirector::IsRunning() const
{
	return bRunning;
}

int32 ADojoF6RangeDirector::GetWaveNumber() const
{
	return WaveIndex + 1;
}

int32 ADojoF6RangeDirector::GetScore() const
{
	return Score;
}

int32 ADojoF6RangeDirector::GetShots() const
{
	return Shots;
}

TArray<ADojoF6Target*> ADojoF6RangeDirector::GetStandingTargets() const
{
	TArray<ADojoF6Target*> Standing;
	for (ADojoF6Target* Target : StandingTargets)
	{
		if (IsValid(Target)) Standing.Add(Target);
	}
	return Standing;
}
