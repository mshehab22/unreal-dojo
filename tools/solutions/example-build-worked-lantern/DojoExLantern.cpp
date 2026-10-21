#include "DojoExLantern.h"

#include "Components/PointLightComponent.h"

/** Creates the light as the root component with a warm color. */
ADojoExLantern::ADojoExLantern()
{
	PrimaryActorTick.bCanEverTick = false;

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));
	RootComponent = Light;
	Light->SetLightColor(FLinearColor(1.f, 0.55f, 0.2f));
}

/** Applies the editable brightness once play starts. */
void ADojoExLantern::BeginPlay()
{
	Super::BeginPlay();

	Light->SetIntensity(Brightness);
}
