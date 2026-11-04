#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Quests/s4-interactable/DojoS4Interactable.h"
#include "DojoS4Villager.generated.h"

class UBoxComponent;
class UDojoS4DialogueData;
class UDojoS4DialogueRunner;
class UDojoS4FlagStore;

/** Someone to talk to: using them starts their conversation on a shared runner, and they cannot be used while any conversation is playing. */
UCLASS()
class ADojoS4Villager : public AActor, public IDojoS4Interactable
{
	GENERATED_BODY()

public:
	/** Creates the box and turns ticking off. */
	ADojoS4Villager();

	/** The box an interactor's sphere overlaps. */
	UPROPERTY(VisibleAnywhere, Category = "Villager")
	TObjectPtr<UBoxComponent> Body;

	/** The name shown in the prompt. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Villager")
	FText DisplayName;

	/** What this villager says. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Villager")
	TObjectPtr<UDojoS4DialogueData> Dialogue;

	/** The runner that plays conversations; villagers share one so only one conversation plays at a time. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Villager")
	TObjectPtr<UDojoS4DialogueRunner> Runner;

	/** The flags the conversation reads and sets. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Villager")
	TObjectPtr<UDojoS4FlagStore> FlagStore;

	/** "Talk to" followed by the villager's name. */
	virtual FText GetPrompt_Implementation() const override;

	/** True when the dialogue, the runner, and the flags are set and no conversation is playing. */
	virtual bool CanInteract_Implementation(AActor* Interactor) const override;

	/** Starts the conversation; false when it cannot be used. */
	virtual bool Interact_Implementation(AActor* Interactor) override;
};
