#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22HudTicker.generated.h"

/** Stands in for the game's HUD: a ticker of short lines and a colored flash around the screen's edge. A real ticker would update a UUserWidget; this one records what it showed, so tests can read it. */
UCLASS()
class UDojoP22HudTicker : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** How many lines the ticker shows at once; older lines scroll away. */
	static constexpr int32 MaxLines = 5;

	/** Adds Line at the bottom of the ticker. */
	UFUNCTION(BlueprintCallable, Category = "HUD")
	void PushLine(const FString& Line);

	/** Flashes the screen's edge in Color. */
	UFUNCTION(BlueprintCallable, Category = "HUD")
	void FlashEdge(FLinearColor Color);

	/** The lines on the ticker now, oldest first. */
	UFUNCTION(BlueprintPure, Category = "HUD")
	TArray<FString> GetLines() const;

	/** How many lines were ever pushed in this world. */
	UFUNCTION(BlueprintPure, Category = "HUD")
	int32 GetPushedCount() const;

	/** How many times the edge flashed in this world. */
	UFUNCTION(BlueprintPure, Category = "HUD")
	int32 GetFlashCount() const;

	/** The color of the last flash, or transparent before the first. */
	UFUNCTION(BlueprintPure, Category = "HUD")
	FLinearColor GetLastFlash() const;

private:
	/** The lines on the ticker now, oldest first. */
	TArray<FString> Lines;

	/** Lines ever pushed. */
	int32 PushedCount = 0;

	/** Flashes so far. */
	int32 FlashCount = 0;

	/** The last flash's color. */
	FLinearColor LastFlash = FLinearColor::Transparent;
};
