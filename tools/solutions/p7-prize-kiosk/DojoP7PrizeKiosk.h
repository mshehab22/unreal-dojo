#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP7PrizeKiosk.generated.h"

class UTextRenderComponent;

/** The one thing the prize kiosk is doing right now. */
UENUM(BlueprintType)
enum class EDojoP7KioskState : uint8
{
	EKS_Idle UMETA(DisplayName = "Insert Token"),
	EKS_Selecting UMETA(DisplayName = "Choose Prize"),
	EKS_Dispensing UMETA(DisplayName = "Dispensing"),
	EKS_OutOfStock UMETA(DisplayName = "Sold Out")
};

/** A prize kiosk by the arena gate whose every input means something different in each of its four modes (State: one enum field, and a switch on it in every input). */
UCLASS()
class ADojoP7PrizeKiosk : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP7PrizeKiosk();

	/** Floating text that shows the kiosk's mode and stock. */
	UPROPERTY(VisibleAnywhere, Category = "Kiosk")
	TObjectPtr<UTextRenderComponent> Label;

	/** Prizes inside the kiosk. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Kiosk", meta = (ClampMin = "0"))
	int32 Stock = 3;

	/** Seconds a prize takes to drop during play. */
	UPROPERTY(EditAnywhere, Category = "Kiosk", meta = (ClampMin = "0.1"))
	float DispenseSeconds = 1.5f;

	/** A token goes in: starts a choice when idle; ignored in every other mode. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void InsertToken();

	/** The player picks a prize: starts dispensing while choosing; ignored otherwise. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void Choose();

	/** The player backs out: refunds the token while choosing; ignored otherwise. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void Cancel();

	/** The prize has dropped: hands it out and returns to idle, or to sold out when the last one is gone. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void FinishDispensing();

	/** Adds prizes; a sold-out kiosk opens again. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void Restock(int32 Amount);

	/** The kiosk's current mode. */
	UFUNCTION(BlueprintPure, Category = "Kiosk")
	EDojoP7KioskState GetState() const;

	/** Prizes handed out so far. */
	UFUNCTION(BlueprintPure, Category = "Kiosk")
	int32 GetPrizesGiven() const;

	/** Tokens given back after a cancel. */
	UFUNCTION(BlueprintPure, Category = "Kiosk")
	int32 GetTokensRefunded() const;

protected:
	/** Shows the starting mode. */
	virtual void BeginPlay() override;

private:
	/** Switches to a new mode, runs that mode's entry action, and refreshes the label. */
	void SetState(EDojoP7KioskState NewState);

	/** Writes the mode's display name and the stock into the label. */
	void RefreshLabel();

	/** The kiosk's one current mode. */
	UPROPERTY(VisibleInstanceOnly, Category = "Kiosk")
	EDojoP7KioskState State = EDojoP7KioskState::EKS_Idle;

	int32 PrizesGiven = 0;
	int32 TokensRefunded = 0;
	FTimerHandle DispenseTimer;
};
