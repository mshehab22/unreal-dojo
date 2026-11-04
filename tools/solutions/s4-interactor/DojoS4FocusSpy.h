#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS4FocusSpy.generated.h"

class UDojoS4Interactor;

/** A listener that counts an interactor's focus notices and remembers the last focus and prompt; it only subscribes. */
UCLASS()
class UDojoS4FocusSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the interactor, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Focus Spy")
	void Watch(UDojoS4Interactor* Interactor);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Focus Spy")
	int32 GetNoticeCount() const;

	/** The focus in the last notice, or null. */
	UFUNCTION(BlueprintPure, Category = "Focus Spy")
	AActor* GetLastFocus() const;

	/** The prompt in the last notice. */
	UFUNCTION(BlueprintPure, Category = "Focus Spy")
	FString GetLastPrompt() const;

private:
	/** Counts the notice and keeps what it carried. */
	UFUNCTION()
	void HandleFocusChanged(AActor* Focus, FText Prompt);

	int32 NoticeCount = 0;

	UPROPERTY()
	TObjectPtr<AActor> LastFocus;

	FString LastPrompt;
};
