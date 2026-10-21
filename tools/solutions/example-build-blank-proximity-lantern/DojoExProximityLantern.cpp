#include "DojoExProximityLantern.h"

#include "Components/PointLightComponent.h"
#include "Components/SphereComponent.h"

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

void ADojoExProximityLantern::BeginPlay()
{
	Super::BeginPlay();

	Sphere->SetSphereRadius(Radius);
	Sphere->OnComponentBeginOverlap.AddDynamic(this, &ADojoExProximityLantern::HandleBeginOverlap);
	Sphere->OnComponentEndOverlap.AddDynamic(this, &ADojoExProximityLantern::HandleEndOverlap);
	ApplyLight();
}

bool ADojoExProximityLantern::IsLit() const
{
	return VisitorCount > 0;
}

void ADojoExProximityLantern::HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (OtherActor == this) return;

	VisitorCount++;
	ApplyLight();
}

void ADojoExProximityLantern::HandleEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex)
{
	if (OtherActor == this) return;

	VisitorCount = FMath::Max(0, VisitorCount - 1);
	ApplyLight();
}

void ADojoExProximityLantern::ApplyLight()
{
	Light->SetIntensity(IsLit() ? Brightness : 0.f);
}
