#include "DojoP20OrbitRule.h"

FVector UDojoP20OrbitRule::NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds)
{
	const FVector Centre = Anchor + CenterOffset;
	const FVector Turned = (Current - Centre).RotateAngleAxis(DegreesPerSecond * DeltaSeconds, FVector::UpVector);
	return Centre + Turned;
}
