#pragma once

#include "CoreMinimal.h"
#include "DojoP15Announcer.h"
#include "DojoP15NullAnnouncer.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP15AnnouncerDesk.generated.h"

/** One per world: holds the announcer that is currently provided and hands it to anyone who asks, so callers need no more than the interface. Service Locator pattern. */
UCLASS()
class UDojoP15AnnouncerDesk : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Makes the do-nothing announcer and provides it, so the desk is never empty. */
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	/** The desk of LevelWorld, or nullptr when there is no world. */
	static UDojoP15AnnouncerDesk* Locate(const UWorld* LevelWorld); // @explain: Callers find the desk through the world and never build one; the engine creates a world subsystem for every game world.

	/** Makes Provider the announcer; nullptr puts the do-nothing announcer back. Returns false, changing nothing, when Provider does not implement the announcer interface. */
	UFUNCTION(BlueprintCallable, Category = "Announcer")
	bool Install(UObject* Provider);

	/** The announcer now in place, as the interface; never empty. */
	IDojoP15Announcer& Get() const; // @explain: The desk gives out the interface, so a caller can speak a line without knowing which class stands behind it.

	/** The object now in place, for code that must wrap or restore it. */
	UFUNCTION(BlueprintPure, Category = "Announcer")
	UObject* GetProvider() const;

	/** The do-nothing announcer this desk owns. */
	UDojoP15NullAnnouncer* GetNullAnnouncer() const;

private:
	/** The announcer in place; any object that implements the interface. */
	UPROPERTY()
	TObjectPtr<UObject> Current; // @explain: A UPROPERTY keeps the provider alive for the garbage collector, and a cast turns the stored object into the interface when it is used.

	/** The do-nothing announcer, made once. */
	UPROPERTY()
	TObjectPtr<UDojoP15NullAnnouncer> Silent;
};
