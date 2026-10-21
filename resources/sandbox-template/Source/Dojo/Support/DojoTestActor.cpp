#include "Support/DojoTestActor.h"
#include "Components/SceneComponent.h"

ADojoTestActor::ADojoTestActor()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}
