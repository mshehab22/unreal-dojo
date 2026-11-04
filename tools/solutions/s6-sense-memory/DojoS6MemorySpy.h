#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS6MemorySpy.generated.h"

class UDojoS6SenseMemoryComponent;

/** A listener that counts a memory's change notices and remembers what the memory said when the last one arrived; it only subscribes. */
UCLASS()
class UDojoS6MemorySpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the memory's changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Memory Spy")
	void Watch(UDojoS6SenseMemoryComponent* Memory);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Memory Spy")
	int32 GetNoticeCount() const;

	/** Whether the memory said its target was in sight when the last notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Memory Spy")
	bool WasVisibleAtLastNotice() const;

private:
	/** Counts the notice and reads the memory that sent it. */
	UFUNCTION()
	void HandleChanged(UDojoS6SenseMemoryComponent* Memory);

	int32 NoticeCount = 0;
	bool bVisibleAtLastNotice = false;
};
