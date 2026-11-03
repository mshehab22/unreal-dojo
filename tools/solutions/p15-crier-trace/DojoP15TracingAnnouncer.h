#pragma once

#include "CoreMinimal.h"
#include "Quests/p15-announcer-desk/DojoP15Announcer.h"
#include "UObject/Object.h"
#include "DojoP15TracingAnnouncer.generated.h"

/** An announcer that wraps another one: it counts each line and passes it on unchanged, so it can be slipped in front of any announcer and taken out again. Service Locator pattern. */
UCLASS()
class UDojoP15TracingAnnouncer : public UObject, public IDojoP15Announcer
{
	GENERATED_BODY()

public:
	/** Sets the announcer that lines are passed on to; an object that does not implement the interface, or nullptr, leaves nothing wrapped. */
	UFUNCTION(BlueprintCallable, Category = "Announcer")
	void Wrap(UObject* Announcer);

	/** Counts Line, then passes it on to the wrapped announcer; with nothing wrapped, the line is counted and dropped. */
	virtual void Announce(const FString& Line) override;

	/** The announcer lines are passed on to, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Announcer")
	UObject* GetWrapped() const;

	/** How many lines have gone through. */
	UFUNCTION(BlueprintPure, Category = "Announcer")
	int32 GetForwardedCount() const;

private:
	/** The announcer behind this one. */
	UPROPERTY()
	TObjectPtr<UObject> Wrapped;

	/** Lines that have gone through. */
	int32 ForwardedCount = 0;
};
