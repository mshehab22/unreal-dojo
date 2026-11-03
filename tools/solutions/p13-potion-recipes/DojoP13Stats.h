#pragma once

#include "CoreMinimal.h"
#include "DojoP13Stats.generated.h"

/** The four numbers a vault script may read or write. */
UENUM(BlueprintType)
enum class EDojoP13Stat : uint8
{
	ES_Health UMETA(DisplayName = "Health"),
	ES_Stamina UMETA(DisplayName = "Stamina"),
	ES_Gold UMETA(DisplayName = "Gold"),
	ES_Keys UMETA(DisplayName = "Keys")
};

/** An adventurer's numbers in the vault, reachable by name so a script can pick one. */
USTRUCT(BlueprintType)
struct FDojoP13Stats
{
	GENERATED_BODY()

	/** Hit points. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
	int32 Health = 0;

	/** Breath for running and striking. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
	int32 Stamina = 0;

	/** Coins carried. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
	int32 Gold = 0;

	/** Keys carried. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
	int32 Keys = 0;

	/** The value of the stat named by Which. */
	int32 Get(EDojoP13Stat Which) const
	{
		switch (Which)
		{
		case EDojoP13Stat::ES_Health: return Health;
		case EDojoP13Stat::ES_Stamina: return Stamina;
		case EDojoP13Stat::ES_Gold: return Gold;
		case EDojoP13Stat::ES_Keys: return Keys;
		}
		return 0;
	}

	/** Sets the stat named by Which to Value. */
	void Set(EDojoP13Stat Which, int32 Value)
	{
		switch (Which)
		{
		case EDojoP13Stat::ES_Health: Health = Value; break;
		case EDojoP13Stat::ES_Stamina: Stamina = Value; break;
		case EDojoP13Stat::ES_Gold: Gold = Value; break;
		case EDojoP13Stat::ES_Keys: Keys = Value; break;
		}
	}
};
