#include "DojoS5PoolComponent.h"

#include "DojoS5Beetle.h"
#include "Engine/World.h"

UDojoS5PoolComponent::UDojoS5PoolComponent()
{
	PrimaryComponentTick.bCanEverTick = false;

	BeetleClass = ADojoS5Beetle::StaticClass();
}

void UDojoS5PoolComponent::Prewarm(int32 Count)
{
	while (Beetles.Num() < FMath::Min(Count, MaxSize))
	{
		if (SpawnSleeping() == nullptr)
		{
			return;
		}
	}
}

ADojoS5Beetle* UDojoS5PoolComponent::Acquire(const FVector& Location)
{
	ADojoS5Beetle* Chosen = nullptr;

	for (ADojoS5Beetle* Beetle : Beetles)
	{
		if (IsValid(Beetle) && !Beetle->IsAwake())
		{
			Chosen = Beetle;
			break;
		}
	}

	if (Chosen == nullptr)
	{
		Chosen = SpawnSleeping();
	}

	if (Chosen == nullptr)
	{
		return nullptr;
	}

	Chosen->Wake(Location);
	return Chosen;
}

bool UDojoS5PoolComponent::Release(ADojoS5Beetle* Beetle)
{
	if (!IsValid(Beetle) || !Beetle->IsAwake() || !Beetles.Contains(Beetle))
	{
		return false;
	}

	Beetle->Sleep();
	return true;
}

void UDojoS5PoolComponent::ReleaseAll()
{
	for (ADojoS5Beetle* Beetle : Beetles)
	{
		if (IsValid(Beetle) && Beetle->IsAwake())
		{
			Beetle->Sleep();
		}
	}
}

int32 UDojoS5PoolComponent::GetCreatedCount() const
{
	return Beetles.Num();
}

int32 UDojoS5PoolComponent::GetAwakeCount() const
{
	return GetAwakeBeetles().Num();
}

TArray<ADojoS5Beetle*> UDojoS5PoolComponent::GetAwakeBeetles() const
{
	TArray<ADojoS5Beetle*> Awake;

	for (ADojoS5Beetle* Beetle : Beetles)
	{
		if (IsValid(Beetle) && Beetle->IsAwake())
		{
			Awake.Add(Beetle);
		}
	}

	return Awake;
}

void UDojoS5PoolComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (EndPlayReason == EEndPlayReason::Destroyed || EndPlayReason == EEndPlayReason::RemovedFromWorld)
	{
		for (ADojoS5Beetle* Beetle : Beetles)
		{
			if (IsValid(Beetle))
			{
				Beetle->Destroy();
			}
		}

		Beetles.Empty();
	}

	Super::EndPlay(EndPlayReason);
}

ADojoS5Beetle* UDojoS5PoolComponent::SpawnSleeping()
{
	UWorld* World = GetWorld();

	if (World == nullptr || BeetleClass == nullptr || Beetles.Num() >= MaxSize)
	{
		return nullptr;
	}

	FActorSpawnParameters Params;
	Params.Owner = GetOwner();
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	const FVector Where = GetOwner() != nullptr ? GetOwner()->GetActorLocation() : FVector::ZeroVector;
	ADojoS5Beetle* Beetle = World->SpawnActor<ADojoS5Beetle>(BeetleClass, Where, FRotator::ZeroRotator, Params);

	if (Beetle == nullptr)
	{
		return nullptr;
	}

	Beetle->Sleep();
	Beetles.Add(Beetle);
	return Beetle;
}
