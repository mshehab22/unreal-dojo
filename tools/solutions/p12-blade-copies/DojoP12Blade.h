#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP12Blade.generated.h"

/** A swinging blade in the trial hall: a handful of numbers that decide how it hurts. */
UCLASS()
class ADojoP12Blade : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP12Blade();

	/** Damage one hit deals. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blade", meta = (ClampMin = "0.0"))
	float Damage = 10.f; // @explain: These defaults live in the class default object, so a blade spawned the plain way always starts from them.

	/** How fast the blade swings, in degrees per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blade", meta = (ClampMin = "0.0"))
	float SwingSpeed = 45.f;

	/** Seconds after the blade appears before it starts to hurt. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blade", meta = (ClampMin = "0.0"))
	float ArmDelay = 1.f;

	/** The color the blade glows. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blade")
	FLinearColor GlowColor = FLinearColor::White;

	/** Takes the blade out of play: hidden, with no collision. */
	UFUNCTION(BlueprintCallable, Category = "Blade")
	void Park();

	/** Puts the blade back in play: shown, with collision. */
	UFUNCTION(BlueprintCallable, Category = "Blade")
	void Wake();

	/** True while the blade is hidden and has no collision. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	bool IsParked() const;
};
