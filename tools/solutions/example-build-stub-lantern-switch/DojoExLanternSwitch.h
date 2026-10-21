#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExLanternSwitch.generated.h"

class ADojoExLantern;

UCLASS()
class ADojoExLanternSwitch : public AActor
{
	GENERATED_BODY()

public:
	ADojoExLanternSwitch();

	UPROPERTY(EditAnywhere, Category = "Switch")
	TArray<TObjectPtr<ADojoExLantern>> Lanterns;

	UFUNCTION(BlueprintCallable, CallInEditor, Category = "Switch")
	void Toggle();

	bool IsOn() const;

protected:
	virtual void BeginPlay() override;

private:
	void ApplyToAll();

	bool bIsOn = false;
};
