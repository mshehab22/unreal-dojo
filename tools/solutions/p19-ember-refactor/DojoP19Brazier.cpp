#include "DojoP19Brazier.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"

ADojoP19Brazier::ADojoP19Brazier()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP19Brazier::Kindle(FVector Where, FVector Velocity, FName Kind)
{
	FDojoP19EmberHot& Ember = Hot.AddDefaulted_GetRef();
	Ember.Position = FVector3f(Where);
	Ember.Velocity = FVector3f(Velocity);
	Ember.Heat = EmberSeconds;

	FDojoP19EmberCold& Record = Cold.AddDefaulted_GetRef();
	Record.Kind = Kind;
	Record.KindledAt = GetWorld()->GetTimeSeconds();
}

int32 ADojoP19Brazier::GetEmberCount() const
{
	return Hot.Num();
}

float ADojoP19Brazier::GetHighestEmberZ() const
{
	float Highest = 0.f;
	bool bAny = false;
	for (const FDojoP19EmberHot& Ember : Hot)
	{
		if (!bAny || Ember.Position.Z > Highest) Highest = Ember.Position.Z;
		bAny = true;
	}
	return Highest;
}

float ADojoP19Brazier::GetTotalHeat() const
{
	float Total = 0.f;
	for (const FDojoP19EmberHot& Ember : Hot)
	{
		Total += Ember.Heat;
	}
	return Total;
}

int32 ADojoP19Brazier::CountEmbersOfKind(FName Kind) const
{
	int32 Count = 0;
	for (const FDojoP19EmberCold& Record : Cold)
	{
		if (Record.Kind == Kind) Count++;
	}
	return Count;
}

float ADojoP19Brazier::GetHighestZOfKind(FName Kind) const
{
	float Highest = 0.f;
	bool bAny = false;
	for (int32 Index = 0; Index < Hot.Num(); ++Index)
	{
		if (Cold[Index].Kind != Kind) continue;
		if (!bAny || Hot[Index].Position.Z > Highest) Highest = Hot[Index].Position.Z;
		bAny = true;
	}
	return Highest;
}

void ADojoP19Brazier::Step(float DeltaSeconds)
{
	for (FDojoP19EmberHot& Ember : Hot)
	{
		Ember.Position += Ember.Velocity * DeltaSeconds;
		Ember.Heat -= DeltaSeconds;
	}

	// Both arrays lose the same index in the same way, so every cold record stays with its hot one.
	for (int32 Index = Hot.Num() - 1; Index >= 0; --Index)
	{
		if (Hot[Index].Heat > 0.f) continue;
		Hot.RemoveAtSwap(Index);
		Cold.RemoveAtSwap(Index);
	}
}

void ADojoP19Brazier::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);
}
