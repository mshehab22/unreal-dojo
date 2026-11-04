#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Perception/AIPerceptionTypes.h"
#include "DojoS6SenseMemoryComponent.generated.h"

class UAIPerceptionComponent;
class UDojoS6SenseMemoryComponent;

/** Broadcast after the memory changed, with the memory itself so one handler can serve many guards. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS6OnMemoryChanged, UDojoS6SenseMemoryComponent*, Memory);

/** What a guard knows (the Component pattern): who it is following, whether that one is in sight, and the newest clue, turned from perception updates into plain facts and announced like the sender in the Observer pattern. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS6SenseMemoryComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the memory only reacts to news. */
	UDojoS6SenseMemoryComponent();

	/** Fires once per piece of news that changed the memory, after the memory holds it. */
	UPROPERTY(BlueprintAssignable, Category = "Memory")
	FDojoS6OnMemoryChanged OnMemoryChanged;

	/** Starts listening to a perception component's updates, and stops listening to the one before; null stops listening. */
	UFUNCTION(BlueprintCallable, Category = "Memory")
	void Watch(UAIPerceptionComponent* Perception);

	/** Turns one perception update into a sighting or a noise, by the sense that produced it. */
	UFUNCTION()
	void HandlePerception(AActor* Actor, FAIStimulus Stimulus);

	/** Records that SeenActor was seen at Location, or, when bSeen is false, that it just went out of sight there. */
	UFUNCTION(BlueprintCallable, Category = "Memory")
	void NoteSight(AActor* SeenActor, bool bSeen, FVector Location);

	/** Records a noise at NoiseLocation as the newest clue, unless the followed actor is in sight. */
	UFUNCTION(BlueprintCallable, Category = "Memory")
	void NoteNoise(FVector NoiseLocation);

	/** Forgets the followed actor and the clue. */
	UFUNCTION(BlueprintCallable, Category = "Memory")
	void Forget();

	/** The actor being followed, or null. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	AActor* GetTarget() const;

	/** True while the followed actor is in sight. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	bool IsTargetVisible() const;

	/** True when there is a clue: the last place the actor was seen, or a noise. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	bool HasClue() const;

	/** Where the newest clue is. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	FVector GetClueLocation() const;

	/** Seconds since the newest clue was noted, or -1 when there is none. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	float GetClueAge() const;

protected:
	/** Stops listening, so a perception component that outlives the memory calls nothing. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Saves Location as the newest clue, stamped with the current time. */
	void SetClue(const FVector& Location);

	/** The world's time in seconds, or zero outside a world. */
	double Now() const;

	UPROPERTY()
	TObjectPtr<UAIPerceptionComponent> WatchedPerception;

	TWeakObjectPtr<AActor> RememberedTarget;
	bool bTargetVisible = false;
	bool bHasClue = false;
	FVector ClueLocation = FVector::ZeroVector;
	double ClueTime = 0.0;
};
