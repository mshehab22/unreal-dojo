#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "DojoP9PropKit.generated.h"

class UActorComponent;

/** Assembles arena props from parts: a kind of prop is a set of components, not a class. Component pattern. */
UCLASS()
class UDojoP9PropKit : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/** Gives Prop a 250 health part and nothing else. */
	UFUNCTION(BlueprintCallable, Category = "Props")
	static void MakeStatue(AActor* Prop);

	/** Gives Prop a 40 health part and a loot part that drops one Bandage when that health runs out. */
	UFUNCTION(BlueprintCallable, Category = "Props")
	static void MakeCrate(AActor* Prop);

private:
	/** Creates a part owned by Prop, not yet registered, so its settings can be filled in first. */
	template<typename TPart>
	static TPart* CreatePart(AActor* Prop)
	{
		return NewObject<TPart>(Prop);
	}

	/** Adds a filled-in part to Prop and registers it; on a playing actor its BeginPlay runs inside this call. */
	static void AttachPart(AActor* Prop, UActorComponent* Part);
};
