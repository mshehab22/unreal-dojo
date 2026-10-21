#include "DojoExTickLantern.h"

#include "Components/PointLightComponent.h"
#include "TimerManager.h"

/** Creates the light as the root component. */
ADojoExTickLantern::ADojoExTickLantern()
{
	PrimaryActorTick.bCanEverTick = false;

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));
	RootComponent = Light;
}

/** Starts the looping flicker timer. */
void ADojoExTickLantern::BeginPlay()
{
	Super::BeginPlay();

	GetWorldTimerManager().SetTimer(FlickerHandle, this, &ADojoExTickLantern::Flicker, FlickerInterval, true);
}

/** Clears the flicker timer before the actor leaves play. */
void ADojoExTickLantern::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(FlickerHandle);

	Super::EndPlay(EndPlayReason);
}

/** Counts a flicker and alternates the light between dim and full. */
void ADojoExTickLantern::Flicker()
{
	FlickerCount++;
	Light->SetIntensity(FlickerCount % 2 == 0 ? Brightness : Brightness * 0.25f);
}
