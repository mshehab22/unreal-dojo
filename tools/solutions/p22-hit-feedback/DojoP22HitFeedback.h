#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22HitFeedback.generated.h"

class UDojoP22HudTicker;
class UDojoP22SoundDesk;
class UDojoP22SparkPool;

/** One front for everything a hit or a miss should look and sound like: the sound desk, the spark pool, and the HUD ticker behind a few calls. Callers depend on this facade; the desk, the pool, and the ticker know nothing about it. */
UCLASS()
class UDojoP22HitFeedback : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Makes sure the desk, the pool, and the ticker exist first, keeps them, and opens the effects bus. */
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	/** A hit of Damage at Where: its cue, its sparks, its HUD line, and a red flash for a heavy hit. Nothing for Damage of 0 or less. */
	UFUNCTION(BlueprintCallable, Category = "Feedback")
	void PlayHitFeedback(FVector Where, float Damage);

	/** A miss at Where: the miss cue, and nothing else. */
	UFUNCTION(BlueprintCallable, Category = "Feedback")
	void PlayMissFeedback(FVector Where);

	/** A hit of at least this much damage is heavy. */
	UFUNCTION(BlueprintCallable, Category = "Feedback")
	void SetHeavyDamage(float Damage);

	/** A hit of at least this much damage is heavy. */
	UFUNCTION(BlueprintPure, Category = "Feedback")
	float GetHeavyDamage() const;

	/** The effects bus volume every cue plays at. */
	static constexpr float EffectsVolume = 0.8f;

	/** One spark flies for every this many points of damage. */
	static constexpr float DamagePerSpark = 5.f;

private:
	/** The audio side. */
	UPROPERTY()
	TObjectPtr<UDojoP22SoundDesk> Sound;

	/** The visual effects side. */
	UPROPERTY()
	TObjectPtr<UDojoP22SparkPool> Sparks;

	/** The HUD side. */
	UPROPERTY()
	TObjectPtr<UDojoP22HudTicker> Hud;

	/** A hit of at least this much damage is heavy. */
	float HeavyDamage = 40.f;
};
