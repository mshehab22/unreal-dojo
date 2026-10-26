#pragma once

#include "CoreMinimal.h"

/** One fan in the stands: only what differs from fan to fan, a few bytes each. */
struct FDojoP11Fan
{
	/** The seat this fan sits in. */
	int32 Seat = 0;

	/** Excitement from 0 to 1. */
	float Excitement = 0.f;

	/** Which of the crowd's styles this fan belongs to. */
	uint8 StyleIndex = 0;
};
