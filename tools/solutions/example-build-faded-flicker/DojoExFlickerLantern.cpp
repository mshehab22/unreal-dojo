#include "DojoExFlickerLantern.h"

#include "Components/PointLightComponent.h"
#include "TimerManager.h"

/** Creates the light as the root component. */
ADojoExFlickerLantern::ADojoExFlickerLantern()
{
	PrimaryActorTick.bCanEverTick = false;

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));
	RootComponent = Light;
}

/** Lights the lantern and starts the looping flicker timer. */
void ADojoExFlickerLantern::BeginPlay()
{
	Super::BeginPlay();

	Light->SetIntensity(Brightness);
	GetWorldTimerManager().SetTimer(FlickerHandle, this, &ADojoExFlickerLantern::Flicker, FlickerInterval, true);
}

/** Dims the light to a quarter and schedules Restore 0.1 seconds later. */
void ADojoExFlickerLantern::Flicker()
{
	Light->SetIntensity(Brightness * 0.25f);
	GetWorldTimerManager().SetTimer(RestoreHandle, this, &ADojoExFlickerLantern::Restore, 0.1f, false);
}

/** Puts the light back to full brightness. */
void ADojoExFlickerLantern::Restore()
{
	Light->SetIntensity(Brightness);
}

/** Clears both timers before the actor leaves play. */
void ADojoExFlickerLantern::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(FlickerHandle);
	GetWorldTimerManager().ClearTimer(RestoreHandle);

	Super::EndPlay(EndPlayReason);
}
