#include "DojoExTickLantern.h"

#include "Components/PointLightComponent.h"
#include "TimerManager.h"

ADojoExTickLantern::ADojoExTickLantern()
{
	PrimaryActorTick.bCanEverTick = false;

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));
	RootComponent = Light;
}

void ADojoExTickLantern::BeginPlay()
{
	Super::BeginPlay();

	GetWorldTimerManager().SetTimer(FlickerHandle, this, &ADojoExTickLantern::Flicker, FlickerInterval, true);
}

void ADojoExTickLantern::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(FlickerHandle);

	Super::EndPlay(EndPlayReason);
}

void ADojoExTickLantern::Flicker()
{
	FlickerCount++;
	Light->SetIntensity(FlickerCount % 2 == 0 ? Brightness : Brightness * 0.25f);
}
