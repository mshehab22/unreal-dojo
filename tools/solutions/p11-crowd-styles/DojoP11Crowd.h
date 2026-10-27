#pragma once

#include "CoreMinimal.h"
#include "DojoP11Fan.h"
#include "DojoP11FanStyle.h"
#include "GameFramework/Actor.h"
#include "DojoP11Crowd.generated.h"

/** The arena crowd: thousands of small fans that each point at one of a few shared styles. Flyweight pattern. */
UCLASS()
class ADojoP11Crowd : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoP11Crowd();

	/** The shared styles; fans refer to them by index. At most 255. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Crowd")
	TArray<FDojoP11FanStyle> Styles;

	/** How many fans SeatFans seats. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Crowd", meta = (ClampMin = "0"))
	int32 FanCount = 3000;

	/** Seats FanCount fans, one per seat, giving the styles out in turn; seats nobody when there are no styles. */
	UFUNCTION(BlueprintCallable, Category = "Crowd")
	void SeatFans();

	/** Adds Amount to every fan's excitement, kept between 0 and 1. */
	UFUNCTION(BlueprintCallable, Category = "Crowd")
	void Excite(float Amount);

	/** The crowd's total loudness: each fan's excitement times its style's cheer volume, summed. */
	UFUNCTION(BlueprintPure, Category = "Crowd")
	float GetLoudness() const;

	/** Fans seated. */
	UFUNCTION(BlueprintPure, Category = "Crowd")
	int32 GetFanCount() const;

	/** The shared style of fan Index, or nullptr for an index with no fan. */
	const FDojoP11FanStyle* GetStyleOf(int32 Index) const;

	/** Fan Index itself, or nullptr for an index with no fan. */
	const FDojoP11Fan* GetFan(int32 Index) const;

protected:
	/** Seats the fans. */
	virtual void BeginPlay() override;

private:
	/** Every fan, a few bytes each; the styles are not copied in. */
	TArray<FDojoP11Fan> Fans;
};
