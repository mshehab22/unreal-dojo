#include "DojoM7KeyRing.h"

UDojoM7KeyRing::UDojoM7KeyRing()
{
	PrimaryComponentTick.bCanEverTick = false;
}

bool UDojoM7KeyRing::AddKey(FName KeyId)
{
	if (KeyId.IsNone() || Keys.Contains(KeyId)) return false;

	Keys.Add(KeyId);
	OnKeyAdded.Broadcast(KeyId);
	return true;
}

bool UDojoM7KeyRing::HasKey(FName KeyId) const
{
	return Keys.Contains(KeyId);
}

bool UDojoM7KeyRing::RemoveKey(FName KeyId)
{
	return Keys.Remove(KeyId) > 0;
}

void UDojoM7KeyRing::ClearKeys()
{
	Keys.Reset();
}

int32 UDojoM7KeyRing::GetKeyCount() const
{
	return Keys.Num();
}
