#include "DojoF6Showcase.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"

DEFINE_LOG_CATEGORY_STATIC(LogDojoF6Showcase, Log, All);

ADojoF6Showcase::ADojoF6Showcase()
{
	PrimaryActorTick.bCanEverTick = false;

	Display = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Display"));
	RootComponent = Display;
}

void ADojoF6Showcase::BeginPlay()
{
	Super::BeginPlay();

	if (!StartingMesh.IsNull()) ShowMesh(StartingMesh);
}

bool ADojoF6Showcase::ShowMesh(TSoftObjectPtr<UStaticMesh> Mesh)
{
	if (Mesh.IsNull())
	{
		UE_LOG(LogDojoF6Showcase, Warning, TEXT("%s was given nothing to show"), *GetName());
		return false;
	}

	UStaticMesh* Loaded = Mesh.LoadSynchronous();
	if (!Loaded)
	{
		UE_LOG(LogDojoF6Showcase, Warning, TEXT("%s could not load %s"), *GetName(), *Mesh.ToString());
		return false;
	}

	Display->SetStaticMesh(Loaded);
	return true;
}

UStaticMesh* ADojoF6Showcase::GetShownMesh() const
{
	return Display->GetStaticMesh();
}
