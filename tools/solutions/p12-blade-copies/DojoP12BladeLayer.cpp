#include "DojoP12BladeLayer.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"

ADojoP12BladeLayer::ADojoP12BladeLayer()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP12BladeLayer::BeginPlay()
{
	Super::BeginPlay();

	SetTunedBlade(TunedBlade); // @explain: A blade picked in Details is a real actor in the level, so it is parked the moment play starts.
}

void ADojoP12BladeLayer::SetTunedBlade(ADojoP12Blade* Blade)
{
	TunedBlade = Blade;
	if (IsValid(TunedBlade)) TunedBlade->Park(); // @explain: Parking keeps the tuned blade out of play but still alive, so its numbers stay available to copy.
}

ADojoP12Blade* ADojoP12BladeLayer::LayBlade(const FVector& Where)
{
	UWorld* LevelWorld = GetWorld();
	if (!LevelWorld || !IsValid(TunedBlade)) return nullptr;

	FActorSpawnParameters Parameters;
	Parameters.Template = TunedBlade;
	ADojoP12Blade* Laid = LevelWorld->SpawnActor<ADojoP12Blade>(TunedBlade->GetClass(), Where, FRotator::ZeroRotator, Parameters);
	if (!Laid) return nullptr;

	Laid->SetActorLocation(Where);
	Laid->Wake();
	LaidBlades.Add(Laid);
	return Laid;
}

int32 ADojoP12BladeLayer::GetLaidCount() const
{
	return LaidBlades.Num();
}

ADojoP12Blade* ADojoP12BladeLayer::GetLaidBlade(int32 Index) const
{
	return LaidBlades.IsValidIndex(Index) ? LaidBlades[Index].Get() : nullptr;
}
