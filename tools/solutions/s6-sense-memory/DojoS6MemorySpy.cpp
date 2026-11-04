#include "DojoS6MemorySpy.h"

#include "DojoS6SenseMemoryComponent.h"

/** Starts listening to the memory's changes, once however many times it is called. */
void UDojoS6MemorySpy::Watch(UDojoS6SenseMemoryComponent* Memory)
{
	if (Memory == nullptr)
	{
		return;
	}

	Memory->OnMemoryChanged.AddUniqueDynamic(this, &UDojoS6MemorySpy::HandleChanged);
}

/** How many notices have arrived. */
int32 UDojoS6MemorySpy::GetNoticeCount() const
{
	return NoticeCount;
}

/** Whether the memory said its target was in sight when the last notice arrived. */
bool UDojoS6MemorySpy::WasVisibleAtLastNotice() const
{
	return bVisibleAtLastNotice;
}

/** Counts the notice and reads the memory that sent it. */
void UDojoS6MemorySpy::HandleChanged(UDojoS6SenseMemoryComponent* Memory)
{
	++NoticeCount;
	bVisibleAtLastNotice = Memory->IsTargetVisible();
}
