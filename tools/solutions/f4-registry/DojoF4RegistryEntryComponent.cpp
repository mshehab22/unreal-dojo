#include "DojoF4RegistryEntryComponent.h"

#include "DojoF4TargetRegistry.h"
#include "Engine/World.h"

UDojoF4RegistryEntryComponent::UDojoF4RegistryEntryComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoF4RegistryEntryComponent::BeginPlay()
{
	Super::BeginPlay();

	if (UDojoF4TargetRegistry* Registry = GetWorld()->GetSubsystem<UDojoF4TargetRegistry>())
	{
		Registry->Register(GetOwner());
	}
}

void UDojoF4RegistryEntryComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (UDojoF4TargetRegistry* Registry = GetWorld()->GetSubsystem<UDojoF4TargetRegistry>())
	{
		Registry->Unregister(GetOwner());
	}

	Super::EndPlay(EndPlayReason);
}
