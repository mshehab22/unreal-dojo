#include "DojoM4Keeper.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"

ADojoM4Keeper::ADojoM4Keeper()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM4Keeper::BeginPlay()
{
	Super::BeginPlay();

	SlotBombs.Init(nullptr, MaxLive);
	GetWorldTimerManager().SetTimer(RefillTimer, this, &ADojoM4Keeper::Refill, RefillSeconds, true, 0.f);
}

void ADojoM4Keeper::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Stop();

	for (ADojoM4Bomb* Bomb : SlotBombs)
	{
		if (IsValid(Bomb))
		{
			Bomb->OnDestroyed.RemoveDynamic(this, &ADojoM4Keeper::HandleBombDestroyed);
		}
	}

	SlotBombs.Reset();

	Super::EndPlay(EndPlayReason);
}

void ADojoM4Keeper::Stop()
{
	GetWorldTimerManager().ClearTimer(RefillTimer);
}

int32 ADojoM4Keeper::GetLive() const
{
	int32 Live = 0;
	for (const ADojoM4Bomb* Bomb : SlotBombs)
	{
		if (Bomb)
		{
			Live++;
		}
	}

	return Live;
}

int32 ADojoM4Keeper::GetMade() const
{
	return Made;
}

void ADojoM4Keeper::Refill()
{
	if (!BombClass)
	{
		return;
	}

	const int32 Slot = SlotBombs.IndexOfByKey(nullptr);
	if (Slot == INDEX_NONE)
	{
		return;
	}

	const FTransform Spot(GetActorRotation(), GetActorLocation() + GetActorRightVector() * Spacing * Slot);
	ADojoM4Bomb* Bomb = GetWorld()->SpawnActorDeferred<ADojoM4Bomb>(BombClass, Spot);
	if (!Bomb)
	{
		return;
	}

	Bomb->StartFuse = Fuse;
	Bomb->OnDestroyed.AddDynamic(this, &ADojoM4Keeper::HandleBombDestroyed);
	Bomb->FinishSpawning(Spot);

	SlotBombs[Slot] = Bomb;
	Made++;
}

void ADojoM4Keeper::HandleBombDestroyed(AActor* DestroyedActor)
{
	const int32 Slot = SlotBombs.IndexOfByPredicate([DestroyedActor](const TObjectPtr<ADojoM4Bomb>& Bomb) { return Bomb.Get() == DestroyedActor; });
	if (Slot != INDEX_NONE)
	{
		SlotBombs[Slot] = nullptr;
	}
}
