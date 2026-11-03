#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22SoundDesk.generated.h"

/** One cue the desk played: which, where, and how loud. */
USTRUCT(BlueprintType)
struct FDojoP22PlayedCue
{
	GENERATED_BODY()

	/** The cue's name. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sound")
	FName Cue;

	/** Where it played. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sound")
	FVector Where = FVector::ZeroVector;

	/** The bus volume it played at, 0 to 1. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sound")
	float Volume = 0.f;
};

/** Stands in for the game's audio: named cues played on one effects bus. A real desk would call UGameplayStatics::PlaySoundAtLocation; this one records what it played, so tests can hear it. */
UCLASS()
class UDojoP22SoundDesk : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** The id of the cue called Cue, or INDEX_NONE for a name the desk does not know. */
	UFUNCTION(BlueprintPure, Category = "Sound")
	int32 FindCue(FName Cue) const;

	/** Sets the effects bus volume, clamped to 0 to 1; every cue plays at it. The bus starts at 0, which is silent. */
	UFUNCTION(BlueprintCallable, Category = "Sound")
	void SetBusVolume(float Volume);

	/** The effects bus volume. */
	UFUNCTION(BlueprintPure, Category = "Sound")
	float GetBusVolume() const;

	/** Plays the cue with id CueId at Where, at the bus volume; false for an id FindCue never gave. */
	UFUNCTION(BlueprintCallable, Category = "Sound")
	bool PlayCue(int32 CueId, FVector Where);

	/** Every cue played in this world, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Sound")
	TArray<FDojoP22PlayedCue> GetPlayed() const;

private:
	/** The cues the desk knows, by id. */
	static const TArray<FName>& KnownCues();

	/** Every cue played, oldest first. */
	UPROPERTY()
	TArray<FDojoP22PlayedCue> Played;

	/** The effects bus volume. */
	float BusVolume = 0.f;
};
