#include "DojoM4BombRack.h"

#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"

ADojoM4BombRack::ADojoM4BombRack()
{
	PrimaryActorTick.bCanEverTick = false;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

int32 ADojoM4BombRack::Load()
{
	if (!BombClass)
	{
		return 0;
	}

	int32 Loaded = 0;
	for (int32 Slot = 0; Slot < Slots; ++Slot)
	{
		const FTransform Spot(GetActorRotation(), GetActorLocation() + GetActorRightVector() * Spacing * Slot);

		ADojoM4Bomb* Bomb = GetWorld()->SpawnActorDeferred<ADojoM4Bomb>(BombClass, Spot);
		if (!Bomb)
		{
			continue;
		}

		Bomb->StartFuse = FirstFuse + FuseStep * Slot;
		Bomb->FinishSpawning(Spot);

		Bombs.Add(Bomb);
		Loaded++;
	}

	return Loaded;
}

TArray<ADojoM4Bomb*> ADojoM4BombRack::GetBombs() const
{
	TArray<ADojoM4Bomb*> Result;
	for (ADojoM4Bomb* Bomb : Bombs)
	{
		Result.Add(Bomb);
	}

	return Result;
}
