#include "DojoP3SparkSwarm.h"

#include "Components/TextRenderComponent.h"
#include "DrawDebugHelpers.h"

ADojoP3SparkSwarm::ADojoP3SparkSwarm()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP3SparkSwarm::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP3SparkSwarm::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);

	for (const FDojoP3Spark& Spark : Sparks)
	{
		DrawDebugPoint(GetWorld(), GetActorLocation() + FVector(Spark.Position, 0.f, 0.f), 12.f, FColor::Orange);
	}
}

void ADojoP3SparkSwarm::Launch()
{
	FDojoP3Spark Spark;
	Spark.Velocity = LaunchSpeed;
	Spark.SecondsLeft = SparkLifetime;
	AddSpark(Spark);
}

void ADojoP3SparkSwarm::Step(float DeltaSeconds)
{
	MovedLastStep = 0;

	// Children added during the walk wait for the next step, so the walk stops at the count it started with.
	const int32 CountAtStart = Sparks.Num();

	for (int32 Index = 0; Index < CountAtStart; ++Index)
	{
		if (Sparks[Index].bDead) continue;

		Sparks[Index].Position += Sparks[Index].Velocity * DeltaSeconds;
		Sparks[Index].SecondsLeft -= DeltaSeconds;
		MovedLastStep++;

		if (Sparks[Index].SecondsLeft <= 0.f) Burst(Index);
	}

	// Removing inside the walk would shift the next spark into the slot just visited and skip it, so removal waits until the walk is done.
	Sparks.RemoveAll([](const FDojoP3Spark& Spark) { return Spark.bDead; });

	RefreshLabel();
}

void ADojoP3SparkSwarm::Burst(int32 Index)
{
	Sparks[Index].bDead = true;

	if (Sparks[Index].Generation >= MaxGeneration) return;

	// Copy what the children need first: adding to the array can move it, which would leave a reference into it dangling.
	const float Position = Sparks[Index].Position;
	const int32 ChildGeneration = Sparks[Index].Generation + 1;

	for (const float Direction : { 1.f, -1.f })
	{
		FDojoP3Spark Child;
		Child.Position = Position;
		Child.Velocity = Direction * LaunchSpeed;
		Child.SecondsLeft = SparkLifetime;
		Child.Generation = ChildGeneration;
		Sparks.Add(Child);
	}
}

int32 ADojoP3SparkSwarm::GetSparkCount() const
{
	return Sparks.Num();
}

int32 ADojoP3SparkSwarm::GetMovedLastStep() const
{
	return MovedLastStep;
}

void ADojoP3SparkSwarm::AddSpark(const FDojoP3Spark& Spark)
{
	Sparks.Add(Spark);
}

const TArray<FDojoP3Spark>& ADojoP3SparkSwarm::GetSparks() const
{
	return Sparks;
}

void ADojoP3SparkSwarm::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Sparks: %d"), Sparks.Num())));
}
