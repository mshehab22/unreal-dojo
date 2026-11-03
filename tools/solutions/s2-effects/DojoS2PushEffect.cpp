#include "DojoS2PushEffect.h"

#include "GameFramework/Actor.h"

void UDojoS2PushEffect::OnApply(AActor* User)
{
	const FVector Center = User->GetActorLocation();

	for (AActor* Target : FindTargetsNear(Center, Radius, User))
	{
		FVector Away = Target->GetActorLocation() - Center;
		Away.Z = 0.f;

		// A target standing exactly on the user has no "away", so it goes the way the user faces.
		const FVector Direction = Away.IsNearlyZero() ? User->GetActorForwardVector() : Away.GetSafeNormal();
		MoveActor(Target, Direction * Distance);
	}
}
