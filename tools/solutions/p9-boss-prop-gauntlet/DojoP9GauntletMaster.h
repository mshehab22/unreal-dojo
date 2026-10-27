#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Templates/Function.h"
#include "DojoP9GauntletMaster.generated.h"

class UDojoP9HealthComponent;
class UTextRenderComponent;

/** One prop of the gauntlet, described by the parts it gets rather than by a class. */
USTRUCT(BlueprintType)
struct FDojoP9PropRecipe
{
	GENERATED_BODY()

	/** Shown above the prop. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Prop")
	FString Name = TEXT("Crate");

	/** Where the prop stands. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Prop")
	FVector Spot = FVector::ZeroVector;

	/** Gives the prop a health part, which makes it breakable. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Prop")
	bool bHasHealth = true;

	/** The health part's MaxHealth. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Prop", meta = (EditCondition = "bHasHealth", ClampMin = "1.0"))
	float MaxHealth = 40.f;

	/** Gives the prop a loot part that drops when its health runs out. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Prop")
	bool bHasLoot = false;

	/** The loot part's item. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Prop", meta = (EditCondition = "bHasLoot"))
	FName LootItem = TEXT("Bandage");

	/** How many of LootItem drop. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Prop", meta = (EditCondition = "bHasLoot", ClampMin = "1"))
	int32 LootCount = 1;
};

/** Runs the prop gauntlet: builds props from recipes of parts, lets the champion strike them for stamina, counts breaks and loot through the parts' events, and starts clean rounds. */
UCLASS()
class ADojoP9GauntletMaster : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP9GauntletMaster();

	/** Shows the round's progress, then WIN or TIME UP. */
	UPROPERTY(VisibleAnywhere, Category = "Gauntlet")
	TObjectPtr<UTextRenderComponent> Label;

	/** The props each round builds, in order. */
	UPROPERTY(EditAnywhere, Category = "Gauntlet")
	TArray<FDojoP9PropRecipe> Recipes;

	/** The actor that strikes; when empty, the first player's pawn. It gets a stamina part if it has none. */
	UPROPERTY(EditAnywhere, Category = "Gauntlet")
	TObjectPtr<AActor> Champion;

	/** A prop this close to the champion can be struck. */
	UPROPERTY(EditAnywhere, Category = "Gauntlet", meta = (ClampMin = "0.0"))
	float StrikeRange = 150.f;

	/** Health a strike takes. */
	UPROPERTY(EditAnywhere, Category = "Gauntlet", meta = (ClampMin = "0.0"))
	float StrikeDamage = 25.f;

	/** Stamina a strike costs the champion. */
	UPROPERTY(EditAnywhere, Category = "Gauntlet", meta = (ClampMin = "0.0"))
	float StrikeStamina = 20.f;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Gauntlet", meta = (ClampMin = "1.0"))
	float RoundSeconds = 45.f;

	/** E: the champion strikes the nearest unbroken prop in range, the earlier recipe on a tie, if it can pay the stamina. */
	UFUNCTION(BlueprintCallable, Category = "Gauntlet")
	void PressStrike();

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Gauntlet")
	void RestartRound();

	/** True from the start of a round until it is won or time runs out. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	bool IsRunning() const;

	/** This round's props, in recipe order. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	TArray<AActor*> GetProps() const;

	/** Props broken this round. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	int32 GetBrokenCount() const;

	/** Props with a health part this round. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	int32 GetBreakableCount() const;

	/** Items dropped by loot parts this round. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	int32 GetLootCount() const;

	/** Seconds the last won round took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	float GetWinSeconds() const;

protected:
	/** Finds the champion, gives it a stamina part if needed, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Stops listening to every prop and clears the round timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Removes the last round's props, refills the champion, builds fresh props, and starts the clock. */
	void StartRound();

	/** Ends the round as won or timed out. */
	void EndRound(bool bWon);

	/** Spawns one prop and gives it the recipe's parts. */
	AActor* BuildProp(const FDojoP9PropRecipe& Recipe);

	/** Creates, fills in by Setup, and registers a part on Prop. */
	template<typename TPart>
	TPart* AddPart(AActor* Prop, TFunctionRef<void(TPart&)> Setup);

	/** Stops listening to every prop and destroys them. */
	void ClearProps();

	/** Called by any prop's health part when it runs out. */
	UFUNCTION()
	void HandlePropBroken(UDojoP9HealthComponent* Health);

	/** Called by any prop's loot part when it drops. */
	UFUNCTION()
	void HandleLootDropped(FName Item, int32 Count);

	/** Round timer ran out. */
	void HandleTimeUp();

	/** Routes one pressed key to its action. */
	void HandleKey(FKey Key);

	/** Writes the round's state into the label. */
	void RefreshLabel();

	/** This round's props. */
	UPROPERTY()
	TArray<TObjectPtr<AActor>> Props;

	FTimerHandle RoundTimer;

	float StartedAt = 0.f;

	float WinSeconds = 0.f;

	int32 BrokenCount = 0;

	int32 BreakableCount = 0;

	int32 LootCount = 0;

	bool bRunning = false;

	bool bWon = false;
};
