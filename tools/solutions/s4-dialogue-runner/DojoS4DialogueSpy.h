#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS4DialogueSpy.generated.h"

class UDojoS4DialogueData;
class UDojoS4DialogueRunner;
class UDojoS4FlagStore;

/** A listener that writes down every event a runner announces, in order, and whether a watched flag was set at each choice; it only subscribes. */
UCLASS()
class UDojoS4DialogueSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the runner, once however many times it is called; Store and WatchedFlag say which flag to read at each choice. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue Spy")
	void Watch(UDojoS4DialogueRunner* Runner, UDojoS4FlagStore* Store, FName WatchedFlag);

	/** The events so far as one line, such as "started, choice 0 Yes, ended". */
	UFUNCTION(BlueprintPure, Category = "Dialogue Spy")
	FString GetLog() const;

	/** The runner's current text at the moment of the last choice notice. */
	UFUNCTION(BlueprintPure, Category = "Dialogue Spy")
	FString GetTextAtLastChoice() const;

	/** True when the watched flag was set at the moment of the last choice notice. */
	UFUNCTION(BlueprintPure, Category = "Dialogue Spy")
	bool WasFlagSetAtLastChoice() const;

private:
	/** Writes "started". */
	UFUNCTION()
	void HandleStarted(UDojoS4DialogueData* Dialogue);

	/** Writes the choice and reads the watched flag. */
	UFUNCTION()
	void HandleChoice(int32 Index, FText ChoiceText);

	/** Writes "ended". */
	UFUNCTION()
	void HandleEnded();

	TArray<FString> Log;

	UPROPERTY()
	TObjectPtr<UDojoS4DialogueRunner> WatchedRunner;

	FString TextAtLastChoice;

	UPROPERTY()
	TObjectPtr<UDojoS4FlagStore> WatchedStore;

	FName FlagName;
	bool bFlagSetAtLastChoice = false;
};
