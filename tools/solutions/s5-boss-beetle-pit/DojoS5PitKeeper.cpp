#include "DojoS5PitKeeper.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Quests/s5-pool/DojoS5Beetle.h"
#include "Quests/s5-pool/DojoS5PoolComponent.h"
#include "Quests/s5-wave-banner/DojoS5WaveBanner.h"
#include "Quests/s5-wave-director/DojoS5WaveDirector.h"
#include "Quests/s5-wave-plan/DojoS5Hatch.h"
#include "Quests/s5-wave-plan/DojoS5WavePlan.h"

ADojoS5PitKeeper::ADojoS5PitKeeper()
{
	PrimaryActorTick.bCanEverTick = false;

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	RootComponent = Board;

	Pool = CreateDefaultSubobject<UDojoS5PoolComponent>(TEXT("Pool"));
}

void ADojoS5PitKeeper::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Hero) || Plan == nullptr)
	{
		return;
	}

	HeroStartRotation = Hero->GetActorRotation();

	// Ahead, right, behind, left of the keeper: the order the director tries them in.
	const FVector Center = GetActorLocation();
	const FVector Offsets[] = { FVector(HatchDistance, 0.f, 0.f), FVector(0.f, HatchDistance, 0.f), FVector(-HatchDistance, 0.f, 0.f), FVector(0.f, -HatchDistance, 0.f) };
	TArray<ADojoS5Hatch*> NewHatches;

	for (const FVector& Offset : Offsets)
	{
		if (ADojoS5Hatch* Hatch = GetWorld()->SpawnActor<ADojoS5Hatch>(Center + Offset, FRotator::ZeroRotator))
		{
			Hatches.Add(Hatch);
			NewHatches.Add(Hatch);
		}
	}

	Director = GetWorld()->SpawnActor<ADojoS5WaveDirector>(Center, FRotator::ZeroRotator);
	Banner = GetWorld()->SpawnActor<ADojoS5WaveBanner>(Center + BannerOffset, FRotator::ZeroRotator);

	if (Director == nullptr)
	{
		return;
	}

	Director->Setup(Plan, Pool, Hero, NewHatches);
	Director->OnWaveStarted.AddUniqueDynamic(this, &ADojoS5PitKeeper::HandleWaveStarted);
	Director->OnWaveCleared.AddUniqueDynamic(this, &ADojoS5PitKeeper::HandleWaveCleared);
	Director->OnRestStarted.AddUniqueDynamic(this, &ADojoS5PitKeeper::HandleRestStarted);

	if (Banner != nullptr)
	{
		Banner->Watch(Director);
	}

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);

		for (const FKey& Key : { EKeys::SpaceBar, EKeys::Q, EKeys::E, EKeys::R })
		{
			InputComponent->BindKey(Key, IE_Pressed, this, &ADojoS5PitKeeper::HandleKey);
		}
	}

	StartNight();
}

void ADojoS5PitKeeper::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (Director != nullptr)
	{
		Director->OnWaveStarted.RemoveDynamic(this, &ADojoS5PitKeeper::HandleWaveStarted);
		Director->OnWaveCleared.RemoveDynamic(this, &ADojoS5PitKeeper::HandleWaveCleared);
		Director->OnRestStarted.RemoveDynamic(this, &ADojoS5PitKeeper::HandleRestStarted);
	}

	// On a level change the level takes the spawned actors along; only a keeper removed from a running level clears up after itself.
	if (EndPlayReason == EEndPlayReason::Destroyed || EndPlayReason == EEndPlayReason::RemovedFromWorld)
	{
		if (IsValid(Banner))
		{
			Banner->Destroy();
		}

		if (IsValid(Director))
		{
			Director->Destroy();
		}

		for (ADojoS5Hatch* Hatch : Hatches)
		{
			if (IsValid(Hatch))
			{
				Hatch->Destroy();
			}
		}

		Hatches.Empty();
	}

	Super::EndPlay(EndPlayReason);
}

