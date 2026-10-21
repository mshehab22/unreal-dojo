#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP6ArenaHerald.generated.h"

class UTextRenderComponent;

/** A knockout as it was at the moment it happened, with everything a listener needs, so it still makes sense after the fighters have left. */
USTRUCT(BlueprintType)
struct FDojoP6KnockoutEvent
{
	GENERATED_BODY()

	/** The fighter who went down. */
	UPROPERTY(BlueprintReadOnly, Category = "Knockout")
	FName FallenName;

	/** The fallen fighter's team. */
	UPROPERTY(BlueprintReadOnly, Category = "Knockout")
	int32 FallenTeam = 0;

	/** The fighter who landed the blow; None when nobody did. */
	UPROPERTY(BlueprintReadOnly, Category = "Knockout")
	FName WinnerName;
};

/** Fired once per knockout when the herald announces it, at the end of the frame. */
DECLARE_MULTICAST_DELEGATE_OneParam(FDojoP6OnKnockoutAnnounced, const FDojoP6KnockoutEvent&);

/** The arena's herald: anyone posts knockouts at any moment, and the herald announces them together at the end of the frame (Event Queue: posting and handling happen at different times). */
UCLASS()
class ADojoP6ArenaHerald : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and ticks after everything else in the frame. */
	ADojoP6ArenaHerald();

	/** Floating text that shows the latest announcement. */
	UPROPERTY(VisibleAnywhere, Category = "Herald")
	TObjectPtr<UTextRenderComponent> Label;

	/** Listeners hear each knockout here, when the herald announces it. */
	FDojoP6OnKnockoutAnnounced OnKnockoutAnnounced;

	/** Adds a knockout to the mailbox and returns at once; nothing is announced until the next Announce. */
	void Post(const FDojoP6KnockoutEvent& Event);

	/** Announces every knockout posted before this call, oldest first. Knockouts posted while announcing wait for the next call. */
	UFUNCTION(BlueprintCallable, Category = "Herald")
	void Announce();

	/** Knockouts waiting in the mailbox. */
	UFUNCTION(BlueprintPure, Category = "Herald")
	int32 GetWaitingCount() const;

	/** Announces the frame's knockouts; runs late in the frame, after fighters have ticked. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** Knockouts posted and not yet announced, oldest first. */
	UPROPERTY()
	TArray<FDojoP6KnockoutEvent> Mailbox;
};
