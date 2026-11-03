#include "DojoS2DashEffect.h"

#include "GameFramework/Actor.h"

void UDojoS2DashEffect::OnApply(AActor* User)
{
	MoveActor(User, User->GetActorForwardVector() * Distance);
}
