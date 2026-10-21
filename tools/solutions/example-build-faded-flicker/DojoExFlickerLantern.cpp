#include "DojoExFlickerLantern.h"

#include "Components/PointLightComponent.h"
#include "TimerManager.h"

ADojoExFlickerLantern::ADojoExFlickerLantern()
{
	PrimaryActorTick.bCanEverTick = false;

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));
	RootComponent = Light;
}

void ADojoExFlickerLantern::BeginPlay()
{
	Super::BeginPlay();

	Light->SetIntensity(Brightness);
	GetWorldTimerManager().SetTimer(FlickerHandle, this, &ADojoExFlickerLantern::Flicker, FlickerInterval, true);
}

void ADojoExFlickerLantern::Flicker()
{
	Light->SetIntensity(Brightness * 0.25f);
	GetWorldTimerManager().SetTimer(RestoreHandle, this, &ADojoExFlickerLantern::Restore, 0.1f, false);
}

void ADojoExFlickerLantern::Restore()
{
	Light->SetIntensity(Brightness);
}

void ADojoExFlickerLantern::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(FlickerHandle);
	GetWorldTimerManager().ClearTimer(RestoreHandle);

	Super::EndPlay(EndPlayReason);
}
