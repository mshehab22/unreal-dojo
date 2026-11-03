#include "DojoP18Lantern.h"

#include "Components/SceneComponent.h"

ADojoP18Lantern::ADojoP18Lantern()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}
