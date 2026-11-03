#include "DojoP19Swarm.h"

#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"
#include "Math/RandomStream.h"

ADojoP19Swarm::ADojoP19Swarm()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP19Swarm::BeginPlay()
{
	Super::BeginPlay();

	FRandomStream Stream(Seed);
	const FVector Origin = GetActorLocation();
	Fireflies.Reserve(StartingFireflies);
	for (int32 Index = 0; Index < StartingFireflies; ++Index)
	{
		const FVector Position = Origin + FVector(Stream.FRandRange(-Extent, Extent), Stream.FRandRange(-Extent, Extent), Stream.FRandRange(0.f, Ceiling));
		const FVector Velocity(Stream.FRandRange(-40.f, 40.f), Stream.FRandRange(-40.f, 40.f), Stream.FRandRange(-60.f, 60.f));
		const float GlowRate = Stream.FRandRange(0.5f, 1.5f) * (Stream.RandBool() ? 1.f : -1.f);
		AddFirefly(Position, Velocity, Stream.FRand(), GlowRate);
	}
}

void ADojoP19Swarm::AddFirefly(FVector Position, FVector Velocity, float Glow, float GlowRate)
{
	FDojoP19Firefly Firefly;
	Firefly.Position = FVector3f(Position);
	Firefly.Velocity = FVector3f(Velocity);
	Firefly.Glow = Glow;
	Firefly.GlowRate = GlowRate;
	Fireflies.Add(Firefly);
}

int32 ADojoP19Swarm::GetFireflyCount() const
{
	return Fireflies.Num();
}

FVector ADojoP19Swarm::GetFireflyPosition(int32 Index) const
{
	return Fireflies.IsValidIndex(Index) ? FVector(Fireflies[Index].Position) : FVector::ZeroVector;
}

float ADojoP19Swarm::GetFireflyGlow(int32 Index) const
{
	return Fireflies.IsValidIndex(Index) ? Fireflies[Index].Glow : 0.f;
}

void ADojoP19Swarm::Step(float DeltaSeconds)
{
	for (FDojoP19Firefly& Firefly : Fireflies)
	{
		Firefly.Position += Firefly.Velocity * DeltaSeconds;
		if ((Firefly.Position.Z < 0.f && Firefly.Velocity.Z < 0.f) || (Firefly.Position.Z > Ceiling && Firefly.Velocity.Z > 0.f)) Firefly.Velocity.Z = -Firefly.Velocity.Z;

		Firefly.Glow += Firefly.GlowRate * DeltaSeconds;
		if ((Firefly.Glow > 1.f && Firefly.GlowRate > 0.f) || (Firefly.Glow < 0.f && Firefly.GlowRate < 0.f)) Firefly.GlowRate = -Firefly.GlowRate;
	}
}

void ADojoP19Swarm::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);

	if (!bDrawDebug) return;

	for (const FDojoP19Firefly& Firefly : Fireflies)
	{
		const uint8 Brightness = static_cast<uint8>(FMath::Clamp(Firefly.Glow, 0.f, 1.f) * 255.f);
		DrawDebugPoint(GetWorld(), FVector(Firefly.Position), 6.f, FColor(Brightness, Brightness, 0));
	}
}
