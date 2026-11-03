#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM4Bomb.generated.h"

class USphereComponent;
class UTextRenderComponent;

/** A bomb that blows, leaving play, when its fuse runs out; its label counts the fuse down while it is lit. */
UCLASS()
class ADojoM4Bomb : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid body as the root and the label above it. */
	ADojoM4Bomb();

	/** The solid shape. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Bomb")
	TObjectPtr<USphereComponent> Body;

	/** Floating text: the seconds left while lit, or SAFE. */
	UPROPERTY(VisibleAnywhere, Category = "Bomb")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds of fuse the bomb is lit with when it begins play; 0 starts it unlit. Set it before the bomb begins play. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bomb", meta = (ClampMin = "0"))
	float StartFuse = 0.f;

	/** Lights the fuse with Seconds; a lit bomb only ever blows sooner, and zero or less blows it at once. */
	UFUNCTION(BlueprintCallable, Category = "Bomb")
	void Light(float Seconds);

	/** Stops the fuse and the countdown. */
	UFUNCTION(BlueprintCallable, Category = "Bomb")
	void Defuse();

	/** True while the fuse is burning. */
	UFUNCTION(BlueprintPure, Category = "Bomb")
	bool IsLit() const;

	/** Seconds until the bomb blows, or 0 while it is unlit. */
	UFUNCTION(BlueprintPure, Category = "Bomb")
	float GetFuseRemaining() const;

	/** True when the bomb was already lit as it began play. */
	UFUNCTION(BlueprintPure, Category = "Bomb")
	bool WasLitAtStart() const;

protected:
	/** Lights the bomb with StartFuse when it is set, and writes the first label. */
	virtual void BeginPlay() override;

	/** Stops both timers. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** The fuse ran out: the bomb leaves play. */
	void Blow();

	/** Writes the seconds left, or SAFE. */
	void RefreshLabel();

	FTimerHandle FuseTimer;

	FTimerHandle LabelTimer;

	bool bLitAtStart = false;
};
