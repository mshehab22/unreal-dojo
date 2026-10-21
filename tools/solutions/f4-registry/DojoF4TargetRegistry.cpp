#include "DojoF4TargetRegistry.h"

#include "GameFramework/Actor.h"

void UDojoF4TargetRegistry::Register(AActor* Actor)
{
	if (!IsValid(Actor)) return;

	Registered.AddUnique(Actor);
}

void UDojoF4TargetRegistry::Unregister(AActor* Actor)
{
	Registered.Remove(Actor);
}

bool UDojoF4TargetRegistry::IsRegistered(const AActor* Actor) const
{
	return Actor != nullptr && Registered.Contains(Actor);
}

int32 UDojoF4TargetRegistry::GetRegisteredCount() const
{
	return Registered.Num();
}

AActor* UDojoF4TargetRegistry::FindNearest(FVector From, float MaxRange) const
{
	AActor* Nearest = nullptr;
	double NearestSquared = FMath::Square(static_cast<double>(MaxRange));

	for (AActor* Actor : Registered)
	{
		if (!IsValid(Actor)) continue;

		// Strictly closer only, so on a tie the earlier registration keeps its place.
		const double DistanceSquared = FVector::DistSquared(From, Actor->GetActorLocation());
		if (Nearest == nullptr ? DistanceSquared <= NearestSquared : DistanceSquared < NearestSquared)
		{
			Nearest = Actor;
			NearestSquared = DistanceSquared;
		}
	}

	return Nearest;
}
