#include "DojoExProximityLantern.h"

#include "Components/PointLightComponent.h"
#include "Components/SphereComponent.h"

/** Creates the overlap sphere as the root and attaches the light to it. */
ADojoExProximityLantern::ADojoExProximityLantern()
{
	PrimaryActorTick.bCanEverTick = false;

	Sphere = CreateDefaultSubobject<USphereComponent>(TEXT("Sphere"));
	Sphere->SetSphereRadius(Radius);
	Sphere->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	Sphere->SetGenerateOverlapEvents(true);
	RootComponent = Sphere;

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));
	Light->SetupAttachment(Sphere);
}

/** Applies the radius, binds the overlap events, and sets the starting light. */
void ADojoExProximityLantern::BeginPlay()
{
	Super::BeginPlay();

	Sphere->SetSphereRadius(Radius);
	Sphere->OnComponentBeginOverlap.AddDynamic(this, &ADojoExProximityLantern::HandleBeginOverlap);
	Sphere->OnComponentEndOverlap.AddDynamic(this, &ADojoExProximityLantern::HandleEndOverlap);
	ApplyLight();
}

/** Whether at least one visitor is inside the sphere. */
bool ADojoExProximityLantern::IsLit() const
{
	return VisitorCount > 0;
}

/** Counts a visitor coming in and updates the light. */
void ADojoExProximityLantern::HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (OtherActor == this) return;

	VisitorCount++;
	ApplyLight();
}

/** Counts a visitor leaving and updates the light. */
void ADojoExProximityLantern::HandleEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex)
{
	if (OtherActor == this) return;

	VisitorCount = FMath::Max(0, VisitorCount - 1);
	ApplyLight();
}

/** Turns the light on or off to match IsLit. */
void ADojoExProximityLantern::ApplyLight()
{
	Light->SetIntensity(IsLit() ? Brightness : 0.f);
}
