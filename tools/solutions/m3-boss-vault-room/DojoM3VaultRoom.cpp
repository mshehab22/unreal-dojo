#include "DojoM3VaultRoom.h"

#include "Components/BoxComponent.h"
#include "Components/SceneComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/m3-checkpoint/DojoM3Checkpoint.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-pawn-gate/DojoM3Gate.h"
#include "Quests/m3-return-pit/DojoM3Pit.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"
#include "Quests/m3-scale-plate/DojoM3Plate.h"

namespace DojoM3VaultRoomSpots
{
	/** Where each piece stands; the spec fixes these. */
	const FVector Flag(600.f, 0.f, 0.f);
	const FVector Plate(900.f, 500.f, 0.f);
	const FVector Pit(900.f, -500.f, 0.f);
	const FVector Gate(1200.f, 0.f, 0.f);
	const FVector Vault(1600.f, 0.f, 0.f);
}

ADojoM3VaultRoom::ADojoM3VaultRoom()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	Vault = CreateDefaultSubobject<UBoxComponent>(TEXT("Vault"));
	Vault->SetupAttachment(RootComponent);
	Vault->SetRelativeLocation(DojoM3VaultRoomSpots::Vault);
	Vault->SetBoxExtent(FVector(100.f, 300.f, 200.f));
	Vault->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	Vault->SetCollisionResponseToAllChannels(ECR_Ignore);
	Vault->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	Board->SetupAttachment(RootComponent);
	Board->SetRelativeLocation(FVector(0.f, 0.f, 300.f));
	Board->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM3VaultRoom::BeginPlay()
{
	Super::BeginPlay();

	Vault->OnComponentBeginOverlap.AddDynamic(this, &ADojoM3VaultRoom::HandleVaultBeginOverlap);
	StartRound();
}

bool ADojoM3VaultRoom::PressDispense()
{
	if (!bRunning || Crates.Num() >= MaxCrates)
	{
		return false;
	}

	FActorSpawnParameters Parameters;
	Parameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	ADojoM3Crate* Crate = GetWorld()->SpawnActor<ADojoM3Crate>(Chute, FRotator::ZeroRotator, Parameters);
	if (!Crate)
	{
		return false;
	}

	Crates.Add(Crate);
	return true;
}

bool ADojoM3VaultRoom::PressRestart()
{
	if (bRunning)
	{
		return false;
	}

	StartRound();
	return true;
}

bool ADojoM3VaultRoom::IsRunning() const
{
	return bRunning;
}

int32 ADojoM3VaultRoom::GetFalls() const
{
	return Falls;
}

float ADojoM3VaultRoom::GetRoundSeconds() const
{
	if (!bRunning)
	{
		return FinishSeconds;
	}

	return static_cast<float>(GetWorld()->GetTimeSeconds() - RoundStartSeconds);
}

ADojoM3Checkpoint* ADojoM3VaultRoom::GetFlag() const
{
	return Flag;
}

ADojoM3Plate* ADojoM3VaultRoom::GetPlate() const
{
	return Plate;
}

ADojoM3Gate* ADojoM3VaultRoom::GetGate() const
{
	return Gate;
}

ADojoM3Pit* ADojoM3VaultRoom::GetPit() const
{
	return Pit;
}

TArray<ADojoM3Crate*> ADojoM3VaultRoom::GetCrates() const
{
	TArray<ADojoM3Crate*> Result;
	for (ADojoM3Crate* Crate : Crates)
	{
		Result.Add(Crate);
	}

	return Result;
}

void ADojoM3VaultRoom::StartRound()
{
	ClearPieces();

	if (Runner)
	{
		Runner->SetActorLocation(Entrance, false, nullptr, ETeleportType::TeleportPhysics);
		Runner->SetRespawnPoint(Entrance);
	}

	UWorld* World = GetWorld();
	Flag = World->SpawnActor<ADojoM3Checkpoint>(DojoM3VaultRoomSpots::Flag, FRotator::ZeroRotator);
	Gate = World->SpawnActor<ADojoM3Gate>(DojoM3VaultRoomSpots::Gate, FRotator::ZeroRotator);
	Pit = World->SpawnActor<ADojoM3Pit>(DojoM3VaultRoomSpots::Pit, FRotator::ZeroRotator);

	const FTransform PlateSpot(DojoM3VaultRoomSpots::Plate);
	Plate = World->SpawnActorDeferred<ADojoM3Plate>(ADojoM3Plate::StaticClass(), PlateSpot);
	Plate->RequiredCount = PlateNeeds;
	Plate->FinishSpawning(PlateSpot);

	Plate->OnCountChanged.AddDynamic(this, &ADojoM3VaultRoom::HandlePlateCountChanged);
	Pit->Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM3VaultRoom::HandlePitBeginOverlap);

	Falls = 0;
	FinishSeconds = 0.f;
	RoundStartSeconds = World->GetTimeSeconds();
	bRunning = true;

	RefreshBoard();
}

void ADojoM3VaultRoom::EndRound()
{
	FinishSeconds = GetRoundSeconds();
	bRunning = false;

	RefreshBoard();
}

void ADojoM3VaultRoom::ClearPieces()
{
	for (ADojoM3Crate* Crate : Crates)
	{
		if (IsValid(Crate))
		{
			Crate->Destroy();
		}
	}

	Crates.Reset();

	const TArray<AActor*> Pieces = { Flag, Plate, Gate, Pit };
	for (AActor* Piece : Pieces)
	{
		if (IsValid(Piece))
		{
			Piece->Destroy();
		}
	}

	Flag = nullptr;
	Plate = nullptr;
	Gate = nullptr;
	Pit = nullptr;
}

void ADojoM3VaultRoom::HandlePlateCountChanged(int32 NewCount)
{
	if (!Gate || !Plate)
	{
		return;
	}

	if (Plate->IsPressed())
	{
		Gate->Open();
	}
	else
	{
		Gate->Close();
	}

	RefreshBoard();
}

void ADojoM3VaultRoom::HandlePitBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (!bRunning || OtherActor != Runner)
	{
		return;
	}

	Falls++;
	RefreshBoard();
}

void ADojoM3VaultRoom::HandleVaultBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (!bRunning || OtherActor != Runner)
	{
		return;
	}

	EndRound();
}

void ADojoM3VaultRoom::RefreshBoard()
{
	FString Text;
	if (bRunning)
	{
		Text = FString::Printf(TEXT("Plate %d / %d, falls %d"), Plate ? Plate->GetCount() : 0, PlateNeeds, Falls);
	}
	else
	{
		Text = FString::Printf(TEXT("VAULT in %.1f s, %d falls"), FinishSeconds, Falls);
	}

	Board->SetText(FText::FromString(Text));
}
