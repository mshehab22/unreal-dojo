#include "DojoExLantern.h"

#include "Components/PointLightComponent.h"

ADojoExLantern::ADojoExLantern()
{
	PrimaryActorTick.bCanEverTick = false;

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));
	RootComponent = Light;
	Light->SetLightColor(FLinearColor(1.f, 0.55f, 0.2f));
}

void ADojoExLantern::BeginPlay()
{
	Super::BeginPlay();

	Light->SetIntensity(Brightness);
}
