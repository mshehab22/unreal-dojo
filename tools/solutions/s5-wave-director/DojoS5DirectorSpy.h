#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS5WaveDirector.h"
#include "DojoS5DirectorSpy.generated.h"

/** A listener that writes down every announcement a director makes, with the state the director was in when it arrived; it only subscribes. */
UCLASS()
class UDojoS5DirectorSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the director's three events, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Director Spy")
	void Watch(ADojoS5WaveDirector* Director);

	/** Every announcement so far, oldest first, such as "start 1 3 Wave", "clear 1 Rest", or "rest 2 3.0 Rest". */
	UPROPERTY(BlueprintReadOnly, Category = "Director Spy")
	TArray<FString> Heard;

private:
	/** Writes down a wave start. */
	UFUNCTION()
	void HandleWaveStarted(int32 Wave, int32 BeetleCount);

	/** Writes down a cleared wave. */
	UFUNCTION()
	void HandleWaveCleared(int32 Wave);

	/** Writes down a rest. */
	UFUNCTION()
	void HandleRestStarted(int32 NextWave, float Seconds);

	/** The watched director's state as a word. */
	FString StateWord() const;

	UPROPERTY()
	TObjectPtr<ADojoS5WaveDirector> Watched;
};
