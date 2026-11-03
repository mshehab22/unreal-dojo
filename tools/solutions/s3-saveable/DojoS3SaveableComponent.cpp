#include "DojoS3SaveableComponent.h"

#include "DojoS3Restorable.h"
#include "GameFramework/Actor.h"
#include "Serialization/MemoryReader.h"
#include "Serialization/MemoryWriter.h"
#include "Serialization/ObjectAndNameAsStringProxyArchive.h"

UDojoS3SaveableComponent::UDojoS3SaveableComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

TArray<uint8> UDojoS3SaveableComponent::CaptureState() const
{
	TArray<uint8> Bytes;
	AActor* Owner = GetOwner();

	if (Owner == nullptr)
	{
		return Bytes;
	}

	FMemoryWriter Writer(Bytes, true);
	FObjectAndNameAsStringProxyArchive Archive(Writer, true);
	Archive.ArIsSaveGame = true;
	Owner->Serialize(Archive);

	return Bytes;
}

bool UDojoS3SaveableComponent::RestoreState(const TArray<uint8>& Bytes)
{
	AActor* Owner = GetOwner();

	if (Owner == nullptr || Bytes.Num() == 0)
	{
		return false;
	}

	FMemoryReader Reader(Bytes, true);
	FObjectAndNameAsStringProxyArchive Archive(Reader, true);
	Archive.ArIsSaveGame = true;
	Owner->Serialize(Archive);

	// The properties are back; an owner that shows them in other ways is told so it can catch up.
	if (Owner->Implements<UDojoS3Restorable>())
	{
		IDojoS3Restorable::Execute_OnRestoredFromSave(Owner);
	}

	return true;
}
