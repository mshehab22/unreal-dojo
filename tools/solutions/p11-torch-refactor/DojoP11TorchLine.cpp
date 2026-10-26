#include "DojoP11TorchLine.h"

#include "Components/InstancedStaticMeshComponent.h"

ADojoP11TorchLine::ADojoP11TorchLine()
{
	PrimaryActorTick.bCanEverTick = false;

	Torches = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Torches"));
	RootComponent = Torches;
}

void ADojoP11TorchLine::BeginPlay()
{
	Super::BeginPlay();

	BuildTorches();
}

void ADojoP11TorchLine::BuildTorches()
{
	Torches->SetStaticMesh(TorchMesh);
	Torches->ClearInstances();

	for (int32 Index = 0; Index < TorchCount; Index++) Torches->AddInstance(FTransform(FVector(Index * TorchSpacing, 0.f, 0.f)));
}

int32 ADojoP11TorchLine::GetTorchCount() const
{
	return Torches->GetInstanceCount();
}

FVector ADojoP11TorchLine::GetTorchLocation(int32 Index) const
{
	FTransform Transform;
	if (!Torches->GetInstanceTransform(Index, Transform)) return FVector::ZeroVector;

	return Transform.GetLocation();
}
