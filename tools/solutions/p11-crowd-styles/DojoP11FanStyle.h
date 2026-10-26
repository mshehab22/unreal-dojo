#pragma once

#include "CoreMinimal.h"
#include "DojoP11FanStyle.generated.h"

/** What every fan of one style shares: stored once in the crowd, never copied into a fan. Flyweight pattern. */
USTRUCT(BlueprintType)
struct FDojoP11FanStyle
{
	GENERATED_BODY()

	/** The style's name, such as Drummers. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Fan Style")
	FName Name = TEXT("Locals");

	/** How loud one fully excited fan of this style cheers. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Fan Style", meta = (ClampMin = "0.0"))
	float CheerVolume = 1.f;

	/** The scarf color every fan of this style waves. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Fan Style")
	FColor ScarfColor = FColor::Red;

	/** The chant this style sings. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Fan Style")
	FText Chant = FText::FromString(TEXT("Again!"));
};
