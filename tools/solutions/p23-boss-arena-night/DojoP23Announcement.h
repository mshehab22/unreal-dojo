#pragma once

#include "CoreMinimal.h"

/** One knockout as the director heard it from the herald: who went down, who landed the blow, and when the herald announced it. */
struct FDojoP23Announcement
{
	/** The fighter who went down. */
	FName Fallen = NAME_None;

	/** The fighter who landed the blow. */
	FName Winner = NAME_None;

	/** The world time of the announcement. */
	double Seconds = 0.0;
};
