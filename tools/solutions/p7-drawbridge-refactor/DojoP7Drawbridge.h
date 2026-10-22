#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP7Drawbridge.generated.h"

class UTextRenderComponent;

/** The one thing the drawbridge is doing right now. */
UENUM(BlueprintType)
enum class EDojoP7BridgeState : uint8
{
	EBS_Down UMETA(DisplayName = "Down"),
	EBS_Raising UMETA(DisplayName = "Raising"),
	EBS_Up UMETA(DisplayName = "Up"),
	EBS_Lowering UMETA(DisplayName = "Lowering"),
	EBS_Jammed UMETA(DisplayName = "Jammed")
};

/** The arena's drawbridge: it raises and lowers over a few seconds, can jam, and lowers after a repair; one mode field means it can never be jammed and moving at once (State: one enum and a switch on it). */
UCLASS()
class ADojoP7Drawbridge : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP7Drawbridge();

	/** Floating text that shows what the bridge is doing. */
	UPROPERTY(VisibleAnywhere, Category = "Bridge")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds for a full raise or lower. */
	UPROPERTY(EditAnywhere, Category = "Bridge", meta = (ClampMin = "0.1"))
	float TravelSeconds = 2.f;

	/** Starts raising a lowered bridge. */
	UFUNCTION(BlueprintCallable, Category = "Bridge")
	void Raise();

	/** Starts lowering a raised bridge. */
	UFUNCTION(BlueprintCallable, Category = "Bridge")
	void Lower();

	/** The chains jam: the bridge stops where it is until repaired. */
	UFUNCTION(BlueprintCallable, Category = "Bridge")
	void Jam();

	/** Frees the chains; a bridge left part-way up then lowers itself for safety. */
	UFUNCTION(BlueprintCallable, Category = "Bridge")
	void Repair();

	/** How far up the bridge is, from 0 (down) to 1 (up). */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	float GetHeight() const;

	/** True while the bridge is travelling. */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	bool IsMoving() const;

	/** True while the chains are jammed. */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	bool IsJammed() const;

	/** True when the bridge is fully up and still. */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	bool IsUp() const;

	/** True when the bridge is fully down and still. */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	bool IsDown() const;

	/** Moves a travelling bridge and tilts the actor to match. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Shows the starting state. */
	virtual void BeginPlay() override;

private:
	/** Switches to a new mode and refreshes the label. */
	void SetState(EDojoP7BridgeState NewState);

	/** Writes the mode's display name into the label. */
	void RefreshLabel();

	/** The bridge's one current mode. */
	UPROPERTY(VisibleInstanceOnly, Category = "Bridge")
	EDojoP7BridgeState State = EDojoP7BridgeState::EBS_Down;

	float Height = 0.f;
};