void ADojoS5PitKeeper::PressSwat()
{
	if (!bRunning || !IsValid(Hero) || Pool == nullptr)
	{
		return;
	}

	const FVector Eye = Hero->GetActorLocation();
	const FVector Facing = Hero->GetActorForwardVector();
	const float MinFacing = FMath::Cos(FMath::DegreesToRadians(SwatHalfAngle));
	ADojoS5Beetle* Nearest = nullptr;
	float NearestDistance = 0.f;

	for (ADojoS5Beetle* Beetle : Pool->GetAwakeBeetles())
	{
		const FVector ToBeetle = Beetle->GetActorLocation() - Eye;
		const float Distance = ToBeetle.Size();

		if (FVector::DotProduct(Facing, ToBeetle.GetSafeNormal()) < MinFacing)
		{
			continue;
		}

		// Strictly nearer only, so between equal distances the beetle the pool made first wins.
		if (Nearest == nullptr || Distance < NearestDistance)
		{
			Nearest = Beetle;
			NearestDistance = Distance;
		}
	}

	if (Nearest == nullptr)
	{
		return;
	}

	++Swats;
	RefreshBoard();
	Nearest->Defeat();
}

void ADojoS5PitKeeper::PressTurn(bool bRight)
{
	if (!bRunning || !IsValid(Hero))
	{
		return;
	}

	Hero->AddActorWorldRotation(FRotator(0.f, bRight ? 90.f : -90.f, 0.f));
}

void ADojoS5PitKeeper::RestartNight()
{
	if (bFinished)
	{
		StartNight();
	}
}

bool ADojoS5PitKeeper::IsRunning() const
{
	return bRunning;
}

bool ADojoS5PitKeeper::IsGateOpen() const
{
	return bGateOpen;
}

int32 ADojoS5PitKeeper::GetSwats() const
{
	return Swats;
}

float ADojoS5PitKeeper::GetFinishSeconds() const
{
	return FinishSeconds;
}

ADojoS5WaveDirector* ADojoS5PitKeeper::GetDirector() const
{
	return Director;
}

ADojoS5WaveBanner* ADojoS5PitKeeper::GetBanner() const
{
	return Banner;
}

TArray<ADojoS5Hatch*> ADojoS5PitKeeper::GetHatches() const
{
	TArray<ADojoS5Hatch*> Result;

	for (ADojoS5Hatch* Hatch : Hatches)
	{
		Result.Add(Hatch);
	}

	return Result;
}

void ADojoS5PitKeeper::HandleWaveStarted(int32 Wave, int32 BeetleCount)
{
	bGateOpen = false;
	RefreshBoard();
}

void ADojoS5PitKeeper::HandleWaveCleared(int32 Wave)
{
	if (Director != nullptr && Director->GetState() == EDojoS5DirectorState::EDS_Done && bRunning)
	{
		bRunning = false;
		bFinished = true;
		bGateOpen = true;
		FinishSeconds = GetWorld()->GetTimeSeconds() - StartSeconds;
	}

	RefreshBoard();
}

void ADojoS5PitKeeper::HandleRestStarted(int32 NextWave, float Seconds)
{
	bGateOpen = true;
	RefreshBoard();
}

void ADojoS5PitKeeper::HandleKey(FKey Key)
{
	if (Key == EKeys::SpaceBar)
	{
		PressSwat();
	}
	else if (Key == EKeys::Q)
	{
		PressTurn(false);
	}
	else if (Key == EKeys::E)
	{
		PressTurn(true);
	}
	else if (Key == EKeys::R)
	{
		RestartNight();
	}
}

void ADojoS5PitKeeper::StartNight()
{
	if (Director == nullptr || !IsValid(Hero))
	{
		return;
	}

	Hero->SetActorRotation(HeroStartRotation);
	Swats = 0;
	bRunning = true;
	bFinished = false;
	bGateOpen = false;
	FinishSeconds = 0.f;
	StartSeconds = GetWorld()->GetTimeSeconds();

	Director->StopNight();
	Director->StartNight();
	RefreshBoard();
}

void ADojoS5PitKeeper::RefreshBoard()
{
	FString Text = FString::Printf(TEXT("Swats %d\nGate %s"), Swats, bGateOpen ? TEXT("open") : TEXT("shut"));

	if (bFinished)
	{
		Text += FString::Printf(TEXT("\nCLEARED in %.1f s"), FinishSeconds);
	}

	Board->SetText(FText::FromString(Text));
}
