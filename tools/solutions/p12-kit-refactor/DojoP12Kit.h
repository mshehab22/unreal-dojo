#pragma once

#include "CoreMinimal.h"
#include "DojoP12Charm.h"
#include "UObject/Object.h"
#include "DojoP12Kit.generated.h"

/** What a challenger carries into a trial: a few numbers, a charm of its own, and a favor shared with others. Prototype pattern, object form. */
UCLASS(Blueprintable, BlueprintType)
class UDojoP12Kit : public UObject
{
	GENERATED_BODY()

public:
	/** Creates the kit's own charm. */
	UDojoP12Kit();

	/** The label shown for this kit. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit")
	FName KitLabel = NAME_None;

	/** Hit points the challenger starts with. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit", meta = (ClampMin = "1"))
	int32 Health = 100;

	/** Stamina the challenger starts with. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit", meta = (ClampMin = "0.0"))
	float Stamina = 50.f;

	/** Extra luck added to every roll; added to the kit after the first version. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit")
	float LuckBonus = 0.f;

	/** The charm this kit owns; every kit has its own. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Instanced, Category = "Kit")
	TObjectPtr<UDojoP12Charm> Charm;

	/** A charm owned by someone else that this kit only points at. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Kit")
	TObjectPtr<UDojoP12Charm> Favor;

	/** Makes a separate kit with the same values and its own copy of the charm; the favor stays shared. */
	UFUNCTION(BlueprintCallable, Category = "Kit")
	UDojoP12Kit* Clone() const;
};
