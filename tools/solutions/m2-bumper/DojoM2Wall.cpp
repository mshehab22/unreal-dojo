#include "DojoM2Wall.h"

#include "Components/BoxComponent.h"

ADojoM2Wall::ADojoM2Wall()
{
	PrimaryActorTick.bCanEverTick = false;

	Box = CreateDefaultSubobject<UBoxComponent>(TEXT("Box"));
	Box->SetBoxExtent(FVector(300.f, 20.f, 200.f));
	Box->SetCollisionProfileName(TEXT("BlockAll"));
	RootComponent = Box;
}
