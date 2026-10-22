#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF6Showcase.generated.h"

class UStaticMesh;
class UStaticMeshComponent;

/** A pedestal that shows a mesh it holds only by path, loading the mesh the moment it is asked to show it. */
UCLASS()
class ADojoF6Showcase : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the display mesh component as the root and turns ticking off. */
	ADojoF6Showcase();

	/** Shows whatever mesh was last loaded. */
	UPROPERTY(VisibleAnywhere, Category = "Showcase")
	TObjectPtr<UStaticMeshComponent> Display;

	/** Shown at BeginPlay when set; held by path, so nothing loads until then. */
	UPROPERTY(EditAnywhere, Category = "Showcase")
	TSoftObjectPtr<UStaticMesh> StartingMesh;

	/** Loads Mesh if needed and shows it; logs a warning and returns false when Mesh is unset or cannot be loaded. */
	UFUNCTION(BlueprintCallable, Category = "Showcase")
	bool ShowMesh(TSoftObjectPtr<UStaticMesh> Mesh);

	/** The mesh on show, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Showcase")
	UStaticMesh* GetShownMesh() const;

protected:
	/** Shows the starting mesh, if one is set. */
	virtual void BeginPlay() override;
};
