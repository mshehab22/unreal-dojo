#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF4CourseDirector.generated.h"

class ADojoF4Carrier;
class ADojoF4Fence;
class UDojoF4TargetRegistry;
class UTextRenderComponent;

/** Runs a course setup round: the keeper carries loose dummies onto the fence's posts, then test-strikes each placed dummy until all are down, against a par time. */
UCLASS()
class ADojoF4CourseDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the result label and turns ticking off. */
	ADojoF4CourseDirector();

	/** Shows the result when the course is ready, and the par while it is being set up. */
	UPROPERTY(VisibleAnywhere, Category = "Course")
	TObjectPtr<UTextRenderComponent> Label;

	/** The keeper the player moves; E and T act from its location. */
	UPROPERTY(EditAnywhere, Category = "Course")
	TObjectPtr<ADojoF4Carrier> Keeper;

	/** The actor the keeper rides with; when empty, the director uses the first player's pawn. */
	UPROPERTY(EditAnywhere, Category = "Course")
	TObjectPtr<AActor> FollowTarget;

	/** The fence whose posts are the places to fill. */
	UPROPERTY(EditAnywhere, Category = "Course")
	TObjectPtr<ADojoF4Fence> Fence;

	/** Every dummy in the course, each carrying a hit counter and a registry entry; their order is the order they register at the start of each round. */
	UPROPERTY(EditAnywhere, Category = "Course")
	TArray<TObjectPtr<AActor>> Dummies;

	/** A loose dummy this close to the keeper can be picked up. */
	UPROPERTY(EditAnywhere, Category = "Course", meta = (ClampMin = "0.0"))
	float PickupRange = 250.f;

	/** A dummy dropped this close to a free post is placed on it. */
	UPROPERTY(EditAnywhere, Category = "Course", meta = (ClampMin = "0.0"))
	float PlaceRange = 200.f;

	/** A placed dummy this close to the keeper can be test-struck. */
	UPROPERTY(EditAnywhere, Category = "Course", meta = (ClampMin = "0.0"))
	float TestRange = 200.f;

	/** Seconds to beat for a round. */
	UPROPERTY(EditAnywhere, Category = "Course", meta = (ClampMin = "1.0"))
	float ParSeconds = 60.f;

	/** E: picks up the nearest loose dummy in range, or drops the carried one, placing it on the nearest free post in range. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void PressInteract();

	/** T: once every post is filled, strikes the placed dummy nearest the keeper within range. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void PressTest();

	/** R: once a round is finished, puts every dummy back and starts the next round. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void RestartCourse();

	/** True from the start of a round until every placed dummy is down. */
	UFUNCTION(BlueprintPure, Category = "Course")
	bool IsRunning() const;

	/** How many posts hold a dummy. */
	UFUNCTION(BlueprintPure, Category = "Course")
	int32 GetPlacedCount() const;

	/** The dummy on the post at Index, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Course")
	AActor* GetOccupant(int32 PostIndex) const;

	/** Seconds the last finished round took, or 0 before the first finish. */
	UFUNCTION(BlueprintPure, Category = "Course")
	float GetFinishSeconds() const;

protected:
	/** Remembers where every dummy starts, attaches the keeper to the player's pawn (or FollowTarget), binds the keys when a player controller exists, and starts round 1. */
	virtual void BeginPlay() override;

private:
	/** Puts every dummy back, clears the posts, registers the dummies in order, and starts the clock. */
	void StartRound();

	/** Stops the clock and shows the result against par. */
	void FinishRound();

	/** The free post nearest to Location within PlaceRange, lowest index on a tie, or INDEX_NONE. */
	int32 FindFreePost(const FVector& Location) const;

	/** True when every post holds a dummy. */
	bool IsSetupDone() const;

	/** The world's target registry. */
	UDojoF4TargetRegistry* GetRegistry() const;

	/** Routes one pressed key to its course action. */
	void HandleKey(FKey Key);

	/** Where each dummy stood when play began. */
	UPROPERTY()
	TMap<TObjectPtr<AActor>, FVector> StartLocations;

	/** One entry per post; nullptr for a free post. */
	UPROPERTY()
	TArray<TObjectPtr<AActor>> Occupants;

	float StartedAt = 0.f;

	float FinishSeconds = 0.f;

	bool bRunning = false;
};
