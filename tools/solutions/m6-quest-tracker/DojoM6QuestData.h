#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoM6QuestData.generated.h"

/** What a quest asks for. */
UENUM(BlueprintType)
enum class EDojoM6QuestKind : uint8
{
	EQK_Collect UMETA(DisplayName = "Collect"),
	EQK_Goal UMETA(DisplayName = "Goal")
};

/** Where a quest stands. */
UENUM(BlueprintType)
enum class EDojoM6QuestState : uint8
{
	EQS_Locked UMETA(DisplayName = "Locked"),
	EQS_Available UMETA(DisplayName = "Available"),
	EQS_Active UMETA(DisplayName = "Active"),
	EQS_Completed UMETA(DisplayName = "Completed"),
	EQS_Failed UMETA(DisplayName = "Failed")
};

/** One quest's definition, kept in an asset so designers add quests without code. */
UCLASS(BlueprintType)
class UDojoM6QuestData : public UDataAsset
{
	GENERATED_BODY()

public:
	/** The name shown on the quest board. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	FText Title;

	/** Collect items, or reach a goal some other piece reports. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	EDojoM6QuestKind Kind = EDojoM6QuestKind::EQK_Collect;

	/** For a collect quest: the tag of the items it wants. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	FName ItemTag;

	/** For a collect quest: how many items finish it. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest", meta = (ClampMin = "1"))
	int32 Count = 1;

	/** Seconds from the start before the quest fails; 0 means no limit. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest", meta = (ClampMin = "0.0"))
	float TimeLimitSeconds = 0.f;

	/** A quest that must be completed before this one is offered; empty for none. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	TObjectPtr<UDojoM6QuestData> Requires;

	/** A secret quest is never offered; it starts itself when its first item is found. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest")
	bool bSecret = false;
};
