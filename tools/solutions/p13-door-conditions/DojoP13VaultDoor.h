#pragma once

#include "CoreMinimal.h"
#include "DojoP13CheckStep.h"
#include "GameFramework/Actor.h"
#include "Quests/p13-potion-recipes/DojoP13Stats.h"
#include "DojoP13VaultDoor.generated.h"

/** What a door's condition says about an adventurer. */
UENUM(BlueprintType)
enum class EDojoP13Verdict : uint8
{
	/** The condition holds: the door may open. */
	EV_Open UMETA(DisplayName = "Open"),
	/** The condition does not hold: the door stays shut. */
	EV_Shut UMETA(DisplayName = "Shut"),
	/** The condition is not a well-formed script: the door stays shut whatever the stats. */
	EV_Broken UMETA(DisplayName = "Broken")
};

/** A vault door that opens only for an adventurer whose stats pass a condition a designer writes in the Details panel. Bytecode pattern. */
UCLASS()
class ADojoP13VaultDoor : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP13VaultDoor();

	/** The most values the condition's stack may hold at once. */
	static constexpr int32 StackLimit = 8;

	/** The steps that decide whether the door opens, in order; they must leave exactly one value. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Door")
	TArray<FDojoP13CheckStep> Condition;

	/** Runs the condition against Stats without changing anything. */
	UFUNCTION(BlueprintPure, Category = "Door")
	EDojoP13Verdict Judge(const FDojoP13Stats& Stats) const;

	/** Opens the door, hidden and with no collision, when the verdict for Stats is Open; true when it is open afterwards. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	bool TryOpen(const FDojoP13Stats& Stats);

	/** Closes the door again, shown and with collision. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Shut();

	/** True while the door is open. */
	UFUNCTION(BlueprintPure, Category = "Door")
	bool IsOpen() const;

private:
	/** Does one step of the condition on Stack; false when the step cannot be done. */
	bool ApplyStep(const FDojoP13CheckStep& Step, const FDojoP13Stats& Stats, TArray<int32>& Stack) const;

	/** True while the door is open. */
	bool bOpen = false;
};
