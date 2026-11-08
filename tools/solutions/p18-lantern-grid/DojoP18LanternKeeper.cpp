#include "DojoP18LanternKeeper.h"

#include "Components/SceneComponent.h"
#include "DojoP18Lantern.h"
#include "EngineUtils.h"

ADojoP18LanternKeeper::ADojoP18LanternKeeper()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP18LanternKeeper::BeginPlay()
{
	Super::BeginPlay();

	Grid = FDojoP18Grid(CellSize);
	for (TActorIterator<ADojoP18Lantern> It(GetWorld()); It; ++It)
	{
		Grid.Add(*It);
	}
}

void ADojoP18LanternKeeper::Register(ADojoP18Lantern* Lantern)
{
	Grid.Add(Lantern);
}

void ADojoP18LanternKeeper::Unregister(ADojoP18Lantern* Lantern)
{
	Grid.Remove(Lantern);
}

void ADojoP18LanternKeeper::MoveLantern(ADojoP18Lantern* Lantern, FVector NewLocation)
{
	if (!IsValid(Lantern)) return;

	Lantern->SetActorLocation(NewLocation);
	Grid.Refile(Lantern);
}

int32 ADojoP18LanternKeeper::CountLitNear(FVector Center, float Radius)
{
	TArray<AActor*> Near;
	LastMeasured = Grid.FindNear(Center, Radius, Near);

	int32 Lit = 0;
	for (AActor* Candidate : Near)
	{
		const ADojoP18Lantern* Lantern = Cast<ADojoP18Lantern>(Candidate);
		if (Lantern && Lantern->bLit) ++Lit;
	}

	return Lit;
}

TArray<ADojoP18Lantern*> ADojoP18LanternKeeper::FindLanternsNear(FVector Center, float Radius)
{
	TArray<AActor*> Near;
	LastMeasured = Grid.FindNear(Center, Radius, Near);

	TArray<ADojoP18Lantern*> Lanterns;
	for (AActor* Candidate : Near)
	{
		if (ADojoP18Lantern* Lantern = Cast<ADojoP18Lantern>(Candidate)) Lanterns.Add(Lantern);
	}

	return Lanterns;
}

int32 ADojoP18LanternKeeper::GetLastMeasured() const
{
	return LastMeasured;
}
