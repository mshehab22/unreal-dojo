#pragma once

#include "CoreMinimal.h"
#include "Quests/p5-drill-orders/DojoP5DrillSergeant.h"

/** One command of the live run as it was recorded: the fixed step it ran on and the move it was. */
struct FDojoP23RecordedCommand
{
	/** The fixed step the command ran on, counting from 1. */
	int32 Step = 0;

	/** The move the command asked for. */
	EDojoP5DrillMove Move = EDojoP5DrillMove::EDM_Block;
};
