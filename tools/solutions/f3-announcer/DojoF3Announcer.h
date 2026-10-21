#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF3Announcer.generated.h"

class UTextRenderComponent;

/** Turns turn results and the leader into display text from formats designers can rewrite and translators can localize. */
UCLASS()
class ADojoF3Announcer : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label, the default formats, and turns ticking off. */
	ADojoF3Announcer();

	/** Floating text that shows the latest announcement. */
	UPROPERTY(VisibleAnywhere, Category = "Announcer")
	TObjectPtr<UTextRenderComponent> Label;

	/** Format for a turn result; may use {Player}, {Score}, and {Best}. */
	UPROPERTY(EditAnywhere, Category = "Announcer")
	FText TurnFormat;

	/** Format for the leader; may use {Player} and {Score}. */
	UPROPERTY(EditAnywhere, Category = "Announcer")
	FText LeaderFormat;

	/** Shown by AnnounceLeader when nobody has scored. */
	UPROPERTY(EditAnywhere, Category = "Announcer")
	FText NoScoresText;

	/** Formats a turn result, shows it on the label, logs it, and returns it. */
	UFUNCTION(BlueprintCallable, Category = "Announcer")
	FText AnnounceTurn(FName Player, int32 Score, int32 Best);

	/** Formats the leader (or NoScoresText for NAME_None), shows it on the label, logs it, and returns it. */
	UFUNCTION(BlueprintCallable, Category = "Announcer")
	FText AnnounceLeader(FName Player, int32 Score);

private:
	/** Puts the text on the label and writes it to the log. */
	void Show(const FText& Text);
};
