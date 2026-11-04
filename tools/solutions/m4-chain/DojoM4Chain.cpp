#include "DojoM4Chain.h"

#include "Components/SceneComponent.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"

ADojoM4Chain::ADojoM4Chain()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM4Chain::Watch(ADojoM4Bomb* Bomb)
{
	if (!Bomb || Bombs.Contains(Bomb))
	{
		return;
	}

	Bombs.Add(Bomb);
	Bomb->OnDestroyed.AddDynamic(this, &ADojoM4Chain::HandleBombDestroyed);
}

int32 ADojoM4Chain::GetWatched() const
{
	return Bombs.Num();
}

int32 ADojoM4Chain::GetBlasts() const
{
	return Blasts;
}

void ADojoM4Chain::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoM4Bomb* Bomb : Bombs)
	{
		if (IsValid(Bomb))
		{
			Bomb->OnDestroyed.RemoveDynamic(this, &ADojoM4Chain::HandleBombDestroyed);
		}
	}

	Bombs.Reset();

	Super::EndPlay(EndPlayReason);
}

void ADojoM4Chain::HandleBombDestroyed(AActor* DestroyedActor)
{
	ADojoM4Bomb* Blown = Cast<ADojoM4Bomb>(DestroyedActor);
	if (!Blown || !Bombs.Contains(Blown))
	{
		return;
	}

	Blasts++;
	Bombs.Remove(Blown);

	const FVector Where = DestroyedActor->GetActorLocation();
	const TArray<TObjectPtr<ADojoM4Bomb>> Others = Bombs;
	for (ADojoM4Bomb* Other : Others)
	{
		if (IsValid(Other) && FVector::Dist(Other->GetActorLocation(), Where) <= Reach)
		{
			Other->Light(SparkDelay);
		}
	}
}
