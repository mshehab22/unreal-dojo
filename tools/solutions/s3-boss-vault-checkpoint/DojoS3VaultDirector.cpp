#include "DojoS3VaultDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "DojoS3Coin.h"
#include "DojoS3Runner.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/s3-door/DojoS3Door.h"
#include "Quests/s3-save-system/DojoS3SaveSystem.h"
#include "Quests/s3-saveable/DojoS3SaveableComponent.h"

ADojoS3VaultDirector::ADojoS3VaultDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	RootComponent = Board;
}

void ADojoS3VaultDirector::BeginPlay()
{
	Super::BeginPlay();

	SaveSystem = GetWorld()->GetSubsystem<UDojoS3SaveSystem>();

	if (SaveSystem == nullptr)
	{
		return;
	}

	SaveSystem->OnSaved.AddUniqueDynamic(this, &ADojoS3VaultDirector::HandleSaved);
	SaveSystem->OnLoaded.AddUniqueDynamic(this, &ADojoS3VaultDirector::HandleLoaded);

	Runner = GetWorld()->SpawnActor<ADojoS3Runner>(FVector::ZeroVector, FRotator::ZeroRotator);

	if (Runner != nullptr)
	{
		Runner->Saveable->SaveId = TEXT("Runner");
	}

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);

		for (const FKey& Key : { EKeys::Left, EKeys::Right, EKeys::E, EKeys::Q, EKeys::F5, EKeys::F9, EKeys::R })
		{
			InputComponent->BindKey(Key, IE_Pressed, this, &ADojoS3VaultDirector::HandleKey);
		}
	}

	StartRound();
}

void ADojoS3VaultDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (SaveSystem != nullptr)
	{
		SaveSystem->OnSaved.RemoveDynamic(this, &ADojoS3VaultDirector::HandleSaved);
		SaveSystem->OnLoaded.RemoveDynamic(this, &ADojoS3VaultDirector::HandleLoaded);
	}

	Super::EndPlay(EndPlayReason);
}

void ADojoS3VaultDirector::PressStep(int32 Direction)
{
	if (!bRunning || Runner == nullptr || Direction == 0)
	{
		return;
	}

	const float Target = Runner->GetSpot() + FMath::Sign(Direction) * StepLength;

	if (Target < 0.f || Target > VaultLength)
	{
		return;
	}

	for (const ADojoS3Door* Door : Doors)
	{
		if (IsValid(Door) && !Door->IsOpen() && FMath::Abs(Door->GetActorLocation().X - Target) < 1.f)
		{
			return;
		}
	}

	Runner->MoveTo(Target);
	RefreshBoard();
}

void ADojoS3VaultDirector::PressTake()
{
	if (!bRunning || Runner == nullptr)
	{
		return;
	}

	ADojoS3Coin* Nearest = nullptr;
	float NearestDistance = CoinReach;

	for (ADojoS3Coin* Coin : GetCoins())
	{
		const float Distance = FMath::Abs(Coin->GetActorLocation().X - Runner->GetSpot());

		if (Distance <= CoinReach && (Nearest == nullptr || Distance < NearestDistance))
		{
			Nearest = Coin;
			NearestDistance = Distance;
		}
	}

	if (Nearest == nullptr)
	{
		return;
	}

	Runner->AddCoins(Nearest->Take());
	RefreshBoard();
}

void ADojoS3VaultDirector::PressDoor()
{
	if (!bRunning || Runner == nullptr)
	{
		return;
	}

	ADojoS3Door* Nearest = nullptr;
	float NearestDistance = DoorReach;

	for (ADojoS3Door* Door : Doors)
	{
		if (!IsValid(Door))
		{
			continue;
		}

		const float Distance = FMath::Abs(Door->GetActorLocation().X - Runner->GetSpot());

		// A door the runner stands in cannot be shut on it.
		if (Distance >= 1.f && Distance <= DoorReach && (Nearest == nullptr || Distance < NearestDistance))
		{
			Nearest = Door;
			NearestDistance = Distance;
		}
	}

	if (Nearest == nullptr)
	{
		return;
	}

	Nearest->Toggle();
	RefreshBoard();
}

void ADojoS3VaultDirector::PressSave()
{
	if (bRunning && SaveSystem != nullptr)
	{
		SaveSystem->SaveToSlot(SlotName);
	}
}

void ADojoS3VaultDirector::PressLoad()
{
	if (!bRunning || SaveSystem == nullptr || !UGameplayStatics::DoesSaveGameExist(SlotName, 0))
	{
		return;
	}

	// The checkpoint goes onto a fresh layout, the way a reloaded level would look, so what was taken after the save comes back.
	LayOut();
	SaveSystem->LoadFromSlot(SlotName);
}

