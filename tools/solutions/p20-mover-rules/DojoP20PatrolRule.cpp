#include "DojoP20PatrolRule.h"

FVector UDojoP20PatrolRule::NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds)
{
	const double Stride = Speed * DeltaSeconds;
	const double Low = Anchor.X;
	const double High = Anchor.X + Distance;

	FVector Next = Current;
	Next.X += bHeadingOut ? Stride : -Stride;

	if (Next.X >= High)
	{
		Next.X = High;
		bHeadingOut = false;
	}
	else if (Next.X <= Low)
	{
		Next.X = Low;
		bHeadingOut = true;
	}

	return Next;
}
