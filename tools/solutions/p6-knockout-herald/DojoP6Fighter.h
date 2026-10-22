#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP6Fighter.generated.h"

class ADojoP6ArenaHerald;
class UTextRenderComponent;

/** An arena fighter who, when knocked out, posts the knockout to the herald and leaves the arena. */
UCLASS()
class ADojoP6Fighter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP6Fighter();

	/** Floating text with the fighter's name. */
	UPROPERTY(VisibleAnywhere, Category = "Fighter")
	TObjectPtr<UTextRenderComponent> Label;

	/** The name the herald announces. */
	UPROPERTY(EditAnywhere, Category = "Fighter")
	FName FighterName = TEXT("Fighter");

	/** The fighter's team. */
	UPROPERTY(EditAnywhere, Category = "Fighter")
	int32 Team = 0;

	/** The herald that hears this fighter's knockout, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Fighter")
	TObjectPtr<ADojoP6ArenaHerald> Herald;

	/** Posts this fighter's knockout to the herald, then removes the fighter from the arena. Winner may be empty. */
	UFUNCTION(BlueprintCallable, Category = "Fighter")
	void KnockOut(ADojoP6Fighter* Winner);

protected:
	/** Shows the fighter's name. */
	virtual void BeginPlay() override;
};
