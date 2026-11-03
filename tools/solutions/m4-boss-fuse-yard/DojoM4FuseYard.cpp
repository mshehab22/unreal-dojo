#include "DojoM4FuseYard.h"

#include "Components/BoxComponent.h"
#include "Components/SceneComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/m2-bumper/DojoM2Wall.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-scale-plate/DojoM3Plate.h"
#include "Quests/m4-chain/DojoM4Chain.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"
#include "Quests/m4-scatter/DojoM4Scatter.h"

namespace DojoM4FuseYardSpots
{
	/** Where each part of the yard stands; the spec fixes these. */
	const FVector Entrance(0.f, 0.f, 0.f);
	const FVector Plate(200.f, 0.f, 0.f);
	const FVector Field(1200.f, 0.f, 0.f);
	const FVector FieldExtent(800.f, 500.f, 50.f);
	const FVector Pillars[] = { FVector(900.f, 0.f, 0.f), FVector(1500.f, 0.f, 0.f) };
}

ADojoM4FuseYard::ADojoM4FuseYard()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	Board->SetupAttachment(RootComponent);
	Board->SetRelativeLocation(FVector(0.f, 0.f, 300.f));
	Board->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM4FuseYard::BeginPlay()
{
	Super::BeginPlay();

	StartRound();
}

void ADojoM4FuseYard::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(EndCheckTimer);

	Super::EndPlay(EndPlayReason);
}

bool ADojoM4FuseYard::PressRestart()
{
	if (!bOver)
	{
		return false;
	}

	StartRound();
	return true;
}

bool ADojoM4FuseYard::IsBurning() const
{
	return bBurning;
}

bool ADojoM4FuseYard::IsOver() const
{
	return bOver;
}

int32 ADojoM4FuseYard::GetBlown() const
{
	return Blown;
}

int32 ADojoM4FuseYard::GetPlaced() const
{
	return Placed;
}

ADojoM3Plate* ADojoM4FuseYard::GetPlate() const
{
	return Plate;
}

TArray<ADojoM4Bomb*> ADojoM4FuseYard::GetBombs() const
{
	TArray<ADojoM4Bomb*> Result;
	for (ADojoM4Bomb* Bomb : Bombs)
	{
		if (IsValid(Bomb))
		{
			Result.Add(Bomb);
		}
	}

	return Result;
}

void ADojoM4FuseYard::StartRound()
{
	ClearYard();

	if (Runner)
	{
		Runner->SetActorLocation(DojoM4FuseYardSpots::Entrance, false, nullptr, ETeleportType::TeleportPhysics);
	}

	UWorld* World = GetWorld();

	const FTransform PlateSpot(DojoM4FuseYardSpots::Plate);
	Plate = World->SpawnActorDeferred<ADojoM3Plate>(ADojoM3Plate::StaticClass(), PlateSpot);
	Plate->RequiredCount = 1;
	Plate->FinishSpawning(PlateSpot);
	Plate->Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM4FuseYard::HandlePlateBeginOverlap);

	for (const FVector& Spot : DojoM4FuseYardSpots::Pillars)
	{
		Pillars.Add(World->SpawnActor<ADojoM2Wall>(Spot, FRotator::ZeroRotator));
	}

	const FTransform FieldSpot(DojoM4FuseYardSpots::Field);
	Scatter = World->SpawnActorDeferred<ADojoM4Scatter>(ADojoM4Scatter::StaticClass(), FieldSpot);
	Scatter->SpawnClass = ADojoM4Bomb::StaticClass();
	Scatter->Count = BombCount;
	Scatter->Seed = Seed;
	Scatter->FinishSpawning(FieldSpot);
	Scatter->Area->SetBoxExtent(DojoM4FuseYardSpots::FieldExtent);

	Chain = World->SpawnActorDeferred<ADojoM4Chain>(ADojoM4Chain::StaticClass(), FTransform::Identity);
	Chain->Reach = Reach;
	Chain->SparkDelay = SparkDelay;
	Chain->FinishSpawning(FTransform::Identity);

	Scatter->Scatter();
	for (AActor* Spawned : Scatter->GetSpawned())
	{
		if (ADojoM4Bomb* Bomb = Cast<ADojoM4Bomb>(Spawned))
		{
			Bombs.Add(Bomb);
			Chain->Watch(Bomb);
			Bomb->OnDestroyed.AddDynamic(this, &ADojoM4FuseYard::HandleBombDestroyed);
		}
	}

	Placed = Bombs.Num();
	Blown = 0;
	bBurning = false;
	bOver = false;

	RefreshBoard();
}

void ADojoM4FuseYard::ClearYard()
{
	GetWorldTimerManager().ClearTimer(EndCheckTimer);

	if (IsValid(Chain))
	{
		Chain->Destroy();
	}

	for (ADojoM4Bomb* Bomb : Bombs)
	{
		if (IsValid(Bomb))
		{
			Bomb->OnDestroyed.RemoveDynamic(this, &ADojoM4FuseYard::HandleBombDestroyed);
			Bomb->Destroy();
		}
	}

	for (ADojoM2Wall* Pillar : Pillars)
	{
		if (IsValid(Pillar))
		{
			Pillar->Destroy();
		}
	}

	if (IsValid(Scatter))
	{
		Scatter->Destroy();
	}

	if (IsValid(Plate))
	{
		Plate->Destroy();
	}

	Bombs.Reset();
	Pillars.Reset();
	Chain = nullptr;
	Scatter = nullptr;
	Plate = nullptr;
}

void ADojoM4FuseYard::HandlePlateBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (bBurning || bOver || OtherActor != Runner || !Plate)
	{
		return;
	}

	ADojoM4Bomb* Nearest = nullptr;
	double NearestDistance = TNumericLimits<double>::Max();
	for (ADojoM4Bomb* Bomb : Bombs)
	{
		const double Distance = IsValid(Bomb) ? FVector::Dist(Bomb->GetActorLocation(), Plate->GetActorLocation()) : TNumericLimits<double>::Max();
		if (Distance < NearestDistance)
		{
			Nearest = Bomb;
			NearestDistance = Distance;
		}
	}

	if (!Nearest)
	{
		return;
	}

	bBurning = true;
	Nearest->Light(FirstFuse);
	RefreshBoard();
}

void ADojoM4FuseYard::HandleBombDestroyed(AActor* DestroyedActor)
{
	Bombs.Remove(Cast<ADojoM4Bomb>(DestroyedActor));
	Blown++;
	RefreshBoard();

	EndCheckTimer = GetWorldTimerManager().SetTimerForNextTick(this, &ADojoM4FuseYard::CheckForEnd);
}

void ADojoM4FuseYard::CheckForEnd()
{
	if (!bBurning)
	{
		return;
	}

	for (ADojoM4Bomb* Bomb : Bombs)
	{
		if (IsValid(Bomb) && Bomb->IsLit())
		{
			return;
		}
	}

	bBurning = false;
	bOver = true;
	RefreshBoard();
}

void ADojoM4FuseYard::RefreshBoard()
{
	FString Text;
	if (bOver)
	{
		Text = FString::Printf(TEXT("CHAIN %d of %d"), Blown, Placed);
	}
	else if (bBurning)
	{
		Text = FString::Printf(TEXT("BURNING %d blown"), Blown);
	}
	else
	{
		Text = FString::Printf(TEXT("ARMED %d bombs"), Placed);
	}

	Board->SetText(FText::FromString(Text));
}
