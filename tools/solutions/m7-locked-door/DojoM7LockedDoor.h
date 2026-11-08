#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7LockedDoor.generated.h"

class ADojoM7LockedDoor;
class UBoxComponent;
class UTextRenderComponent;

/** Broadcast when a door opens for a visitor holding its key, with the door and the visitor. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM7OnUnlocked, ADojoM7LockedDoor*, Door, AActor*, Visitor);

/** A door that opens only for a visitor whose key ring holds its required key; it counts every locked try and never takes the key. */
UCLASS()
class ADojoM7LockedDoor : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid panel as the root and the label in front of it, reading Locked. */
	ADojoM7LockedDoor();

	/** The solid slab, 40 by 300 by 300 cm; it blocks while the door is locked. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Door")
	TObjectPtr<UBoxComponent> Panel;

	/** Floating text: Locked or Open. */
	UPROPERTY(VisibleAnywhere, Category = "Door")
	TObjectPtr<UTextRenderComponent> Label;

	/** The key id a visitor's ring must hold to open the door. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Door")
	FName RequiredKey = TEXT("ShrineKey");

	/** Fires once each time the door goes from locked to open. */
	UPROPERTY(BlueprintAssignable, Category = "Door")
	FDojoM7OnUnlocked OnUnlocked;

	/** A visitor tries the door: true if it is open or opens now; otherwise it reads Locked, counts the try, and returns false. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	bool TryOpen(AActor* Visitor);

	/** True while the door is open. */
	UFUNCTION(BlueprintPure, Category = "Door")
	bool IsOpen() const;

	/** How many tries found the door locked, kept across Relock. */
	UFUNCTION(BlueprintPure, Category = "Door")
	int32 GetLockedTries() const;

	/** Closes the door again: the panel blocks and the label reads Locked. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Relock();

private:
	/** Writes the label text. */
	void SetLabel(const TCHAR* Text);

	bool bOpen = false;

	int32 LockedTries = 0;
};
