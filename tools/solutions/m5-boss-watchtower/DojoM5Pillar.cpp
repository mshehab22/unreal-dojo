#include "DojoM5Pillar.h"

#include "Components/BoxComponent.h"
#include "Engine/EngineTypes.h"

ADojoM5Pillar::ADojoM5Pillar()
{
	PrimaryActorTick.bCanEverTick = false;

	Box = CreateDefaultSubobject<UBoxComponent>(TEXT("Box"));
	Box->SetBoxExtent(FVector(150.f, 20.f, 200.f));
	Box->SetCollisionProfileName(TEXT("BlockAll"));
	Box->SetCollisionObjectType(ECC_WorldStatic);
	RootComponent = Box;
}
