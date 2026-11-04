#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "DojoS3SaveRecord.generated.h"

/** The saved state of one actor: its SaveGame properties, written out as bytes. */
USTRUCT(BlueprintType)
struct FDojoS3ActorRecord
{
	GENERATED_BODY()

	/** The actor's SaveGame properties, as the saveable component wrote them. */
	UPROPERTY()
	TArray<uint8> Bytes;
};

/** One checkpoint: the state of every saveable actor by its id, and the ids of the ones the world has lost. It is plain data and makes no decisions. */
UCLASS()
class UDojoS3SaveRecord : public USaveGame
{
	GENERATED_BODY()

public:
	/** Each saveable actor's state, by its save id. */
	UPROPERTY()
	TMap<FName, FDojoS3ActorRecord> Actors;

	/** Save ids of actors that were removed, such as coins that were picked up. */
	UPROPERTY()
	TArray<FName> GoneIds;

	/** Stores an actor's bytes under its id, replacing what was there; an id of None is ignored. */
	void StoreActor(FName SaveId, const TArray<uint8>& Bytes);

	/** The record stored under this id, or null when there is none. */
	const FDojoS3ActorRecord* FindActor(FName SaveId) const;

	/** Notes that the actor with this id is gone: it is listed once, and any state stored for it is dropped. */
	void MarkGone(FName SaveId);

	/** True when this id was marked gone. */
	bool IsGone(FName SaveId) const;
};
