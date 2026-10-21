#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF1PopupTarget.generated.h"

class UTextRenderComponent;

/** The states a pop-up target moves through; the display names are what designers and the label show. */
UENUM(BlueprintType)
enum class EDojoF1TargetState : uint8
{
	ETS_Lowered UMETA(DisplayName = "Down"),
	ETS_Raised UMETA(DisplayName = "Up"),
	ETS_Broken UMETA(DisplayName = "Broken")
};

/** A target that pops up, drops back when hit, and breaks after enough hits; this boss version adds Lower, misses, and ResetForRound. */
UCLASS()
class ADojoF1PopupTarget : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF1PopupTarget();

	/** Floating text that shows the state's display name. */
	UPROPERTY(VisibleAnywhere, Category = "Target")
	TObjectPtr<UTextRenderComponent> Label;

	/** Hits that break the target for good. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Target", meta = (ClampMin = "1"))
	int32 HitsToBreak = 2;

	/** Lowered to raised; does nothing in any other state. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	void Raise();

	/** Counts a hit on a raised target and returns true; a hit on a lowered or broken target counts a miss, shows MISS, and returns false. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	bool Hit();

	/** Broken to lowered with the hit count cleared. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	void Repair();

	/** The current state. */
	UFUNCTION(BlueprintPure, Category = "Target")
	EDojoF1TargetState GetState() const;

	/** Boss addition: raised to lowered without counting a hit, for a target nobody hit in time. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	void Lower();

	/** Boss addition: hits refused because the target was lowered or broken. */
	UFUNCTION(BlueprintPure, Category = "Target")
	int32 GetMissCount() const;

	/** Boss addition: lowered from any state with hits and misses cleared, ready for a new round. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	void ResetForRound();

protected:
	/** Shows the starting state on the label. */
	virtual void BeginPlay() override;

private:
	/** Changes the state and shows its display name on the label. */
	void SetState(EDojoF1TargetState NewState);

	UPROPERTY(VisibleInstanceOnly, Category = "Target")
	EDojoF1TargetState State = EDojoF1TargetState::ETS_Lowered;

	int32 HitsTaken = 0;

	int32 MissCount = 0;
};
