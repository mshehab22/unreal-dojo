#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP2SwingingBlade.generated.h"

class USceneComponent;
class UTextRenderComponent;

/** A swinging blade trap whose swing is simulated in fixed steps, so it moves the same at any frame rate (Game Loop: a fixed-step simulation inside the engine's frame). */
UCLASS()
class ADojoP2SwingingBlade : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the pivot and the blade label, and turns ticking on. */
	ADojoP2SwingingBlade();

	/** The point the blade swings around. */
	UPROPERTY(VisibleAnywhere, Category = "Blade")
	TObjectPtr<USceneComponent> Pivot;

	/** Floating text hanging below the pivot; it is what you see swing. */
	UPROPERTY(VisibleAnywhere, Category = "Blade")
	TObjectPtr<UTextRenderComponent> Label;

	/** Angle the blade is released from, in degrees. */
	UPROPERTY(EditAnywhere, Category = "Blade")
	float StartAngle = 60.f;

	/** How hard the blade is pulled back toward hanging straight down. */
	UPROPERTY(EditAnywhere, Category = "Blade", meta = (ClampMin = "0"))
	float Stiffness = 20.f;

	/** Share of the swing speed kept after each step; below 1 the swing dies down. */
	UPROPERTY(EditAnywhere, Category = "Blade", meta = (ClampMin = "0", ClampMax = "1"))
	float Damping = 0.99f;

	/** Length of one simulation step, in seconds. */
	UPROPERTY(EditAnywhere, Category = "Blade", meta = (ClampMin = "0.001"))
	float StepSeconds = 1.f / 32.f;

	/** Moves the simulation forward by the real time that passed, in whole fixed steps. */
	UFUNCTION(BlueprintCallable, Category = "Blade")
	void Advance(float DeltaSeconds);

	/** The simulated angle after the last step, in degrees. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	float GetAngle() const;

	/** How many fixed steps have run since play started. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	int32 GetStepsRun() const;

	/** How far the leftover time is toward the next step, from 0 up to but not including 1. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	float GetAlpha() const;

	/** The angle to draw this frame: between the last two steps, by the alpha, so the swing looks smooth. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	float GetDisplayAngle() const;

	/** Advances the simulation and turns the blade to the display angle. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Releases the blade from its start angle. */
	virtual void BeginPlay() override;

private:
	/** One fixed step of the swing. */
	void SimulateStep();

	float Angle = 0.f;
	float PreviousAngle = 0.f;
	float AngularSpeed = 0.f;
	float Lag = 0.f;
	int32 StepsRun = 0;
};