void ADojoS3VaultDirector::RestartRound()
{
	if (!bFinished || SaveSystem == nullptr)
	{
		return;
	}

	UGameplayStatics::DeleteGameInSlot(SlotName, 0);
	StartRound();
}

bool ADojoS3VaultDirector::IsRunning() const
{
	return bRunning;
}

float ADojoS3VaultDirector::GetFinishSeconds() const
{
	return FinishSeconds;
}

ADojoS3Runner* ADojoS3VaultDirector::GetRunner() const
{
	return Runner;
}

TArray<ADojoS3Coin*> ADojoS3VaultDirector::GetCoins() const
{
	TArray<ADojoS3Coin*> Live;

	for (ADojoS3Coin* Coin : Coins)
	{
		if (IsValid(Coin) && !Coin->IsActorBeingDestroyed())
		{
			Live.Add(Coin);
		}
	}

	return Live;
}

TArray<ADojoS3Door*> ADojoS3VaultDirector::GetDoors() const
{
	TArray<ADojoS3Door*> Result;

	for (ADojoS3Door* Door : Doors)
	{
		Result.Add(Door);
	}

	return Result;
}

void ADojoS3VaultDirector::HandleSaved(const FString& SavedSlot, bool bSucceeded)
{
	CheckpointText = bSucceeded ? TEXT("saved") : TEXT("failed");
	RefreshBoard();
}

void ADojoS3VaultDirector::HandleLoaded(const FString& LoadedSlot, bool bSucceeded)
{
	CheckpointText = bSucceeded ? TEXT("loaded") : TEXT("failed");
	RefreshBoard();
}

void ADojoS3VaultDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::Left) PressStep(-1);
	if (Key == EKeys::Right) PressStep(1);
	if (Key == EKeys::E) PressTake();
	if (Key == EKeys::Q) PressDoor();
	if (Key == EKeys::F5) PressSave();
	if (Key == EKeys::F9) PressLoad();
	if (Key == EKeys::R) RestartRound();
}

void ADojoS3VaultDirector::LayOut()
{
	Coins.SetNum(CoinSpots.Num());

	for (int32 Index = 0; Index < CoinSpots.Num(); ++Index)
	{
		if (IsValid(Coins[Index]) && !Coins[Index]->IsActorBeingDestroyed())
		{
			continue;
		}

		Coins[Index] = GetWorld()->SpawnActor<ADojoS3Coin>(FVector(CoinSpots[Index], 0.f, 0.f), FRotator::ZeroRotator);

		if (Coins[Index] != nullptr)
		{
			Coins[Index]->Saveable->SaveId = FName(*FString::Printf(TEXT("Coin%d"), Index + 1));
		}
	}

	Doors.SetNum(DoorSpots.Num());

	for (int32 Index = 0; Index < DoorSpots.Num(); ++Index)
	{
		if (!IsValid(Doors[Index]))
		{
			Doors[Index] = GetWorld()->SpawnActor<ADojoS3Door>(FVector(DoorSpots[Index], 0.f, 0.f), FRotator::ZeroRotator);

			if (Doors[Index] != nullptr)
			{
				Doors[Index]->Saveable->SaveId = FName(*FString::Printf(TEXT("Door%d"), Index + 1));
			}
		}

		if (Doors[Index] != nullptr)
		{
			Doors[Index]->Close();
		}
	}

	if (Runner != nullptr)
	{
		Runner->ResetRun();
	}
}

void ADojoS3VaultDirector::StartRound()
{
	bRunning = false;
	bFinished = false;
	FinishSeconds = 0.f;

	LayOut();
	CheckpointText = TEXT("none");

	bRunning = true;
	StartSeconds = GetWorld()->GetTimeSeconds();
	RefreshBoard();
}

void ADojoS3VaultDirector::RefreshBoard()
{
	if (Runner == nullptr)
	{
		return;
	}

	if (bRunning && CoinSpots.Num() > 0 && Runner->GetCoins() >= CoinSpots.Num())
	{
		bRunning = false;
		bFinished = true;
		FinishSeconds = GetWorld()->GetTimeSeconds() - StartSeconds;
	}

	int32 OpenDoors = 0;

	for (const ADojoS3Door* Door : Doors)
	{
		if (IsValid(Door) && Door->IsOpen())
		{
			++OpenDoors;
		}
	}

	TArray<FString> Lines;
	Lines.Add(FString::Printf(TEXT("Coins %d/%d"), Runner->GetCoins(), CoinSpots.Num()));
	Lines.Add(FString::Printf(TEXT("Doors open %d/%d"), OpenDoors, DoorSpots.Num()));
	Lines.Add(FString::Printf(TEXT("Checkpoint %s"), *CheckpointText));

	if (bFinished)
	{
		Lines.Add(FString::Printf(TEXT("CLEAR in %.1f s"), FinishSeconds));
	}

	Board->SetText(FText::FromString(FString::Join(Lines, TEXT("\n"))));
}
